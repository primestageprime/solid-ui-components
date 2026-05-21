# PivotGrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `PivotGrid` base component against the design spec at `docs/superpowers/specs/2026-05-21-pivot-grid-design.md`. Ship base component + `HeatPivotGrid` + `LinkPivotGrid` curried variants in one PR.

**Architecture:** SolidJS `<table>` primitive with `position: sticky` on top row, left column, and the top-left corner. Vanilla `Date`/`Intl.DateTimeFormat` only (no Luxon — matches the DateRangePicker convention). Heat coloring built-in via a `heatRamp` (default `Math.sqrt`) that maps 0..1 → [0.1, 0.6] alpha. Cells wrap in `<a>` when `cellHref` returns a string, else `<button>` when `onCellClick` is set, else plain `<td>` content.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library`, CSS with `--sui-*` theme tokens.

**Spec:** `docs/superpowers/specs/2026-05-21-pivot-grid-design.md` (D1–D9 + resolved open questions).

**Working directory:** `/Users/aarnold/gits/primestage/solid-ui-components`.

---

## Pre-flight

### Task 0: Baseline

- [ ] **Step 0.1: Clean tree on main**

```bash
git status
git log --oneline -3
```
Expected: clean working tree on `main`, with `10efed1 docs(specs): record PivotGrid open-question decisions` at or near HEAD.

- [ ] **Step 0.2: Confirm baseline build + tests**

```bash
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -5
```
Expected: all tests pass; client + server build cleanly. Note the test count.

- [ ] **Step 0.3: Re-read the spec**

```bash
cat docs/superpowers/specs/2026-05-21-pivot-grid-design.md
```
Specifically internalize: **D2** (API surface — the `PivotGridProps` interface), **D4** (cell interaction model — `<a>` vs `<button>` vs plain), **D5** (heat coloring math, `[0.1, 0.6]` alpha range, sqrt ramp default, `heatRamp` prop). **D8** is the eventual migration plan for amygdala-ui — read it but it's **NOT** in this PR's scope; PivotGrid only.

- [ ] **Step 0.4: Create feature branch**

```bash
git switch -c feat/pivot-grid
```

---

## Task 1: Write the failing test for the base component

**Files:**
- Create: `src/components/PivotGrid/PivotGrid.test.tsx`

This is the biggest test file. It pins every observable behavior the spec promises. Write all 14 cases up front; the implementation in Task 2 must make them all pass.

- [ ] **Step 1.1: Create directory + test file**

```bash
mkdir -p src/components/PivotGrid
```

Create `src/components/PivotGrid/PivotGrid.test.tsx`:

```tsx
import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { PivotGrid } from "./PivotGrid";

type RowId = "rA" | "rB";
type ColId = "cA" | "cB";

interface Cell {
  value: number;
}

const baseProps = {
  rows: ["rA", "rB"] as const,
  columns: ["cA", "cB"] as const,
  rowLabel: (r: RowId) => `Row ${r}`,
  colLabel: (c: ColId) => `Col ${c}`,
  cell: (r: RowId, c: ColId): Cell | null => ({ value: r.charCodeAt(1) + c.charCodeAt(1) }),
  renderCell: (cell: Cell) => <span>{cell.value}</span>,
};

