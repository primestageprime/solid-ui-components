import { find } from "../../fn";

/**
 * Shared Intl.DateTimeFormat that emits the four parts we need:
 * short month name, 2-digit day, 24-hour clock hour, 2-digit minute.
 * We hand-assemble the rendered string via `formatToParts` to keep a
 * comma-free `"May 13 11:35"` layout that doesn't drift across locales
 * or runtimes (the default `format()` output inserts a comma in en-US).
 */
const DATETIME_PARTS_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const pick = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string => find((p) => p.type === type, parts)?.value ?? "";

const normalizeHour = (h: string): string => (h === "24" ? "00" : h);

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/**
 * Format a single timestamp as `"MMM dd HH:mm"` in local time
 * (e.g. `"May 13 11:35"`). Exported so callers that mix custom JSX
 * with `formatCompactRange` output can keep adjacent timestamps in
 * the same shape.
 */
export const formatStartTimestamp = (d: Date): string => {
  const parts = DATETIME_PARTS_FMT.formatToParts(d);
  const month = pick(parts, "month");
  const day = pick(parts, "day");
  const hour = normalizeHour(pick(parts, "hour"));
  const minute = pick(parts, "minute");
  return `${month} ${day} ${hour}:${minute}`;
};

const formatEndTimestamp = (start: Date, end: Date): string => {
  const parts = DATETIME_PARTS_FMT.formatToParts(end);
  const month = pick(parts, "month");
  const day = pick(parts, "day");
  const hour = normalizeHour(pick(parts, "hour"));
  const minute = pick(parts, "minute");

  if (sameDay(start, end)) return `${hour}:${minute}`;
  if (sameMonth(start, end)) return `${day} ${hour}:${minute}`;
  return `${month} ${day} ${hour}:${minute}`;
};

/**
 * Format a duration as a compact, deterministic string. Unlike the
 * `Duration` component:
 *   - never falls back to a wall-clock date range at ≥7d
 *   - keeps a smaller-unit component when the next-larger is zero
 *     (e.g. 24h30m → "1d 30m", not "1d")
 *
 * Output grammar:
 *   - `<60s`   → "Ns"
 *   - `<1h`    → "Nm"
 *   - `<1d`    → "Nh" or "Nh Mm"
 *   - `≥1d`    → "Nd", "Nd Mh", or "Nd Mm"
 *     (hours preferred; minutes shown only when hours are zero — minute
 *     precision over multi-day windows isn't useful for the panes this
 *     serves. Bump to three components if that changes.)
 *
 * Seconds appear only in the `<60s` branch.
 */
export const formatCompactDuration = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHr = Math.floor(totalMin / 60);
  const days = Math.floor(totalHr / 24);
  const hours = totalHr % 24;
  const minutes = totalMin % 60;

  if (totalSec < 60) return `${totalSec}s`;
  if (totalHr < 1) return `${totalMin}m`;
  if (days < 1) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
  if (hours > 0) return `${days}d ${hours}h`;
  if (minutes > 0) return `${days}d ${minutes}m`;
  return `${days}d`;
};

/**
 * Format a date range compactly, keeping start and end but stripping
 * fields from the end side that the start side already conveys.
 *   - Same day:    "May 13 11:35 → 12:05 · 30m"
 *   - Same month:  "May 13 11:35 → 14 12:05 · 1d 30m"
 *   - Different:   "May 13 11:35 → Jun 02 12:05 · 20d 30m"
 *   - Ongoing:     "May 13 11:35 → ongoing · 30m" (duration vs. Date.now())
 *
 * `end === null` is the ongoing sentinel — matches the
 * "alarm-period.end" convention used by typical consumers.
 */
export const formatCompactRange = (start: Date, end: Date | null): string => {
  const startLabel = formatStartTimestamp(start);

  if (end === null) {
    const durationMs = Date.now() - start.getTime();
    return `${startLabel} → ongoing · ${formatCompactDuration(durationMs)}`;
  }

  const endLabel = formatEndTimestamp(start, end);
  const durationMs = end.getTime() - start.getTime();
  return `${startLabel} → ${endLabel} · ${formatCompactDuration(durationMs)}`;
};
