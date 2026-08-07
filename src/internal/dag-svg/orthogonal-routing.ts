/**
 * Orthogonal edge routing — strict right-angle paths with hard corners.
 *
 * Inspired by OMNeT++ NED schematic editor and ELK's layered orthogonal
 * router. All segments are horizontal or vertical; arrowheads always
 * orient cardinal. Obstacles are dodged via a channel above (or below)
 * picked by source-vs-target y relationship.
 */

import type { EdgeRect, ObstacleRect } from "./edge-routing";
import { map, filter, some } from "../../fn";

/** Vertical clearance the router leaves above/below an obstacle's edge.
 *  2rem at the default 16px base font size. */
const OBSTACLE_MARGIN = 32;
/** How far from the source's outer edge the first horizontal leg extends
 *  before the channel turn — keeps the bend 8px clear of the source. */
const SOURCE_EXIT = 8;
/** How close to the target the final approach segment runs. Tuned so the
 *  visible straight-line segment ending at the arrowhead is ~8px
 *  (8px clean line + 7px marker width). */
const TARGET_APPROACH = 15;
/** Legacy alias used by older code paths that haven't been split into
 *  source/target halves. */
const _EXIT_RUN = SOURCE_EXIT;

/**
 * Returns true if the axis-aligned segment from (ax, ay) to (bx, by) —
 * one of which must be horizontal or vertical — intersects `r` expanded
 * by `pad`. Used to test whether a routed leg crosses an unrelated node.
 */
function axisSegmentHitsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: EdgeRect,
  pad: number,
): boolean {
  const xL = r.x - r.width / 2 - pad;
  const xR = r.x + r.width / 2 + pad;
  const yT = r.y - r.height / 2 - pad;
  const yB = r.y + r.height / 2 + pad;
  if (Math.abs(ay - by) < 0.5) {
    // horizontal segment at y = ay
    if (ay < yT || ay > yB) return false;
    const sxMin = Math.min(ax, bx);
    const sxMax = Math.max(ax, bx);
    return sxMax >= xL && sxMin <= xR;
  }
  // vertical segment at x = ax
  if (ax < xL || ax > xR) return false;
  const syMin = Math.min(ay, by);
  const syMax = Math.max(ay, by);
  return syMax >= yT && syMin <= yB;
}

export interface OrthogonalRouteOptions {
  /**
   * Optional explicit y to attach the SOURCE leg to. Overrides the
   * default of `from.y`. Use when ports have been pre-assigned so
   * multiple edges from the same source don't stack.
   */
  fromPortY?: number;
  /**
   * Optional explicit y to attach the TARGET leg to. Overrides the
   * default of "centered on target's near edge."
   */
  toPortY?: number;
}

/**
 * Routes an orthogonal path from `from` (rect) to `to` (rect) avoiding
 * `obstacles` (rects). Returns an SVG `d` string with `M`/`L` only —
 * hard 90° corners, no curves.
 *
 * Geometry:
 *   1. Same y, no obstacle → single horizontal line into target's near side.
 *   2. Different y, no obstacle → Z-shape: horizontal out, vertical knee,
 *      horizontal in. Knee x sits midway between source and target.
 *   3. With obstacle → 5-segment U: horizontal out, vertical to corridor,
 *      horizontal across past obstacle, vertical to target port y,
 *      horizontal into target. Corridor passes ABOVE if source is at or
 *      above target's plane, BELOW otherwise.
 *
 * `obstacles` should NOT include the source or target node — caller filters.
 */
