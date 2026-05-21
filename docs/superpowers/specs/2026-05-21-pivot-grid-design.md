# PivotGrid — Design

**Date:** 2026-05-21
**Status:** Draft (pending randall review before implementation plan)
**Authors:** Veronica (w/ Claude)

## Context

`/alarms/grid` in amygdala-ui renders a raw HTML `<table>` (~165 LOC of inline-styled JSX in `AlarmsGridShell.tsx:670-832`) for a recurring shape we don't currently serve in SUI: a dense pivot of **runtime-derived rows × runtime-derived columns**, with **two-axis sticky positioning** (top header AND left column), **clickable cells** (each cell is an `<A>` to `/alarms/explore`), and **optional continuous heat coloring** based on a per-cell scalar.

### Existing primitives — gap analysis

| Component | Closest to need? | Gap |
|---|---|---|
| `BaseTable` | Fixed column schema, sortable, sticky-header only. | No left-sticky column. Columns must be statically declared, not derived from data. No per-cell coloring hook. No href-per-cell. |
| `Heatmap` / `HeatmapMulti` | Cell grid with row labels + column labels. | Status is a closed enum (`full`/`partial`/`missing`/`empty`); no continuous heat. Cell payload is a single value, no rich label. No left-sticky behavior — it lays out as flex rows, not a real table; the row label is a sibling, not a sticky column. No click-through link. |
| `PivotTreemap` | Pivots `T[]` by two dims. | Treemap layout (proportional rects), not a tabular grid. Wrong visual model for "row label / column label / cell" reading order. |
| `HeatStreamGrid` | Table-of-streams with selection. | Per-cell payload is a HeatStream (timeline), not a scalar or formatted text. |

None of these covers "tabular pivot, dual-sticky, dynamic columns, render-any-cell". Hence a new base.

## Decisions

### D1. Shape — table-based, not flex

PivotGrid renders a real `<table>` with `<thead>` and `<tbody>`. `<th>` for headers and row labels, `<td>` for body cells. This gets us:

- Native `position: sticky` on `<th>` works in all evergreen browsers when the table's scroll container has `overflow: auto`.
- Screen readers read it as a data table — pivots are a data-table use case, not a layout grid.
- `colspan`/`rowspan` is available if we ever add grouped column headers (out of scope for v1).

### D2. API surface

```ts
export interface PivotGridProps<RowKey extends string, ColKey extends string, Cell> {
  /** Row identities, top-to-bottom. Caller sorts. */
  rows: readonly RowKey[];
  /** Column identities, left-to-right. Caller sorts. */
  columns: readonly ColKey[];
  /** Display label for a row's sticky-left header cell. */
  rowLabel: (row: RowKey) => string;
  /** Display label for a column's sticky-top header cell. */
  colLabel: (col: ColKey) => string;
  /** Cell value lookup. Return `null` for "no data" (rendered via `emptyCell`). */
  cell: (row: RowKey, col: ColKey) => Cell | null;
  /** Render the cell payload to JSX. Caller owns formatting. */
  renderCell: (cell: Cell, row: RowKey, col: ColKey) => JSX.Element;
  /** Optional: navigate on click. If present, the cell wraps in a router-friendly `<a>`. */
  cellHref?: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
  /** Optional: imperative click handler. Ignored when `cellHref` returns a string. */
  onCellClick?: (row: RowKey, col: ColKey, cell: Cell | null) => void;
  /** Optional: continuous heat 0..1 → translucent background. Return `null` to skip. */
  getCellHeat?: (cell: Cell, row: RowKey, col: ColKey) => number | null;
  /** Optional: shape the 0..1 heat value before alpha mapping. Default `Math.sqrt` (perceptual). Pass `(v) => v` for linear. */
  heatRamp?: (v: number) => number;
  /** Optional: hue for heat ramp. Default `var(--sui-pivot-heat-rgb, 248, 113, 113)`. */
  heatRgb?: string;
  /** Corner cell (top-left) label. Default `""`. */
  cornerLabel?: string;
  /** Rendered in body cells where `cell()` returns `null`. Default `"—"`. */
  emptyCell?: JSX.Element;
  /** Optional title (native `title` attr) for a cell — tooltip on hover. */
  cellTitle?: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
  /** Tight rows (12px padding) vs default (16px). */
  compact?: boolean;
  class?: string;
}
```

