# ScrubChart — fisheye chart paired with a cadence-generic DateAxis

**Date:** 2026-05-28
**Status:** Design approved; ready for implementation plan
**Affects:** `src/components/DateAxis/`, `src/components/ScrubChart/` (new), `dev/showcases/date-axis.tsx`, `dev/showcases/workshop.tsx`

## Goal

Pair the existing `DateAxis` with a chart that shares its date range and scrubbing model, so that:

- Clicking an axis cell focuses the chart on that cell.
- The focused cell occupies a fixed fraction of the chart width (default 2/3); other cells smoothly compress around it (fisheye).
- Dragging on the chart scrubs continuously; the chart cells morph and the axis scrolls in real time so the effect reads as a single connected system.
- The chart slot is arbitrary — the library doesn't pick a chart type. The first demo is a daily running-balance ("coffers") line, but any SVG drawing can plug in.

Two scale knobs let a consumer tune the geometry: how big the focused cell is, and how much the side cells are compressed.

Generalize beyond days: cells can be days, weeks, months, hours, or any caller-supplied time range. `DateAxis` is refactored to a cadence-generic primitive; a curried `DailyDateAxis` preserves the existing day-cell ergonomics for the common case.

## Architecture

A new Depth-2 composite `ScrubChart` at `src/components/ScrubChart/`. Composition top-to-bottom:

1. **Chart frame** — fixed-height `<div>` holding a user-supplied SVG via `renderChart={(ctx) => …}`. A transparent overlay `<div>` on top captures pointer events for the scrub gesture.
2. **Gutter** — 20px-tall SVG owned by ScrubChart; draws diagonal connectors between each cell's chart-side bounds (top edge) and axis-side bounds (bottom edge). `overflow:hidden` naturally clips diagonals whose chart-side endpoint is off-screen.
3. **DateAxis** — the (newly-generic) atomic. Receives the same `cells: C[]` array, the (integer) `selected` index, an `onCellClick` callback, and forwards `renderCell` / `today` / `cellWidth` from the consumer.

ScrubChart's internals:

- `src/components/ScrubChart/ScrubChart.tsx` — the composite + gesture wiring.
- `src/components/ScrubChart/ScrubChart.css` — gutter SVG styles, chart-frame chrome.
- `src/components/ScrubChart/scales.ts` — pure fisheye math (`layoutCells`, `xToCell`); generic over `C extends Cell`.
- `src/components/ScrubChart/scales.test.ts` — geometry unit tests (focus weight, normalization, inverse mapping at integer + fractional `selectedAnim`, edge cases at start/end of cells array).
- `src/components/ScrubChart/index.ts` — re-exports.

## DateAxis refactor

DateAxis has no production consumers (only its own showcase), so the existing API can be replaced rather than extended.

```ts
// src/components/DateAxis/DateAxis.tsx

export interface Cell {
  /** Inclusive start of this cell's time range. */
  start: Date;
  /** Exclusive end. */
  end: Date;
  /** Optional override label; otherwise the consumer's renderCell decides. */
  label?: string;
}

export interface DateAxisCellContext {
  /** `today` Date falls inside this cell's [start, end). */
  isToday: boolean;
  isSelected: boolean;
  index: number;
}

export interface DateAxisProps<C extends Cell = Cell> {
  cells: C[];
  selected?: number;                                       // index, not Date
  today?: Date;
  cellWidth?: number;                                      // default 40
  onCellClick?: (index: number, cell: C) => void;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;
}
```

What drops from the existing surface:

- `start` / `end` props — replaced by `cells: C[]` (generated via helpers).
- `renderDay` → `renderCell`; now required (no built-in default content).
- `isFirstOfMonth` / `isLastOfMonth` on the context — month-edge detection is day-specific; consumers who care derive it from `cell.start.getUTCDate() === 1`.

What stays:

- Horizontal scroll container + `today` highlighting.
- Selected-cell highlight + click semantics — now keyed by integer index.
- `cellWidth` override + the `createDateAxis` curry factory.

**New behaviour:** when `selected` is set (or changes), DateAxis scrolls smoothly so the selected cell sits at the centre of its viewport. No new prop; on whenever `selected` is provided. Skipped while the user is actively scrolling manually (scroll-delta check).

### Cell-generation helpers

Pure functions exported from `src/components/DateAxis/cells.ts`:

