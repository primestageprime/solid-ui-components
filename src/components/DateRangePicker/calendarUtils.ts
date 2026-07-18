// ============================================
// DateRangePicker — Pure calendar math (vanilla Date only)
// No component imports; no Luxon/date-fns dependency.
//
// TZ model:
// - Grid-coordinate helpers (getCalendarDays, addMonths) take numeric
//   year/month inputs and are inherently TZ-agnostic — the rendered grid
//   shows the requested calendar month in abstract, not a conversion of a
//   particular instant.
// - Date→parts helpers (stripTime, isSameDay, isInRange, isOutOfMaxRange,
//   clampToMaxRange, applyTimeToDate, formatShortDate, formatMonthYear,
//   formatRangeLabel) accept an optional `timeZone?: string` so that the
//   same `Date` instance maps to the same (year, month, day) the caller's
//   other UI renders — preventing off-by-one mismatches at TZ boundaries.
// - Omitting `timeZone` preserves the browser-local behavior (default).
// ============================================

/** Milliseconds in one calendar day. */
import { map } from "../../fn";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Extract `{ year, month (0-indexed), day }` from a `Date` in the given TZ.
 * When `timeZone` is omitted, reads the browser-local calendar fields directly
 * via `getFullYear`/`getMonth`/`getDate`.
 */
export const getDateParts = (
  date: Date,
  timeZone: string | undefined,
): { year: number; month: number; day: number } => {
  if (timeZone === undefined) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  return {
    year: Number(lookup.year),
    month: Number(lookup.month) - 1,
    day: Number(lookup.day),
  };
};

/** True when both dates fall on the same calendar day in the given TZ (ignores time-of-day). */
export const isSameDay = (a: Date, b: Date, timeZone?: string): boolean => {
  const pa = getDateParts(a, timeZone);
  const pb = getDateParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
};

/**
 * True when a cell `Date` built by `getCalendarDays` (browser-local wall-clock
 * midnight) represents the same calendar day as a user-supplied boundary
 * instant observed in `timeZone`. Lets the calendar grid compare its
 * synthetic cell Dates against real instants without double TZ conversion.
 */
export const cellMatchesBoundary = (
  cell: Date,
  boundary: Date,
  timeZone: string | undefined,
): boolean => {
  const pa = getDateParts(cell, undefined);
  const pb = getDateParts(boundary, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
};

/**
 * Stable day-ordinal for a `Date` in the given TZ. Used by range/clamp math;
 * returns epoch-ms at local midnight of that (year, month, day). Two dates
 * that share a calendar day (per `getDateParts`) produce the same value.
 */
export const stripTime = (d: Date, timeZone?: string): number => {
  const { year, month, day } = getDateParts(d, timeZone);
  return new Date(year, month, day).getTime();
};

/**
 * True when `day` falls on or between `rangeStart` and `rangeEnd`
 * (day-level granularity, order-independent). All three dates are interpreted
 * in the same TZ.
 */
export const isInRange = (
  day: Date,
  rangeStart: Date,
  rangeEnd: Date,
  timeZone?: string,
): boolean => {
  const lo = Math.min(
    stripTime(rangeStart, timeZone),
    stripTime(rangeEnd, timeZone),
  );
  const hi = Math.max(
    stripTime(rangeStart, timeZone),
    stripTime(rangeEnd, timeZone),
  );
  const d = stripTime(day, timeZone);
  return d >= lo && d <= hi;
};

/**
 * Cell-vs-instants variant of `isInRange`: `cell` is a synthetic calendar-
 * coordinate `Date` (browser-local midnight from `getCalendarDays`), while
 * `rangeStart`/`rangeEnd` are user-supplied instants observed in `timeZone`.
 */
export const cellInRange = (
  cell: Date,
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string | undefined,
): boolean => {
  const cellMs = stripTime(cell, undefined);
  const startMs = stripTime(rangeStart, timeZone);
  const endMs = stripTime(rangeEnd, timeZone);
  const lo = Math.min(startMs, endMs);
  const hi = Math.max(startMs, endMs);
  return cellMs >= lo && cellMs <= hi;
};

/**
 * Returns 42 Date objects (6 weeks) for a calendar grid.
 * Week starts on Monday. Pads leading/trailing days from adjacent months.
 * Inputs are calendar-coordinate; TZ does not apply here (the grid is the
 * requested month in abstract, not a conversion of a particular instant).
 *
 * @param year  Full year (e.g. 2026).
 * @param month 0-indexed month (0 = January, 11 = December).
 */
export const getCalendarDays = (year: number, month: number): Date[] => {
  const firstOfMonth = new Date(year, month, 1);
  // JS Date.getDay(): 0 = Sun … 6 = Sat. Monday-first offset: Sun → 6, Mon → 0.
  const dayOfWeek = firstOfMonth.getDay();
  const startOffset = (dayOfWeek + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i,
      ),
  );
};

/**
 * Passes through positive values and `undefined` unchanged; logs and returns
 * `undefined` for non-positive values. Non-positive `maxRangeDays` is a
 * programmer error — the caller gets a console error (with a stack trace)
 * and the constraint is dropped rather than producing a degenerate
 * always-disabled calendar.
 */
