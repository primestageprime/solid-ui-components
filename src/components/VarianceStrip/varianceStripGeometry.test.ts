import { describe, expect, it } from "vitest";
import { varianceStripGeometry } from "./varianceStripGeometry";

const xScale = (x: number) => x * 10; // 10px per unit
const band = { top: 100, height: 60 };

describe("varianceStripGeometry", () => {
  it("centres the zero line in the band and scales to the largest bar", () => {
    const g = varianceStripGeometry({
      data: [
        { x: 0, value: 50, kind: "revenue" },
        { x: 1, value: -100, kind: "costs" },
      ],
      xScale,
      step: 1,
      band,
      minExtent: 10,
    });
    expect(g.zeroY).toBe(130);
    expect(g.extent).toBe(100);
    // The largest bar reaches the edge pad: half height 30 less 4.
    expect(g.bars[1].height).toBeCloseTo(26, 5);
    expect(g.bars[1].y).toBe(130); // down from zero
    expect(g.bars[0].height).toBeCloseTo(13, 5);
    expect(g.bars[0].y).toBeCloseTo(117, 5); // up from zero
  });

  it("makes a bar a day's slot wide less the gap, centred on its x", () => {
    const g = varianceStripGeometry({
      data: [{ x: 3, value: 1, kind: "other" }],
      xScale,
      step: 1,
      band,
      minExtent: 1,
    });
    expect(g.bars[0].width).toBeCloseTo(8.5, 5);
    expect(g.bars[0].x).toBeCloseTo(30 - 4.25, 5);
  });

  it("holds a floor on the extent so a quiet strip does not fill the band", () => {
    const g = varianceStripGeometry({
      data: [{ x: 0, value: 2, kind: "other" }],
      xScale,
      step: 1,
      band,
      minExtent: 1000,
    });
    expect(g.extent).toBe(1000);
    expect(g.bars[0].height).toBe(1); // never thinner than 1px
  });

  it("is empty with no data", () => {
    const g = varianceStripGeometry({ data: [], xScale, step: 1, band, minExtent: 1 });
    expect(g.bars).toEqual([]);
    expect(g.extent).toBe(1);
  });
});
