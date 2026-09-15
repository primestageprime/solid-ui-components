// ============================================
// TreeDiffChart — edge routing. Pure geometry, no DOM.
//
// Ported from the Scenario Tree Explorer prototype. A shallow run gets an
// S-curve. Once the drop outweighs the run the S would hook back on itself,
// so the router switches to a rounded elbow: its last segment always runs
// level, and the arrowhead meets the box square on. Two boxes in one column
// get a short vertical curve between the facing edges.
// ============================================

export type Box = {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  width: number;
  height: number;
};

/** Horizontal control-point reach of the S-curve, capped so wide runs stay taut. */
const S_REACH_MAX = 170;
const S_REACH_RATIO = 0.45;
/** Above this drop-to-run ratio the S-curve gives way to the elbow. */
const ELBOW_THRESHOLD = 0.9;
const ELBOW_RADIUS = 16;
/** Vertical bow of the same-column curve. */
const STACK_BOW = 22;
/** Boxes closer than this in x count as one column. */
const SAME_COLUMN_EPSILON = 12;

/**
 * Path from `(x1, y1)` to `(x2, y2)`. `dir` is +1 when the run goes right,
 * -1 when it goes left; the endpoints already sit on the box edges.
 */
export function routeRun(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dir: 1 | -1,
): string {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  if (dy <= dx * ELBOW_THRESHOLD) {
    const k = Math.min(dx * S_REACH_RATIO, S_REACH_MAX);
    return `M ${x1} ${y1} C ${x1 + dir * k} ${y1} ${x2 - dir * k} ${y2} ${x2} ${y2}`;
  }
  const xm = (x1 + x2) / 2;
  const vd = y2 > y1 ? 1 : -1;
  const r = Math.min(ELBOW_RADIUS, dx / 2 - 1, dy / 2);
  if (r < 2) {
    return `M ${x1} ${y1} L ${xm} ${y1} L ${xm} ${y2} L ${x2} ${y2}`;
  }
  return (
    `M ${x1} ${y1}` +
    ` L ${xm - dir * r} ${y1}` +
    ` Q ${xm} ${y1} ${xm} ${y1 + vd * r}` +
    ` L ${xm} ${y2 - vd * r}` +
    ` Q ${xm} ${y2} ${xm + dir * r} ${y2}` +
    ` L ${x2} ${y2}`
  );
}

/** SVG path `d` from the edge of box `a` to the edge of box `b`. */
export function edgePath(a: Box, b: Box): string {
  const dx = Math.abs(b.x - a.x);
  // Stacked boxes: drop from the bottom of `a` to the top of `b`. When the
  // target's center lies inside the source's span (a wide root over a
  // narrower group) the drop starts at the target's x, so the arrow is one
  // straight line instead of a hook that crosses the source box.
  if (dx < SAME_COLUMN_EPSILON || dx < a.width / 2) {
    const x = dx < SAME_COLUMN_EPSILON ? a.x : b.x;
    const aBottom = a.y + a.height / 2;
    const bTop = b.y - b.height / 2;
    return `M ${x} ${aBottom} C ${x} ${aBottom + STACK_BOW} ${b.x} ${bTop - STACK_BOW} ${b.x} ${bTop}`;
  }
  const right = b.x > a.x;
  const x1 = right ? a.x + a.width / 2 : a.x - a.width / 2;
  const x2 = right ? b.x - b.width / 2 : b.x + b.width / 2;
  return routeRun(x1, a.y, x2, b.y, right ? 1 : -1);
}
