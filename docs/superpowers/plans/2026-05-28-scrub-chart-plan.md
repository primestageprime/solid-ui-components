# ScrubChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Depth-2 composite `ScrubChart` that pairs a (newly-generic) `DateAxis` with a user-supplied fisheye chart, allowing live continuous scrubbing where the focused cell smoothly morphs to 2/3 of chart width.

**Architecture:** Refactor `DateAxis` to be cadence-generic (cells: `Cell[]`, where `Cell = { start: Date; end: Date }`); preserve day-cell ergonomics via a curried `DailyDateAxis`. Build `ScrubChart` on top with two scale knobs (`selectedFraction`, `sideCompression`), continuous fractional `selectedAnim`, pointer-anchored scrub gesture, and `requestAnimationFrame`-driven tweens.

**Tech Stack:** SolidJS, TypeScript, Vitest, @solidjs/testing-library, plain CSS with `--sui-*` theme tokens.

**Reference spec:** `docs/superpowers/specs/2026-05-28-scrub-chart-design.md` — read this first.

---

## File Structure

**New files:**
- `src/components/DateAxis/cells.ts` — cadence helpers (`dailyCells`, `weeklyCells`, `monthlyCells`, `hourlyCells`) + `dayKey` / `isSameCalendarDay` (moved here from DateAxis.tsx).
- `src/components/DateAxis/cells.test.ts` — unit tests for the cadence helpers.
- `src/components/DateAxis/DailyDateAxis.tsx` — curried day-cell variant that bakes the original ergonomics on top of the new generic DateAxis.
- `src/components/DateAxis/DailyDateAxis.test.tsx` — tests for the curried variant.
- `src/components/DateAxis/dayCellContent.tsx` — exported default cell-content render fn for day cells ("month label + day number + today pip"). Reusable by `DailyDateAxis` and consumers using bare `DateAxis` with `dailyCells`.
- `src/components/ScrubChart/scales.ts` — pure fisheye math: `layoutCells`, `xToCell`.
- `src/components/ScrubChart/scales.test.ts` — unit tests for the math.
- `src/components/ScrubChart/ScrubChart.tsx` — the composite.
- `src/components/ScrubChart/ScrubChart.css` — gutter SVG styling + chart-frame chrome.
- `src/components/ScrubChart/ScrubChart.test.tsx` — component integration tests.
- `src/components/ScrubChart/index.ts` — re-exports.
- `dev/showcases/cashflow-day-cell.tsx` — extracted cashflow-flavoured cell renderer (date corner + diverging bar + dollar amount). Shared by `dev/showcases/date-axis.tsx` and the workshop.

**Modified files:**
- `src/components/DateAxis/DateAxis.tsx` — rewritten to be generic over `C extends Cell`. Drops `start`/`end`/`renderDay`/`isFirstOfMonth`/`isLastOfMonth`; takes `cells: C[]`, `selected?: number`, `onCellClick?`, required `renderCell`. Adds scroll-to-selected behaviour. Exposes a `scrollableRef` callback prop so `ScrubChart` can subscribe to the axis's scroll position.
- `src/components/DateAxis/index.ts` — re-exports the new API surface plus the cadence helpers, `DailyDateAxis`, and `dayCellContent`.
- `src/components/DateAxis/DateAxis.test.tsx` — rewritten to test the new cell-based API.
- `src/components/DateAxis/DateAxis.css` — no class renames needed (already uses `sui-date-axis__cell`); add a `--selected-anim` modifier for the integer-driven highlight if needed during implementation (likely no change).
- `src/index.ts` — `export * from "./components/ScrubChart";`.
- `dev/showcases/date-axis.tsx` — rewires to the new DateAxis surface (uses `DailyDateAxis` for the passive/clickable ribbons and bare `DateAxis` + `dailyCells` + cashflow cell renderer for the custom-cell example).
- `dev/showcases/workshop.tsx` — replaces the empty workshop with the ScrubChart + cashflow demo, including the two geometry sliders.
- `COMPONENTS.md` — adds a `ScrubChart` section plus a `DailyDateAxis` entry under the existing DateAxis section. Updates the DateAxis surface description to reflect the cadence-generic API.

**Commands the engineer will use:**
- Run tests: `npm test` (vitest run, single shot) or `npx vitest <pattern>` for one suite.
- Run dev server: `npm run dev` (Vite on port 6006). Workshop is the default route.
- Typecheck: `npx tsc --noEmit -p tsconfig.json`.

---

## Phase A — Cadence-generic DateAxis

### Task A1: Cell type + cadence helpers

**Files:**
- Create: `src/components/DateAxis/cells.ts`
- Test: `src/components/DateAxis/cells.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/DateAxis/cells.test.ts
import { describe, it, expect } from "vitest";
import {
  type Cell,
  dailyCells,
  weeklyCells,
  monthlyCells,
  hourlyCells,
  isSameCalendarDay,
} from "./cells";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("dailyCells", () => {
  it("returns one cell per calendar day, inclusive of both endpoints", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    expect(cells).toHaveLength(5);
  });

  it("yields UTC-midnight starts and exclusive-next-midnight ends", () => {
    const [first] = dailyCells(d("2026-05-01"), d("2026-05-01"));
    expect(first.start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(first.end.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("returns empty when start > end", () => {
    expect(dailyCells(d("2026-05-05"), d("2026-05-01"))).toEqual([]);
  });
});

describe("weeklyCells", () => {
  it("anchors to Monday-starts by default and spans full weeks containing the range", () => {
    // 2026-05-01 is a Friday. Mon-start week containing it = 2026-04-27.
    const cells = weeklyCells(d("2026-05-01"), d("2026-05-15"));
    expect(cells[0].start.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-04T00:00:00.000Z");
    expect(cells.at(-1)!.end.toISOString()).toBe("2026-05-18T00:00:00.000Z");
  });

  it("anchors to Sunday-starts when weekStart=0", () => {
    const cells = weeklyCells(d("2026-05-01"), d("2026-05-01"), 0);
    expect(cells[0].start.getUTCDay()).toBe(0);
  });
});

describe("monthlyCells", () => {
  it("returns one cell per month covered, anchored to the 1st", () => {
    const cells = monthlyCells(d("2026-04-15"), d("2026-06-10"));
    expect(cells).toHaveLength(3);
    expect(cells[0].start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(cells[2].end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("hourlyCells", () => {
  it("returns one cell per UTC hour covered, inclusive of both endpoints", () => {
    const cells = hourlyCells(
      new Date("2026-05-01T10:30:00.000Z"),
      new Date("2026-05-01T13:15:00.000Z"),
    );
    // 10:00, 11:00, 12:00, 13:00 = 4 hours
    expect(cells).toHaveLength(4);
    expect(cells[0].start.toISOString()).toBe("2026-05-01T10:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-01T11:00:00.000Z");
  });
});

describe("isSameCalendarDay", () => {
  it("compares in UTC", () => {
    expect(
      isSameCalendarDay(
        new Date("2026-05-27T01:00:00.000Z"),
        new Date("2026-05-27T23:00:00.000Z"),
      ),
    ).toBe(true);
    expect(isSameCalendarDay(d("2026-05-27"), d("2026-05-28"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest src/components/DateAxis/cells.test.ts`
Expected: FAIL — module `./cells` does not exist.

- [ ] **Step 3: Implement the helpers**

```ts
// src/components/DateAxis/cells.ts

/**
 * A single time bucket in a cadence-generic axis: anchored at `start` (inclusive)
 * and ending at `end` (exclusive). All cell helpers ship cells in UTC so day-,
 * week-, and month-keying stay consistent regardless of the host timezone.
 */
export interface Cell {
  start: Date;
  end: Date;
  label?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** UTC-midnight timestamp for `d`. Used internally for day-keying. */
const dayKey = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** True when `a` and `b` fall on the same UTC calendar day. */
export const isSameCalendarDay = (a: Date, b: Date): boolean =>
  dayKey(a) === dayKey(b);

/**
 * One cell per calendar day from `start` to `end` (inclusive). Each cell spans
 * [UTC midnight, next UTC midnight). Returns empty when `start > end`.
 */
export const dailyCells = (start: Date, end: Date): Cell[] => {
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  if (startKey > endKey) return [];
  const count = Math.round((endKey - startKey) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, i) => {
    const left = startKey + i * DAY_MS;
    return { start: new Date(left), end: new Date(left + DAY_MS) };
  });
};

/**
 * One cell per ISO week containing the range. `weekStart` selects the anchor:
 * 1 (default) = Monday; 0 = Sunday.
 */
export const weeklyCells = (
  start: Date,
  end: Date,
  weekStart: 0 | 1 = 1,
): Cell[] => {
  if (dayKey(start) > dayKey(end)) return [];
  // Roll `start` back to the previous week-anchor.
  const dow = start.getUTCDay(); // 0 = Sun
  const back = (dow - weekStart + 7) % 7;
  const firstAnchor = dayKey(start) - back * DAY_MS;
  const lastDay = dayKey(end);
  const cells: Cell[] = [];
  for (let left = firstAnchor; left <= lastDay; left += 7 * DAY_MS) {
    cells.push({ start: new Date(left), end: new Date(left + 7 * DAY_MS) });
  }
  return cells;
};

/** One cell per calendar month covered by the range, anchored to the 1st (UTC). */
export const monthlyCells = (start: Date, end: Date): Cell[] => {
  if (dayKey(start) > dayKey(end)) return [];
  const cells: Cell[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    const left = Date.UTC(y, m, 1);
    const right = Date.UTC(y, m + 1, 1);
    cells.push({ start: new Date(left), end: new Date(right) });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return cells;
};

/** One cell per UTC hour covered by the range (inclusive of both endpoints). */
export const hourlyCells = (start: Date, end: Date): Cell[] => {
  const startKey = Math.floor(start.getTime() / HOUR_MS) * HOUR_MS;
  const endKey = Math.floor(end.getTime() / HOUR_MS) * HOUR_MS;
  if (startKey > endKey) return [];
  const count = Math.round((endKey - startKey) / HOUR_MS) + 1;
  return Array.from({ length: count }, (_, i) => {
    const left = startKey + i * HOUR_MS;
    return { start: new Date(left), end: new Date(left + HOUR_MS) };
  });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest src/components/DateAxis/cells.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/DateAxis/cells.ts src/components/DateAxis/cells.test.ts
git commit -m "feat(DateAxis): add cadence helpers (daily/weekly/monthly/hourly) + Cell type"
```

---

### Task A2: Refactor DateAxis to be cell-based

**Files:**
- Modify: `src/components/DateAxis/DateAxis.tsx` (full rewrite)
- Modify: `src/components/DateAxis/DateAxis.test.tsx` (full rewrite)
- Modify: `src/components/DateAxis/index.ts`

