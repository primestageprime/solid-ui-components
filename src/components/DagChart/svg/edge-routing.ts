/**
 * Edge geometry helpers for DAG charts. Currently provides orthogonal step
 * routing through column gaps — endpoints clip to the node rectangle edges
 * (not centers), and the polyline detours through the empty horizontal space
 * between source and target columns, avoiding in-column siblings.
 */

export type EdgeRect = {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  width: number;
  height: number;
};

const CORNER_RADIUS = 6;
/** When source and target share a column, how far past the column right
 * edge to route the detour channel. */
const SAME_COL_OFFSET = 28;

/**
 * Cubic bezier path from `from` to `to` for different-column edges, with
 * control points anchored in the vertical channel midway between the two
 * columns. The curve leaves each node horizontally (anchor on the inner
 * edge) and bows into the channel — the empty space between columns —
 * so the curve stays clear of in-column siblings. For same-column edges
 * (stacked nodes), draws a direct vertical line between the top/bottom
 * edges; no side wrap-around.
 */
export function bezierThroughChannelPath(from: EdgeRect, to: EdgeRect): string {
  const dx = to.x - from.x;

  // Same column: route via a vertical channel on the side of the column
  // CLOSER TO THE CHART CENTER, so the curve bows out past any cards
  // stacked between source and target without crossing them. For TODO
  // columns (x > 0), the channel sits to the LEFT of the column; for
  // DONE columns (x < 0), it sits to the RIGHT.
  if (Math.abs(dx) < 1) {
    const channelOnLeft = from.x >= 0;
    const fromAnchorX = channelOnLeft
      ? from.x - from.width / 2
      : from.x + from.width / 2;
    const toAnchorX = channelOnLeft
      ? to.x - to.width / 2
      : to.x + to.width / 2;
    const channelDelta = channelOnLeft ? -SAME_COL_OFFSET : SAME_COL_OFFSET;
    const channelX = fromAnchorX + channelDelta;
    return `M ${fromAnchorX} ${from.y} C ${channelX} ${from.y}, ${channelX} ${to.y}, ${toAnchorX} ${to.y}`;
  }

  // Different columns: anchor on inner side, controls in the channel.
  const goingRight = dx > 0;
  const fromAnchorX = goingRight ? from.x + from.width / 2 : from.x - from.width / 2;
  const toAnchorX = goingRight ? to.x - to.width / 2 : to.x + to.width / 2;
  const channelX = (fromAnchorX + toAnchorX) / 2;

  return `M ${fromAnchorX} ${from.y} C ${channelX} ${from.y}, ${channelX} ${to.y}, ${toAnchorX} ${to.y}`;
}

/**
 * SVG path `d` string for an orthogonal step edge from `from` to `to`.
 * - Endpoints anchor to the node rect edges, not centers.
 * - Different-column edges route through a vertical channel midway between
 *   the columns' inner sides.
 * - Same-column edges detour around the right side.
 * - Corners are rounded by CORNER_RADIUS (clamped if a leg is too short).
 */
export function orthogonalStepPath(from: EdgeRect, to: EdgeRect): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Same column: detour right of both nodes.
  if (Math.abs(dx) < 1) {
    const fromAnchorX = from.x + from.width / 2;
    const toAnchorX = to.x + to.width / 2;
    const channelX = Math.max(fromAnchorX, toAnchorX) + SAME_COL_OFFSET;
    return roundedStep(fromAnchorX, from.y, channelX, from.y, channelX, to.y, toAnchorX, to.y);
  }

  // Different columns: anchor on the inner side, channel midway.
  const goingRight = dx > 0;
  const fromAnchorX = goingRight ? from.x + from.width / 2 : from.x - from.width / 2;
  const toAnchorX = goingRight ? to.x - to.width / 2 : to.x + to.width / 2;
  const channelX = (fromAnchorX + toAnchorX) / 2;

  if (Math.abs(dy) < 1) {
    return `M ${fromAnchorX} ${from.y} L ${toAnchorX} ${to.y}`;
  }

  return roundedStep(fromAnchorX, from.y, channelX, from.y, channelX, to.y, toAnchorX, to.y);
}

/**
 * Right-angle step with rounded corners through two elbows:
 *   p1 → p2 (horizontal) → p3 (vertical) → p4 (horizontal)
 * Corner radius is clamped so it never exceeds half of the shortest leg.
 */
function roundedStep(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  p4x: number, p4y: number,
): string {
  const r = Math.min(
    CORNER_RADIUS,
    Math.abs(p2x - p1x) / 2,
    Math.abs(p3y - p2y) / 2,
    Math.abs(p4x - p3x) / 2,
  );
  if (r < 1) {
    return `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y}`;
  }
  const dxIn = Math.sign(p2x - p1x);
  const dyMid = Math.sign(p3y - p2y);
  const dxOut = Math.sign(p4x - p3x);
  return [
    `M ${p1x} ${p1y}`,
    `L ${p2x - r * dxIn} ${p2y}`,
    `Q ${p2x} ${p2y} ${p2x} ${p2y + r * dyMid}`,
    `L ${p3x} ${p3y - r * dyMid}`,
    `Q ${p3x} ${p3y} ${p3x + r * dxOut} ${p3y}`,
    `L ${p4x} ${p4y}`,
  ].join(" ");
}
