/* SwimlaneChart geometry — side "+N" boundary badges.
 *
 * Aggregates collapsed counts per side, places each "+N" pill just outside the
 * outermost visible node, and clamps it inside the viewport so an off-screen or
 * absent anchor still shows its count. */
import type {
  LayoutEdgeLike,
  NodePos,
  SideBadges,
  SummaryLike,
} from "./shared";

/** A rendered boundary badge (the "+N" side pill for collapsed columns). */
export interface BoundaryBadge {
  key: string;
  d: string;
  badgeX: number;
  badgeY: number;
  pillTopY: number;
  pillBottomY: number;
  count: number;
}

export interface BoundaryBadgesInput {
  positions: ReadonlyMap<string, NodePos>;
  edges: LayoutEdgeLike[];
  summaries: SummaryLike[];
  centerCol: number;
  /** Current container width in px (0 before the first measure). */
  containerWidth: number;
  hPadding: number;
  badgeRadius: number;
  stubLength: number;
  /** Side-badge geometry from computeSideBadges. */
  sideBadges: SideBadges;
}

/**
 * Compute the side "boundary badges" — the "+N" pills that stand in for
 * collapsed columns at each horizontal edge. Sums collapsed counts per side (by
 * each summary's own column relative to centerCol), places the pill just outside
 * the outermost visible node on that side, and clamps it inside the viewport so
 * an off-screen or absent anchor still shows its count.
 */
export function computeBoundaryBadges(
  input: BoundaryBadgesInput,
): BoundaryBadge[] {
  const {
    positions,
    edges,
    summaries,
    centerCol: centerColVal,
    containerWidth: cw,
    hPadding: H_PADDING_PX,
    badgeRadius: BADGE_RADIUS,
    stubLength: STUB_LENGTH,
    sideBadges: sidePos,
  } = input;

  // Pick the outermost visible node on each side from layout positions.
  let leftAnchorId: string | undefined;
  let rightAnchorId: string | undefined;
  let leftMinX = Infinity;
  let rightMaxX = -Infinity;
  for (const [id, pos] of positions) {
    if (id.startsWith("__collapsed_")) continue;
    if (pos.x < leftMinX) {
      leftMinX = pos.x;
      leftAnchorId = id;
    }
    if (pos.x > rightMaxX) {
      rightMaxX = pos.x;
      rightAnchorId = id;
    }
  }

  // Sum collapsed counts per side. A summary's side comes from its own column
  // relative to centerCol (NOT its anchor), so a hidden node on the LEFT can
  // never spill into a RIGHT badge just because its only visible neighbor via
  // deps happens to be on the right.
  let leftCount = 0;
  let rightCount = 0;
  for (const s of summaries) {
    if (s.column < centerColVal) {
      leftCount += s.collapsedCount;
    } else if (s.column > centerColVal) {
      rightCount += s.collapsedCount;
    } else {
      // Tie at centerCol — fall back to the original edge-direction heuristic
      // so the badge still picks a sensible side.
      const edge = edges.find(
        (e) => e.sourceId === s.id || e.targetId === s.id,
      );
      const dir = edge && edge.targetId === s.anchorId ? -1 : 1;
      if (dir === -1) leftCount += s.collapsedCount;
      else rightCount += s.collapsedCount;
    }
  }

  type Aggregated = {
    anchorId: string | undefined;
    dir: -1 | 1;
    count: number;
    key: string;
  };
  const sides: Aggregated[] = [];
  if (leftCount > 0) {
    sides.push({
      anchorId: leftAnchorId,
      dir: -1,
      count: leftCount,
      key: "side|-1",
    });
  }
  if (rightCount > 0) {
    sides.push({
      anchorId: rightAnchorId,
      dir: 1,
      count: rightCount,
      key: "side|+1",
    });
  }

  // Viewport edges in content coords. The centering effect pins col 0 (x=0) to
  // the viewport horizontal center at scale 1, so the visible content x-range is
  // [-cw/2, +cw/2]. A side with collapsed nodes but NO visible anchor pins its
  // lozenge just inside the matching viewport edge so the count is ALWAYS shown.
  const vpLeftX = -cw / 2 + H_PADDING_PX + BADGE_RADIUS;
  const vpRightX = cw / 2 - H_PADDING_PX - BADGE_RADIUS;

  return sides.flatMap((g) => {
    const dir = g.dir;
    const anchorPos = g.anchorId ? positions.get(g.anchorId) : undefined;
    const sideInfo = dir === -1 ? sidePos.left : sidePos.right;
    // Vertical placement: follow the anchor column's span when present, else sit
    // at content y=0 (mapped to viewport center when there are no visible nodes).
    const sideY = sideInfo?.y ?? anchorPos?.y ?? 0;
    const pillTopY = sideInfo?.topY ?? sideY - BADGE_RADIUS;
    const pillBottomY = sideInfo?.bottomY ?? sideY + BADGE_RADIUS;

    // Preferred X: just outside the outermost visible node on this side. But the
    // lozenge must ALWAYS stay inside the viewport — clamp to the viewport edge
    // when the anchor is off-screen or absent. cw===0 only on the first paint.
    let badgeX: number;
    if (anchorPos) {
      const anchorOuterX = anchorPos.x + dir * (anchorPos.width / 2);
      badgeX =
        dir === -1
          ? anchorOuterX - STUB_LENGTH - BADGE_RADIUS
          : anchorOuterX + STUB_LENGTH + BADGE_RADIUS;
    } else {
      if (cw === 0) return [];
      badgeX = dir === -1 ? vpLeftX : vpRightX;
    }
    if (cw > 0) {
      badgeX =
        dir === -1 ? Math.max(badgeX, vpLeftX) : Math.min(badgeX, vpRightX);
    }
    return [
      {
        key: g.key,
        d: "",
        badgeX,
        badgeY: sideY,
        pillTopY,
        pillBottomY,
        count: g.count,
      },
    ];
  });
}
