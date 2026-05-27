import { describe, it, expect } from "vitest";
import {
  computeBreakpoints,
  maxDepthForWidth,
  DEFAULT_LANE_LAYOUT_CONFIG,
  type LaneLayoutConfig,
} from "./breakpoints";

describe("breakpoints", () => {
  const cfg: LaneLayoutConfig = {
    cardWidth: 250,
    cardGap: 60,
    lozengeWidth: 16,
    lozengeGap: 32,
    padding: 32,
  };

  it("computeBreakpoints emits depths 0..N with strictly-increasing minWidth", () => {
    const rows = computeBreakpoints(cfg, 3);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 3]);
    expect(rows.map((r) => r.visibleCols)).toEqual([1, 3, 5, 7]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].minWidth).toBeGreaterThan(rows[i - 1].minWidth);
    }
  });

  it("maxDepthForWidth(huge) ≥ maxDepthForWidth(tiny)", () => {
    expect(maxDepthForWidth(2000, cfg)).toBeGreaterThanOrEqual(
      maxDepthForWidth(400, cfg),
    );
  });

  it("maxDepthForWidth uses the exported default config when none passed", () => {
    expect(maxDepthForWidth(2000)).toBeGreaterThanOrEqual(0);
  });

  it("DEFAULT_LANE_LAYOUT_CONFIG.cardWidth is 250", () => {
    expect(DEFAULT_LANE_LAYOUT_CONFIG.cardWidth).toBe(250);
  });
});
