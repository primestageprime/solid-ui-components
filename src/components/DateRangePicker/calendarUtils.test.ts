import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAY_MS,
  addMonths,
  applyTimeToDate,
  cellInRange,
  cellMatchesBoundary,
  clampRange,
  clampToMaxRange,
  formatMonthYear,
  formatRangeLabel,
  formatShortDate,
  getCalendarDays,
  getDateParts,
  isInRange,
  isOutOfMaxRange,
  isSameDay,
  orderDates,
  sanitizeMaxRangeDays,
  stripTime,
} from "./calendarUtils";

// All local-TZ cases build dates with the `new Date(y, m, d, …)` local
// constructor so they read back identically through getDateParts regardless of
// the test runner's timezone. TZ-specific behavior is exercised with explicit
// UTC instants + `timeZone: "UTC"`.

describe("getDateParts", () => {
  it("reads browser-local calendar fields when no timezone is given", () => {
    const d = new Date(2026, 3, 20, 9, 30);
    expect(getDateParts(d, undefined)).toEqual({ year: 2026, month: 3, day: 20 });
  });

  it("resolves parts in an explicit timezone", () => {
    // 2026-04-20T02:00Z is still 2026-04-19 in Los Angeles (UTC-7).
    const instant = new Date(Date.UTC(2026, 3, 20, 2, 0));
    expect(getDateParts(instant, "America/Los_Angeles")).toEqual({
      year: 2026,
      month: 3,
      day: 19,
    });
    expect(getDateParts(instant, "UTC")).toEqual({
      year: 2026,
      month: 3,
      day: 20,
    });
  });
});

describe("isSameDay", () => {
  it("is true for the same day regardless of time-of-day", () => {
    expect(
      isSameDay(new Date(2026, 3, 20, 1, 0), new Date(2026, 3, 20, 23, 59)),
    ).toBe(true);
  });

  it("is false across a day boundary", () => {
    expect(isSameDay(new Date(2026, 3, 20), new Date(2026, 3, 21))).toBe(false);
  });
});

describe("stripTime", () => {
  it("collapses two times on the same day to one ordinal", () => {
    const a = stripTime(new Date(2026, 3, 20, 3, 0));
    const b = stripTime(new Date(2026, 3, 20, 22, 0));
    expect(a).toBe(b);
  });
});

describe("isInRange", () => {
  const start = new Date(2026, 3, 10);
  const end = new Date(2026, 3, 20);

  it("includes both inclusive endpoints", () => {
    expect(isInRange(start, start, end)).toBe(true);
    expect(isInRange(end, start, end)).toBe(true);
  });

  it("includes an interior day and excludes outside days", () => {
    expect(isInRange(new Date(2026, 3, 15), start, end)).toBe(true);
    expect(isInRange(new Date(2026, 3, 21), start, end)).toBe(false);
  });

  it("is order-independent in its bounds", () => {
    expect(isInRange(new Date(2026, 3, 15), end, start)).toBe(true);
  });
});

describe("cellInRange / cellMatchesBoundary", () => {
  it("matches a local cell against a UTC boundary instant", () => {
    const cell = new Date(2026, 3, 20); // local wall-clock midnight
    const boundary = new Date(Date.UTC(2026, 3, 20, 12, 0));
    expect(cellMatchesBoundary(cell, boundary, "UTC")).toBe(true);
  });

  it("treats the range as inclusive and order-independent", () => {
    const cell = new Date(2026, 3, 15);
    const s = new Date(Date.UTC(2026, 3, 20, 12, 0));
    const e = new Date(Date.UTC(2026, 3, 10, 12, 0));
    expect(cellInRange(cell, s, e, "UTC")).toBe(true);
  });
});

describe("getCalendarDays", () => {
  it("returns a 42-cell Monday-first grid covering the month", () => {
    const days = getCalendarDays(2026, 0); // January 2026
    expect(days).toHaveLength(42);
    // First cell is a Monday (getDay() === 1).
    expect(days[0].getDay()).toBe(1);
    // Jan 1 2026 is a Thursday → grid starts on Mon Dec 29 2025.
    expect(days[0].getFullYear()).toBe(2025);
    expect(days[0].getMonth()).toBe(11);
    expect(days[0].getDate()).toBe(29);
    // Every January day is present somewhere in the grid.
    const janDays = days.filter((d) => d.getMonth() === 0).map((d) => d.getDate());
    expect(janDays).toContain(1);
    expect(janDays).toContain(31);
  });
});

