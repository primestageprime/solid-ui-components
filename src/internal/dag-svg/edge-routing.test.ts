// ============================================
// edge-routing — the curved and rounded-step counterparts to
// orthogonal-routing.ts, 256 lines with no test until now (dside sui#16434).
//
// Three exported routers, three different shapes of promise:
//
//   bezierThroughChannelPath   control points sit in the empty channel between
//                              columns, so the curve bows clear of in-column
//                              siblings
//   bezierAvoidingObstacles    same, plus a corridor around the NEAREST
//                              blocking rect, landing on a target CORNER
//   orthogonalStepPath         right angles with a corner radius clamped to
//                              half the shortest leg
//
// The beziers are asserted through their CONTROL NET rather than by sampling
// the curve. A cubic's control points are not on the stroke, so "is the curve
// inside the obstacle" would need de Casteljau — and the control net is the
// actual subject here anyway: every routing decision this module makes shows
// up as where it puts c1 and c2. `pathVertices` deliberately excludes control
// points so the two can't be confused (see src/test-utils/svgPath.ts).
// ============================================

import { describe, it, expect } from "vitest";
import {
  bezierThroughChannelPath,
  bezierAvoidingObstacles,
  orthogonalStepPath,
  type EdgeRect,
  type ObstacleRect,
} from "./edge-routing";
import { pathVertices, controlPoints, pathShape } from "../../test-utils";

const rect = (x: number, y: number, width = 40, height = 20): EdgeRect => ({
  x,
  y,
  width,
  height,
});

const obstacle = (
  id: string,
  x: number,
  y: number,
  width = 40,
  height = 20,
): ObstacleRect => ({ id, x, y, width, height });

