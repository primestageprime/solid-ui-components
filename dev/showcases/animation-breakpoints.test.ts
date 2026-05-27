import { describe, it, expect } from "vitest";
import {
  computeBreakpoints,
  maxDepthForWidth,
  type LaneLayoutConfig,
} from "../../src/internal/animation/breakpoints";

// Default config matches today's hardcoded constants (the chart should
// behave identically at boot under the refactor).
const DEFAULT_CFG: LaneLayoutConfig = {
  cardWidth: 140,
  cardGap: 60,
  lozengeWidth: 16,
  lozengeGap: 32,
  padding: 32,
};

// For the default config:
//   colCenterGap = 140 + 60 = 200
//   baseContent  = 2 * (70 + 32 + 16) = 236
//   minWidth(d)  = 236 + 400 * d + 64  =  300 + 400 * d
//   → d=0: 300, d=1: 700, d=2: 1100, d=3: 1500, d=4: 1900
describe("computeBreakpoints", () => {
  it("returns one row per depth 0..maxDepth with cols = 2*d+1", () => {
    const rows = computeBreakpoints(DEFAULT_CFG, 4);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 3, 4]);
    expect(rows.map((r) => r.visibleCols)).toEqual([1, 3, 5, 7, 9]);
  });

  it("computes minWidth from the geometry formula", () => {
    const rows = computeBreakpoints(DEFAULT_CFG, 4);
    expect(rows[0].minWidth).toBe(300);
    expect(rows[1].minWidth).toBe(700);
    expect(rows[2].minWidth).toBe(1100);
    expect(rows[3].minWidth).toBe(1500);
    expect(rows[4].minWidth).toBe(1900);
  });

  it("handles depth 0 (cols=1) on its own", () => {
    const rows = computeBreakpoints(DEFAULT_CFG, 0);
    expect(rows).toEqual([{ depth: 0, visibleCols: 1, minWidth: 300 }]);
  });

  it("very-narrow cards admit more depths at the same stage width", () => {
    const narrow: LaneLayoutConfig = { ...DEFAULT_CFG, cardWidth: 40, cardGap: 10 };
    // colCenterGap = 50; baseContent = 2*(20+32+16)=136; pad=64
    // minWidth(d) = 200 + 100 d
    const rows = computeBreakpoints(narrow, 3);
    expect(rows[0].minWidth).toBe(200);
    expect(rows[3].minWidth).toBe(500);
  });

  it("very-wide lozenges push minWidth higher and fewer fit", () => {
    const wideLoz: LaneLayoutConfig = { ...DEFAULT_CFG, lozengeWidth: 80 };
    // baseContent = 2*(70+32+80)=364; minWidth(0)=364+64=428
    const rows = computeBreakpoints(wideLoz, 0);
    expect(rows[0].minWidth).toBe(428);
  });
});

describe("maxDepthForWidth", () => {
  it("returns 0 for widths below the depth-1 threshold", () => {
    expect(maxDepthForWidth(300, DEFAULT_CFG)).toBe(0);
    expect(maxDepthForWidth(699, DEFAULT_CFG)).toBe(0);
  });

  it("hits the next depth exactly at the threshold (exact-fit)", () => {
    expect(maxDepthForWidth(700, DEFAULT_CFG)).toBe(1);
    expect(maxDepthForWidth(1100, DEFAULT_CFG)).toBe(2);
    expect(maxDepthForWidth(1500, DEFAULT_CFG)).toBe(3);
  });

  it("compresses just-below the threshold to the next-smaller depth", () => {
    expect(maxDepthForWidth(1099, DEFAULT_CFG)).toBe(1);
    expect(maxDepthForWidth(1499, DEFAULT_CFG)).toBe(2);
  });

  it("returns 0 for ultra-narrow stages", () => {
    expect(maxDepthForWidth(100, DEFAULT_CFG)).toBe(0);
    expect(maxDepthForWidth(0, DEFAULT_CFG)).toBe(0);
  });

  it("narrower cards fit more depths in the same width", () => {
    const narrow: LaneLayoutConfig = { ...DEFAULT_CFG, cardWidth: 40, cardGap: 10 };
    // step = 100, base = 200 → at 700px: depth = (700-200)/100 = 5
    expect(maxDepthForWidth(700, narrow)).toBe(5);
    // vs default at 700px → depth 1
    expect(maxDepthForWidth(700, DEFAULT_CFG)).toBe(1);
  });

  it("wider lozenges fit fewer depths", () => {
    const wideLoz: LaneLayoutConfig = { ...DEFAULT_CFG, lozengeWidth: 80 };
    // baseContent = 364, padding = 64, step = 400
    // at 700px → (700-364-64)/400 = 0.68 → 0
    expect(maxDepthForWidth(700, wideLoz)).toBe(0);
  });

  it("defaults to the workshop's DEFAULT_LANE_LAYOUT_CONFIG when no config passed", () => {
    // Workshop default uses cardWidth=250 (wider than the legacy 140
    // MS_CARD_W). Geometry:
    //   colCenterGap = 250 + 60 = 310
    //   baseContent  = 2 * (125 + 32 + 16) = 346
    //   step         = 2 * 310 = 620
    //   minWidth(d)  = 346 + 620 * d + 64 = 410 + 620 * d
    //   → d=0: 410, d=1: 1030, d=2: 1650
    expect(maxDepthForWidth(410)).toBe(0);
    expect(maxDepthForWidth(1029)).toBe(0);
    expect(maxDepthForWidth(1030)).toBe(1);
    expect(maxDepthForWidth(1650)).toBe(2);
  });

  it("breakpoint row minWidth is the exact threshold for that depth", () => {
    const rows = computeBreakpoints(DEFAULT_CFG, 4);
    for (const row of rows) {
      expect(maxDepthForWidth(row.minWidth, DEFAULT_CFG)).toBeGreaterThanOrEqual(
        row.depth,
      );
      if (row.depth > 0) {
        expect(maxDepthForWidth(row.minWidth - 1, DEFAULT_CFG)).toBe(
          row.depth - 1,
        );
      }
    }
  });
});
