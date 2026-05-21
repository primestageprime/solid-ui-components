import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCompactDuration,
  formatCompactRange,
} from "./formatCompactRange";

describe("formatCompactDuration", () => {
  it("renders seconds for spans under one minute", () => {
    expect(formatCompactDuration(45_000)).toBe("45s");
  });

  it("renders minutes for spans under one hour", () => {
    expect(formatCompactDuration(15 * 60_000)).toBe("15m");
  });

  it("renders hours and minutes for spans under one day", () => {
    expect(formatCompactDuration(2 * 60 * 60_000 + 15 * 60_000)).toBe(
      "2h 15m",
    );
  });

  it("drops the minute component when it's zero", () => {
    expect(formatCompactDuration(3 * 60 * 60_000)).toBe("3h");
  });

  it("renders days and hours when both are present", () => {
    expect(formatCompactDuration(2 * 86_400_000 + 5 * 3_600_000)).toBe("2d 5h");
  });

  it("keeps the minute component past one day when hours are zero", () => {
    // 24h + 30m → "1d 30m" (hours = 0)
    expect(formatCompactDuration(86_400_000 + 30 * 60_000)).toBe("1d 30m");
  });

  it("renders bare days when hours and minutes are both zero", () => {
    expect(formatCompactDuration(20 * 86_400_000)).toBe("20d");
  });
});

describe("formatCompactRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("strips date from end when start and end share the same day", () => {
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 4, 13, 12, 5);
    expect(formatCompactRange(start, end)).toBe("May 13 11:35 → 12:05 · 30m");
  });

  it("strips month from end when start and end share the same month", () => {
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 4, 14, 12, 5);
    expect(formatCompactRange(start, end)).toBe(
      "May 13 11:35 → 14 12:05 · 1d 30m",
    );
  });

  it("shows full date on both sides when start and end are in different months", () => {
    const start = new Date(2026, 4, 13, 11, 35);
    const end = new Date(2026, 5, 2, 12, 5);
    expect(formatCompactRange(start, end)).toBe(
      "May 13 11:35 → Jun 02 12:05 · 20d 30m",
    );
  });

  it("renders 'ongoing' and computes duration vs. now when end is null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 12, 5));
    const start = new Date(2026, 4, 13, 11, 35);
    expect(formatCompactRange(start, null)).toBe(
      "May 13 11:35 → ongoing · 30m",
    );
  });
});
