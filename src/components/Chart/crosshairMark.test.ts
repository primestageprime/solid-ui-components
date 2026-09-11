import { describe, it, expect } from "vitest";
import { buildCrosshair } from "./crosshairMark";

describe("buildCrosshair", () => {
  it("draws the guide the full plot height at x", () => {
    const mark = buildCrosshair({
      x: 42,
      points: [],
      plotTop: 10,
      plotBottom: 90,
    });
    expect(mark.guide).toEqual({ x1: 42, x2: 42, y1: 10, y2: 90 });
  });

  it("defaults a dot's x to the guide's x when the point omits one", () => {
    const mark = buildCrosshair({
      x: 42,
      points: [{ id: "primary", y: 20 }],
      plotTop: 0,
      plotBottom: 100,
    });
    expect(mark.dots).toEqual([{ id: "primary", cx: 42, cy: 20 }]);
  });

  it("keeps a point's own x when it supplies one, unlike the guide's default", () => {
    // Value-addressed callers (Chart's Crosshair) find each series' nearest
    // point independently, so a dot's x can drift from the hovered x.
    const mark = buildCrosshair({
      x: 42,
      points: [{ id: "s1", x: 39, y: 20 }],
      plotTop: 0,
      plotBottom: 100,
    });
    expect(mark.dots[0]).toMatchObject({ cx: 39, cy: 20 });
  });

  it("carries stroke and class straight through, untouched", () => {
    const mark = buildCrosshair({
      x: 0,
      points: [{ id: "a", y: 1, stroke: "red", class: "my-line" }],
      plotTop: 0,
      plotBottom: 10,
    });
    expect(mark.dots[0]).toMatchObject({ stroke: "red", class: "my-line" });
  });

  it("returns one dot per point, in the given order", () => {
    const mark = buildCrosshair({
      x: 5,
      points: [
        { id: "a", y: 1 },
        { id: "b", y: 2 },
        { id: "c", y: 3 },
      ],
      plotTop: 0,
      plotBottom: 10,
    });
    expect(mark.dots.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("returns no dots for no points", () => {
    const mark = buildCrosshair({
      x: 0,
      points: [],
      plotTop: 0,
      plotBottom: 10,
    });
    expect(mark.dots).toEqual([]);
  });
});
