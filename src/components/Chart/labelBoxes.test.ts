import { describe, expect, it } from "vitest";
import {
  boxInsidePlot,
  boxesTouch,
  crossesAnySeries,
  segmentHitsBox,
  type Box,
  type PlotRect,
} from "./labelBoxes";

// A 200x100 plot and a 20x10 box at its centre. Round numbers keep every
// expected verdict readable without a diagram.
const PLOT: PlotRect = { left: 0, top: 0, right: 200, bottom: 100 };
const BOX: Box = { x0: 90, x1: 110, y0: 45, y1: 55 };

describe("boxesTouch", () => {
  it("reports two boxes that share area", () => {
    expect(boxesTouch(BOX, { x0: 100, x1: 120, y0: 45, y1: 55 }, 0)).toBe(true);
  });

  it("clears two boxes that overlap on one axis only", () => {
    expect(boxesTouch(BOX, { x0: 100, x1: 120, y0: 80, y1: 90 }, 0)).toBe(
      false,
    );
  });

  it("counts the gap as a touch", () => {
    const near: Box = { x0: 112, x1: 130, y0: 45, y1: 55 };
    expect(boxesTouch(BOX, near, 0)).toBe(false);
    expect(boxesTouch(BOX, near, 4)).toBe(true);
  });

  it("is symmetric", () => {
    const other: Box = { x0: 105, x1: 130, y0: 50, y1: 60 };
    expect(boxesTouch(BOX, other, 2)).toBe(boxesTouch(other, BOX, 2));
  });
});

describe("boxInsidePlot", () => {
  it("accepts a box wholly within the rectangle", () => {
    expect(boxInsidePlot(BOX, PLOT)).toBe(true);
  });

  it("rejects a box that leaves any edge", () => {
    expect(boxInsidePlot({ x0: -1, x1: 20, y0: 45, y1: 55 }, PLOT)).toBe(false);
    expect(boxInsidePlot({ x0: 190, x1: 210, y0: 45, y1: 55 }, PLOT)).toBe(
      false,
    );
    expect(boxInsidePlot({ x0: 90, x1: 110, y0: -1, y1: 9 }, PLOT)).toBe(false);
    expect(boxInsidePlot({ x0: 90, x1: 110, y0: 95, y1: 105 }, PLOT)).toBe(
      false,
    );
  });

  it("accepts a box that exactly meets every edge", () => {
    expect(boxInsidePlot({ x0: 0, x1: 200, y0: 0, y1: 100 }, PLOT)).toBe(true);
  });
});

describe("segmentHitsBox", () => {
  it("reports a segment straight through the box", () => {
    expect(segmentHitsBox({ x: 0, y: 50 }, { x: 200, y: 50 }, BOX)).toBe(true);
  });

  it("reports a steep segment that clips one corner", () => {
    expect(segmentHitsBox({ x: 85, y: 40 }, { x: 95, y: 50 }, BOX)).toBe(true);
  });

  it("clears a segment that passes above the box", () => {
    expect(segmentHitsBox({ x: 0, y: 20 }, { x: 200, y: 20 }, BOX)).toBe(false);
  });

  it("clears a segment that stops short of the box", () => {
    expect(segmentHitsBox({ x: 0, y: 50 }, { x: 80, y: 50 }, BOX)).toBe(false);
  });

  it("reports a segment that lies wholly inside the box", () => {
    // A flat line UNDER the caption is as unreadable as one that crosses it.
    expect(segmentHitsBox({ x: 95, y: 50 }, { x: 105, y: 50 }, BOX)).toBe(true);
  });

  it("reports a degenerate segment sitting on the box", () => {
    expect(segmentHitsBox({ x: 100, y: 50 }, { x: 100, y: 50 }, BOX)).toBe(
      true,
    );
  });

  it("clears a degenerate segment away from the box", () => {
    expect(segmentHitsBox({ x: 10, y: 10 }, { x: 10, y: 10 }, BOX)).toBe(false);
  });
});

describe("crossesAnySeries", () => {
  it("clears a box when no series is drawn", () => {
    expect(crossesAnySeries(BOX, [])).toBe(false);
  });

  it("ignores a single-point series, which draws no segment", () => {
    expect(crossesAnySeries(BOX, [[{ x: 100, y: 50 }]])).toBe(false);
  });

  it("reports the box when any one series runs through it", () => {
    const clear = [
      { x: 0, y: 10 },
      { x: 200, y: 10 },
    ];
    const through = [
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ];
    expect(crossesAnySeries(BOX, [clear])).toBe(false);
    expect(crossesAnySeries(BOX, [clear, through])).toBe(true);
  });

  it("tests every segment of a series, not only the first", () => {
    // The first segment runs flat along the top and misses. The second dives
    // and ends inside the box.
    const bent = [
      { x: 0, y: 10 },
      { x: 80, y: 10 },
      { x: 100, y: 50 },
    ];
    expect(crossesAnySeries(BOX, [bent])).toBe(true);
  });
});
