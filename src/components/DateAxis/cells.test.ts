import { describe, it, expect } from "vitest";
import {
  type Cell,
  dailyCells,
  weeklyCells,
  monthlyCells,
  hourlyCells,
  isSameCalendarDay,
} from "./cells";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("dailyCells", () => {
  it("returns one cell per calendar day, inclusive of both endpoints", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    expect(cells).toHaveLength(5);
  });

  it("yields UTC-midnight starts and exclusive-next-midnight ends", () => {
    const [first] = dailyCells(d("2026-05-01"), d("2026-05-01"));
    expect(first.start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(first.end.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("returns empty when start > end", () => {
    expect(dailyCells(d("2026-05-05"), d("2026-05-01"))).toEqual([]);
  });
});

describe("weeklyCells", () => {
  it("anchors to Monday-starts by default and spans full weeks containing the range", () => {
    // 2026-05-01 is a Friday. Mon-start week containing it = 2026-04-27.
    const cells = weeklyCells(d("2026-05-01"), d("2026-05-15"));
    expect(cells[0].start.toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-04T00:00:00.000Z");
    expect(cells.at(-1)!.end.toISOString()).toBe("2026-05-18T00:00:00.000Z");
  });

  it("anchors to Sunday-starts when weekStart=0", () => {
    const cells = weeklyCells(d("2026-05-01"), d("2026-05-01"), 0);
    expect(cells[0].start.getUTCDay()).toBe(0);
  });
});

describe("monthlyCells", () => {
  it("returns one cell per month covered, anchored to the 1st", () => {
    const cells = monthlyCells(d("2026-04-15"), d("2026-06-10"));
    expect(cells).toHaveLength(3);
    expect(cells[0].start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(cells[2].end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("hourlyCells", () => {
  it("returns one cell per UTC hour covered, inclusive of both endpoints", () => {
    const cells = hourlyCells(
      new Date("2026-05-01T10:30:00.000Z"),
      new Date("2026-05-01T13:15:00.000Z"),
    );
    // 10:00, 11:00, 12:00, 13:00 = 4 hours
    expect(cells).toHaveLength(4);
    expect(cells[0].start.toISOString()).toBe("2026-05-01T10:00:00.000Z");
    expect(cells[0].end.toISOString()).toBe("2026-05-01T11:00:00.000Z");
  });
});

describe("isSameCalendarDay", () => {
  it("compares in UTC", () => {
    expect(
      isSameCalendarDay(
        new Date("2026-05-27T01:00:00.000Z"),
        new Date("2026-05-27T23:00:00.000Z"),
      ),
    ).toBe(true);
    expect(isSameCalendarDay(d("2026-05-27"), d("2026-05-28"))).toBe(false);
  });
});

// Type guard — keep the `Cell` import referenced so tsc doesn't strip it.
const _typeCheck: Cell = { start: new Date(0), end: new Date(0) };
void _typeCheck;