**Three motivating data shapes, all expressible:**

| Use case | `Cell` shape | `cellHref?` | `getCellHeat?` | `renderCell` |
|---|---|---|---|---|
| Alarms grid (alarm types × assets) | `{ count: number; durationMs: number; mode: "count"\|"duration"\|"%op"; muted: boolean }` | builds `/alarms/explore?…` | scaled count/duration/ratio | formatted text node |
| Ops metrics pivot (timeframes × instruments) | `{ mean: number; p95: number; units: string }` | undefined | undefined | `<MonoValue>` w/ units |
| Flag matrix (alarm types × assets) | `boolean` | undefined | undefined | `✓` / blank |

All three drop into the same component with zero presentational props at the call site.

### D3. Sticky-positioning strategy

CSS-only. The component renders the table inside a `<div class="sui-pivot-grid">` that supplies `overflow: auto`. The `<th>` cells get:

- **Top header row:** `position: sticky; top: 0; z-index: 1;`
- **Left column cells (`<th scope="row">`):** `position: sticky; left: 0; z-index: 1;`
- **Top-left corner cell:** `position: sticky; top: 0; left: 0; z-index: 2;`

The consumer must give the wrapping container a bounded height (e.g. flex child with `min-height: 0`, or explicit `max-height`). The component does **not** set its own height — that's chrome around the table, decided by the page layout.

### D4. Cell interaction model

Cells are always wrapped in either an `<a>` (when `cellHref` returns a string) or a `<button>` (when `onCellClick` is provided) so they're keyboard-focusable by default. If neither is set, the cell renders as plain `<td>` content (no focus ring, no interactive affordance — explicit "this is read-only data" signal). Same priority order as `BaseTable.onRowClick` vs `<a>` wrappers.

Why both? `cellHref` is the right call for cross-route navigation (alarms-grid → /alarms/explore — middle-click opens a new tab, browser back/forward works); `onCellClick` covers in-page selection / drill-down without a route. We don't expose `<A>` (SolidStart-specific) — consumers either pass a string href (the component renders `<a>`, which Solid Router intercepts for in-app links automatically) or use the callback.

### D5. Heat coloring

Built-in via `getCellHeat`. Returns `number | null` in `[0, 1]`. The component applies `background-color: rgba(<heatRgb>, alpha)` where `alpha` comes from running the raw value through a ramp curve, then mapping the result into the `[0.1, 0.6]` alpha range.

**Default ramp: perceptual (sqrt).** Most pivots have a long-tailed magnitude distribution (one outlier asset, many small contributors); linear would wash out the bottom 80% of the data. Sqrt compresses high-magnitude cells and makes mid-range cells distinguishable. Consumers that want linear (e.g. alarms-grid wanting pixel parity with the pre-migration look) pass `heatRamp={(v) => v}`.

**Prop:** `heatRamp?: (v: number) => number` — defaults to `Math.sqrt`. The caller's `getCellHeat` returns the raw 0..1 ratio (across the whole grid), the ramp shapes it, the component does the final `[0.1, 0.6]` alpha mapping. Default `heatRgb` is exposed via `--sui-pivot-heat-rgb` (defaults to `248, 113, 113` — the danger red the alarms grid already uses).

Why not compose `Heatmap`? `Heatmap` is status-enum-based (`full`/`partial`/`missing`), not continuous. The two visual languages are different — Heatmap reads as a completeness map, PivotGrid reads as a magnitude pivot. Sharing a component would over-couple them. Caller computes the 0..1 scale once (across the whole grid) and passes a pure `getCellHeat`.