describe("bezierThroughChannelPath", () => {
  it("anchors on the facing edges and puts both controls in the channel", () => {
    const d = bezierThroughChannelPath(rect(0, 0), rect(200, 100));
    expect(pathShape(d)).toBe("MC");
    expect(pathVertices(d)).toEqual([
      { x: 20, y: 0 },
      { x: 180, y: 100 },
    ]);
    // Both controls share the channel x — that is what makes the curve leave
    // and enter HORIZONTALLY instead of cutting the corner diagonally.
    expect(controlPoints(d)).toEqual([
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  it("mirrors the anchors when the target is to the left", () => {
    const d = bezierThroughChannelPath(rect(200, 0), rect(0, 100));
    expect(pathVertices(d)).toEqual([
      { x: 180, y: 0 }, // source's LEFT edge
      { x: 20, y: 100 }, // target's RIGHT edge
    ]);
  });

  it("routes a same-column edge through a channel LEFT of a positive column", () => {
    // x > 0 is a TODO column, so the channel sits on the side nearer the
    // chart centre — otherwise the curve bows out over the chart's margin.
    const d = bezierThroughChannelPath(rect(100, 0), rect(100, 100));
    expect(pathVertices(d)).toEqual([
      { x: 80, y: 0 },
      { x: 80, y: 100 },
    ]);
    for (const c of controlPoints(d)) expect(c.x).toBe(52); // 80 − SAME_COL_OFFSET
  });

  it("flips that channel to the RIGHT for a negative column", () => {
    const d = bezierThroughChannelPath(rect(-100, 0), rect(-100, 100));
    expect(pathVertices(d)).toEqual([
      { x: -80, y: 0 },
      { x: -80, y: 100 },
    ]);
    for (const c of controlPoints(d)) expect(c.x).toBe(-52); // −80 + SAME_COL_OFFSET
  });

  it("treats a sub-pixel column offset as the same column", () => {
    // The guard is `|dx| < 1`, not `dx === 0`: layout rounding must not flip an
    // edge between two completely different routing shapes.
    const nudged = bezierThroughChannelPath(rect(100, 0), rect(100.4, 100));
    const exact = bezierThroughChannelPath(rect(100, 0), rect(100, 100));
    expect(controlPoints(nudged)[0].x).toBe(controlPoints(exact)[0].x);
  });
});

describe("bezierAvoidingObstacles", () => {
  const source = rect(0, 0);
  const target = rect(300, 0);

  it("is the plain channel curve when nothing blocks the line", () => {
    const clear = rect(150, 400); // far below the source→target segment
    expect(
      bezierAvoidingObstacles(source, target, [
        { ...clear, id: "clear" } as ObstacleRect,
      ]),
    ).toBe(bezierThroughChannelPath(source, target));
  });

  it("lands on the target's near CORNER once something blocks it", () => {
    const d = bezierAvoidingObstacles(source, target, [obstacle("b", 150, 0)]);
    const [start, end] = pathVertices(d);
    expect(start).toEqual({ x: 20, y: 0 });
    // Corner, not mid-edge: the cubic's landing tangent is diagonal there, so
    // the marker-end arrowhead points into the corner instead of skewing.
    expect(end).toEqual({ x: 280, y: -10 });
  });

  it("lifts both controls to a corridor clear of the obstacle", () => {
    const blocker = obstacle("b", 150, 0);
    const d = bezierAvoidingObstacles(source, target, [blocker]);
    const controls = controlPoints(d);
    // Obstacle top edge −10, corridor a further OBSTACLE_MARGIN × 2.5 above.
    for (const c of controls) expect(c.y).toBe(-45);
    expect(controls[0].x).toBe(116); // obstacle's left edge − OBSTACLE_MARGIN
  });

  it("detours around the NEAREST blocker when several are on the line", () => {
    const near = obstacle("near", 100, 0);
    const far = obstacle("far", 220, 0);
    const d = bezierAvoidingObstacles(source, target, [far, near]);
    // 100 − 20 − 14 = 66 keyed off `near`; `far` would give 186. Passing them
    // far-first proves the sort runs rather than the input order deciding.
    expect(controlPoints(d)[0].x).toBe(66);
  });

  it("drops the corridor BELOW when the source sits under the target", () => {
    const from = rect(0, 100);
    const to = rect(300, 0);
    const blocker = obstacle("b", 150, 50);
    const d = bezierAvoidingObstacles(from, to, [blocker]);
    for (const c of controlPoints(d)) expect(c.y).toBe(95); // 60 + 35, below
    // …and lands on the target's BOTTOM corner to match the approach side.
    expect(pathVertices(d)[1]).toEqual({ x: 280, y: 10 });
  });

  it("ignores obstacles entirely for a same-column edge", () => {
    // Same column short-circuits before the blocker scan. Documented as a
    // limitation rather than an oversight — a stacked pair has no channel to
    // detour through.
    const from = rect(100, 0);
    const to = rect(100, 200);
    const between = obstacle("between", 100, 100);
    expect(bezierAvoidingObstacles(from, to, [between])).toBe(
      bezierThroughChannelPath(from, to),
    );
  });
});

describe("orthogonalStepPath", () => {
  it("draws a straight line between facing edges when the rows align", () => {
    const d = orthogonalStepPath(rect(0, 0), rect(200, 0));
    expect(pathShape(d)).toBe("ML");
    expect(pathVertices(d)).toEqual([
      { x: 20, y: 0 },
      { x: 180, y: 0 },
    ]);
  });

  it("rounds both elbows through the mid-channel when the rows differ", () => {
    const d = orthogonalStepPath(rect(0, 0), rect(200, 100));
    expect(pathShape(d)).toBe("MLQLQL");
    // Channel midway between the facing edges; corners cut CORNER_RADIUS back.
    expect(pathVertices(d)).toEqual([
      { x: 20, y: 0 },
      { x: 94, y: 0 }, // 100 − 6
      { x: 100, y: 6 }, // first elbow's exit
      { x: 100, y: 94 }, // 100 − 6
      { x: 106, y: 100 }, // second elbow's exit
      { x: 180, y: 100 },
    ]);
  });

  it("clamps the corner radius to half the shortest leg", () => {
    // Vertical leg is only 3px; a 6px radius would overshoot past the elbow
    // and draw the curve backwards.
    const d = orthogonalStepPath(rect(0, 0), rect(50, 3));
    const pts = pathVertices(d);
    expect(pathShape(d)).toBe("MLQLQL");
    expect(pts[1].x).toBe(23.5); // channel 25 − r, so r = 1.5 = 3/2
    expect(pts[2].y).toBe(1.5);
  });

  it("gives up on rounding entirely once the radius falls below a pixel", () => {
    const d = orthogonalStepPath(rect(0, 0), rect(42, 1.5));
    expect(pathShape(d)).toBe("MLLL"); // hard corners, no Q
  });

  it("detours a same-column edge to the RIGHT of BOTH nodes", () => {
    // The two nodes must differ in width. With equal widths the anchors
    // coincide, and the `Math.max` that makes the channel clear the WIDER of
    // the pair is indistinguishable from a `Math.min` that would run the
    // channel straight through it — a mutation of exactly that survived an
    // earlier version of this fixture.
    const narrow = rect(0, 0, 40, 20); // right edge 20
    const wide = rect(0, 100, 100, 20); // right edge 50
    const pts = pathVertices(orthogonalStepPath(narrow, wide));
    expect(pts[0]).toEqual({ x: 20, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 50, y: 100 });
    // 50 + SAME_COL_OFFSET. Keyed off the WIDE node: 20 + 28 = 48 would put
    // the channel inside `wide`, which extends to 50.
    expect(Math.max(...pts.map((p) => p.x))).toBe(78);
  });
});
