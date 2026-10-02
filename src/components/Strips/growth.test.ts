// Headless observation of the growth rules: a table of units over periods.
import { describe, expect, it } from "vitest";
import {
  type GrowthValue,
  clampCeiling,
  clampChurnPct,
  growthOfKind,
  nextUnits,
  normalizeGrowth,
  percentToBp,
  projectUnits,
  setGrowthCeiling,
  setGrowthChurn,
} from "./growth";

const cases: { name: string; start: number; growth: GrowthValue }[] = [
  { name: "none", start: 100, growth: { kind: "none" } },
  { name: "+12 a period", start: 100, growth: { kind: "units", perPeriod: 12 } },
  { name: "+12, churn 3%", start: 100, growth: { kind: "units", perPeriod: 12, churnPct: 3 } },
  { name: "+12, churn 3%, ceiling 130", start: 100, growth: { kind: "units", perPeriod: 12, churnPct: 3, ceiling: 130 } },
  { name: "5% a period", start: 100, growth: { kind: "percent", pctPerPeriod: 5 } },
  { name: "-10% a period", start: 100, growth: { kind: "percent", pctPerPeriod: -10 } },
  { name: "churn 10% alone", start: 100, growth: { kind: "none", churnPct: 10 } },
];

describe("growth projection", () => {
  it("prints N periods of units for each growth", () => {
    const periods = 8;
    const rows = cases.map((c) => {
      const units = projectUnits(c.start, c.growth, periods);
      return { growth: c.name, ...Object.fromEntries(units.map((u, i) => [`p${i}`, u])) };
    });
    console.table(rows);
    expect(rows).toHaveLength(cases.length);
  });

  it("none holds, units add, percent compounds", () => {
    expect(projectUnits(100, { kind: "none" }, 3)).toEqual([100, 100, 100, 100]);
    expect(projectUnits(100, { kind: "units", perPeriod: 12 }, 3)).toEqual([100, 112, 124, 136]);
    expect(projectUnits(100, { kind: "percent", pctPerPeriod: 5 }, 3)).toEqual([100, 105, 110, 116]);
  });

  it("churn loses floor(units x churn) before new units are admitted", () => {
    // 100 -> lose 3 -> 97 + 12 = 109; 109 -> lose 3 (floor 3.27) -> 106 + 12 = 118.
    expect(projectUnits(100, { kind: "units", perPeriod: 12, churnPct: 3 }, 2)).toEqual([100, 109, 118]);
  });

  it("the ceiling caps admissions and holds the line", () => {
    const g: GrowthValue = { kind: "units", perPeriod: 12, ceiling: 130 };
    expect(projectUnits(100, g, 4)).toEqual([100, 112, 124, 130, 130]);
  });

  it("units never go below zero", () => {
    expect(projectUnits(10, { kind: "units", perPeriod: -6 }, 3)).toEqual([10, 4, 0, 0]);
    expect(nextUnits(5, { kind: "none", churnPct: 100 })).toBe(0);
  });
});

describe("growth rules", () => {
  it("churn stays in 0..100", () => {
    expect(clampChurnPct(-5)).toBe(0);
    expect(clampChurnPct(150)).toBe(100);
    expect(clampChurnPct(3.5)).toBe(3.5);
    expect(setGrowthChurn({ kind: "none" }, 250)).toEqual({ kind: "none", churnPct: 100 });
    expect(setGrowthChurn({ kind: "none", churnPct: 3 }, undefined)).toEqual({ kind: "none" });
  });

  it("the ceiling is at least the starting units", () => {
    expect(clampCeiling(50, 120)).toBe(120);
    expect(clampCeiling(500, 120)).toBe(500);
    expect(setGrowthCeiling({ kind: "units", perPeriod: 2 }, 80, 100)).toEqual({
      kind: "units", perPeriod: 2, ceiling: 100,
    });
    expect(setGrowthCeiling({ kind: "none", ceiling: 300 }, undefined, 100)).toEqual({ kind: "none" });
  });

  it("changing kind keeps churn and ceiling and zeroes the rate", () => {
    const g: GrowthValue = { kind: "units", perPeriod: 12, churnPct: 3, ceiling: 500 };
    expect(growthOfKind("percent", g)).toEqual({ kind: "percent", pctPerPeriod: 0, churnPct: 3, ceiling: 500 });
    expect(growthOfKind("none", g)).toEqual({ kind: "none", churnPct: 3, ceiling: 500 });
  });

  it("normalize forces everything into range", () => {
    expect(
      normalizeGrowth({ kind: "percent", pctPerPeriod: -400, churnPct: 120, ceiling: 20 }, 100),
    ).toEqual({ kind: "percent", pctPerPeriod: -100, churnPct: 100, ceiling: 100 });
  });

  it("percent to basis points", () => {
    expect(percentToBp(3)).toBe(300);
    expect(percentToBp(0.5)).toBe(50);
  });
});
