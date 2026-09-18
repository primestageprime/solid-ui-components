import { describe, expect, it } from "vitest";
import {
  FRAME,
  OUTPUTS,
  PRODUCING_KW,
  formatKw,
  percentOf,
  ribbonsOf,
  shareOf,
} from "./solar-sankey-model";

describe("the reading", () => {
  it("accounts for all of production — nothing created, nothing lost", () => {
    const total = OUTPUTS.reduce((sum, output) => sum + output.kw, 0);
    expect(total).toBeCloseTo(PRODUCING_KW, 9);
  });

  it("labels each output as its share of production", () => {
    expect(OUTPUTS.map((o) => [o.label, formatKw(o.kw), percentOf(o.kw, PRODUCING_KW)])).toEqual([
      ["Exporting", "1.6 kW", "36%"],
      ["Charging", "2.3 kW", "52%"],
      ["Consuming", "0.5 kW", "11%"],
    ]);
  });
});

describe("the ribbons", () => {
  const ribbons = ribbonsOf(OUTPUTS, PRODUCING_KW);

  it("are as thick as their share of the whole band", () => {
    for (const ribbon of ribbons)
      expect(ribbon.thickness).toBeCloseTo(
        shareOf(ribbon.output.kw, PRODUCING_KW) * FRAME.band,
        9,
      );
    const summed = ribbons.reduce((sum, r) => sum + r.thickness, 0);
    expect(summed).toBeCloseTo(FRAME.band, 9);
  });

  it("leave the source bar edge to edge, with no gap and no overlap", () => {
    expect(ribbons[0]!.sourceTop).toBeCloseTo((FRAME.height - FRAME.band) / 2, 9);
    for (let i = 1; i < ribbons.length; i += 1)
      expect(ribbons[i]!.sourceTop).toBeCloseTo(
        ribbons[i - 1]!.sourceTop + ribbons[i - 1]!.thickness,
        9,
      );
  });

  it("land on destination bars separated by exactly one gap", () => {
    for (let i = 1; i < ribbons.length; i += 1)
      expect(ribbons[i]!.sinkTop).toBeCloseTo(
        ribbons[i - 1]!.sinkTop + ribbons[i - 1]!.thickness + FRAME.gap,
        9,
      );
    // The whole fan sits centred in the frame.
    const last = ribbons[ribbons.length - 1]!;
    const bottom = last.sinkTop + last.thickness;
    expect(ribbons[0]!.sinkTop).toBeCloseTo(FRAME.height - bottom, 9);
  });

  it("draw a closed outline with no NaN in it", () => {
    for (const ribbon of ribbons) {
      expect(ribbon.path).not.toContain("NaN");
      expect(ribbon.path.endsWith("Z")).toBe(true);
    }
  });

  it("draw nothing, rather than NaN, with no production", () => {
    for (const ribbon of ribbonsOf(OUTPUTS, 0)) expect(ribbon.thickness).toBe(0);
  });
});
