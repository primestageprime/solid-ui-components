// ============================================
// DateRangePicker — Pure calendar math (vanilla Date only)
// No component imports; no Luxon/date-fns dependency.
// ============================================

/** Milliseconds in one calendar day. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** True when both dates fall on the same calendar day (ignores time-of-day). */
export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Midnight epoch ms for a given date, discarding time-of-day. */
export const stripTime = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * True when `day` falls on or between `rangeStart` and `rangeEnd`
 * (day-level granularity, order-independent).
 */
export const isInRange = (
  day: Date,
  rangeStart: Date,
  rangeEnd: Date,
): boolean => {
  const lo = Math.min(stripTime(rangeStart), stripTime(rangeEnd));
  const hi = Math.max(stripTime(rangeStart), stripTime(rangeEnd));
  const d = stripTime(day);
  return d >= lo && d <= hi;
};

/**
 * Returns 42 Date objects (6 weeks) for a calendar grid.
 * Week starts on Monday. Pads leading/trailing days from adjacent months.
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
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
};

/**
 * Passes through positive values and `undefined` unchanged; logs and returns
 * `undefined` for non-positive values. Non-positive `maxRangeDays` is a
 * programmer error — the caller gets a console error and the constraint is
 * dropped rather than producing a degenerate always-disabled calendar.
 */
export const sanitizeMaxRangeDays = (
  raw: number | undefined,
): number | undefined => {
  if (raw === undefined) return undefined;
  if (raw > 0) return raw;
  console.error(
    `[DateRangePicker] maxRangeDays must be positive, got ${raw}. Treating as no constraint.`,
  );
  return undefined;
};

/** True when `day` is more than `maxDays` calendar days from `anchor`. */
export const isOutOfMaxRange = (
  day: Date,
  anchor: Date,
  maxDays: number,
): boolean => {
  const diff = Math.abs(stripTime(day) - stripTime(anchor));
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
): Date => {
  if (maxDays === undefined) return target;
  const anchorMs = stripTime(anchor);
  const diff = stripTime(target) - anchorMs;
  if (Math.abs(diff) <= maxDays * DAY_MS) return target;
  const maxMs = maxDays * DAY_MS;
  return diff > 0 ? new Date(anchorMs + maxMs) : new Date(anchorMs - maxMs);
};

/**
 * If the span between `start` and `end` exceeds `maxDays`, clamp `start`
 * forward so the range is exactly `maxDays` wide. Returns the range unchanged
 * when `maxDays` is undefined or the range already fits.
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

/** Add whole months to a date. Safe for month-boundary overflow (Date constructor normalizes). */
export const addMonths = (year: number, month: number, delta: number): { year: number; month: number } => {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

/**
 * Format a date as `MMM d` or `MMM d, yyyy` using `Intl.DateTimeFormat`.
 * `withYear=true` → `Apr 20, 2026`; `false` → `Apr 20`.
 */
export const formatShortDate = (date: Date, withYear: boolean): string =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date);

/** Format `MMMM yyyy`, e.g. `April 2026`. */
export const formatMonthYear = (year: number, month: number): string =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" })
    .format(new Date(year, month, 1));

/**
 * Format a committed range as a single trigger-label string.
 * Year is omitted from the start date when both ends fall in the same year.
 */
export const formatRangeLabel = (start: Date, end: Date): string => {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${formatShortDate(start, !sameYear)} \u2013 ${formatShortDate(end, true)}`;
};

/** Apply an `HH:mm` time string to a date, returning a new Date. */
export const applyTimeToDate = (date: Date, time: string): Date => {
  const [h, m] = time.split(":").map(Number);
  const hours = Number.isFinite(h) ? h : 0;
  const minutes = Number.isFinite(m) ? m : 0;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
};

/** Return the pair in ascending order. */
export const orderDates = (
  a: Date,
  b: Date,
): { start: Date; end: Date } =>
  a.getTime() <= b.getTime() ? { start: a, end: b } : { start: b, end: a };