- [ ] **Step 1: Rewrite the test file against the new API**

```tsx
// src/components/DateAxis/DateAxis.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateAxis } from "./DateAxis";
import { dailyCells, type Cell } from "./cells";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const noopRender = (cell: Cell) => <span>{cell.start.getUTCDate()}</span>;

describe("DateAxis rendering", () => {
  it("renders one cell per item in `cells`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-07"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    expect(container.querySelectorAll(".sui-date-axis__cell")).toHaveLength(7);
  });

  it("marks the cell whose [start, end) contains `today`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    const todayCells = container.querySelectorAll(".sui-date-axis__cell--today");
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].getAttribute("aria-current")).toBe("date");
  });

  it("provides the right cell context to renderCell", () => {
    const seen: { index: number; isToday: boolean; isSelected: boolean }[] = [];
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    render(() => (
      <DateAxis
        cells={cells}
        today={d("2026-05-02")}
        selected={2}
        renderCell={(_cell, ctx) => {
          seen.push({ index: ctx.index, isToday: ctx.isToday, isSelected: ctx.isSelected });
          return <span />;
        }}
      />
    ));
    expect(seen).toEqual([
      { index: 0, isToday: false, isSelected: false },
      { index: 1, isToday: true, isSelected: false },
      { index: 2, isToday: false, isSelected: true },
    ]);
  });
});

describe("DateAxis interactivity", () => {
  it("is passive (columnheader, not focusable) when onCellClick is omitted", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis cells={cells} renderCell={noopRender} />
    ));
    const cell = container.querySelector(".sui-date-axis__cell")!;
    expect(cell.getAttribute("role")).toBe("columnheader");
    expect(cell.getAttribute("tabindex")).toBeNull();
  });

  it("fires onCellClick with index and cell on click and on Enter / Space", () => {
    const onCellClick = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis cells={cells} renderCell={noopRender} onCellClick={onCellClick} />
    ));
    const firstCell = container.querySelector(".sui-date-axis__cell")!;
    fireEvent.click(firstCell);
    fireEvent.keyDown(firstCell, { key: "Enter" });
    fireEvent.keyDown(firstCell, { key: " " });
    expect(onCellClick).toHaveBeenCalledTimes(3);
    expect(onCellClick.mock.calls[0][0]).toBe(0);
    expect(onCellClick.mock.calls[0][1]).toBe(cells[0]);
  });

  it("marks the selected cell with the --selected modifier", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} selected={3} renderCell={noopRender} />
    ));
    const selected = container.querySelectorAll(".sui-date-axis__cell--selected");
    expect(selected).toHaveLength(1);
    expect(Array.from(container.querySelectorAll(".sui-date-axis__cell")).indexOf(selected[0])).toBe(3);
  });
});

describe("DateAxis with payload-carrying cells", () => {
  it("preserves consumer-attached cell properties through renderCell", () => {
    type Tagged = Cell & { tag: string };
    const cells: Tagged[] = dailyCells(d("2026-05-01"), d("2026-05-03")).map((c, i) => ({
      ...c,
      tag: `t${i}`,
    }));
    const tags: string[] = [];
    render(() => (
      <DateAxis<Tagged>
        cells={cells}
        renderCell={(cell) => {
          tags.push(cell.tag);
          return <span>{cell.tag}</span>;
        }}
      />
    ));
    expect(tags).toEqual(["t0", "t1", "t2"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest src/components/DateAxis/DateAxis.test.tsx`