export function orthogonalAvoidingObstacles(
  from: EdgeRect,
  to: EdgeRect,
  obstacles: ObstacleRect[],
  opts: OrthogonalRouteOptions = {},
): string {
  const goingRight = to.x >= from.x;
  const fromOuterX = goingRight
    ? from.x + from.width / 2
    : from.x - from.width / 2;
  const toOuterX = goingRight ? to.x - to.width / 2 : to.x + to.width / 2;
  const fromPortY = opts.fromPortY ?? from.y;
  const toPortY = opts.toPortY ?? to.y;

  // Same-column / horizontally-overlapping case. When the source and
  // target have overlapping x-ranges, side anchors don't work — the
  // path would have to double back through one of the nodes. Route
  // via top/bottom edges instead.
  const fromXMin = from.x - from.width / 2;
  const fromXMax = from.x + from.width / 2;
  const toXMin = to.x - to.width / 2;
  const toXMax = to.x + to.width / 2;
  const xOverlap = !(toXMax < fromXMin || toXMin > fromXMax);
  if (xOverlap) {
    const sourceAbove = from.y < to.y;
    const fromEdgeY = sourceAbove
      ? from.y + from.height / 2
      : from.y - from.height / 2;
    const toEdgeY = sourceAbove ? to.y - to.height / 2 : to.y + to.height / 2;
    if (Math.abs(from.x - to.x) < 0.5) {
      // Aligned: single straight vertical.
      return `M ${from.x} ${fromEdgeY} L ${to.x} ${toEdgeY}`;
    }
    // Offset but overlapping: bottom-out then knee at midX then into top.
    const midY = (fromEdgeY + toEdgeY) / 2;
    return [
      `M ${from.x} ${fromEdgeY}`,
      `L ${from.x} ${midY}`,
      `L ${to.x} ${midY}`,
      `L ${to.x} ${toEdgeY}`,
    ].join(" ");
  }

  // Same y, straight horizontal line if no obstacle blocks it.
  if (Math.abs(fromPortY - toPortY) < 0.5) {
    const blocked = some(
      (o: ObstacleRect) =>
        axisSegmentHitsRect(fromOuterX, fromPortY, toOuterX, toPortY, o, 2),
      obstacles,
    );
    if (!blocked) {
      return `M ${fromOuterX} ${fromPortY} L ${toOuterX} ${toPortY}`;
    }
  }

  // Minimum-turn Z-shape: 3 segments, 2 turns. Knee biased to the
  // target side so the final approach is ~8px clean line + 7px arrow,
  // and the rest of the horizontal travel lives on the source leg.
  // Lower-bounded by fromOuterX + 4 so we never punch back through
  // the source's bbox.
  const channelX = goingRight
    ? Math.max(fromOuterX + 4, toOuterX - TARGET_APPROACH)
    : Math.min(fromOuterX - 4, toOuterX + TARGET_APPROACH);
  const zSegments: Segment[] = [
    { ax: fromOuterX, ay: fromPortY, bx: channelX, by: fromPortY },
    { ax: channelX, ay: fromPortY, bx: channelX, by: toPortY },
    { ax: channelX, ay: toPortY, bx: toOuterX, by: toPortY },
  ];
  if (!segmentsHitAny(zSegments, obstacles, 2)) {
    return segmentsToPath(zSegments);
  }

  // Obstacle blocks the Z. Detour via corridor above (or below) any
  // obstacle whose y-band overlaps the straight line from source to
  // target. Corridor side based on source vs target y, matching the
  // "left-node-below-target → bottom approach" convention we use today.
  const above = fromPortY <= toPortY;
  const obsInBand = filter((o) => {
    const oxL = o.x - o.width / 2;
    const oxR = o.x + o.width / 2;
    const xMin = Math.min(fromOuterX, toOuterX);
    const xMax = Math.max(fromOuterX, toOuterX);
    return oxR >= xMin && oxL <= xMax;
  }, obstacles);
  let corridorY: number;
  if (obsInBand.length > 0) {
    corridorY = above
      ? Math.min(...map((o) => o.y - o.height / 2, obsInBand)) - OBSTACLE_MARGIN
      : Math.max(...map((o) => o.y + o.height / 2, obsInBand)) +
        OBSTACLE_MARGIN;
  } else {
    corridorY = above ? toPortY - OBSTACLE_MARGIN : toPortY + OBSTACLE_MARGIN;
  }

  // Lift / drop x positions. Treat each as bounded by:
  //   liftX: lower = fromOuterX (don't punch back through source's bbox)
  //          upper = leftmost obstacle edge − margin (don't punch the obstacle)
  //          ideal = fromOuterX + EXIT_RUN (clean exit run from source)
  //   dropX: lower = rightmost obstacle edge + margin
  //          upper = toOuterX (don't punch past target's inner edge)
  //          ideal = toOuterX − EXIT_RUN
  // (Mirror the lower/upper roles when going right-to-left.)
  // When lower > upper, the obstacle is jammed against the node — fall
  // back to the source-/target-adjacent edge (lift right at fromOuterX
  // or drop right at toOuterX).
  //
  // "Trust the corridor to lift above it" used to justify BOTH fallbacks here.
  // It is only true of the lift. The lift happens BEFORE the corridor, so
  // rising from fromOuterX + 2 leaves the obstacle behind; the drop happens
  // AFTER it, and has to come back down through the obstacle's y-band to reach
  // the port. The target-side case is handled below, after `dropX` is known —
  // see the descent check (dside sui#16435).
  const obsXLefts = map((o) => o.x - o.width / 2, obsInBand);
  const obsXRights = map((o) => o.x + o.width / 2, obsInBand);
  let liftX: number;
  let dropX: number;
  if (goingRight) {
    const liftLow = fromOuterX + 2;
    const liftHigh =
      obsXLefts.length > 0
        ? Math.min(...obsXLefts) - OBSTACLE_MARGIN
        : Infinity;
    const liftIdeal = fromOuterX + SOURCE_EXIT;
    liftX =
      liftLow > liftHigh
        ? liftLow
        : Math.max(liftLow, Math.min(liftIdeal, liftHigh));
    const dropLow =
      obsXRights.length > 0
        ? Math.max(...obsXRights) + OBSTACLE_MARGIN
        : -Infinity;
    const dropHigh = toOuterX - 2;
    // dropX biased close to the target so the final horizontal run is
    // ~TARGET_APPROACH (≈5px clean line + 7px arrow).
    const dropIdeal = toOuterX - TARGET_APPROACH;
    dropX =
      dropLow > dropHigh
        ? dropHigh
        : Math.min(dropHigh, Math.max(dropIdeal, dropLow));
  } else {
    const liftHigh = fromOuterX - 2;
    const liftLow =
      obsXRights.length > 0
        ? Math.max(...obsXRights) + OBSTACLE_MARGIN
        : -Infinity;
    const liftIdeal = fromOuterX - SOURCE_EXIT;
    liftX =
      liftLow > liftHigh
        ? liftHigh
        : Math.min(liftHigh, Math.max(liftIdeal, liftLow));
    const dropHigh =
      obsXLefts.length > 0
        ? Math.min(...obsXLefts) - OBSTACLE_MARGIN
        : Infinity;
    const dropLow = toOuterX + 2;
    const dropIdeal = toOuterX + TARGET_APPROACH;
    dropX =
      dropLow > dropHigh
        ? dropLow
        : Math.max(dropLow, Math.min(dropIdeal, dropHigh));
  }

  // The two VERTICAL legs are what the clamps above cannot always place safely,
  // and the failure is symmetric (dside sui#16435).
  //
  // Each of `liftX` and `dropX` is bounded by its own node's outer edge —
  // "don't punch back through the bbox" — so when an obstacle's near edge
  // reaches past that bound, there is no x left that is both clear of the
  // obstacle and on the right side of the node. The clamp yields to the node,
  // and the leg then runs straight through the obstacle the corridor just
  // detoured around: the corridor goes OVER an obstacle, never PAST it.
  //
  // An earlier version of this comment claimed only the target side could fail,
  // on the reasoning that the lift happens BEFORE the corridor and therefore
  // leaves the obstacle behind. That is wrong. The lift starts at `fromPortY`,
  // which is inside the source's y-band, so an obstacle merely ABUTTING the
  // source — near edge at or inside `fromOuterX + 2`, no overlap with the node
  // required — is crossed on the way up. A grid sweep over 1808 layouts found
  // 16 crossings, and every one of them was this source-side case.
  //
  // Both are asked as "does this specific leg hit something" rather than "did
  // the clamp give up", because the two are not the same set. A clamp also
  // gives up when the obstacle merely comes CLOSE to a node — near enough that
  // OBSTACLE_MARGIN doesn't fit, but still clear of the leg — and those paths
  // are correct as they stand. Rerouting on the clamp would redraw working
  // edges for no reason.
  const liftBlocked = some(
    (o: ObstacleRect) =>
      axisSegmentHitsRect(liftX, fromPortY, liftX, corridorY, o, 2),
    obstacles,
  );
  const descentBlocked = some(
    (o: ObstacleRect) =>
      axisSegmentHitsRect(dropX, corridorY, dropX, toPortY, o, 2),
    obstacles,
  );

  // Leave (or enter) through the node's near HORIZONTAL edge instead, running
  // up or down its centre line. When an obstacle abuts a node on the corridor
  // side, no side-anchored leg exists at all — every one at the port's y
  // crosses it. The arrowhead stays cardinal, and this is the same anchoring
  // the x-overlap branch at the top of this function already uses, for the
  // same reason.
  //
  // NOTE: this drops the affected port. A pre-assigned port exists to stop
  // several edges stacking on one side anchor, and a side anchor is exactly
  // what is unreachable here — so the port has nothing left to express. Edges
  // landing in this branch converge on their node's centre line.
  const fromEdgeY = above ? from.y - from.height / 2 : from.y + from.height / 2;
  const toEdgeY = above ? to.y - to.height / 2 : to.y + to.height / 2;

  // Single-sourced so the corridor cannot disagree with the legs it joins.
  // `segmentsToPath` emits only the FIRST segment's `ax`/`ay` and then each
  // segment's `bx`/`by`, so a wrong `ax` on an interior segment is invisible in
  // the output and would surface only through `segmentsHitAny` — silently, and
  // much later.
  const exitX = liftBlocked ? from.x : liftX;
  const entryX = descentBlocked ? to.x : dropX;

  const exit: Segment[] = liftBlocked
    ? [{ ax: exitX, ay: fromEdgeY, bx: exitX, by: corridorY }]
    : [
        { ax: fromOuterX, ay: fromPortY, bx: exitX, by: fromPortY },
        { ax: exitX, ay: fromPortY, bx: exitX, by: corridorY },
      ];
  const approach: Segment[] = descentBlocked
    ? [{ ax: entryX, ay: corridorY, bx: entryX, by: toEdgeY }]
    : [
        { ax: entryX, ay: corridorY, bx: entryX, by: toPortY },
        { ax: entryX, ay: toPortY, bx: toOuterX, by: toPortY },
      ];

  return segmentsToPath([
    ...exit,
    { ax: exitX, ay: corridorY, bx: entryX, by: corridorY },
    ...approach,
  ]);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

function segmentsHitAny(
  segs: Segment[],
  obstacles: ObstacleRect[],
  pad: number,
): boolean {
  for (const s of segs) {
    for (const o of obstacles) {
      if (axisSegmentHitsRect(s.ax, s.ay, s.bx, s.by, o, pad)) return true;
    }
  }
  return false;
}

function segmentsToPath(segs: Segment[]): string {
  if (segs.length === 0) return "";
  const first = segs[0];
  const parts: string[] = [`M ${first.ax} ${first.ay}`];
  for (const s of segs) parts.push(`L ${s.bx} ${s.by}`);
  return parts.join(" ");
}