describe("PivotGrid rendering", () => {
  it("renders a table with the row + column labels in thead/tbody", () => {
    const { container } = render(() => <PivotGrid {...baseProps} />);
    const table = container.querySelector("table");
    expect(table).toBeTruthy();
    // 2 columns + corner cell = 3 thead cells
    expect(container.querySelectorAll("thead th").length).toBe(3);
    // 2 rows × (1 row-header + 2 body cells) = 2 row-header + 4 body cells
    expect(container.querySelectorAll("tbody th").length).toBe(2);
    expect(container.querySelectorAll("tbody td").length).toBe(4);
  });

  it("calls colLabel + rowLabel + cell + renderCell for each axis", () => {
    const rowLabel = vi.fn((r: RowId) => `R-${r}`);
    const colLabel = vi.fn((c: ColId) => `C-${c}`);
    const cell = vi.fn((r: RowId, c: ColId): Cell | null => ({ value: 1 }));
    const renderCell = vi.fn((c: Cell) => <span>{c.value}</span>);

    render(() => (
      <PivotGrid
        {...baseProps}
        rowLabel={rowLabel}
        colLabel={colLabel}
        cell={cell}
        renderCell={renderCell}
      />
    ));

    expect(rowLabel).toHaveBeenCalledTimes(2);
    expect(colLabel).toHaveBeenCalledTimes(2);
    // 2 rows × 2 cols = 4 cell lookups
    expect(cell).toHaveBeenCalledTimes(4);
    expect(renderCell).toHaveBeenCalledTimes(4);
  });

  it("renders the emptyCell placeholder for null cells", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} cell={() => null} />
    ));
    const bodyCells = container.querySelectorAll("tbody td");
    bodyCells.forEach((td) => expect(td.textContent).toBe("—"));
  });

  it("uses a custom emptyCell when provided", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cell={() => null}
        emptyCell={<i>n/a</i>}
      />
    ));
    const bodyCells = container.querySelectorAll("tbody td");
    bodyCells.forEach((td) => expect(td.textContent).toBe("n/a"));
  });

  it("renders the cornerLabel (default empty string)", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} cornerLabel="↓ rows / cols →" />
    ));
    const corner = container.querySelector("thead th:first-child");
    expect(corner?.textContent).toBe("↓ rows / cols →");
  });
});

describe("PivotGrid interactivity", () => {
  it("wraps cells in <a> when cellHref returns a string", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={(r, c) => `/explore?row=${r}&col=${c}`}
      />
    ));
    const links = container.querySelectorAll("tbody td a");
    expect(links.length).toBe(4);
    expect(links[0]?.getAttribute("href")).toBe("/explore?row=rA&col=cA");
  });

  it("renders a non-interactive td when cellHref returns undefined for that cell", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={(r) => (r === "rA" ? "/x" : undefined)}
      />
    ));
    const rows = container.querySelectorAll("tbody tr");
    // rA row: 2 cells with <a>
    expect(rows[0]?.querySelectorAll("a").length).toBe(2);
    // rB row: 0 cells with <a>, 0 with <button>
    expect(rows[1]?.querySelectorAll("a").length).toBe(0);
    expect(rows[1]?.querySelectorAll("button").length).toBe(0);
  });

  it("wraps cells in <button> when onCellClick is set and no href", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <PivotGrid {...baseProps} onCellClick={onCellClick} />
    ));
    const buttons = container.querySelectorAll("tbody td button");
    expect(buttons.length).toBe(4);

    fireEvent.click(buttons[0]!);
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick).toHaveBeenCalledWith("rA", "cA", { value: 162 });
  });

  it("prefers cellHref over onCellClick when both are set and href returns a string", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={() => "/x"}
        onCellClick={onCellClick}
      />
    ));
    expect(container.querySelectorAll("tbody td a").length).toBe(4);
    expect(container.querySelectorAll("tbody td button").length).toBe(0);
    fireEvent.click(container.querySelector("tbody td a")!);
    // <a> default-prevented or not — onCellClick must not fire for href cells
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("renders the cellTitle as the native title attribute on interactive cells", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={() => "/x"}
        cellTitle={(r, c) => `${r}/${c}`}
      />
    ));
    const a = container.querySelector("tbody td a");
    expect(a?.getAttribute("title")).toBe("rA/cA");
  });
});

describe("PivotGrid heat coloring", () => {
  it("applies background-color when getCellHeat returns a non-null number", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 1.0} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toMatch(/background-color/);
  });

  it("does not apply background-color when getCellHeat returns null", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => null} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).not.toMatch(/background-color/);
  });

  it("uses sqrt ramp by default — heat 0.25 maps to alpha 0.35 (midway)", () => {
    // sqrt(0.25) = 0.5 → alpha = 0.1 + 0.5 * 0.5 = 0.35
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 0.25} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("0.35");
  });

  it("uses a linear ramp when heatRamp={(v) => v} is passed (heat 0.5 → alpha 0.35)", () => {
    // linear(0.5) = 0.5 → alpha = 0.1 + 0.5 * 0.5 = 0.35
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        getCellHeat={() => 0.5}
        heatRamp={(v) => v}
      />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("0.35");
  });

  it("respects the custom heatRgb prop in the rgba() string", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        getCellHeat={() => 1.0}
        heatRgb="0, 128, 255"
      />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("rgba(0, 128, 255");
  });
});