### D6. Composition

Standalone base component, owns its CSS (`PivotGrid.css`). Does **not** compose `BaseTable` — BaseTable's column model is static, the sort UI is irrelevant for a pivot, and the markup divergence (sticky-left, no sort indicators) would mean overriding more than half the props. Internally uses no other library components; renders raw `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`/`<a>` with theme tokens (`--sui-bg-secondary`, `--sui-border`, `--sui-text-muted`, etc.).

### D7. Curried variants

Ship two in SUI:

- **`HeatPivotGrid`** — `PivotGrid` with `getCellHeat` mandatory; convenience for the common "magnitude pivot with heat" case.
- **`LinkPivotGrid`** — `PivotGrid` with `cellHref` mandatory; convenience for "every cell is a drilldown link".

The domain-specific `AlarmsPivotGrid` (with the alarm cell formatter, /alarms/explore href builder, and red heat) lives in **amygdala-ui**, not SUI — it bakes in route-specific URL params that don't belong upstream. If a second project grows a similar alarm-drilldown grid, we promote it then (per `~/.claude/worker-style-guides/design-system.md` "2+ projects → promote").

### D8. Migration plan for amygdala-ui

1. Move the cell rendering / heat-scale logic out of `AlarmsGridShell.tsx` into a thin local `AlarmsPivotGrid.tsx` (lives in `src/pages/alarms-grid/`).
2. That file wraps `LinkPivotGrid` and supplies: `cell` lookup over `cells()`, `cellHref` via `buildExploreHref`, `getCellHeat` driven by the existing `heatScale()` memo, `renderCell` returning the existing formatted text, `cellTitle` carrying the missing-op-time message.
3. Delete the inline `<table>`/`<thead>`/`<tbody>` block (lines 670-832 in `AlarmsGridShell.tsx`); the JSX collapses to `<AlarmsPivotGrid rows={alarmTypes()} columns={assets()} … />`.
4. The header chrome (date picker, MultiSelectFilter, sort dropdowns, display-mode toggle) stays in `AlarmsGridShell` — only the grid body migrates.
5. Visual regression: pixel-compare the alarms-grid screenshot before/after on the dev route. To preserve the current linear-ramp look, the alarms migration passes `heatRamp={(v) => v}` — this overrides PivotGrid's new sqrt default and keeps the alpha math identical. Cell padding must also be identical.

### D9. Out of scope (v1)

- **Sorting.** Caller sorts `rows` and `columns` before passing in. The grid is a renderer, not a sort engine. (BaseTable owns sort UI; PivotGrid stays minimal.)
- **Virtualization.** Real-world alarms-grid currently caps at ~30 assets × ~20 alarm types = 600 cells, well under what the browser can layout. If a future call site needs 10k+ cells, that's a v2 conversation.
- **Multi-level headers** (e.g. grouped column headers, hierarchical row labels). Defer until two consumers ask.
- **In-cell editing.** Cells are read-only / navigational. An editable pivot would be a different component.
- **Cell selection / multi-select.** Not part of v1 — would require a selection store like `SelectableTable`'s. Add if a consumer needs it.
- **Frozen non-header columns** (e.g. "freeze the first 2 data columns"). Single sticky-left header column only.

## Open questions for randall — RESOLVED 2026-05-21

1. **Heat ramp curve.** ✅ **Sqrt by default**, with a `heatRamp` prop for callers that want linear (or other curves). The alarms-grid migration passes `heatRamp={(v) => v}` to preserve pixel parity with the pre-migration look. See D5 + D2 for the prop signature.
2. **`cellHref` returning `undefined`.** ✅ **Render non-interactive.** The cell becomes plain `<td>` content with no focus ring. Consumers wanting per-cell interactivity choice should use only `onCellClick` and branch internally.
3. **Atomic extraction.** ✅ **Defer.** PivotGrid and BaseTable stay parallel base components. Revisit when BaseTable actually grows a left-sticky variant.
