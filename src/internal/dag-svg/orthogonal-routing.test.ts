// ============================================
// orthogonalAvoidingObstacles — 281 lines shipped to three Primitives
// (DagChart, SwimlaneChart via geometry/edge-views, AnimatedSwimlaneChart)
// with no test until now. Filed as dside sui#16434.
//
// WHAT IS ASSERTED, AND WHY NOT THE `d` STRING. The router composes its output
// from a corridor y and two clamped x positions, so a literal string pins six
// coordinates at once: every tuning change fails the suite and nothing tells
// you whether the path still clears the obstacle. These tests assert the three
// properties the module actually promises in its header —
//
//   1. every segment is horizontal or vertical (so arrowheads stay cardinal)
//   2. endpoints anchor to a rect EDGE, never a centre
//   3. the routed path does not pass through an obstacle
//
// — and pin exact coordinates only where a named constant IS the behaviour
// (SOURCE_EXIT, TARGET_APPROACH, OBSTACLE_MARGIN, and the two "don't punch
// back through the node" bounds).
//
// The clearance check samples the polyline rather than reusing the module's own
// `axisSegmentHitsRect`. A test that shared that implementation would agree
// with a bug in it, and `axisSegmentHitsRect` is exactly what decides which
// branch runs — so it is the last thing the oracle should depend on.
// ============================================

import { describe, it, expect } from "vitest";
import { orthogonalAvoidingObstacles } from "./orthogonal-routing";
import type { EdgeRect, ObstacleRect } from "./edge-routing";
import { pathVertices, pathShape, samplePolyline } from "../../test-utils";
import type { PathPoint } from "../../test-utils";

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

/** Strictly inside — a path that grazes an obstacle's boundary is fine, one
 *  that crosses it is not. */
const insideRect = (p: PathPoint, r: EdgeRect): boolean =>
  p.x > r.x - r.width / 2 &&
  p.x < r.x + r.width / 2 &&
  p.y > r.y - r.height / 2 &&
  p.y < r.y + r.height / 2;

/** Every point 200 samples along the routed polyline, for containment tests. */
const routeSamples = (d: string): PathPoint[] =>
  samplePolyline(pathVertices(d), 200);

const expectAllSegmentsAxisAligned = (d: string) => {
  const pts = pathVertices(d);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const dx = Math.abs(pts[i + 1].x - pts[i].x);
    const dy = Math.abs(pts[i + 1].y - pts[i].y);
    // One of the two must be zero. A diagonal leg is the one thing this
    // router exists to never emit — it would tilt the arrowhead off-cardinal.
    expect(
      dx < 1e-9 || dy < 1e-9,
      `segment ${i} from (${pts[i].x},${pts[i].y}) to (${pts[i + 1].x},${pts[i + 1].y}) is diagonal`,
    ).toBe(true);
  }
};

describe("orthogonalAvoidingObstacles — unobstructed", () => {
  it("draws ONE horizontal line between facing edges when the ports share a y", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 0), []);
    expect(pathShape(d)).toBe("ML");
    // 20 and 180, not 0 and 200: the line stops at each node's outer edge so
    // the arrowhead lands on the border rather than the centre.
    expect(pathVertices(d)).toEqual([
      { x: 20, y: 0 },
      { x: 180, y: 0 },
    ]);
  });

  it("draws a Z with two turns when the ports differ in y", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 100), []);
    expect(pathShape(d)).toBe("MLLL");
    expectAllSegmentsAxisAligned(d);
    const [start, knee1, knee2, end] = pathVertices(d);
    expect(start).toEqual({ x: 20, y: 0 });
    expect(end).toEqual({ x: 180, y: 100 });
    // The knee is vertical: both bends share an x.
    expect(knee1.x).toBe(knee2.x);
  });

  it("puts the knee TARGET_APPROACH from the target, not midway", () => {
    // The header once described the knee as sitting "midway between source and
    // target"; the code biases it to the target side so the final visible run
    // is a short 15px (≈8px of line + 7px of marker). Midway would be 100.
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 100), []);
    const [, knee] = pathVertices(d);
    expect(knee.x).toBe(165);
    expect(180 - knee.x).toBe(15);
  });

  it("never puts the knee back inside the source, even when the nodes are close", () => {
    // Source outer edge 20, target outer edge 30. The target-biased ideal is
    // 30 - 15 = 15, which is INSIDE the source's bbox. The lower bound wins.
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(50, 60), []);
    const [start, knee] = pathVertices(d);
    expect(start.x).toBe(20);
    expect(knee.x).toBe(24);
    expect(knee.x).toBeGreaterThan(start.x);
  });

  it("mirrors the whole construction when routing right-to-left", () => {
    const d = orthogonalAvoidingObstacles(rect(200, 0), rect(0, 100), []);
    expectAllSegmentsAxisAligned(d);
    const pts = pathVertices(d);
    expect(pts[0]).toEqual({ x: 180, y: 0 }); // source's LEFT edge
    expect(pts[pts.length - 1]).toEqual({ x: 20, y: 100 }); // target's RIGHT edge
    // Every x decreases or holds — the path never doubles back rightward.
    for (let i = 0; i < pts.length - 1; i += 1) {
      expect(pts[i + 1].x).toBeLessThanOrEqual(pts[i].x);
    }
  });
});

