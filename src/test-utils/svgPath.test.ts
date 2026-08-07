// ============================================
// The parser under the dag-svg routing suites. It is worth its own tests for
// one reason: every assertion in those suites is only as good as this, and the
// failure mode of a hand-rolled path parser is not a crash but a QUIETER
// assertion — a dropped command makes the path look shorter, a control point
// mistaken for a vertex makes a curve look like it clears an obstacle. Both
// read as green.
// ============================================

import { describe, it, expect } from "vitest";
import {
  parsePath,
  pathVertices,
  controlPoints,
  pathShape,
  samplePolyline,
} from "./svgPath";

describe("parsePath", () => {
  it("reads each operator with its own arity", () => {
    expect(parsePath("M 1 2 L 3 4 C 5 6 7 8 9 10 Q 11 12 13 14")).toEqual([
      { op: "M", coords: [1, 2] },
      { op: "L", coords: [3, 4] },
      { op: "C", coords: [5, 6, 7, 8, 9, 10] },
      { op: "Q", coords: [11, 12, 13, 14] },
    ]);
  });

  it("accepts the comma separators SVG allows between coordinate pairs", () => {
    // The routers emit `C 1 2, 3 4, 5 6` — commas between pairs, spaces within.
    expect(parsePath("M 0 0 C 1 2, 3 4, 5 6")).toEqual(
      parsePath("M 0 0 C 1 2 3 4 5 6"),
    );
  });

  it("keeps negative and fractional coordinates intact", () => {
    expect(parsePath("M -20 -4.5 L 0 1e2")[0].coords).toEqual([-20, -4.5]);
    expect(parsePath("M -20 -4.5 L 0 1e2")[1].coords).toEqual([0, 100]);
  });

  it("throws on a command it does not support rather than skipping it", () => {
    // Skipping would silently shorten the path, and a suite asserting on
    // vertex COUNT would then pass against a route it never saw.
    expect(() => parsePath("M 0 0 A 1 1 0 0 1 5 5")).toThrow(/unsupported/);
  });

  it("throws when a command is short of coordinates", () => {
    expect(() => parsePath("M 0 0 L 5")).toThrow(/wants 2 coordinates/);
  });

  it("throws on a non-numeric coordinate", () => {
    expect(() => parsePath("M 0 zero")).toThrow(/non-numeric/);
  });

  it("returns nothing for an empty string", () => {
    expect(parsePath("   ")).toEqual([]);
  });
});

describe("pathVertices / controlPoints", () => {
  const CURVE = "M 0 0 C 10 -50, 90 -50, 100 10";

  it("takes only the ON-curve landing point of a cubic", () => {
    // The corridor y of −50 is a control point. A vertex list that included it
    // would let a bezier 'prove' it clears an obstacle the stroke cuts through.
    expect(pathVertices(CURVE)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 10 },
    ]);
  });

  it("takes both controls of a cubic, in order, and neither endpoint", () => {
    expect(controlPoints(CURVE)).toEqual([
      { x: 10, y: -50 },
      { x: 90, y: -50 },
    ]);
  });

  it("takes the single control of a quadratic", () => {
    expect(controlPoints("M 0 0 Q 5 5 10 0")).toEqual([{ x: 5, y: 5 }]);
  });

  it("reports no controls for a pure polyline", () => {
    expect(controlPoints("M 0 0 L 5 0 L 5 5")).toEqual([]);
  });
});

describe("pathShape", () => {
  it("collapses a path to its operator sequence", () => {
    expect(pathShape("M 0 0 L 5 0")).toBe("ML");
    expect(pathShape("M 0 0 L 5 0 Q 6 0 6 1 L 6 9 Q 6 10 7 10 L 12 10")).toBe(
      "MLQLQL",
    );
  });
});

describe("samplePolyline", () => {
  it("walks the polyline by ARC LENGTH, not by vertex index", () => {
    // Legs of 100 and 10. Vertex-index sampling would put the midpoint at the
    // corner; by arc length it sits well along the long leg.
    const mid = samplePolyline(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 10 },
      ],
      3,
    )[1];
    expect(mid.y).toBe(0);
    expect(mid.x).toBeCloseTo(55, 6);
  });

  it("hits both endpoints exactly", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
    ];
    const out = samplePolyline(pts, 5);
    expect(out.length).toBe(5);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[4].x).toBeCloseTo(30, 6);
    expect(out[4].y).toBeCloseTo(40, 6);
  });

  it("returns the input unchanged when there is nothing to interpolate", () => {
    const single = [{ x: 1, y: 2 }];
    expect(samplePolyline(single, 10)).toEqual(single);
    // A zero-length path would divide by zero without the total===0 guard.
    const degenerate = [
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ];
    expect(samplePolyline(degenerate, 10)).toEqual(degenerate);
  });
});