describe("PivotGrid layout modifiers", () => {
  it("adds the compact class when compact={true}", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} compact />
    ));
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toMatch(/sui-pivot-grid/);
    expect(wrapper?.className).toMatch(/sui-pivot-grid--compact/);
  });

  it("merges the consumer class with the base class", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} class="my-grid" />
    ));
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toMatch(/sui-pivot-grid/);
    expect(wrapper?.className).toMatch(/my-grid/);
  });
});
```

- [ ] **Step 1.2: Run the test and confirm it fails**

```bash
npx vitest run src/components/PivotGrid/PivotGrid.test.tsx 2>&1 | tail -15
```
Expected: FAIL — `Cannot find module './PivotGrid'`.

---

## Task 2: Implement the base component + CSS

**Files:**
- Create: `src/components/PivotGrid/PivotGrid.tsx`
- Create: `src/components/PivotGrid/PivotGrid.css`
- Create: `src/components/PivotGrid/index.ts`

- [ ] **Step 2.1: Write the implementation**

Create `src/components/PivotGrid/PivotGrid.tsx`:

```tsx
import { For, JSX, Show } from "solid-js";
import "./PivotGrid.css";

export interface PivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> {
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
  /** Optional: navigate on click. If present, the cell wraps in an `<a>`. */
  cellHref?: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
  /** Optional: imperative click handler. Ignored when `cellHref` returns a string. */
  onCellClick?: (row: RowKey, col: ColKey, cell: Cell | null) => void;
  /** Optional: continuous heat 0..1 → translucent background. Return `null` to skip. */
  getCellHeat?: (cell: Cell, row: RowKey, col: ColKey) => number | null;
  /** Optional: shape the 0..1 heat value before alpha mapping. Default `Math.sqrt`. */
  heatRamp?: (v: number) => number;
  /** Optional: hue for heat ramp. Default `var(--sui-pivot-heat-rgb, 248, 113, 113)`. */
  heatRgb?: string;
  /** Corner cell (top-left) label. Default `""`. */
  cornerLabel?: string;
  /** Rendered in body cells where `cell()` returns `null`. Default `"—"`. */
  emptyCell?: JSX.Element;
  /** Optional title (native `title` attr) for a cell. */
  cellTitle?: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
  /** Tight rows (12px padding) vs default (16px). */
  compact?: boolean;
  class?: string;
}

const HEAT_ALPHA_MIN = 0.1;
const HEAT_ALPHA_MAX = 0.6;
const DEFAULT_HEAT_RGB_VAR = "var(--sui-pivot-heat-rgb, 248, 113, 113)";

const heatBackground = (
  rampedHeat: number,
  rgb: string,
): string => {
  const alpha = HEAT_ALPHA_MIN + rampedHeat * (HEAT_ALPHA_MAX - HEAT_ALPHA_MIN);
  return `rgba(${rgb}, ${alpha})`;
};

export function PivotGrid<
  RowKey extends string,
  ColKey extends string,
  Cell,
