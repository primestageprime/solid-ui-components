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
  const monthLabel =
    isFirstOfMonth(cell.start) || isLastOfMonth(cell.start)
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
