// ============================================
// Cadence helpers — pure functions that produce Cell[] arrays for the
// cadence-generic DateAxis. Each helper covers the requested range with
// cells anchored to UTC so day-/week-/month-keying is stable across
// timezones.
// ============================================

/**
 * A single time bucket in a cadence-generic axis: anchored at `start`
 * (inclusive) and ending at `end` (exclusive). All cell helpers ship cells in
 * UTC so day-, week-, and month-keying stay consistent regardless of the host
 * timezone.
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
    if (m > 11) {
      m = 0;
      y += 1;
    }
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