>(props: PivotGridProps<RowKey, ColKey, Cell>): JSX.Element {
  const heatRamp = (v: number): number => (props.heatRamp ?? Math.sqrt)(v);
  const heatRgb = (): string => props.heatRgb ?? DEFAULT_HEAT_RGB_VAR;

  const wrapperClass = (): string => {
    const parts = ["sui-pivot-grid"];
    if (props.compact) parts.push("sui-pivot-grid--compact");
    if (props.class) parts.push(props.class);
    return parts.join(" ");
  };

  return (
    <div class={wrapperClass()}>
      <table class="sui-pivot-grid__table">
        <thead>
          <tr>
            <th class="sui-pivot-grid__corner">{props.cornerLabel ?? ""}</th>
            <For each={props.columns}>
              {(col) => (
                <th class="sui-pivot-grid__col-header" scope="col">
                  {props.colLabel(col)}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={props.rows}>
            {(row) => (
              <tr>
                <th class="sui-pivot-grid__row-header" scope="row">
                  {props.rowLabel(row)}
                </th>
                <For each={props.columns}>
                  {(col) => {
                    const cellValue = (): Cell | null => props.cell(row, col);
                    const href = (): string | undefined =>
                      props.cellHref?.(row, col, cellValue());
                    const title = (): string | undefined =>
                      props.cellTitle?.(row, col, cellValue());

                    const heat = (): number | null => {
                      const v = cellValue();
                      if (v === null) return null;
                      const raw = props.getCellHeat?.(v, row, col);
                      if (raw === null || raw === undefined) return null;
                      return heatRamp(raw);
                    };

                    const cellStyle = (): JSX.CSSProperties | undefined => {
                      const h = heat();
                      if (h === null) return undefined;
                      return { "background-color": heatBackground(h, heatRgb()) };
                    };

                    const renderInner = (): JSX.Element => {
                      const v = cellValue();
                      if (v === null) return props.emptyCell ?? "—";
                      return props.renderCell(v, row, col);
                    };

                    return (
                      <td class="sui-pivot-grid__cell" style={cellStyle()}>
                        <Show
                          when={href() !== undefined}
                          fallback={
                            <Show
                              when={props.onCellClick !== undefined}
                              fallback={renderInner()}
                            >
                              <button
                                type="button"
                                class="sui-pivot-grid__cell-button"
                                title={title()}
                                onClick={() =>
                                  props.onCellClick?.(row, col, cellValue())
                                }
                              >
                                {renderInner()}
                              </button>
                            </Show>
                          }
                        >
                          <a
                            class="sui-pivot-grid__cell-link"
                            href={href()}
                            title={title()}
                          >
                            {renderInner()}
                          </a>
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2.2: Write the CSS**

Create `src/components/PivotGrid/PivotGrid.css`:

```css
.sui-pivot-grid {
  overflow: auto;
  background: var(--sui-bg-primary, #0d0d0d);
  color: var(--sui-text-primary, #fff);
}

.sui-pivot-grid__table {
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
  min-width: 0;
  width: max-content;
  font-variant-numeric: tabular-nums;
}

.sui-pivot-grid__corner,
.sui-pivot-grid__col-header,
.sui-pivot-grid__row-header {
  background: var(--sui-bg-secondary, #1a1a1a);
  text-align: left;
  padding: var(--sui-space-2, 8px) var(--sui-space-3, 12px);
  border-bottom: 1px solid var(--sui-border, #2a2a2a);
  border-right: 1px solid var(--sui-border, #2a2a2a);
  white-space: nowrap;
  font-weight: 500;
}

.sui-pivot-grid__col-header {
  position: sticky;
  top: 0;
  z-index: 1;
}

.sui-pivot-grid__row-header {
  position: sticky;
  left: 0;
  z-index: 1;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sui-pivot-grid__corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 2;
}

.sui-pivot-grid__cell {
  padding: 0;
  border-bottom: 1px solid var(--sui-border, #2a2a2a);
  border-right: 1px solid var(--sui-border, #2a2a2a);
  white-space: nowrap;
  text-align: right;
}

.sui-pivot-grid__cell-link,
.sui-pivot-grid__cell-button {
  display: block;
  width: 100%;
  padding: var(--sui-space-2, 8px) var(--sui-space-3, 12px);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  text-align: right;
  background: transparent;
  border: 0;
  font: inherit;
}

.sui-pivot-grid__cell-link:hover,
.sui-pivot-grid__cell-button:hover {
  background-color: var(--sui-bg-hover, rgba(255, 255, 255, 0.04));
}

.sui-pivot-grid__cell-link:focus-visible,
.sui-pivot-grid__cell-button:focus-visible {
  outline: 2px solid var(--sui-accent, #4a9eff);
  outline-offset: -2px;
}

/* When the cell has no interactive wrapper, plain text gets the same padding */
.sui-pivot-grid__cell:not(:has(.sui-pivot-grid__cell-link)):not(:has(.sui-pivot-grid__cell-button)) {
  padding: var(--sui-space-2, 8px) var(--sui-space-3, 12px);
}

/* Compact variant — 6/8 padding instead of 8/12 */
.sui-pivot-grid--compact .sui-pivot-grid__corner,
.sui-pivot-grid--compact .sui-pivot-grid__col-header,
.sui-pivot-grid--compact .sui-pivot-grid__row-header,
.sui-pivot-grid--compact .sui-pivot-grid__cell-link,
.sui-pivot-grid--compact .sui-pivot-grid__cell-button,
.sui-pivot-grid--compact .sui-pivot-grid__cell:not(:has(.sui-pivot-grid__cell-link)):not(:has(.sui-pivot-grid__cell-button)) {
  padding: var(--sui-space-1, 6px) var(--sui-space-2, 8px);
}
```

- [ ] **Step 2.3: Create the barrel**

Create `src/components/PivotGrid/index.ts`:

```ts
export { PivotGrid } from "./PivotGrid";
export type { PivotGridProps } from "./PivotGrid";
```

- [ ] **Step 2.4: Run tests, confirm all pass**

```bash
npx vitest run src/components/PivotGrid/PivotGrid.test.tsx 2>&1 | tail -15
```
Expected: 14 tests pass. If a test fails, fix the implementation (not the test) — the test pins the spec's behavior.

Two likely failure modes:
- **`:has()` selectors** are unsupported in older runtimes. The test framework uses jsdom which may not support `:has()`. The `:has()` rule in the CSS is for visual hover/focus; the tests check class names + inline styles, not computed styles, so the test should still pass. Don't change the CSS unless the test specifically fails on it.
- **`Show` nesting** for the "href > button > plain" priority can be tricky in Solid. If the link/button test fails, double-check the inner/outer `Show` ordering — outer must guard on href, inner on click handler.

- [ ] **Step 2.5: Build clean**

```bash
npm run build 2>&1 | tail -5
```
Expected: client + server builds clean.

- [ ] **Step 2.6: Commit base component**

```bash
git add src/components/PivotGrid/PivotGrid.tsx src/components/PivotGrid/PivotGrid.css src/components/PivotGrid/PivotGrid.test.tsx src/components/PivotGrid/index.ts
git commit -m "$(cat <<'EOF'
feat(PivotGrid): base component for dual-sticky pivot tables

New SUI base component matching the spec at
`docs/superpowers/specs/2026-05-21-pivot-grid-design.md`. Renders a
real <table> with sticky-top headers, sticky-left row headers, and
a sticky top-left corner. Cells wrap in <a> when `cellHref` returns
a string, <button> when only `onCellClick` is set, plain content
otherwise (non-interactive). Heat coloring built-in via `getCellHeat`
+ sqrt ramp default + `heatRgb` token.

14 tests pin every observable behavior the spec promises:
rendering shape, callback invocation counts, emptyCell fallback,
cornerLabel, three interactivity modes + priority, cellTitle,
heat applied/skipped, sqrt ramp math, linear ramp opt-in, custom
heatRgb, compact modifier, class merging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Curried variants — HeatPivotGrid + LinkPivotGrid

**Files:**
- Create: `src/components/PivotGrid/HeatPivotGrid.tsx`
- Create: `src/components/PivotGrid/LinkPivotGrid.tsx`
- Modify: `src/components/PivotGrid/index.ts`

- [ ] **Step 3.1: Write HeatPivotGrid**

Create `src/components/PivotGrid/HeatPivotGrid.tsx`:

```tsx
import { JSX } from "solid-js";
import { PivotGrid, type PivotGridProps } from "./PivotGrid";

/**
 * Curried variant of {@link PivotGrid} with `getCellHeat` mandatory.
 * Convenience for the common "magnitude pivot with heat" case — the
 * type system enforces that the heat hook is wired up at the call site.
 */
export type HeatPivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> = Omit<PivotGridProps<RowKey, ColKey, Cell>, "getCellHeat"> & {
  getCellHeat: (cell: Cell, row: RowKey, col: ColKey) => number | null;
};

export function HeatPivotGrid<
  RowKey extends string,
  ColKey extends string,
  Cell,
>(props: HeatPivotGridProps<RowKey, ColKey, Cell>): JSX.Element {
  return <PivotGrid {...props} />;
}
```

- [ ] **Step 3.2: Write LinkPivotGrid**

Create `src/components/PivotGrid/LinkPivotGrid.tsx`:

```tsx
import { JSX } from "solid-js";
import { PivotGrid, type PivotGridProps } from "./PivotGrid";

/**
 * Curried variant of {@link PivotGrid} with `cellHref` mandatory.
 * Convenience for "every cell is a drilldown link" — type-enforces
 * the navigation contract at the call site.
 */
export type LinkPivotGridProps<
  RowKey extends string,
  ColKey extends string,
  Cell,
> = Omit<PivotGridProps<RowKey, ColKey, Cell>, "cellHref"> & {
  cellHref: (row: RowKey, col: ColKey, cell: Cell | null) => string | undefined;
};

export function LinkPivotGrid<
  RowKey extends string,
  ColKey extends string,
  Cell,
>(props: LinkPivotGridProps<RowKey, ColKey, Cell>): JSX.Element {
  return <PivotGrid {...props} />;
}
```

- [ ] **Step 3.3: Write a single test asserting each curried variant renders correctly**

Append to `src/components/PivotGrid/PivotGrid.test.tsx`:

```tsx
import { HeatPivotGrid } from "./HeatPivotGrid";
import { LinkPivotGrid } from "./LinkPivotGrid";

describe("HeatPivotGrid (curried variant)", () => {
  it("forwards props to PivotGrid and renders with heat applied", () => {
    const { container } = render(() => (
      <HeatPivotGrid {...baseProps} getCellHeat={() => 1.0} />
    ));
    expect(container.querySelector("table")).toBeTruthy();
    const td = container.querySelector("tbody td");
    expect(td?.getAttribute("style") ?? "").toMatch(/background-color/);
  });
});

describe("LinkPivotGrid (curried variant)", () => {
  it("forwards props to PivotGrid and renders cells as links", () => {
    const { container } = render(() => (
      <LinkPivotGrid {...baseProps} cellHref={() => "/x"} />
    ));
    expect(container.querySelectorAll("tbody td a").length).toBe(4);
  });
});
```

- [ ] **Step 3.4: Update the barrel**

Update `src/components/PivotGrid/index.ts`:

```ts
export { PivotGrid } from "./PivotGrid";
export type { PivotGridProps } from "./PivotGrid";
export { HeatPivotGrid } from "./HeatPivotGrid";
export type { HeatPivotGridProps } from "./HeatPivotGrid";
export { LinkPivotGrid } from "./LinkPivotGrid";
export type { LinkPivotGridProps } from "./LinkPivotGrid";
```

- [ ] **Step 3.5: Run tests, confirm 16 pass**

```bash
npx vitest run src/components/PivotGrid 2>&1 | tail -10
```
Expected: 14 + 2 = 16 tests pass.

- [ ] **Step 3.6: Commit curried variants**

```bash
git add src/components/PivotGrid/HeatPivotGrid.tsx src/components/PivotGrid/LinkPivotGrid.tsx src/components/PivotGrid/index.ts src/components/PivotGrid/PivotGrid.test.tsx
git commit -m "$(cat <<'EOF'
feat(PivotGrid): HeatPivotGrid + LinkPivotGrid curried variants

Two thin wrappers over PivotGrid that type-enforce one of the
optional hooks: HeatPivotGrid requires `getCellHeat`, LinkPivotGrid
requires `cellHref`. Convenience for the two common call-site
patterns the spec calls out (magnitude pivot with heat; drilldown
link grid). One smoke test each.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Top-level barrel + COMPONENTS.md

**Files:**
- Modify: `src/index.ts`
- Modify: `COMPONENTS.md`

- [ ] **Step 4.1: Add top-level barrel re-export**

Find `src/index.ts`. Add (in alphabetical order with the other `./components/*` exports):

```ts
export * from "./components/PivotGrid";
```

Run:
```bash
grep -n "components/PivotGrid" src/index.ts
```
Expected: one match.

- [ ] **Step 4.2: Verify the build re-exports everything**

```bash
npm run build 2>&1 | tail -5
grep -E "PivotGrid|HeatPivotGrid|LinkPivotGrid" dist/index.d.ts | head -10
```
Expected: 6+ matches in `dist/index.d.ts` (the 3 component exports + 3 type exports).

- [ ] **Step 4.3: Update COMPONENTS.md**

Find the existing pivot/table entries (`grep -n 'PivotTreemap\|BaseTable\|^## Tables' COMPONENTS.md`) and add a new entry near them. Match the existing bullet style. The entry should be a single bullet (the COMPONENTS.md is the call-site index, not a deep-dive):

```markdown
- **PivotGrid<RowKey, ColKey, Cell>** — Dense pivot of runtime-derived rows × runtime-derived columns, with two-axis sticky positioning (top header AND left column), optional clickable cells, and optional continuous heat coloring. Caller passes flat `readonly RowKey[]` + `readonly ColKey[]` arrays (caller sorts), label functions, a `cell(row, col) → Cell | null` lookup, and a `renderCell(cell, row, col) → JSX` formatter. Three optional hooks layer on top: `cellHref` (wraps cells in `<a>` for cross-route navigation), `onCellClick` (button-wrapped fallback for in-page selection), and `getCellHeat → number | null` (the grid does the 0..1 → alpha math). Heat ramp defaults to `Math.sqrt` (perceptual); pass `heatRamp={(v) => v}` for linear. Curried variants `HeatPivotGrid` (type-enforces `getCellHeat`) and `LinkPivotGrid` (type-enforces `cellHref`) ship alongside. Use for: alarm-period grids, ops metrics pivots, flag matrices — anywhere the same row × col × cell shape recurs with dynamic axes.
```

- [ ] **Step 4.4: Commit barrel + docs**

```bash
git add src/index.ts COMPONENTS.md
git commit -m "$(cat <<'EOF'
docs(PivotGrid): top-level barrel re-export + COMPONENTS entry

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Full verification

- [ ] **Step 5.1: Run the full suite**

```bash
npm test 2>&1 | tail -10
```
Expected: all tests pass, including the 16 new PivotGrid tests.

- [ ] **Step 5.2: Full build**

```bash
npm run build 2>&1 | tail -5
```
Expected: client + server build clean.

- [ ] **Step 5.3: Audit-styles (if the repo runs this)**

```bash
npm run audit:styles 2>&1 | tail -10
```
Expected: no new violations introduced by `PivotGrid.css`. (The repo has this script per `package.json`.)

---

## Task 6: Open the PR

- [ ] **Step 6.1: Push and open PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(PivotGrid): dual-sticky pivot table primitive" --body "$(cat <<'EOF'
## Summary
- New `PivotGrid<RowKey, ColKey, Cell>` base component matching the spec at `docs/superpowers/specs/2026-05-21-pivot-grid-design.md`
- Dual sticky positioning (top header + left column + top-left corner)
- Three interaction modes: `cellHref` → `<a>`, `onCellClick` → `<button>`, neither → plain `<td>`
- Optional `getCellHeat` + sqrt ramp default + custom `heatRamp` / `heatRgb` props
- `HeatPivotGrid` + `LinkPivotGrid` curried variants type-enforce the common patterns
- 16 unit tests pin every observable behavior

PR scope is the SUI primitive only. amygdala-ui's `/alarms/grid` migration is a follow-up — spec section D8 outlines the steps.

## Test plan
- [x] `npm test` passes (16 new tests)
- [x] `npm run build` (client + server) clean
- [x] Top-level barrel re-exports the 3 components + 3 type exports (verified in `dist/index.d.ts`)
- [x] COMPONENTS.md updated under Tables / DataDisplay

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Acceptance criteria

- [ ] `PivotGrid`, `HeatPivotGrid`, `LinkPivotGrid` + their `Props` types exported from `src/components/PivotGrid/` and re-exported from the top-level barrel
- [ ] 16 tests pass
- [ ] `npm run build` clean (client + server)
- [ ] COMPONENTS.md has a PivotGrid bullet near the existing table primitives
- [ ] 3 commits (base + tests; curried variants; barrel + docs); PR opened
- [ ] No new inline-style violations from `npm run audit:styles`
