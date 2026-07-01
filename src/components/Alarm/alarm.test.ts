import { describe, it, expect } from "vitest";
import {
  detectRanges,
  padRanges,
  findHotZones,
  subtractZones,
  clampRanges,
  alarmPipeline,
} from "./alarm";

/* Tiny, deterministic data — three to twenty-odd points each. The pipeline
 * is total and pure, so exact-equality assertions are appropriate. */

describe("detectRanges", () => {
  it("returns nothing when all samples are below the threshold", () => {
    expect(
      detectRanges(
        [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        10,
      ),
    ).toEqual([]);
  });

  it("returns one range when the series stays above end-to-end", () => {
    expect(
      detectRanges(
        [
          { x: 0, y: 5 },
          { x: 1, y: 6 },
          { x: 2, y: 7 },
        ],
        4,
      ),
    ).toEqual([{ start: 0, end: 2 }]);
  });

  it("opens, closes, and reopens cleanly across two excursions", () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 0 },
      { x: 4, y: 5 },
      { x: 5, y: 0 },
    ];
    expect(detectRanges(data, 4)).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 4 },
    ]);
  });
});

describe("padRanges", () => {
  it("is a no-op when padFraction is 0", () => {
    const ranges = [{ start: 10, end: 20 }];
    expect(padRanges(ranges, 0, 100)).toEqual(ranges);
  });

  it("extends both ends by padFraction × xDomainWidth", () => {
    expect(padRanges([{ start: 50, end: 60 }], 0.1, 100)).toEqual([
      { start: 40, end: 70 },
    ]);
  });
});

describe("findHotZones", () => {
  it("returns nothing when no x position exceeds the depth threshold", () => {
    expect(
      findHotZones(
        [
          { start: 0, end: 5 },
          { start: 10, end: 15 },
        ],
        1,
      ),
    ).toEqual([]);
  });

  it("collapses heavy overlap into a single zone with the source count", () => {
    // 4 staggered ranges, threshold = 2 → triggers depth > 2 (≥ 3 concurrent).
    const ranges = [
      { start: 0, end: 10 },
      { start: 2, end: 12 },
      { start: 4, end: 14 },
      { start: 5, end: 15 },
    ];
    expect(findHotZones(ranges, 2)).toEqual([{ start: 4, end: 12, count: 4 }]);
  });

  it("does not trigger when only one pair of ranges overlaps (lanes preferred over block)", () => {
    expect(
      findHotZones(
        [
          { start: 0, end: 10 },
          { start: 5, end: 15 },
        ],
        5,
      ),
    ).toEqual([]);
  });

  it("treats a tie at a touch-point as no overlap (uses half-open interior test)", () => {
    expect(
      findHotZones(
        [
          { start: 0, end: 5 },
          { start: 5, end: 10 },
        ],
        1,
      ),
    ).toEqual([]);
  });
});

describe("subtractZones", () => {
  it("returns ranges unchanged when there are no zones", () => {
    const ranges = [
      { start: 0, end: 5 },
      { start: 10, end: 15 },
    ];
    expect(subtractZones(ranges, [])).toEqual(ranges);
  });

  it("drops any range that intersects a zone, keeps the rest", () => {
    const ranges = [
      { start: 0, end: 5 },
      { start: 6, end: 9 },
      { start: 12, end: 18 },
      { start: 25, end: 30 },
    ];
    expect(subtractZones(ranges, [{ start: 6, end: 15 }])).toEqual([
      { start: 0, end: 5 },
      { start: 25, end: 30 },
    ]);
  });
});

describe("clampRanges", () => {
  it("trims partial overhang and drops fully-outside ranges, preserving extra fields", () => {
    expect(
      clampRanges(
        [
          { start: -3, end: 4, count: 9 },
          { start: 5, end: 12, count: 7 },
          { start: 15, end: 20, count: 1 },
          { start: 2, end: 8, count: 4 },
        ],
        0,
        10,
      ),
    ).toEqual([
      { start: 0, end: 4, count: 9 },
      { start: 5, end: 10, count: 7 },
      { start: 2, end: 8, count: 4 },
    ]);
  });
});

describe("alarmPipeline", () => {
  it("composes the full pipeline into render-ready outputs", () => {
    const data: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const above = i <= 2 || (i >= 8 && i <= 10) || (i >= 16 && i <= 18);
      data.push({ x: i, y: above ? 60 : 40 });
    }
    const out = alarmPipeline(data, {
      yThreshold: 50,
      padFraction: 0.25,
      xDomainWidth: 20,
      depthThreshold: 2,
    });
    expect(out.ranges).toEqual([
      { start: 0, end: 2 },
      { start: 8, end: 10 },
      { start: 16, end: 18 },
    ]);
    expect(out.padded).toEqual([
      { start: -5, end: 7 },
      { start: 3, end: 15 },
      { start: 11, end: 23 },
    ]);
    expect(out.hotZones).toEqual([]);
    expect(out.visibleRanges).toEqual([
      { start: 0, end: 7 },
      { start: 3, end: 15 },
      { start: 11, end: 20 },
    ]);
  });

  it("removes ranges from visibleRanges when they sit inside a hot zone", () => {
    const ranges = [
      { start: 0, end: 8 },
      { start: 2, end: 9 },
      { start: 4, end: 10 },
      { start: 5, end: 11 },
      { start: 6, end: 12 },
    ];
    const zones = findHotZones(ranges, 2);
    expect(zones).toEqual([{ start: 4, end: 10, count: 5 }]);
    expect(subtractZones(ranges, zones)).toEqual([]);
  });
});
