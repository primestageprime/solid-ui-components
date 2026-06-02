import { describe, it, expect } from "vitest";
import { buildDeviationBand } from "./deviationBand";

// Identity scales keep the assertions readable: x = index, y = value.
const cellToX = (i: number) => i;
const yToPlot = (v: number) => v;

describe("buildDeviationBand", () => {
  it("is positive where the reference runs above the series", () => {
    const runs = buildDeviationBand(
      [0, 1, 2],
      cellToX,
      yToPlot,
      () => 0, // series
      () => 5, // reference (above)
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].sign).toBe("positive");
  });

  it("is negative where the reference dips below the series", () => {
    const runs = buildDeviationBand(
      [0, 1],
      cellToX,
      yToPlot,
      () => 5, // series (above)
      () => 0, // reference
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].sign).toBe("negative");
  });

  it("splits at the crossing with a shared vertex", () => {
    // reference 0; series 10 → −10. reference−series: −10 then +10.
    const series = [10, -10];
    const runs = buildDeviationBand(
      [0, 1],
      cellToX,
      yToPlot,
      (_item, i) => series[i],
      () => 0,
    );
    expect(runs.map((r) => r.sign)).toEqual(["negative", "positive"]);
    expect(runs[0].points).toContain("0.5,0.0");
    expect(runs[1].points).toContain("0.5,0.0");
  });

  it("does NOT lock onto the start colour when the lines begin equal", () => {
    // Regression: lines touch at i0 (diff 0), then the reference sits below
    // the series for the rest. The whole span must read negative — the old
    // implementation stayed 'positive' because 0 → negative is not a strict
    // sign flip.
    const series = [0, 5, 5, 5];
    const runs = buildDeviationBand(
      [0, 1, 2, 3],
      cellToX,
      yToPlot,
      (_item, i) => series[i],
      () => 0, // reference flat at 0, below the series after i0
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].sign).toBe("negative");
  });

  it("breaks the band where either accessor returns null", () => {
    const series = [0, 0, null, 0, 0];
    const runs = buildDeviationBand(
      [0, 1, 2, 3, 4],
      cellToX,
      yToPlot,
      (_item, i) => series[i],
      () => 5, // reference above throughout → positive spans
    );
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.sign === "positive")).toBe(true);
  });

  it("ignores a lone valid sample that cannot enclose area", () => {
    const reference = [0, null, 0];
    const runs = buildDeviationBand(
      [0, 1, 2],
      cellToX,
      yToPlot,
      () => 5,
      (_item, i) => reference[i],
    );
    expect(runs).toHaveLength(0);
  });
});