```ts
export const dailyCells   : (start: Date, end: Date) => Cell[];
export const weeklyCells  : (start: Date, end: Date, weekStart?: 0 | 1 /* Sun=0, Mon=1 */) => Cell[];
export const monthlyCells : (start: Date, end: Date) => Cell[];
export const hourlyCells  : (start: Date, end: Date) => Cell[];
```

Each returns cells whose `[start, end)` cover the requested range, anchored to UTC. `eachDayOfRange` and `isSameCalendarDay` (currently exported from DateAxis) move into this module as implementation helpers and become non-public.

### `DailyDateAxis` — curried day-cell variant

Restores the original DateAxis ergonomics on top of the generic surface:

```ts
export interface DateAxisDayContext {
  isToday: boolean;
  isSelected: boolean;
  isFirstOfMonth: boolean;
  isLastOfMonth: boolean;
  index: number;
}

export interface DailyDateAxisProps {
  start: Date;
  end: Date;
  today?: Date;
  selected?: Date;
  cellWidth?: number;
  onDayClick?: (day: Date) => void;
  renderDay?: (day: Date, ctx: DateAxisDayContext) => JSX.Element;
}

export const DailyDateAxis: Component<DailyDateAxisProps>;
```

Internally:

- Generates cells via `dailyCells(start, end)`.
- Translates `selected: Date` → integer index via UTC day-key match.
- Translates `onCellClick(idx, cell)` → `onDayClick(cell.start)`.
- Computes `isFirstOfMonth` / `isLastOfMonth` from `cell.start` and supplies the day-flavored context.
- Uses an exported `dayCellContent(day, ctx)` render as the default when `renderDay` isn't supplied — the same "month label + day number + today pip" rendering that ships today.

The existing DateAxis showcase rewires to use `DailyDateAxis` for the default ribbon examples and to the new generic `DateAxis` with `dailyCells(...)` for the heatmap example, demonstrating both surfaces.

## ScrubChart public API

```ts
// src/components/ScrubChart/ScrubChart.tsx

export interface ScrubChartContext<C extends Cell> {
  /** Center x in chart pixels for the cell at `index`. */
  cellToX(index: number): number;
  /** [leftX, rightX] in chart pixels — may extend outside [0, width]. */
  cellBounds(index: number): [number, number];
  /** Selected cell's index. */
  selected: number;
  /** Full cell array, for iteration + payload access. */
  cells: C[];
  /** Indices of cells whose bounds intersect [0, width]. */
  visibleCells: number[];
  width: number;
  height: number;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  selected: number;                            // index into cells (controlled)
  onScrub: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;

  // ── Geometry knobs ──
  /** Fraction of chart pixel width the focused cell occupies. Default 2/3. */
  selectedFraction?: number;
  /** Focused cell is this many times wider than each side cell. Default 28. */
  sideCompression?: number;

  // ── Layout ──
  chartHeight?: number;                        // default 200
  gutterHeight?: number;                       // default 20

  // ── Forwarded to inner DateAxis ──
  cellWidth?: number;                          // default 40
  renderCell: DateAxisProps<C>["renderCell"];  // required (no fallback at this layer)
  today?: Date;
}
```

`sideWindow` (cells per side) is derived: `floor((1 − selectedFraction) × sideCompression / (2 × selectedFraction))`. Defaults give 7 cells per side, 15 total visible.

The consumer attaches payload to each cell via `C extends Cell`. Inside `renderChart`, they iterate `ctx.cells` or `ctx.visibleCells` and read both layout (`cellToX(i)`, `cellBounds(i)`) and data (`ctx.cells[i].myField`).

## Fisheye geometry — continuous

ScrubChart owns an internal signal `selectedAnim: number`, which may be fractional. All layout reads from this — not from `props.selected` directly.

For each cell index `i`:

```
focusWeight(i) = max(0, 1 − |i − selectedAnim|)
rawWidth(i)    = sideWidth + (focusedWidth − sideWidth) × focusWeight(i)
```

where `focusedWidth = chartWidth × selectedFraction` and `sideWidth = focusedWidth / sideCompression`.

Widths are normalised so the sum of `rawWidth(i)` across the **active window** equals chart width — eliminates fractional-step wobble. The active window is the contiguous range of cells `[floor(selectedAnim) − sideWindow, ceil(selectedAnim) + sideWindow]` clamped to `[0, cells.length − 1]` (so the window covers one extra cell on the side `selectedAnim` is straddling toward). `cellBounds(i)` for indices inside the active window cumulates the normalised left edges, anchored so the focused cell's centre sits at `chartWidth / 2` when `selectedAnim` is integer. For indices outside the active window, `cellBounds(i)` extrapolates linearly at `sideWidth` pitch — those bounds are far off-canvas and their connectors are naturally clipped.

