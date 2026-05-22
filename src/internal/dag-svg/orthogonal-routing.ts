/**
 * Orthogonal edge routing — strict right-angle paths with hard corners.
 *
 * Inspired by OMNeT++ NED schematic editor and ELK's layered orthogonal
 * router. All segments are horizontal or vertical; arrowheads always
 * orient cardinal. Obstacles are dodged via a channel above (or below)
 * picked by source-vs-target y relationship.
 */

import type { EdgeRect, ObstacleRect } from "./edge-routing";

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
const EXIT_RUN = SOURCE_EXIT;

/**
 * Returns true if the axis-aligned segment from (ax, ay) to (bx, by) —
 * one of which must be horizontal or vertical — intersects `r` expanded
 * by `pad`. Used to test whether a routed leg crosses an unrelated node.
 */
function axisSegmentHitsRect(
  ax: number, ay: number,
  bx: number, by: number,
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
  const fromOuterX = goingRight ? from.x + from.width / 2 : from.x - from.width / 2;
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
    const fromEdgeY = sourceAbove ? from.y + from.height / 2 : from.y - from.height / 2;
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
    const blocked = obstacles.some((o) =>
      axisSegmentHitsRect(fromOuterX, fromPortY, toOuterX, toPortY, o, 2),
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
  const obsInBand = obstacles.filter((o) => {
    const oxL = o.x - o.width / 2;
    const oxR = o.x + o.width / 2;
    const xMin = Math.min(fromOuterX, toOuterX);
    const xMax = Math.max(fromOuterX, toOuterX);
    return oxR >= xMin && oxL <= xMax;
  });
  let corridorY: number;
  if (obsInBand.length > 0) {
    corridorY = above
      ? Math.min(...obsInBand.map((o) => o.y - o.height / 2)) - OBSTACLE_MARGIN
      : Math.max(...obsInBand.map((o) => o.y + o.height / 2)) + OBSTACLE_MARGIN;
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
  // or drop right at toOuterX) and trust the corridor to lift above it.
  const obsXLefts = obsInBand.map((o) => o.x - o.width / 2);
  const obsXRights = obsInBand.map((o) => o.x + o.width / 2);
  let liftX: number;
  let dropX: number;
  if (goingRight) {
    const liftLow = fromOuterX + 2;
    const liftHigh =
      obsXLefts.length > 0 ? Math.min(...obsXLefts) - OBSTACLE_MARGIN : Infinity;
    const liftIdeal = fromOuterX + SOURCE_EXIT;
    liftX = liftLow > liftHigh ? liftLow : Math.max(liftLow, Math.min(liftIdeal, liftHigh));
    const dropLow =
      obsXRights.length > 0 ? Math.max(...obsXRights) + OBSTACLE_MARGIN : -Infinity;
    const dropHigh = toOuterX - 2;
    // dropX biased close to the target so the final horizontal run is
    // ~TARGET_APPROACH (≈5px clean line + 7px arrow).
    const dropIdeal = toOuterX - TARGET_APPROACH;
    dropX = dropLow > dropHigh ? dropHigh : Math.min(dropHigh, Math.max(dropIdeal, dropLow));
  } else {
    const liftHigh = fromOuterX - 2;
    const liftLow =
      obsXRights.length > 0 ? Math.max(...obsXRights) + OBSTACLE_MARGIN : -Infinity;
    const liftIdeal = fromOuterX - SOURCE_EXIT;
    liftX = liftLow > liftHigh ? liftHigh : Math.min(liftHigh, Math.max(liftIdeal, liftLow));
    const dropHigh =
      obsXLefts.length > 0 ? Math.min(...obsXLefts) - OBSTACLE_MARGIN : Infinity;
    const dropLow = toOuterX + 2;
    const dropIdeal = toOuterX + TARGET_APPROACH;
    dropX = dropLow > dropHigh ? dropLow : Math.max(dropLow, Math.min(dropIdeal, dropHigh));
  }

  // 5-segment U.
  const uSegments: Segment[] = [
    { ax: fromOuterX, ay: fromPortY, bx: liftX, by: fromPortY },
    { ax: liftX, ay: fromPortY, bx: liftX, by: corridorY },
    { ax: liftX, ay: corridorY, bx: dropX, by: corridorY },
    { ax: dropX, ay: corridorY, bx: dropX, by: toPortY },
    { ax: dropX, ay: toPortY, bx: toOuterX, by: toPortY },
  ];
  return segmentsToPath(uSegments);
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
