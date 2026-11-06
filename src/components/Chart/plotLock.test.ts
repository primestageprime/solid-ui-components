import { describe, expect, it } from "vitest";
import { createRoot } from "solid-js";
import {
  createPlotLock,
  dayCellEnds,
  dayCellX,
  dayCount,
  lockedInsets,
} from "./plotLock";

const DAY = 86_400_000;
const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

describe("lockedInsets", () => {
  it("takes the widest inset at each end when the boxes coincide", () => {
    // The payroll board's two charts, measured 2026-11-06: Cash Flow has the
    // wider y labels AND a line-label gutter; Pay levels has neither.
    const answers = lockedInsets([
      { natural: { left: 88, right: 134 }, origin: 0, width: 1581 },
      { natural: { left: 61, right: 14 }, origin: 0, width: 1581 },
    ]);
    expect(answers).toEqual([
      { left: 88, right: 134 },
      { left: 88, right: 134 },
    ]);
  });

  it("lines the PLOTS up on the page when the boxes do not", () => {
    const reports = [
      { natural: { left: 40, right: 10 }, origin: 100, width: 600 },
      { natural: { left: 20, right: 30 }, origin: 130, width: 560 },
    ];
    const answers = lockedInsets(reports);
    const pageSpan = answers.map((a, i) => [
      reports[i].origin + a.left,
      reports[i].origin + reports[i].width - a.right,
    ]);
    expect(pageSpan[0]).toEqual(pageSpan[1]);
    // Never narrower than a member's own need.
    answers.forEach((a, i) => {
      expect(a.left).toBeGreaterThanOrEqual(reports[i].natural.left);
      expect(a.right).toBeGreaterThanOrEqual(reports[i].natural.right);
    });
  });

  it("is empty with no reports", () => {
    expect(lockedInsets([])).toEqual([]);
  });
});

describe("the day-cell rule", () => {
  it("puts each day at its cell centre, and dayCellEnds agrees with it", () => {
    const first = day("2026-10-20");
    const last = day("2027-10-19");
    const days = dayCount(first, last);
    expect(days).toBe(365);
    const [left, right] = [88, 1447];
    const { x0, x1 } = dayCellEnds(first, last, left, right);
    // A LINEAR map of [first, last] onto [x0, x1] — what LevelsTimeline does —
    // must land every date where the day-cell rule does.
    const linear = (at: number) => x0 + ((at - first) / (last - first)) * (x1 - x0);
    const rows = ["2026-10-20", "2026-11-06", "2027-01-29", "2027-04-06", "2027-10-19"].map((iso) => ({
      date: iso,
      cell: dayCellX(day(iso), first, days, left, right).toFixed(2),
      linear: linear(day(iso)).toFixed(2),
    }));
    console.table(rows);
    for (const row of rows) expect(Math.abs(Number(row.cell) - Number(row.linear))).toBeLessThan(0.01);
    expect(x0 - left).toBeCloseTo((right - left) / days / 2);
    expect(right - x1).toBeCloseTo((right - left) / days / 2);
  });

  it("counts both ends of the domain", () => {
    expect(dayCount(day("2026-01-01"), day("2026-01-01"))).toBe(1);
    expect(dayCount(day("2026-01-01"), day("2026-01-01") + 6 * DAY)).toBe(7);
  });
});

describe("createPlotLock", () => {
  it("answers every member with the shared insets, and drops a member that leaves", () => {
    createRoot((dispose) => {
      const lock = createPlotLock();
      const cash = lock.join();
      const levels = lock.join();
      expect(cash.insets()).toBeUndefined();
      cash.report({ natural: { left: 88, right: 134 }, origin: 0, width: 1581 });
      levels.report({ natural: { left: 61, right: 14 }, origin: 0, width: 1581 });
      expect(levels.insets()).toEqual({ left: 88, right: 134 });
      expect(cash.insets()).toEqual({ left: 88, right: 134 });
      cash.leave();
      expect(levels.insets()).toEqual({ left: 61, right: 14 });
      expect(lock.observe()).toHaveLength(1);
      dispose();
    });
  });

  it("serves the first publisher's ticks, and hands them on when it leaves", () => {
    createRoot((dispose) => {
      const lock = createPlotLock();
      const a = lock.join();
      const b = lock.join();
      a.publishTicks([{ at: day("2026-11-01"), label: "Nov" }]);
      b.publishTicks([{ at: day("2026-11-06"), label: "2026-11-06" }]);
      expect(lock.ticks()).toEqual([{ at: day("2026-11-01"), label: "Nov" }]);
      a.leave();
      expect(lock.ticks()).toEqual([{ at: day("2026-11-06"), label: "2026-11-06" }]);
      dispose();
    });
  });
});
