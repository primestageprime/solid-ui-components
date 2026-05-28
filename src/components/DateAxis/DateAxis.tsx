// ============================================
// DateAxis — Atomic (Depth 1).
// Cadence-generic horizontal cell ribbon. One cell per item in `cells`;
// caller supplies a `renderCell` function that draws each cell's content.
//
// Use the helpers in ./cells (dailyCells, weeklyCells, monthlyCells, hourlyCells)
// to generate `Cell[]` for common cadences. For the original day-cell
// ergonomics, prefer the curried `DailyDateAxis` from ./DailyDateAxis.
// ============================================

import {
  Component,
  For,
  type JSX,
  createEffect,
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import "./DateAxis.css";
import type { Cell } from "./cells";

export type { Cell } from "./cells";

/**
 * Per-cell context passed to `renderCell`. Lets the caller branch on the
 * cell's role and its index into the wider `cells` array.
 */
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
  /**
   * A Date used to compute the today highlight. The cell whose [start, end)
   * contains it gets marked.
   */
  today?: Date;
  /**
   * Width in pixels of each default cell. Default 40. Ignored when `renderCell`
   * returns a self-sized element.
   */
  cellWidth?: number;
  /** Called when a cell is clicked or activated via Enter / Space. */
  onCellClick?: (index: number, cell: C) => void;
  /** Required cell content renderer. */
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;
  /**
   * Callback receiving the scroll container element on mount. Used by
   * ScrubChart to subscribe to the axis's scroll position; consumers that
   * don't need this can omit it.
   */
  scrollableRef?: (el: HTMLDivElement) => void;
}

/** True when `t` falls within `cell`'s [start, end). */
const cellContainsTime = (cell: Cell, t: Date): boolean =>
  t.getTime() >= cell.start.getTime() && t.getTime() < cell.end.getTime();

/** Threshold in ms within which a user-initiated scroll suppresses programmatic scroll. */
const USER_SCROLL_GRACE_MS = 250;

export const DateAxis = <C extends Cell = Cell>(
  props: DateAxisProps<C>,
): JSX.Element => {
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
    if (Date.now() - lastUserScrollAt < USER_SCROLL_GRACE_MS) return;
    const cellLeft = idx * cellW();
    const target = cellLeft + cellW() / 2 - el.clientWidth / 2;
    // `scrollTo` is unavailable in some test environments (JSDOM); fall back
    // to assigning `scrollLeft` directly. Real browsers always have scrollTo.
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: target, behavior: "smooth" });
    } else {
      el.scrollLeft = Math.max(0, target);
    }
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
                ]
                  .filter(Boolean)
                  .join(" ")}
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

// ── Override / Data split + factory ────────────────────────────────────────

/**
 * Props that are visual/static overrides — locked at variant-definition time.
 * `cellWidth` is the only presentational knob; everything else is data/callback.
 */
export type DateAxisOverrides<C extends Cell = Cell> = Pick<
  DateAxisProps<C>,
  "cellWidth"
>;

/** Props that remain available to consumers of a curried DateAxis variant. */
export type DateAxisDataProps<C extends Cell = Cell> = Omit<
  DateAxisProps<C>,
  keyof DateAxisOverrides<C>
>;

/**
 * Factory that returns a curried DateAxis with a baked-in presentational
 * `cellWidth`. Call sites then receive only `DateAxisDataProps`.
 */
export function createDateAxis<C extends Cell = Cell>(
  defaults: Partial<Omit<DateAxisProps<C>, "children">>,
): Component<DateAxisDataProps<C>> {
  return (props) => (
    <DateAxis {...(mergeProps(defaults, props) as DateAxisProps<C>)} />
  );
}