describe("sanitizeMaxRangeDays", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes through undefined and positive values", () => {
    expect(sanitizeMaxRangeDays(undefined)).toBeUndefined();
    expect(sanitizeMaxRangeDays(30)).toBe(30);
  });

  it("drops non-positive values with a console error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(sanitizeMaxRangeDays(0)).toBeUndefined();
    expect(sanitizeMaxRangeDays(-5)).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("isOutOfMaxRange", () => {
  const anchor = new Date(2026, 3, 10);
  it("is false within the cap and true beyond it", () => {
    expect(isOutOfMaxRange(new Date(2026, 3, 15), anchor, 5)).toBe(false);
    expect(isOutOfMaxRange(new Date(2026, 3, 16), anchor, 5)).toBe(true);
  });
});

describe("clampToMaxRange", () => {
  const anchor = new Date(2026, 3, 10);

  it("returns the target unchanged when within the cap or cap is undefined", () => {
    const within = new Date(2026, 3, 13);
    expect(clampToMaxRange(within, anchor, 5)).toBe(within);
    expect(clampToMaxRange(within, anchor, undefined)).toBe(within);
  });

  it("clamps forward and backward to exactly maxDays from the anchor", () => {
    const forward = clampToMaxRange(new Date(2026, 3, 30), anchor, 5);
    expect(stripTime(forward)).toBe(stripTime(anchor) + 5 * DAY_MS);
    const backward = clampToMaxRange(new Date(2026, 2, 1), anchor, 5);
    expect(stripTime(backward)).toBe(stripTime(anchor) - 5 * DAY_MS);
  });
});

describe("clampRange", () => {
  it("leaves a range that already fits", () => {
    const start = new Date(2026, 3, 10);
    const end = new Date(2026, 3, 12);
    expect(clampRange(start, end, 5)).toEqual({ start, end });
    expect(clampRange(start, end, undefined)).toEqual({ start, end });
  });

  it("pulls the start forward when the span exceeds the cap", () => {
    const start = new Date(2026, 3, 1);
    const end = new Date(2026, 3, 20);
    const clamped = clampRange(start, end, 5);
    expect(clamped.end).toBe(end);
    expect(clamped.start.getTime()).toBe(end.getTime() - 5 * DAY_MS);
  });
});

describe("addMonths", () => {
  it("advances and rewinds within a year", () => {
    expect(addMonths(2026, 3, 2)).toEqual({ year: 2026, month: 5 });
    expect(addMonths(2026, 3, -2)).toEqual({ year: 2026, month: 1 });
  });

  it("wraps across year boundaries in both directions", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths(2026, 5, 12)).toEqual({ year: 2027, month: 5 });
  });
});

describe("orderDates", () => {
  it("returns the pair ascending regardless of argument order", () => {
    const earlier = new Date(2026, 3, 10);
    const later = new Date(2026, 3, 20);
    expect(orderDates(later, earlier)).toEqual({ start: earlier, end: later });
    expect(orderDates(earlier, later)).toEqual({ start: earlier, end: later });
  });
});

describe("applyTimeToDate", () => {
  it("sets the wall-clock time on the same local day", () => {
    const result = applyTimeToDate(new Date(2026, 3, 20, 8, 30), "14:45");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(45);
  });

  it("defaults missing/garbage time parts to zero", () => {
    const result = applyTimeToDate(new Date(2026, 3, 20), "bad");
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe("formatting", () => {
  it("formatShortDate includes the year only when requested", () => {
    const d = new Date(2026, 3, 20);
    expect(formatShortDate(d, true)).toContain("2026");
    expect(formatShortDate(d, false)).not.toContain("2026");
  });

  it("formatMonthYear renders the month name and year", () => {
    expect(formatMonthYear(2026, 3)).toContain("2026");
  });

  it("formatRangeLabel omits the start year within a single year", () => {
    const label = formatRangeLabel(new Date(2026, 3, 20), new Date(2026, 3, 25));
    expect(label).toContain("–"); // en-dash separator
    // Only the end carries the year.
    expect(label.match(/2026/g)).toHaveLength(1);
  });

  it("formatRangeLabel shows both years across a year boundary", () => {
    const label = formatRangeLabel(
      new Date(2025, 11, 30),
      new Date(2026, 0, 2),
    );
    expect(label).toContain("2025");
    expect(label).toContain("2026");
  });
});
