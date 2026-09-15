// ============================================
// TreeDiffChart — edge routing. Pure geometry, no DOM.
//
// Ported from the Scenario Tree Explorer prototype, minus its S-curve: every
// horizontal run is a rounded elbow whose vertical leg sits in the corridor
// next to the source box. Its last segment always runs level, so the
// arrowhead meets the box square on. Edges that leave a root drop along a
// shared vertical trunk and turn level into their target, so one root's
// edges read as one line with branches.
// ============================================

export type Box = {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  width: number;
  height: number;
};

/** How far past the source edge the elbow turns down, so the vertical leg
 * sits in the corridor between columns instead of behind a neighbour box. */
const TURN_REACH = 20;
const ELBOW_RADIUS = 16;
/** Vertical bow of the same-column curve. */
const STACK_BOW = 22;
/** Boxes closer than this in x count as one column. */
const SAME_COLUMN_EPSILON = 12;

/**
 * Rounded elbow from `(x1, y1)` to `(x2, y2)`. `dir` is +1 when the run goes
 * right, -1 when it goes left; the endpoints already sit on the box edges.
 * The path leaves level, turns down (or up) in the corridor next to the
 * source, and arrives level, so the arrowhead meets the box square on. A
 * level run degenerates to a straight line.
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
  const xm = x1 + dir * Math.min(dx / 2, TURN_REACH);
  const vd = y2 > y1 ? 1 : -1;
  const r = Math.min(
    ELBOW_RADIUS,
    Math.min(dx - TURN_REACH, TURN_REACH) - 1,
    dy / 2,
  );
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

/**
 * Trunk path: drop from `(trunkX, topY)` straight down (or up) to the
 * target's center y, then turn level into the target's near edge. `dir` is
 * +1 when the target sits right of the trunk, -1 when it sits left.
 */
export function trunkPath(
  trunkX: number,
  topY: number,
  to: Box,
  dir: 1 | -1,
): string {
  const x2 = dir === 1 ? to.x - to.width / 2 : to.x + to.width / 2;
  const y2 = to.y;
  const vd = y2 > topY ? 1 : -1;
  const r = Math.min(
    ELBOW_RADIUS,
    Math.abs(x2 - trunkX) - 1,
    Math.abs(y2 - topY) / 2,
  );
  if (r < 2) {
    return `M ${trunkX} ${topY} L ${trunkX} ${y2} L ${x2} ${y2}`;
  }
  return (
    `M ${trunkX} ${topY}` +
    ` L ${trunkX} ${y2 - vd * r}` +
    ` Q ${trunkX} ${y2} ${trunkX + dir * r} ${y2}` +
    ` L ${x2} ${y2}`
  );
}

/** SVG path `d` from the edge of box `a` to the edge of box `b`. */
export function edgePath(a: Box, b: Box): string {
  if (Math.abs(b.x - a.x) < SAME_COLUMN_EPSILON) {
    const aBottom = a.y + a.height / 2;
    const bTop = b.y - b.height / 2;
    return `M ${a.x} ${aBottom} C ${a.x} ${aBottom + STACK_BOW} ${b.x} ${bTop - STACK_BOW} ${b.x} ${bTop}`;
  }
  const right = b.x > a.x;
  const x1 = right ? a.x + a.width / 2 : a.x - a.width / 2;
  const x2 = right ? b.x - b.width / 2 : b.x + b.width / 2;
  return routeRun(x1, a.y, x2, b.y, right ? 1 : -1);
}
