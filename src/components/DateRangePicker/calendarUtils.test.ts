import { describe, it, expect } from "vitest";
import {
  clampEndToMaxDate,
  isAfterMaxDate,
  isOutOfMaxRange,
} from "./calendarUtils";

describe("isAfterMaxDate", () => {
  // maxDate is mid-day on 2026-05-15; the day containing it stays selectable.
  const maxDate = new Date(2026, 4, 15, 13, 30);

  it("returns false for a day before maxDate", () => {
    expect(isAfterMaxDate(new Date(2026, 4, 14), maxDate)).toBe(false);
  });

  it("returns false for the calendar day containing maxDate (mid-day cap)", () => {
    // Cell Dates are wall-clock midnight; the 15th's midnight is < maxDate
    // instant but shares its calendar day, so it must stay selectable.
    expect(isAfterMaxDate(new Date(2026, 4, 15), maxDate)).toBe(false);
  });

  it("returns true for a day strictly after maxDate's day", () => {
    expect(isAfterMaxDate(new Date(2026, 4, 16), maxDate)).toBe(true);
  });
});

describe("clampEndToMaxDate", () => {
  const maxDate = new Date(2026, 4, 15, 13, 30);

  it("returns end unchanged when maxDate is undefined", () => {
    const end = new Date(2026, 11, 31);
    expect(clampEndToMaxDate(end, undefined)).toBe(end);
  });

  it("returns end unchanged when end is on or before maxDate's day", () => {
    const end = new Date(2026, 4, 15, 23, 59);
    expect(clampEndToMaxDate(end, maxDate)).toBe(end);
  });

  it("clamps end to maxDate when end's day is after maxDate's day", () => {
    const end = new Date(2026, 4, 20);
    expect(clampEndToMaxDate(end, maxDate)).toBe(maxDate);
  });
});

describe("isOutOfMaxRange (unchanged behavior)", () => {
  const anchor = new Date(2026, 4, 10);

  it("false within span cap", () => {
    expect(isOutOfMaxRange(new Date(2026, 4, 13), anchor, 5)).toBe(false);
  });

  it("true beyond span cap", () => {
    expect(isOutOfMaxRange(new Date(2026, 4, 20), anchor, 5)).toBe(true);
  });
});
