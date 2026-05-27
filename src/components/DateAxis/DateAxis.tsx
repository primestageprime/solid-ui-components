// ============================================
// DateAxis — Atomic (Depth 1).
// A freestanding horizontal day-cell ribbon. One cell per calendar day across
// a date range, with date labels, horizontal scrolling for long ranges, and a
// highlighted "today" cell.
//
// KEY DIFFERENCE from Chart/Axes XAxis:
//   - XAxis: scale-driven SVG axis rendered inside a <Chart>'s coordinate
//     system; works with numeric domain values; requires chart context.
//   - DateAxis: freestanding HTML ribbon; one <div> per calendar day; owns
//     its own DOM and scroll container; usable without any chart wrapper.
//     Suitable as bottom-of-chart date header OR standalone "rules" axis.
// ============================================

import { Component, For, type JSX } from "solid-js";
import "./DateAxis.css";

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Per-cell context passed to a custom `renderDay`. Lets the caller branch on
 * the day's role (today / selected / month edges) and index into its own data.
 */
export interface DateAxisDayContext {
  /** This cell is the `today` day. */
  isToday: boolean;
  /** This cell is the `selected` day. */
  isSelected: boolean;
  /** First calendar day of its month. */
  isFirstOfMonth: boolean;
  /** Last calendar day of its month. */
  isLastOfMonth: boolean;
  /** Zero-based position within the rendered range — index into your own series. */
  index: number;
}

export interface DateAxisProps {
  /** First day of the displayed range (inclusive). */
  start: Date;
  /** Last day of the displayed range (inclusive). */
  end: Date;
  /**
   * The calendar day to highlight as "today". Defaults to `new Date()`.
   * Pass an explicit value to pin the marker in tests or historical views.
   */
  today?: Date;
  /**
   * Width in pixels of each day cell. Default: 40.
   * Smaller values compress a long range; larger values give more label room.
   */
  cellWidth?: number;
  /**
   * The currently-selected day — e.g. the day a linked graph is scrolled to.
   * Highlighted distinctly from `today`. Controlled by the caller.
   */
  selected?: Date;
  /**
   * Called when a day cell is clicked or activated via keyboard. When provided,
   * cells become interactive (pointer cursor, focusable, hover state). Use it to
   * drive a linked view — e.g. scrub a graph to the clicked day.
   */
  onDayClick?: (day: Date) => void;
  /**
   * Custom renderer for the CONTENT of each day cell. When omitted, the default
   * "simple" content is used (month label + day number + today pip). Use it to
   * render anything per day — e.g. a heatmap square coloured by a value, a dot,
   * or a mini-bar. DateAxis still owns the cell wrapper (sizing, borders, click
   * handling, today/selected highlight); `renderDay` controls only what's inside.
   */
  renderDay?: (day: Date, ctx: DateAxisDayContext) => JSX.Element;
}

// ── Pure day-range helpers ────────────────────────────────────────────────

/** Milliseconds in one calendar day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Strips the time component from a Date, returning midnight UTC-0 as a
 * numeric timestamp. Used only for day-equality comparisons — avoids
 * browser-local midnight ambiguity by normalising both operands the same way.
 */
const dayKey = (d: Date): number =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Returns true when `a` and `b` fall on the same calendar day (browser-local).
 */
export const isSameCalendarDay = (a: Date, b: Date): boolean =>
  dayKey(a) === dayKey(b);

/**
 * Produces an array of one Date per calendar day from `start` to `end`
 * inclusive. Returns an empty array when `start > end`. Purely derived from
 * inputs — no side effects.
 */
export const eachDayOfRange = (start: Date, end: Date): Date[] => {
  const startKey = dayKey(start);
  const endKey = dayKey(end);
  if (startKey > endKey) return [];

  const count = Math.round((endKey - startKey) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, i) => new Date(startKey + i * DAY_MS));
};

// ── Label formatters ──────────────────────────────────────────────────────

/**
 * Short day label: "1", "2", …, "31" (no leading zero).
 * Falls back to the numeric date to avoid locale surprises.
 */
const formatDayNumber = (d: Date): string => String(d.getUTCDate());

/**
 * Month label shown above the day number on the first and last day of each
 * month. E.g. "May", "Jun".
 */
const formatMonth = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

/** True when `d` is the first calendar day of its month. */
const isFirstOfMonth = (d: Date): boolean => d.getUTCDate() === 1;

/** True when `d` is the last calendar day of its month (the next day rolls over).
 * Cells are generated at UTC midnight, so step a full day off the raw timestamp
 * and compare in UTC — mixing in local-time accessors would be off by one in
 * timezones behind UTC. */
const isLastOfMonth = (d: Date): boolean =>
  new Date(d.getTime() + DAY_MS).getUTCMonth() !== d.getUTCMonth();

/**
 * The first and last day of each month get a month label above the day number,
 * so the ribbon stays scannable as you scroll across month boundaries.
 */
const showsMonth = (d: Date): boolean => isFirstOfMonth(d) || isLastOfMonth(d);

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Standalone horizontal date-axis ribbon.
 *
 * Renders one cell per calendar day from `start` to `end` (inclusive).
 * The `today` cell receives a distinct highlight. Long ranges scroll
 * horizontally within a fixed-height container.
 *
 * @example
 * ```tsx
 * const start = new Date("2025-05-01");
 * const end   = new Date("2025-07-31");
 * <DateAxis start={start} end={end} />
 * ```
 */
export const DateAxis: Component<DateAxisProps> = (props) => {
  const resolvedToday = () => props.today ?? new Date();
  const cellW = () => props.cellWidth ?? 40;
  const days = () => eachDayOfRange(props.start, props.end);
  const clickable = () => props.onDayClick !== undefined;

  return (
    <div
      class="sui-date-axis"
      style={{ "--sui-date-axis-cell-width": `${cellW()}px` }}
      role="row"
      aria-label="Date axis"
    >
      <div class="sui-date-axis__track">
        <For each={days()}>
          {(day, idx) => {
            const isToday = () => isSameCalendarDay(day, resolvedToday());
            const isSelected = () =>
              props.selected !== undefined && isSameCalendarDay(day, props.selected);
            const monthLabel = () => (showsMonth(day) ? formatMonth(day) : "");
            const activate = () => props.onDayClick?.(day);
            const ctx = (): DateAxisDayContext => ({
              isToday: isToday(),
              isSelected: isSelected(),
              isFirstOfMonth: isFirstOfMonth(day),
              isLastOfMonth: isLastOfMonth(day),
              index: idx(),
            });

            return (
              <div
                class={[
                  "sui-date-axis__cell",
                  isToday() ? "sui-date-axis__cell--today" : "",
                  isSelected() ? "sui-date-axis__cell--selected" : "",
                  clickable() ? "sui-date-axis__cell--clickable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role={clickable() ? "button" : "columnheader"}
                tabindex={clickable() ? 0 : undefined}
                aria-label={day.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
                aria-current={isToday() ? "date" : undefined}
                aria-pressed={clickable() ? isSelected() : undefined}
                title={day.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
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
                {props.renderDay ? (
                  props.renderDay(day, ctx())
                ) : (
                  <>
                    <span class="sui-date-axis__month" aria-hidden="true">{monthLabel()}</span>
                    <span class="sui-date-axis__label">{formatDayNumber(day)}</span>
                    {isToday() && <span class="sui-date-axis__today-pip" aria-hidden="true" />}
                  </>
                )}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
