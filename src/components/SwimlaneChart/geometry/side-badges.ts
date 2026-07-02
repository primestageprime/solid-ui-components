/* SwimlaneChart geometry — side-badge positions.
 *
 * Computes the collapsed-column pill geometry (position + vertical span) that
 * sits just outside the outermost visible node on each side. Both the edge-view
 * and boundary-badge computations read from here. */
import type { NodePos, SideBadges } from "./shared";

/**
 * Side-aware boundary-badge positions. Each badge sits just OUTSIDE the outermost
 * visible node on its side, at anchorOuterX ± (stubLength + badgeRadius); its
 * pill spans the vertical range (topY..bottomY) of the visible nodes sharing that
 * outermost column. edgeViews and boundaryBadges both read from here so a
 * visible→hidden edge terminates exactly where the badge renders.
 */
export function computeSideBadges(
  positions: ReadonlyMap<string, NodePos>,
  stubLength: number,
  badgeRadius: number,
): SideBadges {
  // First pass: find the outermost x on each side.
  let leftMinX = Infinity;
  let rightMaxX = -Infinity;
  for (const [id, p] of positions) {
    if (id.startsWith("__collapsed_")) continue;
    if (p.x < leftMinX) leftMinX = p.x;
    if (p.x > rightMaxX) rightMaxX = p.x;
  }
  // Second pass: collect every visible node sharing that outermost x and compute
  // (avgY, topY, bottomY) — the pill sits at the avg center and spans top..bottom.
  const collect = (targetX: number) => {
    const matches: {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    for (const [id, p] of positions) {
      if (id.startsWith("__collapsed_")) continue;
      if (Math.abs(p.x - targetX) < 0.5) matches.push({ id, ...p });
    }
    if (matches.length === 0) return undefined;
    const avgY = matches.reduce((s, m) => s + m.y, 0) / matches.length;
    const topY = Math.min(...matches.map((m) => m.y - m.height / 2));
    const bottomY = Math.max(...matches.map((m) => m.y + m.height / 2));
    const ref = matches[0];
    return { ref, y: avgY, topY, bottomY };
  };
  const out: SideBadges = {};
  const left = leftMinX < Infinity ? collect(leftMinX) : undefined;
  if (left) {
    out.left = {
      x: left.ref.x - left.ref.width / 2 - stubLength - badgeRadius,
      y: left.y,
      topY: left.topY,
      bottomY: left.bottomY,
      anchorId: left.ref.id,
    };
  }
  const right = rightMaxX > -Infinity ? collect(rightMaxX) : undefined;
  if (right) {
    out.right = {
      x: right.ref.x + right.ref.width / 2 + stubLength + badgeRadius,
      y: right.y,
      topY: right.topY,
      bottomY: right.bottomY,
      anchorId: right.ref.id,
    };
  }
  return out;
}
