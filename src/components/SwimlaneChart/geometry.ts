/* SwimlaneChart — pure edge-routing geometry.
 *
 * Extracted from the component so the edge-view computation is a pure function
 * of its inputs (node positions, layout edges, side badges, per-edge ports) and
 * independently testable. The reactive component wraps it in a memo; see
 * SwimlaneChart.test.tsx for the characterization lock on the emitted paths. */
import {
  bezierAvoidingObstacles,
  orthogonalAvoidingObstacles,
  type ObstacleRect,
} from "../../internal/dag-svg";

export interface NodePos {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A layout edge (already rewritten by computeSwimlaneLayout — carries the
 *  resolved source/target ids and a `synthetic` flag for anchor→summary edges). */
export interface LayoutEdgeLike {
  sourceId: string;
  targetId: string;
  synthetic?: boolean;
}

/** A collapsed-group summary: its id, logical column, the count of nodes it
 *  hides, and the id of the visible node it anchors to. */
export interface SummaryLike {
  id: string;
  column: number;
  collapsedCount: number;
  anchorId: string;
}

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

/** A side badge (collapsed-column pill) with its vertical span. */
export interface SideBadge {
  x: number;
  y: number;
  topY: number;
  bottomY: number;
  anchorId: string;
}

export interface SideBadges {
  left?: SideBadge;
  right?: SideBadge;
}

export interface EdgePorts {
  from: number;
  to: number;
}

export interface EdgeView {
  d: string;
  isSummary: boolean;
  key: string;
}

export interface EdgeViewsInput {
  positions: ReadonlyMap<string, NodePos>;
  summaries: SummaryLike[];
  edges: LayoutEdgeLike[];
  /** Logical column that sits at the chart's horizontal center. */
  centerCol: number;
  /** Orthogonal (right-angle) routing when true; bezier otherwise. */
  isOrthogonal: boolean;
  /** Side badges for collapsed columns (left/right of center). */
  badges: SideBadges;
  /** Per-edge port y-overrides for orthogonal fan-out, keyed "source|target". */
  ports: Map<string, EdgePorts>;
  /** Badge pill radius (px) — sizes the synthetic badge endpoint rects. */
  badgeRadius: number;
}

/**
 * Compute one routed SVG path per visible edge. Handles visible→visible edges
 * (obstacle-avoiding routing), visible↔collapsed-summary edges (routed to the
 * side badge pill), and dedups the synthetic anchor→summary edges the layout
 * emits alongside real ones. Returns exactly one EdgeView per (source, target).
 */
export function computeEdgeViews(input: EdgeViewsInput): EdgeView[] {
  const {
    positions,
    summaries,
    edges,
    centerCol: centerColVal,
    isOrthogonal,
    badges,
    ports,
    badgeRadius: BADGE_RADIUS,
  } = input;
  const summariesById = new Map(summaries.map((s) => [s.id, s] as const));
  // Build the obstacle list once per layout — every visible node is a
  // potential obstacle for any edge that isn't anchored on it.
  const allRects: ObstacleRect[] = [];
  for (const [id, p] of positions) {
    if (id.startsWith("__collapsed_")) continue;
    allRects.push({ id, x: p.x, y: p.y, width: p.width, height: p.height });
  }
  const routeEdge = (
    from: { x: number; y: number; width: number; height: number },
    to: { x: number; y: number; width: number; height: number },
    obstacles: ObstacleRect[],
    edgeKey: string,
  ): string => {
    if (isOrthogonal) {
      const p = ports.get(edgeKey);
      return orthogonalAvoidingObstacles(from, to, obstacles, {
        fromPortY: p?.from,
        toPortY: p?.to,
      });
    }
    return bezierAvoidingObstacles(from, to, obstacles);
  };
  /** Variant that takes explicit port overrides — used for badge edges
   *  where the pill side wants its port-y anchored to the connected
   *  visible node, not to the badge's vertical center. */
  const routeEdgeWithPorts = (
    from: { x: number; y: number; width: number; height: number },
    to: { x: number; y: number; width: number; height: number },
    obstacles: ObstacleRect[],
    edgeKey: string,
    fromPortY: number | undefined,
    toPortY: number | undefined,
  ): string => {
    if (isOrthogonal) {
      const p = ports.get(edgeKey);
      return orthogonalAvoidingObstacles(from, to, obstacles, {
        fromPortY: fromPortY ?? p?.from,
        toPortY: toPortY ?? p?.to,
      });
    }
    // Bezier doesn't take port overrides — adjust the from/to y instead.
    const f = fromPortY !== undefined ? { ...from, y: fromPortY } : from;
    const t = toPortY !== undefined ? { ...to, y: toPortY } : to;
    return bezierAvoidingObstacles(f, t, obstacles);
  };
  const all = edges.flatMap((e) => {
    // Skip synthetic anchor→summary edges — the boundary-badge memo
    // renders those independently as the side stub. Only real data
    // edges should produce dashed lines to/from the badges.
    if (e.synthetic) return [];

    // Hidden → visible: the original source was a hidden node and
    // its dependent is visible. Draw a dashed line from the side
    // badge to the visible target's anchor.
    if (
      e.sourceId.startsWith("__collapsed_") &&
      !e.targetId.startsWith("__collapsed_")
    ) {
      const sum = summariesById.get(e.sourceId);
      if (!sum) return [];
      const t = positions.get(e.targetId);
      if (!t) return [];
      const side =
        sum.column > centerColVal
          ? badges.right
          : sum.column < centerColVal
            ? badges.left
            : undefined;
      if (!side) return [];
      // Pill badge spans (side.topY..side.bottomY). For port-y on the
      // badge side, anchor at the target's y so the dashed line emerges
      // from the pill at the same row it lands on the visible node.
      const pillHeight = side.bottomY - side.topY;
      const pillMidY = (side.topY + side.bottomY) / 2;
      const synthSource = {
        x: side.x,
        y: pillMidY,
        width: BADGE_RADIUS * 2,
        height: pillHeight,
      };
      const obstacles = allRects.filter((r) => r.id !== e.targetId);
      const key = `${e.sourceId}|${e.targetId}`;
      // Both endpoints anchor at the visible node's row y. Bypassing
      // port-assignment on both sides keeps the corridor on the
      // correct side (above vs below the obstacle) instead of flipping
      // because port spreading offset one end.
      const rowY = t.y;
      const fromPortY = Math.max(
        side.topY + 4,
        Math.min(side.bottomY - 4, rowY),
      );
      return [
        {
          d: routeEdgeWithPorts(
            synthSource,
            t,
            obstacles,
            key,
            fromPortY,
            rowY,
          ),
          isSummary: true,
          key,
        },
      ];
    }
    // Hidden → hidden: both endpoints inside the same (or different)
    // summary — render nothing; the summary badges already convey
    // existence.
    if (
      e.sourceId.startsWith("__collapsed_") &&
      e.targetId.startsWith("__collapsed_")
    ) {
      return [];
    }
    const s = positions.get(e.sourceId);
    if (!s) return [];

    // Visible → collapsed-summary: route to the side-badge position,
    // not the layout's hidden-col placeholder. Summary side comes
    // from the summary's `column` (relative to centerCol), so a
    // hidden b6 on the right always lands at the right-side badge
    // even if its layout-anchor is a node on the left.
    // (Dedup happens after the flatMap — the layout emits a
    // synthetic anchor→summary edge alongside the real rewritten
    // edge, which would otherwise produce a duplicate path.)
    if (e.targetId.startsWith("__collapsed_")) {
      const sum = summariesById.get(e.targetId);
      if (!sum) return [];
      const side =
        sum.column > centerColVal
          ? badges.right
          : sum.column < centerColVal
            ? badges.left
            : undefined;
      if (!side) return [];
      // Synthetic target rect matching the badge geometry so the
      // router treats it like any other endpoint.
      const pillHeight = side.bottomY - side.topY;
      const pillMidY = (side.topY + side.bottomY) / 2;
      const t = {
        x: side.x,
        y: pillMidY,
        width: BADGE_RADIUS * 2,
        height: pillHeight,
      };
      const obstacles = allRects.filter((r) => r.id !== e.sourceId);
      const key = `${e.sourceId}|${e.targetId}`;
      // Anchor both ports at the visible source's row y so corridor-
      // side selection stays in sync with the actual visual layout.
      const rowY = s.y;
      const toPortY = Math.max(side.topY + 4, Math.min(side.bottomY - 4, rowY));
      return [
        {
          d: routeEdgeWithPorts(s, t, obstacles, key, rowY, toPortY),
          isSummary: true,
          key,
        },
      ];
    }

    const t = positions.get(e.targetId);
    if (!t) return [];
    const obstacles = allRects.filter(
      (r) => r.id !== e.sourceId && r.id !== e.targetId,
    );
    // Path follows the edge's data direction (source -> target) so the
    // arrowhead (marker-end) lands at the target = dependent.
    const key = `${e.sourceId}|${e.targetId}`;
    return [
      {
        d: routeEdge(s, t, obstacles, key),
        isSummary: false,
        key,
      },
    ];
  });
  // Dedup paths by key — the layout emits both the rewritten real
  // edge and a synthetic anchor→summary edge for boundary badges,
  // and we want exactly one path per (source, target) pair.
  const seen = new Set<string>();
  const out: { d: string; isSummary: boolean; key: string }[] = [];
  for (const ev of all) {
    if (seen.has(ev.key)) continue;
    seen.add(ev.key);
    out.push(ev);
  }
  return out;
}

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

/**
 * Per-edge port assignment for orthogonal routing. For each visible node, its
 * in/out edges get distinct y positions spread evenly along the node's vertical
 * extent so parallel connections fan out instead of stacking at one anchor.
 * Returns a map keyed "source|target" → { from, to } port y-values.
 */
export function computePortAssignments(
  positions: ReadonlyMap<string, NodePos>,
  edges: LayoutEdgeLike[],
): Map<string, EdgePorts> {
  // Ordered so edges with smaller other-endpoint y get earlier ports (the fan
  // reads top-to-bottom).
  const incoming = new Map<string, { edgeKey: string; otherY: number }[]>();
  const outgoing = new Map<string, { edgeKey: string; otherY: number }[]>();
  for (const e of edges) {
    if (e.synthetic) continue;
    const key = `${e.sourceId}|${e.targetId}`;
    const s = positions.get(e.sourceId);
    const t = positions.get(e.targetId);
    if (s && positions.has(e.targetId)) {
      const arr = outgoing.get(e.sourceId) ?? [];
      arr.push({ edgeKey: key, otherY: t!.y });
      outgoing.set(e.sourceId, arr);
    }
    if (t && positions.has(e.sourceId)) {
      const arr = incoming.get(e.targetId) ?? [];
      arr.push({ edgeKey: key, otherY: s!.y });
      incoming.set(e.targetId, arr);
    }
  }
  const portY = new Map<string, EdgePorts>();
  const assign = (
    side: "in" | "out",
    list: Map<string, { edgeKey: string; otherY: number }[]>,
  ) => {
    for (const [nodeId, es] of list) {
      const p = positions.get(nodeId);
      if (!p) continue;
      es.sort((a, b) => a.otherY - b.otherY);
      const n = es.length;
      const top = p.y - p.height / 2;
      const h = p.height;
      es.forEach((e, i) => {
        const y = top + (h * (i + 1)) / (n + 1);
        const cur = portY.get(e.edgeKey) ?? { from: p.y, to: p.y };
        if (side === "out") cur.from = y;
        else cur.to = y;
        portY.set(e.edgeKey, cur);
      });
    }
  };
  assign("out", outgoing);
  assign("in", incoming);
  return portY;
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

export interface ViewBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface ViewBoundsInput {
  positions: ReadonlyMap<string, NodePos>;
  /** Rendered boundary badges (contributes their pill extents to the bounds). */
  boundaryBadges: { badgeX: number; pillTopY: number; pillBottomY: number }[];
  /** Rendered bottom overflow badges (contributes their extents to the bounds). */
  bottomBadges: { x: number; y: number }[];
  badgeRadius: number;
  /** Vertical padding so corridor routes above/below the content have room. */
  edgeGutter: number;
}

/**
 * The content bounding box of the whole chart (node rects + boundary/bottom
 * badges), extended vertically by `edgeGutter`. Drives the SVG viewBox / centering
 * transform. Pure aggregation — returns a zeroed box when there are no nodes.
 */
export function computeViewBounds(input: ViewBoundsInput): ViewBounds {
  const { positions, boundaryBadges, bottomBadges, badgeRadius, edgeGutter } =
    input;
  if (positions.size === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      centerX: 0,
      centerY: 0,
      width: 0,
      height: 0,
    };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x - p.width / 2);
    maxX = Math.max(maxX, p.x + p.width / 2);
    minY = Math.min(minY, p.y - p.height / 2);
    maxY = Math.max(maxY, p.y + p.height / 2);
  }
  for (const b of boundaryBadges) {
    minX = Math.min(minX, b.badgeX - badgeRadius);
    maxX = Math.max(maxX, b.badgeX + badgeRadius);
    minY = Math.min(minY, b.pillTopY);
    maxY = Math.max(maxY, b.pillBottomY);
  }
  for (const b of bottomBadges) {
    minX = Math.min(minX, b.x - badgeRadius);
    maxX = Math.max(maxX, b.x + badgeRadius);
    maxY = Math.max(maxY, b.y + badgeRadius);
  }
  // Extend vertically so corridor routes above/below have room.
  minY -= edgeGutter;
  maxY += edgeGutter;
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}
