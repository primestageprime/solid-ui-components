import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import {
  type TargetBar,
  type TargetBarSeries,
  TARGET_BAR_HALF,
  breakdownOf,
  outlineOf,
  placeBars,
  slotOffset,
  stackOf,
  stackTotal,
  tallestOf,
  targetBarAxis,
  targetBarRows,
} from "./targetBarGeometry";

const bar = (over: Partial<TargetBar>): TargetBar => ({
  period: 0,
  projected: 0,
  invoiced: 0,
  confirmed: 0,
  planned: 0,
  missing: 0,
  above: 0,
  ...over,
});

const series = (id: string, bars: readonly TargetBar[]): TargetBarSeries => ({
  id,
  label: id.toUpperCase(),
  bars,
  step: 100,
});

describe("slotOffset", () => {
  it("centres the group: three series at -1/0/+1 slots, one at 0", () => {
    expect([slotOffset(0, 3), slotOffset(1, 3), slotOffset(2, 3)]).toEqual([
      -0.3, 0, 0.3,
    ]);
    expect(slotOffset(0, 1)).toBe(0);
  });
});

describe("stackOf", () => {
  it("stacks bottom-up: invoiced, confirmed, planned, missing, above", () => {
    const b = bar({ invoiced: 1, confirmed: 2, planned: 3, missing: 4, above: 5 });
    expect(stackOf(b)).toEqual([
      { mark: "invoiced", value: 1 },
      { mark: "confirmed", value: 2 },
      { mark: "planned", value: 3 },
      { mark: "missing", value: 4 },
      { mark: "above", value: 5 },
    ]);
    expect(stackTotal(b)).toBe(15);
  });
});

describe("outlineOf", () => {
  it("draws three sides per projected bar, broken between bars", () => {
    const pts = outlineOf([bar({ period: 2, projected: 10 })], 0.3);
    expect(pts.length).toBe(5);
    expect(pts[0]).toEqual({ x: 2.3 - TARGET_BAR_HALF, y: 0 });
    expect(pts[1]).toEqual({ x: 2.3 - TARGET_BAR_HALF, y: 10 });
    expect(pts[2]).toEqual({ x: 2.3 + TARGET_BAR_HALF, y: 10 });
    expect(pts[3]).toEqual({ x: 2.3 + TARGET_BAR_HALF, y: 0 });
    expect(Number.isNaN(pts[4].x)).toBe(true);
  });

  it("draws nothing for a zero projection", () => {
    expect(outlineOf([bar({ projected: 0, invoiced: 5 })], 0)).toEqual([]);
  });
});

describe("tallestOf / targetBarAxis", () => {
  it("takes the taller of the lid and the stack", () => {
    const s = [
      series("a", [bar({ projected: 900, invoiced: 100 })]),
      series("b", [bar({ projected: 200, invoiced: 800, above: 600 })]),
    ];
    expect(tallestOf(s)).toBe(1400);
  });

  it("rounds a little above the value onto a nice step", () => {
    // 14000 * 1.08 = 15120; / 4 = 3780 -> step 5000; top 20000.
    expect(targetBarAxis(14000)).toEqual({
      top: 20000,
      ticks: [0, 5000, 10000, 15000, 20000],
    });
  });

  it("gives an empty chart a unit axis, never a zero span", () => {
    expect(targetBarAxis(0).top).toBeGreaterThan(0);
  });
});

describe("breakdownOf", () => {
  it("reports the excess when booked beyond the projection", () => {
    const b = breakdownOf(bar({ projected: 10, invoiced: 10, above: 3 }));
    expect([b.standing, b.amount]).toEqual(["above", 3]);
  });
  it("reports a past shortfall as missing", () => {
    const b = breakdownOf(bar({ projected: 10, invoiced: 6, missing: 4 }));
    expect([b.standing, b.amount]).toEqual(["missing", 4]);
  });
  it("reports what is still projected", () => {
    const b = breakdownOf(bar({ projected: 10, invoiced: 2, confirmed: 3, planned: 1 }));
    expect([b.standing, b.amount]).toEqual(["remaining", 4]);
  });
  it("reports on the projection when exactly filled", () => {
    const b = breakdownOf(bar({ projected: 10, invoiced: 10 }));
    expect([b.standing, b.amount]).toEqual(["on", 0]);
  });
});

describe("placeBars / targetBarRows (headless observation)", () => {
  it("places each series' bar at its period plus its slot offset", () => {
    const s = [
      series("a", [bar({ period: 1, projected: 5 })]),
      series("b", [bar({ period: 1, projected: 7, invoiced: 9, above: 2 })]),
    ];
    const placed = placeBars(s);
    expect(map((p: (typeof placed)[number]) => [p.seriesId, p.x], placed)).toEqual([
      ["a", 0.85],
      ["b", 1.15],
    ]);
    const rows = targetBarRows(s);
    // Printed, so a failing run shows the whole picture.
    console.table(rows);
    expect(rows[1]).toEqual({
      series: "B",
      period: 1,
      x: 1.15,
      projected: 7,
      stack: 11,
      standing: "above",
      amount: 2,
    });
  });
});