export const sanitizeMaxRangeDays = (
  raw: number | undefined,
): number | undefined => {
  if (raw === undefined) return undefined;
  if (raw > 0) return raw;
  console.error(
    new Error(
      `[DateRangePicker] maxRangeDays must be positive, got ${raw}. Treating as no constraint.`,
    ),
  );
  return undefined;
};

/** True when `day` is more than `maxDays` calendar days from `anchor`. */
export const isOutOfMaxRange = (
  day: Date,
  anchor: Date,
  maxDays: number,
  timeZone?: string,
): boolean => {
  const diff = Math.abs(stripTime(day, timeZone) - stripTime(anchor, timeZone));
  return diff > maxDays * DAY_MS;
};

/**
 * Clamp `target` to within `maxDays` calendar days of `anchor`.
 * Returns `target` unchanged when within range or when `maxDays` is undefined.
 */
export const clampToMaxRange = (
  target: Date,
  anchor: Date,
  maxDays: number | undefined,
  timeZone?: string,
): Date => {
  if (maxDays === undefined) return target;
  const anchorMs = stripTime(anchor, timeZone);
  const diff = stripTime(target, timeZone) - anchorMs;
  if (Math.abs(diff) <= maxDays * DAY_MS) return target;
  const maxMs = maxDays * DAY_MS;
  return diff > 0 ? new Date(anchorMs + maxMs) : new Date(anchorMs - maxMs);
};

/**
 * If the span between `start` and `end` exceeds `maxDays`, clamp `start`
 * forward so the range is exactly `maxDays` wide. Returns the range unchanged
 * when `maxDays` is undefined or the range already fits. Operates on raw
 * instants — TZ independent (absolute-time comparison).
 */
export const clampRange = (
  start: Date,
  end: Date,
  maxDays: number | undefined,
): { start: Date; end: Date } => {
  if (maxDays === undefined) return { start, end };
  const diffMs = end.getTime() - start.getTime();
  const maxMs = maxDays * DAY_MS;
  if (diffMs <= maxMs) return { start, end };
  return { start: new Date(end.getTime() - maxMs), end };
};

/** Add whole months to a numeric (year, month) pair. TZ does not apply. */
export const addMonths = (
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } => {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

/**
 * Format a date as `MMM d` or `MMM d, yyyy` using `Intl.DateTimeFormat`.
 * `withYear=true` → `Apr 20, 2026`; `false` → `Apr 20`.
 */
export const formatShortDate = (
  date: Date,
  withYear: boolean,
  timeZone?: string,
): string =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    ...(timeZone ? { timeZone } : {}),
  }).format(date);

/** Format `MMMM yyyy`, e.g. `April 2026`. Purely calendar-coordinate — no TZ needed. */
export const formatMonthYear = (year: number, month: number): string =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(year, month, 1),
  );

/**
 * Format a committed range as a single trigger-label string.
 * Year is omitted from the start date when both ends fall in the same year
 * (per the given TZ).
 */
export const formatRangeLabel = (
  start: Date,
  end: Date,
  timeZone?: string,
): string => {
  const sameYear =
    getDateParts(start, timeZone).year === getDateParts(end, timeZone).year;
  return `${formatShortDate(start, !sameYear, timeZone)} \u2013 ${formatShortDate(end, true, timeZone)}`;
};

/**
 * Return a new `Date` representing `HH:mm` on the same calendar day as `date`
 * (as observed in `timeZone`). Without a `timeZone`, constructs the instant in
 * the browser's local TZ. With a `timeZone`, uses the same TZ for day
 * resolution so the committed instant lines up with the calendar cell the
 * user clicked.
 */
export const applyTimeToDate = (
  date: Date,
  time: string,
  timeZone?: string,
): Date => {
  const [h, m] = map(Number, time.split(":"));
  const hours = Number.isFinite(h) ? h : 0;
  const minutes = Number.isFinite(m) ? m : 0;
  const { year, month, day } = getDateParts(date, timeZone);
  if (timeZone === undefined) {
    return new Date(year, month, day, hours, minutes, 0, 0);
  }
  return zonedDateTimeToInstant(year, month, day, hours, minutes, timeZone);
};

/**
 * Construct a UTC instant for a given wall-clock `(year, month, day, hours,
 * minutes)` in `timeZone`. Uses the standard two-pass offset resolution:
 * compute the UTC guess as if the wall-clock were UTC, then measure the real
 * offset for that moment in the target TZ, then apply the correction. This
 * resolves ambiguous local times deterministically.
 */
const zonedDateTimeToInstant = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string,
): Date => {
  const utcGuess = Date.UTC(year, month, day, hours, minutes, 0, 0);
  const observedParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));
  const lookup: Record<string, string> = {};
  for (const p of observedParts) lookup[p.type] = p.value;
  // `Intl.DateTimeFormat` can emit "24" for hour-after-midnight in some runtimes; normalize to 0.
  const obsHour = Number(lookup.hour) === 24 ? 0 : Number(lookup.hour);
  const observedUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    obsHour,
    Number(lookup.minute),
    Number(lookup.second),
    0,
  );
  const offsetMs = observedUtc - utcGuess;
  return new Date(utcGuess - offsetMs);
};

/** Return the pair in ascending order. */
export const orderDates = (a: Date, b: Date): { start: Date; end: Date } =>
  a.getTime() <= b.getTime() ? { start: a, end: b } : { start: b, end: a };
