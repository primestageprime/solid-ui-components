import { describe, expect, it } from "vitest";
import { calloutModeFor, minLeadersWidth } from "../../../../src/components/RateGauge/geometry";
import { SLOPE_FIXTURE, columnTextsFor } from "./slope-model";
import {
  CORNER_BOX,
  LEADER_BOX,
  SWEEP_MAX,
  SWEEP_MIN,
  SWEEP_STOPS,
  GRID_STOPS,
  inversionOf,
  observeSweep,
  observeSweepGrid,
  sweepReading,
} from "./sweep-model";

describe("payroll board — the value sweep", () => {
  it("sweeps the gauge's whole scale", () => {
    expect([SWEEP_MIN, SWEEP_MAX]).toEqual([...SLOPE_FIXTURE.domain]);
  });

  it("holds each gauge in a box on its own side of the breakpoint", () => {
    const labels = columnTextsFor(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario);
    expect(LEADER_BOX.width).toBeGreaterThanOrEqual(minLeadersWidth(LEADER_BOX.height, labels));
    expect(calloutModeFor(LEADER_BOX, labels)).toBe("leaders");
    expect(calloutModeFor(CORNER_BOX, labels)).toBe("corners");
  });

  it("prints value → label boxes → collisions", () => {
    console.log(observeSweep());
  });

  it("collapses to one row at the baseline in both gauges", () => {
    const at = sweepReading(SLOPE_FIXTURE.baseline);
    expect(at.boxes.map((b) => b.text)).toEqual([
      "Scenario = Baseline",
      "$37,978/mo",
      "Scenario = Baseline",
      "$37,978/mo",
    ]);
  });

  it("reads every stop without NaN", () => {
    for (const value of SWEEP_STOPS) {
      expect(JSON.stringify(sweepReading(value))).not.toMatch(/NaN/);
    }
  });

  it("holds the corner dial at one radius across the whole scale (printed)", () => {
    const stops = Array.from({ length: 81 }, (_, i) => SWEEP_MIN + i * 1000);
    const rows = [...stops, SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario].map((value) => ({
      value,
      corners: sweepReading(value).ring.corners,
    }));
    console.log(
      rows
        .filter((_, i) => i % 10 === 0 || i >= 81)
        .map((r) => `${String(r.value).padStart(7)}  C=${r.corners.toFixed(2)}`)
        .join("\n"),
    );
    expect(new Set(rows.map((r) => r.corners.toFixed(6))).size).toBe(1);
  });

  it("prints the baseline × scenario grid, collision-free with the inversion right", () => {
    console.log(observeSweepGrid());
    for (const baseline of GRID_STOPS) {
      for (const value of GRID_STOPS) {
        expect(sweepReading(value, baseline).collisions).toEqual([]);
        const inv = inversionOf(value, baseline);
        expect(Math.sign(inv.delta)).toBe(Math.sign(value - baseline));
        if (value !== baseline) expect(inv.braceUp).toBe(value > baseline);
        expect(inv.topRow).toBe(
          value > baseline ? "value" : value < baseline ? "baseline" : "valueAndBaseline",
        );
      }
    }
  });
});