Expected: FAIL — type errors and missing imports (the new API doesn't exist yet).

- [ ] **Step 3: Rewrite `DateAxis.tsx` against the new API**

```tsx
// src/components/DateAxis/DateAxis.tsx
// ============================================
// DateAxis — Atomic (Depth 1).
// Cadence-generic horizontal cell ribbon. One cell per item in `cells`;
// caller supplies a `renderCell` function that draws each cell's content.
//
// Use the helpers in ./cells (dailyCells, weeklyCells, monthlyCells, hourlyCells)
// to generate `Cell[]` for common cadences. For the original day-cell
// ergonomics, prefer the curried `DailyDateAxis` from ./DailyDateAxis.
// ============================================

import { Component, For, JSX, mergeProps, onCleanup, onMount, createEffect } from "solid-js";
import "./DateAxis.css";
import type { Cell } from "./cells";

export type { Cell } from "./cells";

export interface DateAxisCellContext {
  /** `today` Date falls within this cell's [start, end). */
  isToday: boolean;
  /** This cell is the selected one. */
  isSelected: boolean;
  /** Zero-based position in `cells`. */
  index: number;
}

export interface DateAxisProps<C extends Cell = Cell> {
  /** The cells to render, left to right. Generate via the helpers in ./cells. */
  cells: C[];
  /**
   * Index of the selected cell. When provided, the axis scrolls smoothly so
   * the selected cell sits at the centre of the viewport (unless the user is
   * actively panning manually).
   */
  selected?: number;
  /** A Date used to compute the today highlight. The cell whose [start, end) contains it gets marked. */
  today?: Date;
  /** Width in pixels of each default cell. Default 40. Ignored when `renderCell` returns a self-sized element. */
  cellWidth?: number;
  /** Called when a cell is clicked or activated via Enter / Space. */
  onCellClick?: (index: number, cell: C) => void;
  /** Required cell content renderer. */
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;
  /**
   * Callback receiving the scroll container element on mount. Used by ScrubChart
   * to subscribe to scroll position; consumers that don't need this can omit it.
   */
  scrollableRef?: (el: HTMLDivElement) => void;
}

/** True when `t` falls within `cell`'s [start, end). */
const cellContainsTime = (cell: Cell, t: Date): boolean =>
  t.getTime() >= cell.start.getTime() && t.getTime() < cell.end.getTime();

export const DateAxis = <C extends Cell = Cell>(props: DateAxisProps<C>): JSX.Element => {
  const cellW = () => props.cellWidth ?? 40;
  const clickable = () => props.onCellClick !== undefined;
  let scrollEl: HTMLDivElement | undefined;
  // Tracks the timestamp of the most recent user-initiated scroll so we can
  // suppress programmatic scroll-into-view when the user is actively panning.
  let lastUserScrollAt = 0;

  onMount(() => {
    if (scrollEl) props.scrollableRef?.(scrollEl);
  });

  // Programmatic scroll-into-view on selected change.
  createEffect(() => {
    const idx = props.selected;
    if (idx === undefined || idx < 0 || idx >= props.cells.length) return;
    const el = scrollEl;
    if (!el) return;
    if (Date.now() - lastUserScrollAt < 250) return; // user is panning — leave them alone
    const cellLeft = idx * cellW();
    const target = cellLeft + cellW() / 2 - el.clientWidth / 2;
    el.scrollTo({ left: target, behavior: "smooth" });
  });

  const onScrollListener = () => {
    lastUserScrollAt = Date.now();
  };

  return (
    <div
      class="sui-date-axis"
      style={{ "--sui-date-axis-cell-width": `${cellW()}px` }}
      role="row"
      aria-label="Date axis"
      ref={(el) => {
        scrollEl = el;
        el.addEventListener("scroll", onScrollListener, { passive: true });
        onCleanup(() => el.removeEventListener("scroll", onScrollListener));
      }}
    >
      <div class="sui-date-axis__track">
        <For each={props.cells}>
          {(cell, idx) => {
            const isToday = () =>
              props.today !== undefined && cellContainsTime(cell, props.today);
            const isSelected = () => props.selected === idx();
            const ctx = (): DateAxisCellContext => ({
              isToday: isToday(),
              isSelected: isSelected(),
              index: idx(),
            });
            const activate = () => props.onCellClick?.(idx(), cell);

            return (
              <div
                class={[
                  "sui-date-axis__cell",
                  "sui-date-axis__cell--custom",
                  isToday() ? "sui-date-axis__cell--today" : "",
                  isSelected() ? "sui-date-axis__cell--selected" : "",
                  clickable() ? "sui-date-axis__cell--clickable" : "",
                ].filter(Boolean).join(" ")}
                role={clickable() ? "button" : "columnheader"}
                tabindex={clickable() ? 0 : undefined}
                aria-current={isToday() ? "date" : undefined}
                aria-pressed={clickable() ? isSelected() : undefined}
                onClick={clickable() ? activate : undefined}
                onKeyDown={
                  clickable()
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          activate();
                        }
                      }
                    : undefined
                }
              >
                {props.renderCell(cell, ctx())}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

// ── Curry factory ──────────────────────────────────────────────────────

export type DateAxisOverrides<C extends Cell> = Pick<DateAxisProps<C>, "cellWidth">;
export type DateAxisDataProps<C extends Cell> = Omit<DateAxisProps<C>, keyof DateAxisOverrides<C>>;

export function createDateAxis<C extends Cell = Cell>(
  defaults: Partial<Omit<DateAxisProps<C>, "children">>,
): Component<DateAxisDataProps<C>> {
  return (props) => <DateAxis {...(mergeProps(defaults, props) as DateAxisProps<C>)} />;
}
```

Note: The unconditional `--custom` class is intentional. The original `DateAxis` only added this when a `renderDay` was supplied; the new API always delegates to `renderCell`, so every cell is "custom" by definition. The default border/padding rules in `DateAxis.css` already handle this via `.sui-date-axis__cell--custom`.

- [ ] **Step 4: Update `src/components/DateAxis/index.ts` to re-export the new surface**

```ts
// src/components/DateAxis/index.ts
export { DateAxis, createDateAxis } from "./DateAxis";
export type {
  DateAxisProps,
  DateAxisOverrides,
  DateAxisDataProps,
  DateAxisCellContext,
} from "./DateAxis";
export type { Cell } from "./cells";
export {
  dailyCells,
  weeklyCells,
  monthlyCells,
  hourlyCells,
  isSameCalendarDay,
} from "./cells";
```

- [ ] **Step 5: Run the DateAxis tests to verify they pass**

Run: `npx vitest src/components/DateAxis`
Expected: PASS — all tests in DateAxis.test.tsx and cells.test.ts are green.

- [ ] **Step 6: Run a full typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Type errors in `dev/showcases/date-axis.tsx` (uses the old `start`/`end`/`renderDay` API). These are fixed in Task A4. No other errors elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/components/DateAxis/DateAxis.tsx src/components/DateAxis/DateAxis.test.tsx src/components/DateAxis/index.ts
git commit -m "refactor(DateAxis)!: make cadence-generic; cells: Cell[] + renderCell required

Breaking: DateAxis now takes cells: C[] instead of start/end. The old
renderDay/isFirstOfMonth/isLastOfMonth surface is replaced by renderCell with
a smaller DateAxisCellContext. Day-cell ergonomics are restored via the
forthcoming DailyDateAxis curried variant (Task A4). Showcase + downstream
consumers updated in follow-up tasks."
```

---

### Task A3: Add `dayCellContent` default renderer

**Files:**
- Create: `src/components/DateAxis/dayCellContent.tsx`

This is the "month label + day number + today pip" rendering the original DateAxis baked in as a default. Now it's an exported function so consumers (including the upcoming `DailyDateAxis`) can pass it explicitly into the generic `DateAxis`.

- [ ] **Step 1: Implement `dayCellContent`**

```tsx
// src/components/DateAxis/dayCellContent.tsx
import type { JSX } from "solid-js";
import type { Cell } from "./cells";

/** Per-cell context for the day-flavored renderer. */
export interface DayCellContext {
  isToday: boolean;
  isSelected: boolean;
  isFirstOfMonth: boolean;
  isLastOfMonth: boolean;
  index: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const isFirstOfMonth = (d: Date): boolean => d.getUTCDate() === 1;

const isLastOfMonth = (d: Date): boolean =>
  new Date(d.getTime() + DAY_MS).getUTCMonth() !== d.getUTCMonth();

const formatMonth = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

/**
 * Default cell content for a `dailyCells(...)` axis: a small month label on
 * the first / last day of each month, the day number, and a today pip on the
 * highlighted cell. Width comes from DateAxis's `cellWidth`.
 */
export const dayCellContent = (cell: Cell, ctx: DayCellContext): JSX.Element => {
  const monthLabel = isFirstOfMonth(cell.start) || isLastOfMonth(cell.start)
    ? formatMonth(cell.start)
    : "";
  return (
    <>
      <span class="sui-date-axis__month" aria-hidden="true">{monthLabel}</span>
      <span class="sui-date-axis__label">{cell.start.getUTCDate()}</span>
      {ctx.isToday && <span class="sui-date-axis__today-pip" aria-hidden="true" />}
    </>
  );
};

/**
 * Helper to upgrade a `DateAxisCellContext` to a `DayCellContext` for callers
 * mixing the bare DateAxis with day cells.
 */
export const dayCellContext = (
  cell: Cell,
  base: { isToday: boolean; isSelected: boolean; index: number },
): DayCellContext => ({
  ...base,
  isFirstOfMonth: isFirstOfMonth(cell.start),
  isLastOfMonth: isLastOfMonth(cell.start),
});
```

- [ ] **Step 2: Export `dayCellContent` from the DateAxis barrel**

Append to `src/components/DateAxis/index.ts`:

```ts
export { dayCellContent, dayCellContext } from "./dayCellContent";
export type { DayCellContext } from "./dayCellContent";
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Same as before (showcase still broken, fixed in A4). No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/DateAxis/dayCellContent.tsx src/components/DateAxis/index.ts
git commit -m "feat(DateAxis): export dayCellContent + DayCellContext for day-flavored axes"
```

---

### Task A4: Add `DailyDateAxis` curried variant

**Files:**
- Create: `src/components/DateAxis/DailyDateAxis.tsx`
- Create: `src/components/DateAxis/DailyDateAxis.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/DateAxis/DailyDateAxis.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DailyDateAxis } from "./DailyDateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("DailyDateAxis", () => {
  it("renders one cell per day in [start, end] using the default day content", () => {
    const { container } = render(() => (
      <DailyDateAxis start={d("2026-05-01")} end={d("2026-05-05")} today={d("2026-05-02")} />
    ));
    const cells = container.querySelectorAll(".sui-date-axis__cell");
    expect(cells).toHaveLength(5);
    // Day labels: 1..5
    const labels = Array.from(container.querySelectorAll(".sui-date-axis__label"))
      .map((n) => n.textContent);
    expect(labels).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("translates selected: Date → cell index for the highlight", () => {
    const { container } = render(() => (
      <DailyDateAxis
        start={d("2026-05-01")}
        end={d("2026-05-05")}
        today={d("2026-05-01")}
        selected={d("2026-05-04")}
      />
    ));
    const cells = Array.from(container.querySelectorAll(".sui-date-axis__cell"));
    expect(cells[3].classList.contains("sui-date-axis__cell--selected")).toBe(true);
  });

  it("translates onCellClick back to onDayClick(day: Date)", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <DailyDateAxis
        start={d("2026-05-01")}
        end={d("2026-05-03")}
        today={d("2026-05-02")}
        onDayClick={onDayClick}
      />
    ));
    fireEvent.click(container.querySelectorAll(".sui-date-axis__cell")[1]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const passed = onDayClick.mock.calls[0][0] as Date;
    expect(passed.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("passes day-flavored context (isFirstOfMonth / isLastOfMonth) to renderDay", () => {
    const seen: { isFirstOfMonth: boolean; isLastOfMonth: boolean }[] = [];
    render(() => (
      <DailyDateAxis
        start={d("2026-05-31")}
        end={d("2026-06-01")}
        today={d("2026-05-31")}
        renderDay={(_day, ctx) => {
          seen.push({
            isFirstOfMonth: ctx.isFirstOfMonth,
            isLastOfMonth: ctx.isLastOfMonth,
          });
          return <span />;
        }}
      />
    ));
    expect(seen[0]).toEqual({ isFirstOfMonth: false, isLastOfMonth: true });
    expect(seen[1]).toEqual({ isFirstOfMonth: true, isLastOfMonth: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest src/components/DateAxis/DailyDateAxis.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `DailyDateAxis`**

```tsx
// src/components/DateAxis/DailyDateAxis.tsx
import { Component, JSX, createMemo } from "solid-js";
import { DateAxis } from "./DateAxis";
import { dailyCells, isSameCalendarDay, type Cell } from "./cells";
import { dayCellContent, dayCellContext, type DayCellContext } from "./dayCellContent";

export interface DailyDateAxisProps {
  start: Date;
  end: Date;
  today?: Date;
  /** Highlighted day — translated to a cell index internally. */
  selected?: Date;
  cellWidth?: number;
  onDayClick?: (day: Date) => void;
  /** Per-day renderer. When omitted, `dayCellContent` is used. */
  renderDay?: (day: Date, ctx: DayCellContext) => JSX.Element;
}

/**
 * Day-cell curried variant of DateAxis. Restores the original ergonomics:
 * pass start/end + optional selected: Date and onDayClick, and get a fully
 * formed day-cell ribbon back.
 */
export const DailyDateAxis: Component<DailyDateAxisProps> = (props) => {
  const cells = createMemo(() => dailyCells(props.start, props.end));
  const selectedIndex = createMemo(() => {
    if (props.selected === undefined) return undefined;
    const target = props.selected;
    const idx = cells().findIndex((c) => isSameCalendarDay(c.start, target));
    return idx >= 0 ? idx : undefined;
  });

  return (
    <DateAxis<Cell>
      cells={cells()}
      selected={selectedIndex()}
      today={props.today}
      cellWidth={props.cellWidth}
      onCellClick={
        props.onDayClick !== undefined
          ? (_idx, cell) => props.onDayClick!(cell.start)
          : undefined
      }
      renderCell={(cell, ctx) => {
        const dayCtx = dayCellContext(cell, ctx);
        if (props.renderDay) return props.renderDay(cell.start, dayCtx);
        return dayCellContent(cell, dayCtx);
      }}
    />
  );
};
```

- [ ] **Step 4: Export `DailyDateAxis` from the barrel**

Append to `src/components/DateAxis/index.ts`:

```ts
export { DailyDateAxis } from "./DailyDateAxis";
export type { DailyDateAxisProps } from "./DailyDateAxis";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest src/components/DateAxis/DailyDateAxis.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/components/DateAxis/DailyDateAxis.tsx src/components/DateAxis/DailyDateAxis.test.tsx src/components/DateAxis/index.ts
git commit -m "feat(DateAxis): add DailyDateAxis curried variant for day-cell ergonomics"
```

---

### Task A5: Update DateAxis showcase to the new surface

**Files:**
- Modify: `dev/showcases/date-axis.tsx`

The current showcase uses the old API. Rewire to demonstrate both `DailyDateAxis` (for the simple ribbon examples) and bare `DateAxis` + `dailyCells` + the cashflow cell renderer (for the custom-cell example).

- [ ] **Step 1: Update the showcase**

Replace the entire `dev/showcases/date-axis.tsx` with:

```tsx
import { Component, createSignal } from "solid-js";
import {
  DateAxis,
  DailyDateAxis,
  dailyCells,
  dayCellContent,
  dayCellContext,
  type Cell,
} from "../../src/components/DateAxis";

// ── Static dates — anchored to 2026-05-01 so the gallery shows a stable
//    range without clocking. `today` is pinned near the middle of the range.
const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-07-14"); // ~75 days — forces horizontal scroll
const PINNED_TODAY = new Date("2026-05-27");

const NARROW_START = new Date("2026-05-19");
const NARROW_END = new Date("2026-06-08");

const fmtLong = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Deterministic stub net-cashflow ($) per day for the heatmap demo.
const cashflow = (i: number): number =>
  Math.round(Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260);

const fmtDollars = (v: number): string =>
  `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString("en-US")}`;

const HEAT_GREEN = "rgba(0, 200, 120, 0.85)";
const HEAT_RED = "rgba(230, 70, 70, 0.85)";

const demoBox = (label: string, children: () => unknown) => (
  <div
    style={{
      padding: "0 0 4px",
      background: "var(--sui-bg-elevated)",
      border: "1px solid var(--sui-border)",
      "border-radius": "var(--sui-radius-md)",
      "margin-bottom": "16px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "8px 16px",
        "font-size": "11px",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        color: "var(--sui-text-muted)",
        "border-bottom": "1px solid var(--sui-border)",
      }}
    >
      {label}
    </div>
    <div style={{ padding: "0" }}>{children() as any}</div>
  </div>
);

export const DateAxisShowcase: Component = () => {
  const [selected, setSelected] = createSignal<Date>(PINNED_TODAY);

  // Cells for the custom-render example are computed once.
  const customCells = dailyCells(RANGE_START, RANGE_END);

  return (
    <div class="component-section">
      <h2>DateAxis — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Cadence-generic horizontal cell ribbon. Pass any <code>Cell[]</code>
        produced by <code>dailyCells</code> / <code>weeklyCells</code> /
        <code>monthlyCells</code> / <code>hourlyCells</code>, or build your own.
        For day-cell ergonomics use <code>DailyDateAxis</code>.
      </p>

      <div class="example-group">
        <h3>Default ribbon — DailyDateAxis</h3>
        <p class="text-meta">
          <code>{"<DailyDateAxis start={…} end={…} />"}</code>. Today (May 27)
          is marked; month names appear above the day number on the first and
          last day of each month.
        </p>
        {demoBox("DailyDateAxis · passive · 3-week · cellWidth=56", () => (
          <DailyDateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            cellWidth={56}
          />
        ))}
      </div>

      <div class="example-group">
        <h3>Clickable days drive a linked view</h3>
        <p class="text-meta">
          Click (or focus + Enter/Space on) any day below. Both ribbons share
          one <code>selected</code> signal.
        </p>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "12px",
            padding: "16px 20px",
            background: "var(--sui-bg-elevated)",
            border: "1px solid var(--sui-accent)",
            "border-radius": "var(--sui-radius-md)",
            "margin-bottom": "16px",
          }}
        >
          <span style={{ "font-size": "20px" }}>📈</span>
          <div>
            <div
              style={{
                "font-size": "11px",
                "text-transform": "uppercase",
                "letter-spacing": "0.08em",
                color: "var(--sui-text-muted)",
              }}
            >
              Graph view — centered on
            </div>
            <div
              style={{
                "font-size": "15px",
                "font-weight": "600",
                color: "var(--sui-accent)",
              }}
            >
              {fmtLong(selected())}
            </div>
          </div>
        </div>

        {demoBox("DailyDateAxis · clickable · start=2026-05-01  end=2026-07-14", () => (
          <DailyDateAxis
            start={RANGE_START}
            end={RANGE_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
          />
        ))}

        {demoBox("DailyDateAxis · clickable · 3-week · cellWidth=56", () => (
          <DailyDateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
            cellWidth={56}
          />
        ))}
      </div>

      <div class="example-group">
        <h3>Custom cell renderer — cashflow heatmap (bare DateAxis)</h3>
        <p class="text-meta">
          Drop the curry: <code>DateAxis</code> with <code>cells</code> from
          <code>dailyCells(...)</code> and a custom <code>renderCell</code>.
          The renderer sizes each cell; the axis grows to respect it and the
          scrollbar stays entirely below the cells.
        </p>
        {demoBox("DateAxis · custom renderCell — date corner + diverging bar + $", () => (
          <DateAxis
            cells={customCells}
            today={PINNED_TODAY}
            renderCell={(cell: Cell, ctx) => {
              const dayCtx = dayCellContext(cell, ctx);
              const v = cashflow(ctx.index);
              const up = v >= 0;
              const frac = Math.min(1, Math.abs(v) / 2200);
              const corner =
                dayCtx.isFirstOfMonth || dayCtx.isLastOfMonth
                  ? `${cell.start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${cell.start.getUTCDate()}`
                  : String(cell.start.getUTCDate());
              return (
                <div
                  style={{
                    position: "relative",
                    width: "60px",
                    height: "72px",
                    "box-sizing": "border-box",
                    display: "flex",
                    "flex-direction": "column",
                    padding: "3px 4px 4px",
                    gap: "2px",
                    "border-right": "1px solid var(--sui-border)",
                    background: up ? "rgba(0,200,120,0.05)" : "rgba(230,70,70,0.05)",
                  }}
                >
                  <div
                    style={{
                      "font-size": "9px",
                      "line-height": "1.1",
                      color: "var(--sui-text-muted)",
                      "white-space": "nowrap",
                    }}
                  >
                    {corner}
                  </div>
                  <div style={{ position: "relative", flex: "1", "min-height": "0" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "50%",
                        height: "1px",
                        background: "var(--sui-border)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "24%",
                        right: "24%",
                        height: `${(frac * 50).toFixed(0)}%`,
                        ...(up
                          ? { bottom: "50%", background: HEAT_GREEN, "border-radius": "1px 1px 0 0" }
                          : { top: "50%", background: HEAT_RED, "border-radius": "0 0 1px 1px" }),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      "font-size": "9px",
                      "font-weight": "600",
                      "text-align": "center",
                      "white-space": "nowrap",
                      color: up ? HEAT_GREEN : HEAT_RED,
                    }}
                  >
                    {fmtDollars(v)}
                  </div>
                </div>
              );
            }}
          />
        ))}
        <div class="text-meta">
          DateAxis owns the cell wrapper (click handling, today / selected highlight);
          your <code>renderCell</code> controls what's inside and the cell's own size.
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors. (If there are stale references to removed exports elsewhere, fix them — there should be none.)

- [ ] **Step 3: Run the dev server and visually verify the showcase still renders all three examples correctly**

Run: `npm run dev` (Vite on port 6006).
Open http://localhost:6006/#/date-axis in a browser. Verify:
- The passive 3-week ribbon renders with today highlighted on May 27.
- Clicking days in the two interactive ribbons updates the shared selected view (the "Graph view — centered on" line).
- The cashflow custom-cell variant renders with green/red diverging bars and dollar amounts.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/date-axis.tsx
git commit -m "chore(showcase): rewire DateAxis showcase to cadence-generic API"
```

---

## Phase B — ScrubChart

### Task B1: Pure layout math (`layoutCells`)

**Files:**
- Create: `src/components/ScrubChart/scales.ts`
- Create: `src/components/ScrubChart/scales.test.ts`

This task implements the fisheye geometry as a pure function. No Solid, no DOM — just numbers in, numbers out. Easy to unit test exhaustively.

- [ ] **Step 1: Write the failing tests**

```ts
// src/components/ScrubChart/scales.test.ts
import { describe, it, expect } from "vitest";
import { layoutCells } from "./scales";

const DEFAULT = {
  cellCount: 22,
  chartWidth: 880,
  selectedFraction: 2 / 3,
  sideCompression: 28,
};

describe("layoutCells", () => {
  it("at integer selectedAnim, focused cell is exactly selectedFraction of chartWidth", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect(r - l).toBeCloseTo(DEFAULT.chartWidth * DEFAULT.selectedFraction, 1);
  });

  it("active window widths sum to chartWidth", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const total = layout.activeWindow
      .map((i) => layout.bounds[i][1] - layout.bounds[i][0])
      .reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(DEFAULT.chartWidth, 1);
  });

  it("focused cell centre sits at chartWidth/2 at integer selectedAnim", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect((l + r) / 2).toBeCloseTo(DEFAULT.chartWidth / 2, 1);
  });

  it("at fractional selectedAnim, two cells share the focus width", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8.5 });
    const w8 = layout.bounds[8][1] - layout.bounds[8][0];
    const w9 = layout.bounds[9][1] - layout.bounds[9][0];
    expect(w8).toBeCloseTo(w9, 1);
    expect(w8).toBeGreaterThan(layout.bounds[7][1] - layout.bounds[7][0]); // wider than a pure side cell
    expect(w8).toBeLessThan(DEFAULT.chartWidth * DEFAULT.selectedFraction);  // narrower than full focus
  });

  it("derives sideWindow from selectedFraction × sideCompression", () => {
    // (1 - 2/3) * 28 / (2 * 2/3) = (1/3 * 28) / (4/3) = 7
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    expect(layout.sideWindow).toBe(7);
    // Active window should include selected ± sideWindow.
    expect(layout.activeWindow).toContain(1);
    expect(layout.activeWindow).toContain(15);
    expect(layout.activeWindow).not.toContain(0);
    expect(layout.activeWindow).not.toContain(16);
  });

  it("clamps sideWindow to 0 when knobs leave no room for side cells", () => {
    const layout = layoutCells({
      cellCount: 20,
      chartWidth: 880,
      selectedFraction: 0.95,
      sideCompression: 4, // 0.05 * 4 / 1.9 = 0.105 < 1
      selectedAnim: 8,
    });
    expect(layout.sideWindow).toBe(0);
    // Active window is just the focused cell.
    expect(layout.activeWindow).toEqual([8]);
    // Focused cell expands to fill (width === chartWidth).
    expect(layout.bounds[8][1] - layout.bounds[8][0]).toBeCloseTo(880, 1);
  });

  it("handles selected near the start (fewer left-side cells)", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 2 });
    expect(layout.activeWindow[0]).toBe(0); // can't go below 0
    // Visible cells on the left side: 0, 1 (only 2 instead of 7).
    expect(layout.bounds[0][0]).toBeGreaterThanOrEqual(0);
  });

  it("handles selected near the end (fewer right-side cells)", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 20 });
    expect(layout.activeWindow.at(-1)).toBe(21); // last cell index = 21
  });

  it("extrapolates bounds for cells outside the active window", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    // Cell 0 is outside the active window (window starts at 1).
    expect(layout.bounds[0]).toBeDefined();
    expect(layout.bounds[0][1]).toBeLessThan(0); // off-canvas to the left
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest src/components/ScrubChart/scales.test.ts`
Expected: FAIL — module `./scales` does not exist.

- [ ] **Step 3: Implement `layoutCells`**

```ts
// src/components/ScrubChart/scales.ts

export interface LayoutCellsInput {
  /** Total cell count (matches the consumer's `cells.length`). */
  cellCount: number;
  /** Chart drawing-area width in px. */
  chartWidth: number;
  /** Fraction of chart width the focused cell occupies. 0 < f < 1. */
  selectedFraction: number;
  /** Focused cell is this many times wider than each side cell. > 0. */
  sideCompression: number;
  /** Current fractional focus position. Can be non-integer (during gesture/tween). */
  selectedAnim: number;
}

export interface CellLayout {
  /** [leftX, rightX] in chart pixels for every cell index in [0, cellCount).
   *  Cells outside the active window have extrapolated bounds that may fall
   *  outside [0, chartWidth]. */
  bounds: [number, number][];
  /** Cell indices included in the active window (contiguous). */
  activeWindow: number[];
  /** Derived from knobs; 0 when knobs leave no room for side cells. */
  sideWindow: number;
}

/**
 * Compute the per-cell horizontal bounds of the fisheye chart for a given
 * fractional `selectedAnim`. Pure function.
 *
 *   focusWeight(i)   = max(0, 1 − |i − selectedAnim|)
 *   rawWidth(i)      = sideWidth + (focusedWidth − sideWidth) × focusWeight(i)
 *
 * After raw widths are computed for cells in the active window, they're
 * normalised so their sum equals `chartWidth` exactly. Cells outside the
 * active window get bounds extrapolated linearly at side-width pitch.
 */
export function layoutCells(input: LayoutCellsInput): CellLayout {
  const { cellCount, chartWidth, selectedFraction, sideCompression, selectedAnim } = input;

  const focusedWidth = chartWidth * selectedFraction;
  const sideWidthRaw = focusedWidth / sideCompression;
  // Derive sideWindow (per-side cell count). Clamp to 0 when knobs leave no room.
  const rawSideWindow = ((1 - selectedFraction) * sideCompression) / (2 * selectedFraction);
  const sideWindow = Math.floor(Math.max(0, rawSideWindow));

  // Determine the active window: [floor(selectedAnim) − sideWindow, ceil(selectedAnim) + sideWindow]
  // clamped to [0, cellCount − 1].
  const lo = Math.max(0, Math.floor(selectedAnim) - sideWindow);
  const hi = Math.min(cellCount - 1, Math.ceil(selectedAnim) + sideWindow);

  const activeWindow: number[] = [];
  for (let i = lo; i <= hi; i++) activeWindow.push(i);

  // Compute raw widths inside the window.
  const rawWidths: number[] = activeWindow.map((i) => {
    const w = Math.max(0, 1 - Math.abs(i - selectedAnim));
    return sideWidthRaw + (focusedWidth - sideWidthRaw) * w;
  });
  const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
  const scale = totalRaw > 0 ? chartWidth / totalRaw : 1;
  const normalisedWidths = rawWidths.map((w) => w * scale);

  // Cumulate left edges starting from x=0.
  const bounds: [number, number][] = new Array(cellCount);
  let cursor = 0;
  for (let k = 0; k < activeWindow.length; k++) {
    const i = activeWindow[k];
    const w = normalisedWidths[k];
    bounds[i] = [cursor, cursor + w];
    cursor += w;
  }

  // Extrapolate cells before/after the active window at sideWidth pitch.
  const extrapolatedSide = sideWidthRaw * scale;
  // Left of window
  for (let i = lo - 1; i >= 0; i--) {
    const right = bounds[i + 1][0];
    bounds[i] = [right - extrapolatedSide, right];
  }
  // Right of window
  for (let i = hi + 1; i < cellCount; i++) {
    const left = bounds[i - 1][1];
    bounds[i] = [left, left + extrapolatedSide];
  }

  return { bounds, activeWindow, sideWindow };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest src/components/ScrubChart/scales.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScrubChart/scales.ts src/components/ScrubChart/scales.test.ts
git commit -m "feat(ScrubChart): pure fisheye layout (layoutCells)"
```

---

### Task B2: Inverse mapping (`xToCell`)

**Files:**
- Modify: `src/components/ScrubChart/scales.ts`
- Modify: `src/components/ScrubChart/scales.test.ts`

- [ ] **Step 1: Add failing tests for `xToCell`**

Append to `scales.test.ts`:

```ts
import { layoutCells, xToCell } from "./scales";

describe("xToCell", () => {
  it("returns the focused cell index for x at chart centre", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    expect(xToCell(DEFAULT.chartWidth / 2, layout)).toBeCloseTo(8, 2);
  });

  it("returns a fractional value within the focused cell", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect(xToCell(l + (r - l) * 0.25, layout)).toBeCloseTo(8 - 0.25, 2);
    expect(xToCell(l + (r - l) * 0.75, layout)).toBeCloseTo(8 + 0.25, 2);
  });

  it("clamps to nearest visible cell when x is outside the chart range", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    // Far left → leftmost visible cell.
    expect(xToCell(-1000, layout)).toBe(layout.activeWindow[0]);
    // Far right → rightmost visible cell.
    expect(xToCell(99999, layout)).toBe(layout.activeWindow.at(-1));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest src/components/ScrubChart/scales.test.ts`
Expected: FAIL — `xToCell` is not exported.

- [ ] **Step 3: Implement `xToCell`**

Append to `src/components/ScrubChart/scales.ts`:

```ts
/**
 * Inverse of layoutCells: given a chart-pixel x, return the fractional cell
 * position that x falls within. Used to map pointer x → selectedAnim during
 * a scrub gesture. Clamps to the nearest cell in the active window when x
 * falls outside [0, chartWidth].
 */
export function xToCell(x: number, layout: CellLayout): number {
  const win = layout.activeWindow;
  if (win.length === 0) return 0;
  if (x <= 0) return win[0];
  // Walk visible cells, find the one whose bounds contain x.
  for (const i of win) {
    const [l, r] = layout.bounds[i];
    if (x >= l && x <= r) {
      const frac = (x - l) / (r - l); // 0..1 inside the cell
      // Cell i covers [i-0.5, i+0.5] in fractional-cell-coords, so:
      return i - 0.5 + frac;
    }
  }
  // x is past the rightmost visible cell.
  return win.at(-1)!;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest src/components/ScrubChart/scales.test.ts`
Expected: PASS — all tests including the new ones green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScrubChart/scales.ts src/components/ScrubChart/scales.test.ts
git commit -m "feat(ScrubChart): inverse mapping xToCell"
```

---

### Task B3: ScrubChart scaffold (static, integer-only)

**Files:**
- Create: `src/components/ScrubChart/ScrubChart.tsx`
- Create: `src/components/ScrubChart/ScrubChart.css`
- Create: `src/components/ScrubChart/index.ts`
- Create: `src/components/ScrubChart/ScrubChart.test.tsx`

Build the static composition first: chart frame + gutter + axis stacked vertically, with the layout reading from an integer `selected` prop. No animation, no scrub gesture yet — those land in B5 and B6.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ScrubChart/ScrubChart.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("ScrubChart static composition", () => {
  it("renders chart frame, gutter, and axis", () => {
    const cells: Cell[] = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg data-testid="chart" />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__frame")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__gutter")).toBeTruthy();
    expect(container.querySelector(".sui-date-axis")).toBeTruthy();
    expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
  });

  it("passes a context with cellToX, cellBounds, and visibleCells to renderChart", () => {
    let seenCtx: { selected: number; width: number; visibleCount: number } | null = null;
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={() => {}}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={(ctx) => {
          seenCtx = { selected: ctx.selected, width: ctx.width, visibleCount: ctx.visibleCells.length };
          return <svg />;
        }}
      />
    ));
    expect(seenCtx).not.toBeNull();
    expect(seenCtx!.selected).toBe(15);
    expect(seenCtx!.width).toBeGreaterThan(0);
    // Default knobs (2/3 + 28) → 7 cells per side → 15 visible.
    expect(seenCtx!.visibleCount).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest src/components/ScrubChart`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the scaffold**

```tsx
// src/components/ScrubChart/ScrubChart.tsx
import {
  Component,
  For,
  JSX,
  Show,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { DateAxis, type Cell, type DateAxisCellContext } from "../DateAxis";
import { layoutCells, type CellLayout } from "./scales";
import "./ScrubChart.css";

export interface ScrubChartContext<C extends Cell> {
  cellToX(index: number): number;
  cellBounds(index: number): [number, number];
  selected: number;
  cells: C[];
  visibleCells: number[];
  width: number;
  height: number;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  selected: number;
  onScrub: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;

  /** Fraction of chart pixel width the focused cell occupies. Default 2/3. */
  selectedFraction?: number;
  /** Focused cell is this many times wider than each side cell. Default 28. */
  sideCompression?: number;
  /** Chart drawing-area height in px. Default 200. */
  chartHeight?: number;
  /** Gutter height in px. Default 20. */
  gutterHeight?: number;
  /** Width of one axis cell in px. Default 40. */
  cellWidth?: number;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;
}

export const ScrubChart = <C extends Cell>(props: ScrubChartProps<C>): JSX.Element => {
  // ── Defaults ─────────────────────────────────────────────────────────
  const selectedFraction = () => props.selectedFraction ?? 2 / 3;
  const sideCompression = () => props.sideCompression ?? 28;
  const chartHeight = () => props.chartHeight ?? 200;
  const gutterHeight = () => props.gutterHeight ?? 20;
  const cellWidth = () => props.cellWidth ?? 40;

  // ── Layout ───────────────────────────────────────────────────────────
  // Chart pixel width is measured via ResizeObserver on the frame.
  const [chartWidth, setChartWidth] = createSignal(880);
  let frameEl: HTMLDivElement | undefined;
  onMount(() => {
    if (!frameEl) return;
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setChartWidth(entry.contentRect.width);
    });
    obs.observe(frameEl);
    onCleanup(() => obs.disconnect());
  });

  // Static integer-only layout for the scaffold; B5 swaps to fractional selectedAnim.
  const layout = createMemo<CellLayout>(() =>
    layoutCells({
      cellCount: props.cells.length,
      chartWidth: chartWidth(),
      selectedFraction: selectedFraction(),
      sideCompression: sideCompression(),
      selectedAnim: props.selected,
    }),
  );

  const ctx = (): ScrubChartContext<C> => {
    const lay = layout();
    return {
      cellToX: (i: number) => (lay.bounds[i][0] + lay.bounds[i][1]) / 2,
      cellBounds: (i: number) => lay.bounds[i],
      selected: props.selected,
      cells: props.cells,
      visibleCells: lay.activeWindow.filter((i) => {
        const [l, r] = lay.bounds[i];
        return r >= 0 && l <= chartWidth();
      }),
      width: chartWidth(),
      height: chartHeight(),
    };
  };

  return (
    <div class="sui-scrub-chart">
      <div
        class="sui-scrub-chart__frame"
        style={{ height: `${chartHeight()}px` }}
        ref={(el) => (frameEl = el)}
      >
        <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
      </div>

      <svg
        class="sui-scrub-chart__gutter"
        viewBox={`0 0 ${chartWidth()} ${gutterHeight()}`}
        preserveAspectRatio="none"
        style={{ height: `${gutterHeight()}px` }}
      >
        <For each={Array.from({ length: props.cells.length }, (_, i) => i)}>
          {(i) => {
            const isSelected = i === props.selected;
            const [chL, chR] = layout().bounds[i];
            const axL = i * cellWidth();
            const axR = (i + 1) * cellWidth();
            const stroke = isSelected
              ? "var(--sui-accent)"
              : "var(--sui-border)";
            const strokeWidth = isSelected ? 1.5 : 1;
            return (
              <>
                <line x1={chL} y1={0} x2={axL} y2={gutterHeight()}
                  stroke={stroke} stroke-width={strokeWidth} />
                <line x1={chR} y1={0} x2={axR} y2={gutterHeight()}
                  stroke={stroke} stroke-width={strokeWidth} />
              </>
            );
          }}
        </For>
      </svg>

      <DateAxis<C>
        cells={props.cells}
        selected={props.selected}
        today={props.today}
        cellWidth={cellWidth()}
        onCellClick={(idx, cell) => props.onScrub(idx, cell)}
        renderCell={props.renderCell}
      />
    </div>
  );
};
```

- [ ] **Step 4: Add the CSS**

```css
/* src/components/ScrubChart/ScrubChart.css */

.sui-scrub-chart {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--sui-bg-elevated);
  border: 1px solid var(--sui-border);
  border-radius: var(--sui-radius-md);
  overflow: hidden;
}

.sui-scrub-chart__frame {
  position: relative;
  width: 100%;
  background: var(--sui-bg-base, transparent);
}

.sui-scrub-chart__gutter {
  display: block;
  width: 100%;
  background: var(--sui-bg-base, transparent);
  border-top: 1px solid var(--sui-border);
  border-bottom: 1px solid var(--sui-border);
  overflow: hidden;
}
```

- [ ] **Step 5: Add the index barrel**

```ts
// src/components/ScrubChart/index.ts
export { ScrubChart } from "./ScrubChart";
export type { ScrubChartProps, ScrubChartContext } from "./ScrubChart";
export { layoutCells, xToCell } from "./scales";
export type { LayoutCellsInput, CellLayout } from "./scales";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest src/components/ScrubChart`
Expected: PASS — both scaffold tests green.

- [ ] **Step 7: Commit**

```bash
git add src/components/ScrubChart/
git commit -m "feat(ScrubChart): scaffold (static integer-only) — chart + gutter + axis"
```

---

### Task B4: Add the gesture overlay + click-to-scrub

The scaffold's axis already supports click-scrub via `onCellClick`. This task adds the chart-side click handler (no drag yet — drag lands in B6).

**Files:**
- Modify: `src/components/ScrubChart/ScrubChart.tsx`
- Modify: `src/components/ScrubChart/ScrubChart.test.tsx`

- [ ] **Step 1: Add a failing test for click-to-scrub on the chart overlay**

Append to `ScrubChart.test.tsx`:

```tsx
import { fireEvent } from "@solidjs/testing-library";
import { vi } from "vitest";

describe("ScrubChart click-to-scrub on the chart", () => {
  it("calls onScrub with the cell under the pointer when the overlay is clicked", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={onScrub}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const overlay = container.querySelector(".sui-scrub-chart__overlay")! as HTMLDivElement;
    // Simulate a click at chart-x = chartWidth/2 → focused cell (15).
    // JSDOM doesn't compute layout; we'll stub getBoundingClientRect.
    overlay.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 880, height: 200, right: 880, bottom: 200, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
    fireEvent.pointerDown(overlay, { clientX: 440, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(overlay, { clientX: 440, clientY: 100, pointerId: 1 });
    expect(onScrub).toHaveBeenCalledTimes(1);
    expect(onScrub.mock.calls[0][0]).toBe(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest src/components/ScrubChart/ScrubChart.test.tsx`
Expected: FAIL — `.sui-scrub-chart__overlay` doesn't exist yet.

- [ ] **Step 3: Add the overlay + pointer handlers**

Inside `ScrubChart.tsx`, modify the chart frame to include an overlay div and wire pointerdown/pointerup. (Drag handling lands in B6.) Replace the chart frame section with:

```tsx
const [pointerActive, setPointerActive] = createSignal(false);

const handlePointerDown = (e: PointerEvent) => {
  if (!frameEl) return;
  const rect = frameEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const fractional = xToCell(x, layout());
  const idx = Math.round(fractional);
  const clamped = Math.max(0, Math.min(props.cells.length - 1, idx));
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
  setPointerActive(true);
  // For B4 (click-only), we just record on down and commit on up.
  pendingIndex = clamped;
};
let pendingIndex: number | null = null;

const handlePointerUp = (e: PointerEvent) => {
  if (!pointerActive()) return;
  try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
  setPointerActive(false);
  if (pendingIndex !== null) {
    const i = pendingIndex;
    pendingIndex = null;
    props.onScrub(i, props.cells[i]);
  }
};
```

And inside the JSX, replace the chart frame block with:

```tsx
<div
  class="sui-scrub-chart__frame"
  style={{ height: `${chartHeight()}px` }}
  ref={(el) => (frameEl = el)}
>
  <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
  <div
    class="sui-scrub-chart__overlay"
    onPointerDown={handlePointerDown}
    onPointerUp={handlePointerUp}
  />
</div>
```

Add an `xToCell` import at the top:

```tsx
import { layoutCells, xToCell, type CellLayout } from "./scales";
```

- [ ] **Step 4: Add overlay CSS**

Append to `ScrubChart.css`:

```css
.sui-scrub-chart__overlay {
  position: absolute;
  inset: 0;
  cursor: ew-resize;
  touch-action: none;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest src/components/ScrubChart`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScrubChart/ScrubChart.tsx src/components/ScrubChart/ScrubChart.css src/components/ScrubChart/ScrubChart.test.tsx
git commit -m "feat(ScrubChart): pointer overlay + click-to-scrub on the chart"
```

---

### Task B5: Internal `selectedAnim` signal + tween on prop change

Now we introduce the fractional internal signal and tween it toward `props.selected` whenever the prop changes. After this task the chart morphs smoothly on axis clicks.

**Files:**
- Modify: `src/components/ScrubChart/ScrubChart.tsx`

- [ ] **Step 1: Add the tween infrastructure**

Inside `ScrubChart.tsx`, add at the top of the component:

```tsx
const TWEEN_MS = 250;

// Internal fractional position. All layout reads from this — not props.selected.
const [selectedAnim, setSelectedAnim] = createSignal(props.selected);

// Tween `selectedAnim` from its current value to `target` over TWEEN_MS,
// ease-out. Cancels any in-flight tween.
let rafHandle: number | null = null;
const tweenTo = (target: number) => {
  if (rafHandle !== null) cancelAnimationFrame(rafHandle);
  const start = selectedAnim();
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / TWEEN_MS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    setSelectedAnim(start + (target - start) * eased);
    if (t < 1) {
      rafHandle = requestAnimationFrame(step);
    } else {
      rafHandle = null;
    }
  };
  rafHandle = requestAnimationFrame(step);
};
onCleanup(() => {
  if (rafHandle !== null) cancelAnimationFrame(rafHandle);
});

// Tween toward props.selected whenever it changes (unless we're mid-gesture).
createEffect(() => {
  const target = props.selected;
  if (gestureActive()) return; // gesture owns selectedAnim while active
  if (Math.abs(target - selectedAnim()) < 0.001) return;
  tweenTo(target);
});
```

And add `gestureActive` (used by B6; for now keep a placeholder signal):

```tsx
const [gestureActive, setGestureActive] = createSignal(false);
```

Replace the `layout` memo's `selectedAnim` argument:

```tsx
const layout = createMemo<CellLayout>(() =>
  layoutCells({
    cellCount: props.cells.length,
    chartWidth: chartWidth(),
    selectedFraction: selectedFraction(),
    sideCompression: sideCompression(),
    selectedAnim: selectedAnim(),     // ← was props.selected
  }),
);
```

Add `createEffect` import at the top:

```tsx
import {
  Component, For, JSX, Show,
  createEffect, createMemo, createSignal,
  onMount, onCleanup,
} from "solid-js";
```

- [ ] **Step 2: Run typecheck to make sure nothing else broke**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors.

- [ ] **Step 3: Run all tests**

Run: `npx vitest src/components/ScrubChart`
Expected: PASS — tween animation isn't directly tested here, but the static tests should still pass because `selectedAnim` initialises to `props.selected`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScrubChart/ScrubChart.tsx
git commit -m "feat(ScrubChart): internal fractional selectedAnim + ease-out tween on prop change"
```

---

### Task B6: Pointer-anchored drag scrub

Replace the click-only handler with a drag-aware version that updates `selectedAnim` continuously and commits the rounded value on release.

**Files:**
- Modify: `src/components/ScrubChart/ScrubChart.tsx`
- Modify: `src/components/ScrubChart/ScrubChart.test.tsx`

- [ ] **Step 1: Add a drag-scrub test**

Append to `ScrubChart.test.tsx`:

```tsx
describe("ScrubChart drag scrub", () => {
  it("updates selectedAnim mid-drag and commits the rounded value on pointerup", () => {
    const onScrub = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-31"));
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        selected={15}
        onScrub={onScrub}
        renderCell={(cell) => <span>{cell.start.getUTCDate()}</span>}
        renderChart={() => <svg />}
      />
    ));
    const overlay = container.querySelector(".sui-scrub-chart__overlay")! as HTMLDivElement;
    overlay.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 880, height: 200, right: 880, bottom: 200, x: 0, y: 0, toJSON: () => "" }) as DOMRect;
    // Down at chart centre.
    fireEvent.pointerDown(overlay, { clientX: 440, clientY: 100, pointerId: 1 });
    // Drag right by a chunk that should advance by several side-cells.
    fireEvent.pointerMove(overlay, { clientX: 600, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(overlay, { clientX: 600, clientY: 100, pointerId: 1 });
    expect(onScrub).toHaveBeenCalledTimes(1);
    // Drag moved the focus to the right; committed index should be > 15.
    expect(onScrub.mock.calls[0][0]).toBeGreaterThan(15);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest src/components/ScrubChart`
Expected: FAIL — drag isn't wired yet (only down+up commits).

- [ ] **Step 3: Replace the pointer handlers**

Inside `ScrubChart.tsx`, replace the click-only handlers from B4 with the drag-aware version:

```tsx
type GestureState = {
  pointerId: number;
  startLayout: CellLayout;
  selectedAtStart: number;
  anchorCell: number;
};
let gesture: GestureState | null = null;

const handlePointerDown = (e: PointerEvent) => {
  if (!frameEl) return;
  const rect = frameEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const startLayout = layout();
  const anchorCell = xToCell(x, startLayout);
  (e.currentTarget as Element).setPointerCapture(e.pointerId);
  gesture = {
    pointerId: e.pointerId,
    startLayout,
    selectedAtStart: selectedAnim(),
    anchorCell,
  };
  setGestureActive(true);
};

const handlePointerMove = (e: PointerEvent) => {
  if (!gesture || !frameEl) return;
  const rect = frameEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const cellAtNow = xToCell(x, gesture.startLayout);
  const next = gesture.selectedAtStart + (cellAtNow - gesture.anchorCell);
  const clamped = Math.max(0, Math.min(props.cells.length - 1, next));
  setSelectedAnim(clamped);
};

const endGesture = (e: PointerEvent) => {
  if (!gesture) return;
  try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
  const idx = Math.round(selectedAnim());
  const clamped = Math.max(0, Math.min(props.cells.length - 1, idx));
  setSelectedAnim(clamped); // snap
  gesture = null;
  setGestureActive(false);
  props.onScrub(clamped, props.cells[clamped]);
};
```

And update the overlay JSX to wire all three handlers:

```tsx
<div
  class="sui-scrub-chart__overlay"
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={endGesture}
  onPointerCancel={endGesture}
/>
```

Delete the obsolete `pointerActive` signal and `pendingIndex` from B4.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest src/components/ScrubChart`
Expected: PASS — drag test + click test both green (a click is just a degenerate drag).

- [ ] **Step 5: Commit**

```bash
git add src/components/ScrubChart/ScrubChart.tsx src/components/ScrubChart/ScrubChart.test.tsx
git commit -m "feat(ScrubChart): pointer-anchored drag scrub with start-layout anchoring"
```

---

### Task B7: Drive axis scroll from `selectedAnim`

The DateAxis already auto-scrolls on integer `selected` change (Task A2). For the live drag, we need it to scroll continuously as `selectedAnim` changes. ScrubChart subscribes to the axis's scroll element via `scrollableRef` and drives `scrollLeft` directly while a gesture is active or a tween is in flight.

**Files:**
- Modify: `src/components/ScrubChart/ScrubChart.tsx`

- [ ] **Step 1: Wire `scrollableRef` and drive axis scroll**

Inside `ScrubChart.tsx`, add an axis-scroll signal and a `scrollableRef` ref:

```tsx
let axisScrollEl: HTMLDivElement | undefined;
const handleScrollableRef = (el: HTMLDivElement) => {
  axisScrollEl = el;
};

// Drive axis scrollLeft from selectedAnim whenever it changes.
createEffect(() => {
  const anim = selectedAnim();
  const el = axisScrollEl;
  if (!el) return;
  const w = cellWidth();
  const targetLeft = anim * w + w / 2 - el.clientWidth / 2;
  el.scrollLeft = Math.max(0, targetLeft);
});
```

Pass the `scrollableRef` callback into the inner `DateAxis`:

```tsx
<DateAxis<C>
  cells={props.cells}
  selected={props.selected}
  today={props.today}
  cellWidth={cellWidth()}
  onCellClick={(idx, cell) => props.onScrub(idx, cell)}
  renderCell={props.renderCell}
  scrollableRef={handleScrollableRef}
/>
```

Note: The DateAxis's own scroll-into-view effect from A2 still fires when `props.selected` changes. To avoid fighting with ScrubChart's continuous drive, the DateAxis effect's user-scroll-suppression check naturally yields here because ScrubChart's direct `scrollLeft` writes trigger the axis's `scroll` listener, which bumps `lastUserScrollAt` — so the DateAxis effect bails out. Verify in step 3.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors.

- [ ] **Step 3: Run all tests**

Run: `npx vitest src/components/ScrubChart`
Expected: PASS — existing tests should still hold; no new test for the scroll coupling because JSDOM doesn't compute scroll geometry. Visual verification happens in Task C2.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScrubChart/ScrubChart.tsx
git commit -m "feat(ScrubChart): drive axis scroll from selectedAnim during gestures and tweens"
```

---

### Task B8: Connector lines reflect live `selectedAnim`

The gutter currently re-renders on every `selectedAnim` change (memo dependency), but its axis-side x's assume `scrollLeft = 0`. Wire it to track the axis scroll so the diagonals stay glued to the moving axis cells.

**Files:**
- Modify: `src/components/ScrubChart/ScrubChart.tsx`

- [ ] **Step 1: Track axis scrollLeft as a signal**

Inside `ScrubChart.tsx`, replace `handleScrollableRef` with:

```tsx
const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
let axisScrollEl: HTMLDivElement | undefined;
const handleScrollableRef = (el: HTMLDivElement) => {
  axisScrollEl = el;
  el.addEventListener(
    "scroll",
    () => setAxisScrollLeft(el.scrollLeft),
    { passive: true },
  );
};
```

Update the gutter JSX to subtract `axisScrollLeft()` from the axis-side x's:

```tsx
const axL = i * cellWidth() - axisScrollLeft();
const axR = (i + 1) * cellWidth() - axisScrollLeft();
```

- [ ] **Step 2: Run typecheck + tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest src/components/ScrubChart`
Expected: Zero errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScrubChart/ScrubChart.tsx
git commit -m "feat(ScrubChart): gutter connectors track axis scrollLeft"
```

---

### Task B9: Wire ScrubChart into the library root export

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add the export**

Append to `src/index.ts`:

```ts
export * from "./components/ScrubChart";
```

- [ ] **Step 2: Run a clean build to ensure the package types resolve**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(ScrubChart): export from library root"
```

---

## Phase C — Cashflow demo + workshop

### Task C1: Extract reusable cashflow cell renderer

Pull the cashflow day cell out of `dev/showcases/date-axis.tsx` into a shared module so both the date-axis showcase and the workshop reference one source.

**Files:**
- Create: `dev/showcases/cashflow-day-cell.tsx`
- Modify: `dev/showcases/date-axis.tsx`

- [ ] **Step 1: Create the shared module**

```tsx
// dev/showcases/cashflow-day-cell.tsx
import type { JSX } from "solid-js";
import { dayCellContext, type Cell, type DateAxisCellContext } from "../../src/components/DateAxis";

/** Deterministic stub net-cashflow ($) per day. */
export const cashflowAt = (i: number): number =>
  Math.round(Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260);

const HEAT_GREEN = "rgba(0, 200, 120, 0.85)";
const HEAT_RED = "rgba(230, 70, 70, 0.85)";

export const fmtDollars = (v: number): string =>
  `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString("en-US")}`;

/**
 * Cashflow-flavoured day cell: date corner (with month label on edges),
 * diverging green/red bar showing magnitude, and the dollar amount below.
 * Each cell sizes itself (60 × 72 px). Caller passes the value via the
 * `cashflowAt(ctx.index)` stub or via cell payload.
 */
export const cashflowDayCell = (cell: Cell, ctx: DateAxisCellContext): JSX.Element => {
  const dayCtx = dayCellContext(cell, ctx);
  const v = cashflowAt(ctx.index);
  const up = v >= 0;
  const frac = Math.min(1, Math.abs(v) / 2200);
  const corner =
    dayCtx.isFirstOfMonth || dayCtx.isLastOfMonth
      ? `${cell.start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${cell.start.getUTCDate()}`
      : String(cell.start.getUTCDate());
  return (
    <div
      style={{
        position: "relative",
        width: "60px",
        height: "72px",
        "box-sizing": "border-box",
        display: "flex",
        "flex-direction": "column",
        padding: "3px 4px 4px",
        gap: "2px",
        "border-right": "1px solid var(--sui-border)",
        background: up ? "rgba(0,200,120,0.05)" : "rgba(230,70,70,0.05)",
      }}
    >
      <div
        style={{
          "font-size": "9px",
          "line-height": "1.1",
          color: "var(--sui-text-muted)",
          "white-space": "nowrap",
        }}
      >
        {corner}
      </div>
      <div style={{ position: "relative", flex: "1", "min-height": "0" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            height: "1px",
            background: "var(--sui-border)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "24%",
            right: "24%",
            height: `${(frac * 50).toFixed(0)}%`,
            ...(up
              ? { bottom: "50%", background: HEAT_GREEN, "border-radius": "1px 1px 0 0" }
              : { top: "50%", background: HEAT_RED, "border-radius": "0 0 1px 1px" }),
          }}
        />
      </div>
      <div
        style={{
          "font-size": "9px",
          "font-weight": "600",
          "text-align": "center",
          "white-space": "nowrap",
          color: up ? HEAT_GREEN : HEAT_RED,
        }}
      >
        {fmtDollars(v)}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Update `dev/showcases/date-axis.tsx` to use the shared renderer**

Replace the inline `renderCell` in the custom-cell example with:

```tsx
import { cashflowDayCell } from "./cashflow-day-cell";

// ... in the JSX, replace the inline renderCell={(cell, ctx) => { ... }} with:
renderCell={cashflowDayCell}
```

Remove the now-unused `cashflow`, `fmtDollars`, `HEAT_GREEN`, `HEAT_RED` constants from `date-axis.tsx` if they're no longer referenced.

- [ ] **Step 3: Run typecheck + tests + dev server visual check**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest`
Expected: Zero errors, all tests pass.

Then `npm run dev` and verify the custom-cell example in the date-axis showcase still looks the same.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/cashflow-day-cell.tsx dev/showcases/date-axis.tsx
git commit -m "chore(showcase): extract cashflowDayCell into shared module"
```

---

### Task C2: Wire the workshop showcase

Drop a ScrubChart instance into the workshop using the cashflow cell renderer for the axis and a hand-drawn SVG line chart in `renderChart`.

**Files:**
- Modify: `dev/showcases/workshop.tsx`

- [ ] **Step 1: Replace the workshop body**

```tsx
// dev/showcases/workshop.tsx
import { Component, createMemo, createSignal, For } from "solid-js";
import { SectionTitle } from "../../src/components/Text";
import { ScrubChart } from "../../src/components/ScrubChart";
import { dailyCells, type Cell } from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";

type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-09-30");
const PINNED_TODAY = new Date("2026-05-28");

// Pre-compute cells with running balance.
const cells: CashflowCell[] = (() => {
  let running = 0;
  return dailyCells(RANGE_START, RANGE_END).map((cell, i) => {
    const cashflowCents = cashflowAt(i) * 100; // cashflowAt returns dollars; store cents
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
})();

const todayIndex = cells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

// Y-axis bounds for the running balance.
const balances = cells.map((c) => c.balanceCents);
const yMin = Math.min(0, ...balances);
const yMax = Math.max(0, ...balances);
const yRange = yMax - yMin || 1;
const balanceToY = (cents: number, height: number): number =>
  height - ((cents - yMin) / yRange) * height;

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const WorkshopShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const [selectedFraction, setSelectedFraction] = createSignal(2 / 3);
  const [sideCompression, setSideCompression] = createSignal(28);

  const cell = createMemo(() => cells[selectedIdx()]);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop — ScrubChart</SectionTitle>
      <p style={{ "font-size": "12px", color: "var(--sui-text-secondary)", margin: "8px 0 16px", "max-width": "72ch" }}>
        DateAxis paired with a fisheye chart. Click an axis cell or drag on the chart to scrub.
        The focused cell smoothly morphs to {(selectedFraction() * 100).toFixed(0)}% of the chart width
        while neighbouring cells compress into the side bands.
      </p>

      <ScrubChart<CashflowCell>
        cells={cells}
        selected={selectedIdx()}
        onScrub={(i) => setSelectedIdx(i)}
        today={PINNED_TODAY}
        selectedFraction={selectedFraction()}
        sideCompression={sideCompression()}
        renderCell={cashflowDayCell}
        renderChart={(ctx) => {
          const points = ctx.visibleCells
            .map((i) => {
              const x = ctx.cellToX(i);
              const y = balanceToY(ctx.cells[i].balanceCents, ctx.height);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
          const zeroY = balanceToY(0, ctx.height);
          const selBounds = ctx.cellBounds(ctx.selected);
          return (
            <svg
              viewBox={`0 0 ${ctx.width} ${ctx.height}`}
              preserveAspectRatio="none"
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <rect
                x={selBounds[0]}
                y={0}
                width={selBounds[1] - selBounds[0]}
                height={ctx.height}
                fill="rgba(88,166,255,0.10)"
              />
              <line x1={0} x2={ctx.width} y1={zeroY} y2={zeroY}
                stroke="var(--sui-border)" stroke-dasharray="4 4" />
              <polyline
                points={points}
                fill="none"
                stroke="var(--sui-accent)"
                stroke-width={2}
              />
              <For each={ctx.visibleCells}>
                {(i) => {
                  const x = ctx.cellToX(i);
                  const y = balanceToY(ctx.cells[i].balanceCents, ctx.height);
                  const isSel = i === ctx.selected;
                  return (
                    <circle cx={x} cy={y} r={isSel ? 5 : 2.5}
                      fill={isSel ? "var(--sui-warning, #f5a623)" : "var(--sui-accent)"} />
                  );
                }}
              </For>
            </svg>
          );
        }}
      />

      <div style={{ "margin-top": "16px", "font-size": "13px", color: "var(--sui-text-secondary)" }}>
        Selected: <strong style={{ color: "var(--sui-text-primary)" }}>{fmtDate(cell().start)}</strong>
        {" — "}
        Balance: <strong style={{ color: "var(--sui-text-primary)" }}>{fmtDollars(cell().balanceCents / 100)}</strong>
        {"  · Day cashflow: "}
        <span>{fmtDollars(cell().cashflowCents / 100)}</span>
      </div>
    </div>
  );
};
```

Notes:
- The chart line traverses only `visibleCells` so the polyline stays a manageable length even at very wide zoom.
- The selected-cell highlight column uses `ctx.cellBounds(ctx.selected)` so it follows the live fisheye geometry.
- The dot for the selected cell renders larger and in a contrasting colour (warning / amber).

- [ ] **Step 2: Run typecheck + tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest`
Expected: Zero errors, all tests pass.

- [ ] **Step 3: Visually verify in the dev server**

Run: `npm run dev`.
Open http://localhost:6006/#/workshop in a browser. Verify:
- Chart, gutter (with diagonals), and axis stack vertically.
- Clicking a day in the axis morphs the chart to focus on that day.
- Dragging horizontally on the chart smoothly moves the focus.
- The dollar amount + date readout under the chart updates as you scrub.
- The line drawn in the chart passes through every visible cell's centre.

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/workshop.tsx
git commit -m "feat(workshop): wire ScrubChart + cashflow line demo"
```

---

### Task C3: Add geometry sliders to the workshop

**Files:**
- Modify: `dev/showcases/workshop.tsx`

- [ ] **Step 1: Add the slider controls**

Insert below the stats readout in `WorkshopShowcase`:

```tsx
<div
  style={{
    "margin-top": "20px",
    padding: "12px 16px",
    background: "var(--sui-bg-elevated)",
    border: "1px solid var(--sui-border)",
    "border-radius": "var(--sui-radius-md)",
    display: "flex",
    "flex-direction": "column",
    gap: "8px",
    "max-width": "560px",
  }}
>
  <div style={{ "font-size": "11px", "text-transform": "uppercase", "letter-spacing": "0.08em", color: "var(--sui-text-muted)" }}>
    Geometry controls
  </div>
  <label style={{ display: "flex", "align-items": "center", gap: "12px", "font-size": "12px" }}>
    <span style={{ width: "150px", color: "var(--sui-text-secondary)" }}>
      Selected fraction: <code>{selectedFraction().toFixed(2)}</code>
    </span>
    <input
      type="range"
      min={0.4}
      max={0.9}
      step={0.01}
      value={selectedFraction()}
      onInput={(e) => setSelectedFraction(parseFloat(e.currentTarget.value))}
      style={{ flex: 1 }}
    />
  </label>
  <label style={{ display: "flex", "align-items": "center", gap: "12px", "font-size": "12px" }}>
    <span style={{ width: "150px", color: "var(--sui-text-secondary)" }}>
      Side compression: <code>{sideCompression()}</code>
    </span>
    <input
      type="range"
      min={4}
      max={60}
      step={1}
      value={sideCompression()}
      onInput={(e) => setSideCompression(parseInt(e.currentTarget.value, 10))}
      style={{ flex: 1 }}
    />
  </label>
</div>
```

- [ ] **Step 2: Verify in the dev server**

Run: `npm run dev`. Open http://localhost:6006/#/workshop. Drag both sliders and verify the chart geometry changes live — the focused cell width and the side-cell compression both respond.

- [ ] **Step 3: Commit**

```bash
git add dev/showcases/workshop.tsx
git commit -m "feat(workshop): add live geometry sliders (selectedFraction, sideCompression)"
```

---

### Task C4: Update COMPONENTS.md

**Files:**
- Modify: `COMPONENTS.md`

- [ ] **Step 1: Update the DateAxis section + add ScrubChart**

Find the `## DateAxis` section and replace its body with an updated description that reflects the cadence-generic API and the curried `DailyDateAxis`. Add a new top-level `## ScrubChart` section after `## DateAxis` (alphabetical order in the file is approximate; place it before `## SwimlaneChart`).

Replace the existing DateAxis section body with:

```markdown
## DateAxis

- **DateAxis** — Atomic (Depth 1). Cadence-generic horizontal cell ribbon. Pass any `Cell[]` produced by the exported helpers (`dailyCells`, `weeklyCells`, `monthlyCells`, `hourlyCells`) or a custom array, plus a `renderCell` function. The axis owns the scroll container, the selected-cell highlight, the today highlight (the cell whose `[start, end)` contains `today`), and click/keyboard activation. Key props: `cells` (`C[]` where `C extends Cell`), `selected?` (number index), `today?` (`Date`), `cellWidth?` (default 40), `onCellClick?` (`(index, cell) => void`), `renderCell` (required). When `selected` is provided, the axis scrolls smoothly to centre it (skipped while the user is actively panning). Exported pure helpers: `dailyCells`, `weeklyCells`, `monthlyCells`, `hourlyCells`, `isSameCalendarDay`, `dayCellContent`, `dayCellContext`. Use for: scrubber/date-header ribbons, per-cell heatmaps at any cadence, linked time-axis controls above a graph.
  - **createDateAxis factory** — `createDateAxis({ cellWidth })` returns a curried `Component<DateAxisDataProps<C>>` with the one presentational override frozen.
  - **DailyDateAxis** — Curried day-cell variant. Restores the original ergonomics: takes `start: Date`, `end: Date`, optional `selected: Date` and `onDayClick: (day: Date) => void`, plus an optional `renderDay` whose `DayCellContext` includes `isFirstOfMonth` / `isLastOfMonth`. Use for the common day-cell case so you don't have to wire `dailyCells(...)` + index mapping yourself.
  - Example:
    ```tsx
    import { DailyDateAxis } from "solid-ui-components";
    const [selected, setSelected] = createSignal<Date>(new Date("2026-05-27"));
    <DailyDateAxis
      start={new Date("2026-05-01")}
      end={new Date("2026-07-14")}
      selected={selected()}
      onDayClick={setSelected}
    />
    ```

## ScrubChart

- **ScrubChart** — Composite (Depth 2). Composes `DateAxis` (Atomic) + a user-supplied chart slot + an internal gutter SVG that draws diagonal connectors between each cell's chart-side and axis-side bounds. Generic over `C extends Cell`: consumers attach payload to each cell and read it back inside `renderChart`. The focused cell occupies a fixed fraction of chart width (`selectedFraction`, default 2/3) and morphs smoothly when scrubbed. Two scale knobs (`selectedFraction`, `sideCompression`) tune the geometry; `sideWindow` is derived. Scrubbing supports both axis-cell click and drag-on-chart (pointer-capture, anchored to the start-frozen layout); the axis auto-scrolls to keep the selected cell centred. The internal `selectedAnim` is fractional during gestures and tweens, then snaps to an integer on release. Key props: `cells: C[]`, `selected: number`, `onScrub: (index, cell) => void`, `renderChart: (ctx) => JSX.Element`, `renderCell` (forwarded to the inner DateAxis), `selectedFraction?` (default 2/3), `sideCompression?` (default 28), `chartHeight?` (default 200), `gutterHeight?` (default 20), `cellWidth?` (default 40), `today?`. Exported types: `ScrubChartProps`, `ScrubChartContext`, plus pure helpers `layoutCells` and `xToCell` for downstream chart authors who want the same geometry. Uses `--sui-accent`, `--sui-border`, `--sui-bg-elevated`, `--sui-bg-base`, `--sui-radius-md`. Use for: linked chart + axis pairings where one focused day/week/hour gets the magnifying glass while context cells stay visible.
  - Example:
    ```tsx
    import { ScrubChart } from "solid-ui-components";
    import { dailyCells, type Cell } from "solid-ui-components";

    type Row = Cell & { balanceCents: number };
    const cells: Row[] = dailyCells(start, end).map((c, i) => ({ ...c, balanceCents: runningBalances[i] }));
    const [selected, setSelected] = createSignal(0);

    <ScrubChart<Row>
      cells={cells}
      selected={selected()}
      onScrub={(i) => setSelected(i)}
      renderCell={myCellRender}
      renderChart={(ctx) => (
        <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`} preserveAspectRatio="none">
          <polyline points={ctx.visibleCells.map(i => `${ctx.cellToX(i)},${balanceToY(ctx.cells[i].balanceCents)}`).join(" ")}
                    fill="none" stroke="var(--sui-accent)" />
        </svg>
      )}
    />
    ```
```

- [ ] **Step 2: Verify the COMPONENTS.md still parses cleanly**

Open the file and scroll through — no broken markdown sections, no duplicated headings.

- [ ] **Step 3: Commit**

```bash
git add COMPONENTS.md
git commit -m "docs(COMPONENTS): document cadence-generic DateAxis + DailyDateAxis + ScrubChart"
```

---

## Self-Review Checklist (for the engineer running the plan)

After completing all tasks, run the full verification suite:

- [ ] `npx tsc --noEmit -p tsconfig.json` → zero errors
- [ ] `npm test` → all suites pass
- [ ] `npm run dev` → both showcases (`#/date-axis` and `#/workshop`) render and behave as expected:
  - DateAxis: passive ribbon, two clickable ribbons sharing selection, cashflow heatmap.
  - Workshop: cashflow line chart, axis scrubs to clicked cell, drag scrubs continuously with smooth fisheye morph, both sliders tune the geometry live.
- [ ] `git log --oneline -25` → commits read as a clean, ordered story.

If any step turns up something the spec didn't cover, capture it in `docs/superpowers/specs/2026-05-28-scrub-chart-design.md` (amend the doc) before patching the code — the spec is the source of truth.