At rest with `selectedAnim` integer, the layout matches the static mockup exactly. Halfway between two integers, cells `floor` and `ceil` are equal-width neighbours.

## Scrub gesture — pointer-anchored, layout-stable

To avoid the feedback loop between pointer position and a morphing layout:

1. **pointerdown** at `x0` over the chart:
   - Record `selectedAtStart = selectedAnim` and snapshot the current `cellBounds` layout into `startLayout`.
   - The pointer "anchors" to a virtual cell position derived from `startLayout`.
2. **pointermove** at `x`:
   - Map `x` to a fractional cell index via `xToCell(x, startLayout)` — using the frozen start layout, not the live one.
   - `selectedAnim = clamp(selectedAtStart + (cellAtNow − cellAtStart), 0, cells.length − 1)`.
   - The chart re-renders with the morphed fisheye; the gesture's pointer-to-cell mapping does NOT change.
   - Use `Element.setPointerCapture(pointerId)` on the chart overlay at pointerdown so pointer events keep firing even when the pointer leaves the overlay element. Release the capture at pointerup / pointercancel.
3. **pointerup**:
   - `commitIndex = round(selectedAnim)`. Snap `selectedAnim ← commitIndex`.
   - Fire `onScrub(commitIndex, cells[commitIndex])`. The parent updates `props.selected`; ScrubChart's effect on `props.selected` sees no diff (already equal) and stays put.

A bare click (down + up without movement) commits immediately at the cell under the pointer.

Pointer leaving the chart overlay or the window cancels the gesture cleanly: the next `pointerup` (or `pointercancel`) snaps to whatever `selectedAnim` was at that moment.

## Programmatic / axis-driven selection — tween

When `props.selected` changes from a source other than the active gesture (axis click, parent state update), tween `selectedAnim` from its current value to the new integer over ~250ms with ease-out. Same morph, different driver.

Implementation: a hand-rolled `requestAnimationFrame` loop inside an `onCleanup`-guarded effect. The tween target is a single scalar (`selectedAnim`); no animation library dependency required.

## Axis scroll, continuous

DateAxis's scroll container scroll position is driven by `selectedAnim`:

```
target = (selectedAnim × cellWidth + cellWidth/2) − viewportWidth/2
```

Applied imperatively each frame while the chart's `selectedAnim` is changing (gesture or tween). On a static `selectedAnim`, no scroll updates fire.

Skip programmatic scroll while the user is actively scrolling manually — detect via a recent-scroll-delta check on the scroll container.

## Connectors

In the gutter SVG, for each cell index `i`:

- `axL = i × cellWidth`, `axR = (i + 1) × cellWidth` (axis-side, fixed regardless of `selectedAnim`).
- `[chL, chR] = cellBounds(i)` (chart-side, morphs with `selectedAnim`).
- Draw two lines per cell: `(chL, 0) → (axL, gutterHeight)` and `(chR, 0) → (axR, gutterHeight)`.

Diagonals for cells whose chart-side bounds fall outside `[0, chartWidth]` still render — they exit through the gutter's vertical edges, naturally clipped by the SVG's `overflow:hidden`.

The selected cell's two diagonals render in the accent colour; all others in a muted grey. Both colours via theme tokens.

The axis-side x positions assume axis cells stay at fixed `cellWidth` (they do — only the chart side morphs). The chart and gutter live OUTSIDE the axis's scroll container; the axis-side x for cell `i` is therefore `(i × cellWidth + edge) − axisScrollLeft`, recomputed reactively from the axis's scroll position. This keeps the chart's x-coordinate space stable (chart never scrolls) and lets the axis scroll independently underneath, with the gutter diagonals tracking the axis cells smoothly as they slide.

## Cashflow demo

Lives in the workshop showcase, not as a standalone library component. Uses the existing daily `cashflowAt(i)` stub from the current DateAxis showcase as data source.

```ts
type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

const RANGE_START   = new Date("2026-05-01");
const RANGE_END     = new Date("2026-09-30");
const PINNED_TODAY  = new Date("2026-05-28");

const cells: CashflowCell[] = (() => {
  let running = 0;
  return dailyCells(RANGE_START, RANGE_END).map((cell, i) => {
    const cashflowCents = cashflowAt(i);     // existing deterministic stub
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
})();
```

