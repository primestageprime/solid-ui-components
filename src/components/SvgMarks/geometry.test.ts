import { describe, expect, it } from "vitest";
import { centerOf, fitEndLabels, inflate, segmentRects } from "./geometry";

const box = { x: 10, y: 20, width: 200, height: 26 };

describe("inflate", () => {
  it("grows a box by n on every side", () => {
    expect(inflate(box, 3)).toEqual({ x: 7, y: 17, width: 206, height: 32 });
  });

  it("collapses to the centre rather than producing a negative size", () => {
    expect(inflate({ x: 0, y: 0, width: 4, height: 4 }, -5)).toEqual({
      x: 2,
      y: 2,
      width: 0,
      height: 0,
    });
  });
});

describe("centerOf", () => {
  it("is the middle of the box", () => {
    expect(centerOf(box)).toEqual({ x: 110, y: 33 });
  });
});

describe("segmentRects", () => {
  it("maps fractions of the box width to x and width", () => {
    const out = segmentRects(box, [
      { from: 0, to: 0.25, fill: "a" },
      { from: 0.25, to: 1, fill: "b" },
    ]);
    expect(out.map((r) => [r.x, r.width, r.fill])).toEqual([
      [10, 50, "a"],
      [60, 150, "b"],
    ]);
  });

  it("marks a seam on a segment that starts where the previous one ended", () => {
    const out = segmentRects(box, [
      { from: 0, to: 0.5, fill: "a" },
      { from: 0.5, to: 1, fill: "b" },
    ]);
    expect(out.map((r) => r.seam)).toEqual([false, true]);
  });

  it("puts no seam on a segment with a gap before it", () => {
    const out = segmentRects(box, [
      { from: 0, to: 0.4, fill: "a" },
      { from: 0.5, to: 1, fill: "b" },
    ]);
    expect(out[1].seam).toBe(false);
  });

  it("clamps fractions into the box and drops empty segments", () => {
    const out = segmentRects(box, [
      { from: -0.5, to: 0.1, fill: "a" },
      { from: 0.6, to: 0.6, fill: "empty" },
      { from: 0.9, to: 1.4, fill: "c" },
    ]);
    expect(
      out.map((r) => [Math.round(r.x), Math.round(r.width), r.fill]),
    ).toEqual([
      [10, 20, "a"],
      [190, 20, "c"],
    ]);
  });

  it("keeps a sliver at least one pixel wide so it is never lost", () => {
    const out = segmentRects(box, [{ from: 0.5, to: 0.501, fill: "a" }]);
    expect(out[0].width).toBe(1);
  });
});

describe("fitEndLabels", () => {
  const glyph = 7;

  it("places the lead at the left and the trail at the right, both on the vertical middle", () => {
    const out = fitEndLabels(box, "#3", "$33.8k", glyph);
    expect(out.lead).toEqual({ x: 18, y: 33, text: "#3" });
    expect(out.trail).toEqual({ x: 202, y: 33, text: "$33.8k" });
  });

  it("drops the trail first when both do not fit", () => {
    const narrow = { ...box, width: 60 };
    const out = fitEndLabels(narrow, "#3", "$33.8k", glyph);
    expect(out.lead?.text).toBe("#3");
    expect(out.trail).toBeNull();
  });

  it("drops the lead too when even it does not fit", () => {
    const sliver = { ...box, width: 12 };
    const out = fitEndLabels(sliver, "#3", "$33.8k", glyph);
    expect(out).toEqual({ lead: null, trail: null });
  });

  it("treats a missing label as absent, not as empty text", () => {
    const out = fitEndLabels(box, null, "$1k", glyph);
    expect(out.lead).toBeNull();
    expect(out.trail?.text).toBe("$1k");
  });
});