describe("orthogonalAvoidingObstacles — vertically stacked nodes", () => {
  it("draws ONE vertical line between facing edges when the centres align", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(0, 100), []);
    expect(pathShape(d)).toBe("ML");
    // Leaves the source's BOTTOM edge and enters the target's TOP edge. Side
    // anchors are unusable here: the path would double back through a node.
    expect(pathVertices(d)).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 90 },
    ]);
  });

  it("flips both anchors when the source sits BELOW the target", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 100), rect(0, 0), []);
    expect(pathVertices(d)).toEqual([
      { x: 0, y: 90 }, // source's TOP edge
      { x: 0, y: 10 }, // target's BOTTOM edge
    ]);
  });

  it("knees through the midpoint when the columns overlap but do not align", () => {
    // x-ranges [-20,20] and [10,50] overlap, so this takes the stacked path
    // even though the centres are 30 apart.
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(30, 100), []);
    expect(pathShape(d)).toBe("MLLL");
    expectAllSegmentsAxisAligned(d);
    expect(pathVertices(d)).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 50 }, // midway between the two facing edges
      { x: 30, y: 50 },
      { x: 30, y: 90 },
    ]);
  });
});

describe("orthogonalAvoidingObstacles — obstacle detours", () => {
  const source = rect(0, 0);
  const target = rect(200, 0);

  it("abandons the straight line when an obstacle sits on it", () => {
    const blocker = obstacle("mid", 100, 0);
    const clear = orthogonalAvoidingObstacles(source, target, []);
    const detoured = orthogonalAvoidingObstacles(source, target, [blocker]);
    expect(pathShape(clear)).toBe("ML");
    expect(pathShape(detoured)).toBe("MLLLLL"); // the 5-segment U
    expect(detoured).not.toBe(clear);
  });

  it("routes the U clear of the obstacle it is dodging", () => {
    const blocker = obstacle("mid", 100, 0);
    const d = orthogonalAvoidingObstacles(source, target, [blocker]);
    expectAllSegmentsAxisAligned(d);
    for (const p of routeSamples(d)) {
      expect(
        insideRect(p, blocker),
        `sample (${p.x},${p.y}) is inside the obstacle`,
      ).toBe(false);
    }
  });

  it("clears the obstacle's edge by OBSTACLE_MARGIN, above, when source ≤ target", () => {
    const blocker = obstacle("mid", 100, 0);
    const d = orthogonalAvoidingObstacles(source, target, [blocker]);
    const corridorY = Math.min(...pathVertices(d).map((p) => p.y));
    // Obstacle top edge is -10; the corridor sits a full 32 above it.
    expect(corridorY).toBe(-42);
  });

  it("drops the corridor BELOW instead when the source sits under the target", () => {
    const from = rect(0, 100);
    const to = rect(200, 0);
    const blocker = obstacle("mid", 100, 100);
    const d = orthogonalAvoidingObstacles(from, to, [blocker]);
    expectAllSegmentsAxisAligned(d);
    const corridorY = Math.max(...pathVertices(d).map((p) => p.y));
    // Obstacle bottom edge is 110; corridor 32 below it.
    expect(corridorY).toBe(142);
    for (const p of routeSamples(d)) {
      expect(insideRect(p, blocker)).toBe(false);
    }
  });

  it("leaves the source by SOURCE_EXIT before turning into the corridor", () => {
    const blocker = obstacle("mid", 100, 0);
    const [, lift] = pathVertices(
      orthogonalAvoidingObstacles(source, target, [blocker]),
    );
    expect(lift.x).toBe(28); // fromOuterX 20 + SOURCE_EXIT 8
  });

  it("enters the target by TARGET_APPROACH after leaving the corridor", () => {
    const blocker = obstacle("mid", 100, 0);
    const pts = pathVertices(
      orthogonalAvoidingObstacles(source, target, [blocker]),
    );
    const drop = pts[pts.length - 2];
    expect(drop.x).toBe(165); // toOuterX 180 − TARGET_APPROACH 15
  });

  it("ignores an obstacle outside the source→target x-band when siting the corridor", () => {
    // `far` sits well right of the target, so it must not drag the corridor
    // with it — only `mid` is in the band.
    const mid = obstacle("mid", 100, 0);
    const far = obstacle("far", 900, 0, 40, 400);
    const withFar = orthogonalAvoidingObstacles(source, target, [mid, far]);
    const withoutFar = orthogonalAvoidingObstacles(source, target, [mid]);
    expect(withFar).toBe(withoutFar);
  });

  it("clears the TALLEST in-band obstacle, not merely the first", () => {
    const shallow = obstacle("shallow", 80, 0, 20, 20);
    const tall = obstacle("tall", 130, 0, 20, 120);
    const d = orthogonalAvoidingObstacles(source, target, [shallow, tall]);
    const corridorY = Math.min(...pathVertices(d).map((p) => p.y));
    expect(corridorY).toBe(-92); // tall's top edge −60, minus OBSTACLE_MARGIN
    for (const p of routeSamples(d)) {
      expect(insideRect(p, shallow)).toBe(false);
      expect(insideRect(p, tall)).toBe(false);
    }
  });

  it("falls back to a source-adjacent lift when the obstacle is jammed against the source", () => {
    // Obstacle's left edge is 40; the ideal lift bound is 40 − 32 = 8, which is
    // inside the source. `liftLow > liftHigh`, so the router lifts right at the
    // source edge — and here that is CORRECT, because the lift at x=22 misses
    // the obstacle's 40..80 span entirely.
    //
    // This is the clamp giving up while the leg is still fine, which is exactly
    // why the sui#16435 fix keys on "does the leg hit something" and not on the
    // clamp. Pushing this obstacle 20px left (see the beside-source case below)
    // is what actually blocks the lift.
    const jammed = obstacle("jammed", 60, 0);
    const d = orthogonalAvoidingObstacles(source, rect(300, 100), [jammed]);
    const [, lift] = pathVertices(d);
    expect(lift.x).toBe(22); // fromOuterX 20 + 2, the hard lower bound
    expectAllSegmentsAxisAligned(d);
    for (const p of routeSamples(d)) {
      expect(insideRect(p, jammed)).toBe(false);
    }
  });

  it("approaches the target's TOP edge when an obstacle abuts its near side", () => {
    // Regression for sui#16435, fixed 2026-08-06. The descent from the corridor
    // to the target port used to cut straight down through this obstacle: the
    // corridor clears it overhead, but `dropX` is bounded above by the target's
    // own inner edge, so once the obstacle's far edge reaches past that bound
    // there is no horizontal arrival left at all.
    //
    // Here the obstacle spans x 240..280 and the target's left edge IS 280, so
    // every horizontal approach at y=100 crosses it. The router now comes down
    // the target's centre line into its top edge instead.
    const abutting = obstacle("beside-target", 260, 100);
    const d = orthogonalAvoidingObstacles(source, rect(300, 100), [abutting]);
    expect(d).toBe("M 20 0 L 28 0 L 28 58 L 300 58 L 300 90");
    expectAllSegmentsAxisAligned(d);
    for (const p of routeSamples(d)) {
      expect(insideRect(p, abutting), `sample (${p.x},${p.y}) is inside`).toBe(
        false,
      );
    }
    // Lands ON the target's top edge, not short of it and not inside it.
    expect(pathVertices(d).at(-1)).toEqual({ x: 300, y: 90 });
  });

  it("enters the BOTTOM edge instead when the corridor runs underneath", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 100), rect(300, 0), [
      obstacle("beside-target", 260, 0),
    ]);
    expect(pathVertices(d).at(-1)).toEqual({ x: 300, y: 10 });
    for (const p of routeSamples(d)) {
      expect(insideRect(p, obstacle("beside-target", 260, 0))).toBe(false);
    }
  });

  it("leaves the ordinary horizontal arrival alone when the descent is clear", () => {
    // This obstacle ALSO trips the `dropLow > dropHigh` clamp — right edge 270,
    // and 270 + OBSTACLE_MARGIN overshoots the target — but the descent at
    // x=278 misses it, so this path was always correct and must not be
    // rerouted. Keying the fix on the CLAMP rather than on the descent would
    // have redrawn this edge for no reason.
    const near = obstacle("near-target", 250, 100);
    const d = orthogonalAvoidingObstacles(source, rect(300, 100), [near]);
    expect(d).toBe("M 20 0 L 28 0 L 28 58 L 278 58 L 278 100 L 280 100");
    for (const p of routeSamples(d)) {
      expect(insideRect(p, near)).toBe(false);
    }
  });

  it("leaves the source's TOP edge when an obstacle abuts ITS side", () => {
    // The symmetric half of sui#16435, and the one I first argued could not
    // happen — on the reasoning that the lift runs before the corridor and so
    // leaves the obstacle behind. Wrong: the lift starts at `fromPortY`, inside
    // the source's y-band, so an obstacle that merely ABUTS the source is
    // crossed on the way up. No overlap with the node is needed. This obstacle
    // spans x 20..60 and the source's right edge is 20.
    const abutting = obstacle("beside-source", 40, 0);
    const d = orthogonalAvoidingObstacles(source, rect(150, 0), [abutting]);
    expect(d).toBe("M 0 -10 L 0 -42 L 115 -42 L 115 0 L 130 0");
    expectAllSegmentsAxisAligned(d);
    for (const p of routeSamples(d)) {
      expect(insideRect(p, abutting)).toBe(false);
    }
    // Still arrives horizontally — only the blocked END is rerouted.
    expect(pathVertices(d).at(-1)).toEqual({ x: 130, y: 0 });
  });

  it("reroutes BOTH ends when obstacles abut the source and the target", () => {
    const atSource = obstacle("beside-source", 40, 0);
    const atTarget = obstacle("beside-target", 260, 0);
    const d = orthogonalAvoidingObstacles(source, rect(300, 0), [
      atSource,
      atTarget,
    ]);
    // Edge-to-edge over the top: no side anchor is reachable at either end.
    expect(d).toBe("M 0 -10 L 0 -42 L 300 -42 L 300 -10");
    for (const p of routeSamples(d)) {
      expect(insideRect(p, atSource)).toBe(false);
      expect(insideRect(p, atTarget)).toBe(false);
    }
  });

  it("still ends on the target's SIDE edge in the ordinary detour", () => {
    // The fix's blast radius from the other side: a plain mid-band obstacle
    // must keep its horizontal arrival and its 5-segment U.
    const d = orthogonalAvoidingObstacles(source, target, [
      obstacle("mid", 100, 0),
    ]);
    expect(pathShape(d)).toBe("MLLLLL");
    expect(pathVertices(d).at(-1)).toEqual({ x: 180, y: 0 });
  });
});

describe("orthogonalAvoidingObstacles — explicit ports", () => {
  it("attaches the source leg to fromPortY instead of the node centre", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 0), [], {
      fromPortY: 6,
    });
    const pts = pathVertices(d);
    expect(pts[0]).toEqual({ x: 20, y: 6 });
    // No longer a shared y, so the straight-line case no longer applies.
    expect(pathShape(d)).toBe("MLLL");
  });

  it("attaches the target leg to toPortY instead of the node centre", () => {
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 0), [], {
      toPortY: -6,
    });
    const pts = pathVertices(d);
    expect(pts[pts.length - 1]).toEqual({ x: 180, y: -6 });
  });

  it("restores the single straight line when both ports agree again", () => {
    // Two edges out of one source, both pushed to the same y: the ports cancel
    // and the cheap path comes back. This is what stops pre-assigned ports
    // forcing a Z on every edge.
    const d = orthogonalAvoidingObstacles(rect(0, 0), rect(200, 40), [], {
      fromPortY: 40,
    });
    expect(pathShape(d)).toBe("ML");
    expect(pathVertices(d)).toEqual([
      { x: 20, y: 40 },
      { x: 180, y: 40 },
    ]);
  });
});
