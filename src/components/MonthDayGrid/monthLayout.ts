// ============================================
// monthLayout — pure calendar geometry for MonthDayGrid. No Solid, no DOM.
// Dates are ISO day strings ("2026-11-04"), compared as strings, so there is
// no time zone anywhere.
// ============================================

/** One week row: seven slots, null where the slot falls outside the month. */
export type MonthWeek = readonly (string | null)[];

import { map } from "../../fn";

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (s: string): number[] => map(Number, s.split("-"));

/** Days in "YYYY-MM". */
export function daysInMonth(month: string): number {
  const [y, m] = parts(month);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Weekday of the 1st, 0 = Sunday … 6 = Saturday. */
export function firstWeekday(month: string): number {
  const [y, m] = parts(month);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

/**
 * The month as weeks of seven slots, starting on `weekStart` (0 = Sunday,
 * 1 = Monday). Leading and trailing slots outside the month are null.
 */
export function monthLayout(month: string, weekStart: 0 | 1 = 0): MonthWeek[] {
  const lead = (firstWeekday(month) - weekStart + 7) % 7;
  const n = daysInMonth(month);
  const slots: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= n; d++) slots.push(`${month}-${pad(d)}`);
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks: MonthWeek[] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

/** Column headings for `weekStart`, e.g. ["S","M",…] — short, for 44px columns. */
export function weekdayLabels(
  weekStart: 0 | 1 = 0,
): { short: string; long: string }[] {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const out: { short: string; long: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const long = names[(i + weekStart) % 7];
    out.push({ short: long.slice(0, 1), long });
  }
  return out;
}

/** The ISO day `delta` days from `iso`. */
export function addDays(iso: string, delta: number): string {
  const [y, m, d] = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Where a key moves focus inside the month, or null for a non-movement key.
 * Left/Right ±1 day, Up/Down ±7, Home/End the first/last day of the week row,
 * clamped to the month (focus never leaves it).
 */
export function dayMove(
  iso: string,
  key: string,
  month: string,
  weekStart: 0 | 1 = 0,
): string | null {
  const first = `${month}-01`;
  const last = `${month}-${pad(daysInMonth(month))}`;
  const clamp = (d: string) => (d < first ? first : d > last ? last : d);
  const col = (new Date(`${iso}T00:00:00Z`).getUTCDay() - weekStart + 7) % 7;
  switch (key) {
    case "ArrowRight":
      return clamp(addDays(iso, 1));
    case "ArrowLeft":
      return clamp(addDays(iso, -1));
    case "ArrowDown": {
      const d = addDays(iso, 7);
      return d > last ? iso : d;
    }
    case "ArrowUp": {
      const d = addDays(iso, -7);
      return d < first ? iso : d;
    }
    case "Home":
      return clamp(addDays(iso, -col));
    case "End":
      return clamp(addDays(iso, 6 - col));
    default:
      return null;
  }
}

/**
 * Keep only the weeks with at least one day on or after `from` (ISO day).
 * `from` undefined keeps every week.
 */
export function visibleWeeks(weeks: readonly MonthWeek[], from?: string): MonthWeek[] {
  if (from === undefined) return [...weeks];
  const out: MonthWeek[] = [];
  for (const w of weeks) {
    let keep = false;
    for (const d of w) if (d !== null && d >= from) keep = true;
    if (keep) out.push(w);
  }
  return out;
}
