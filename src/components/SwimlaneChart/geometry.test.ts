import { describe, it, expect } from "vitest";
import { computeViewBounds, type NodePos } from "./geometry";

// Direct unit tests for the pure geometry functions that the DOM
// characterization suite can't reach headlessly (viewBounds aggregates the
// content bounding box, which the SVG viewBox derives from).

describe("computeViewBounds", () => {
  it("returns a zeroed box when there are no nodes", () => {
    expect(
      computeViewBounds({
        positions: new Map(),
        boundaryBadges: [],
        bottomBadges: [],
        badgeRadius: 11,
        edgeGutter: 40,
      }),
    ).toEqual({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      centerX: 0,
      centerY: 0,
      width: 0,
      height: 0,
    });
  });

  it("bounds the node rects and extends vertically by the edge gutter", () => {
    const positions = new Map<string, NodePos>([
      ["a", { x: 0, y: 0, width: 180, height: 60 }],
      ["b", { x: 260, y: 0, width: 180, height: 60 }],
    ]);
    const r = computeViewBounds({
      positions,
      boundaryBadges: [],
      bottomBadges: [],
      badgeRadius: 11,
      edgeGutter: 40,
    });
    // x: a.left=-90 … b.right=350; y: -30..30 extended ±40 → -70..70.
    expect(r).toEqual({
      minX: -90,
      maxX: 350,
      minY: -70,
      maxY: 70,
      centerX: 130,
      centerY: 0,
      width: 440,
      height: 140,
    });
  });

  it("includes boundary and bottom badges in the bounds", () => {
    const positions = new Map<string, NodePos>([
      ["a", { x: 0, y: 0, width: 100, height: 40 }],
    ]);
    const r = computeViewBounds({
      positions,
      boundaryBadges: [{ badgeX: 200, pillTopY: -50, pillBottomY: 80 }],
      bottomBadges: [{ x: -200, y: 100 }],
      badgeRadius: 10,
      edgeGutter: 0,
    });
    expect(r.minX).toBe(-210); // bottom badge at x=-200 − r10
    expect(r.maxX).toBe(210); // boundary badge at x=200 + r10
    expect(r.minY).toBe(-50); // boundary badge pillTopY
    expect(r.maxY).toBe(110); // bottom badge y=100 + r10
  });
});