`renderCell` reuses the existing cashflow day-cell renderer (date corner + diverging green/red bar + dollar amount) lifted out of the current DateAxis showcase into `dev/showcases/cashflow-day-cell.tsx` so the workshop and the date-axis showcase can both reference it.

`renderChart` draws a pure SVG with:

- Zero line + a few y-axis dollar labels (`$80k` / `$0` / `−$80k` style, derived from `balanceCents` range).
- A `<polyline>` through the running balance at each visible cell's centre — `points` is a memo over `ctx.visibleCells.map(i => `${ctx.cellToX(i)},${balanceToY(...)}`)`.
- Per-cell dots; the selected cell's dot is larger (`r=5`) and accent-coloured.
- A translucent column overlay covering the selected cell's `cellBounds` to visually emphasize the focus.

No library components inside the chart SVG — the slot is plain JSX/SVG to demonstrate that the chart can be anything.

## Workshop layout

`dev/showcases/workshop.tsx` becomes a single full-width section:

- Title + 2–3 line description ("DateAxis paired with a fisheye chart…").
- The `ScrubChart` instance.
- Below the chart: a one-line stats readout for the selected cell — formatted date + running balance + that day's cashflow delta.
- Below stats: two range inputs labeled "Selected fraction" (0.4 → 0.9, step 0.01, default 0.667) and "Side compression" (4 → 60, step 1, default 28). Wired to local signals fed into `selectedFraction` / `sideCompression` so the geometry can be tuned by hand for tuning the defaults.

## Edge cases

- **Selected near the start of `cells`** — fewer than `sideWindow` cells exist on the left. The fisheye layout still works (focusWeight=0 for non-existent cells contributes nothing); the visible window asymmetrically extends further right. Diagonals on the left side trail off into empty axis space.
- **Selected near the end** — symmetric to the above.
- **`selected` out of range** — defensive clamp at the ScrubChart boundary into `[0, cells.length − 1]`. Dev-mode `console.warn` if a caller passes a value out of range.
- **`cells.length` shorter than the visible window** — focused cell still gets `selectedFraction` of the chart; the remaining width simply isn't filled (or fills proportionally — choice deferred to implementation, pick whichever looks better in practice).
- **`cells.length === 0`** — chart renders empty, axis renders empty. No crash; `selected` is ignored.
- **Pointer leaves chart mid-gesture** — `pointerup` (or `pointercancel`) anywhere commits the current `selectedAnim`. Pointer Events API's pointer-capture is appropriate here.
- **Empty / single-cell case in `renderChart`** — the consumer's `ctx.visibleCells` is `[]` or `[0]`; their drawing must handle this. Documented.
- **Knob values that yield `sideWindow < 1`** — e.g. `selectedFraction=0.95` + `sideCompression=4` (focused cell already wider than the entire side budget). Clamp `sideWindow` to 0 in this case: the focused cell expands to fill the chart entirely, no side cells visible. Document this in the prop tsdoc so consumers understand the interaction.
- **Resize while gesturing** — `chartWidth` measured via ResizeObserver; if it changes mid-gesture, recompute `startLayout` at the new width and shift the anchor proportionally so the pointer stays over the same virtual cell.

## Out of scope (for v1)

- Multiple selected cells / range selection. Single-cell focus only.
- Variable-rate fall-off curves (Gaussian, bezier). Only the uniform "focused vs. side" two-width model.
- Keyboard scrub on the chart (arrow keys to advance `selected`). Axis already supports Enter/Space activation on the focused cell.
- Touch-pinch / wheel-zoom on the chart. Future enhancement.
- A second curried `ScrubChart` variant with `selectedFraction` and `sideCompression` baked in. The bare `ScrubChart` already has sensible defaults; a `createScrubChart` factory can be added when a second use case materialises.
- Server-side rendering of the morphed layout. Initial paint uses `selectedAnim = props.selected` (integer), then ResizeObserver kicks in client-side.

## Open questions / deferred decisions

- **Behaviour when `cells.length` is shorter than the visible window** — focused cell still claims `selectedFraction` of width; the remaining side budget either stays empty (visible gap) or rescales proportionally so the few existing side cells fill the budget. Pick during implementation based on which reads better visually. Either choice is a one-line change.
