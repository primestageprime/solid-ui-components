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

/** A collapsed-group summary, identified by id and its logical column. */
export interface SummaryLike {
  id: string;
  column: number;
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
        const side = sum.column > centerColVal ? badges.right
          : sum.column < centerColVal ? badges.left
          : undefined;
        if (!side) return [];
        // Pill badge spans (side.topY..side.bottomY). For port-y on the
        // badge side, anchor at the target's y so the dashed line emerges
        // from the pill at the same row it lands on the visible node.
        const pillHeight = side.bottomY - side.topY;
        const pillMidY = (side.topY + side.bottomY) / 2;
        const synthSource = { x: side.x, y: pillMidY, width: BADGE_RADIUS * 2, height: pillHeight };
        const obstacles = allRects.filter((r) => r.id !== e.targetId);
        const key = `${e.sourceId}|${e.targetId}`;
        // Both endpoints anchor at the visible node's row y. Bypassing
        // port-assignment on both sides keeps the corridor on the
        // correct side (above vs below the obstacle) instead of flipping
        // because port spreading offset one end.
        const rowY = t.y;
        const fromPortY = Math.max(side.topY + 4, Math.min(side.bottomY - 4, rowY));
        return [{
          d: routeEdgeWithPorts(synthSource, t, obstacles, key, fromPortY, rowY),
          isSummary: true,
          key,
        }];
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
        const side = sum.column > centerColVal ? badges.right
          : sum.column < centerColVal ? badges.left
          : undefined;
        if (!side) return [];
        // Synthetic target rect matching the badge geometry so the
        // router treats it like any other endpoint.
        const pillHeight = side.bottomY - side.topY;
        const pillMidY = (side.topY + side.bottomY) / 2;
        const t = { x: side.x, y: pillMidY, width: BADGE_RADIUS * 2, height: pillHeight };
        const obstacles = allRects.filter((r) => r.id !== e.sourceId);
        const key = `${e.sourceId}|${e.targetId}`;
        // Anchor both ports at the visible source's row y so corridor-
        // side selection stays in sync with the actual visual layout.
        const rowY = s.y;
        const toPortY = Math.max(side.topY + 4, Math.min(side.bottomY - 4, rowY));
        return [{
          d: routeEdgeWithPorts(s, t, obstacles, key, rowY, toPortY),
          isSummary: true,
          key,
        }];
      }

      const t = positions.get(e.targetId);
      if (!t) return [];
      const obstacles = allRects.filter(
        (r) => r.id !== e.sourceId && r.id !== e.targetId,
      );
      // Path follows the edge's data direction (source -> target) so the
      // arrowhead (marker-end) lands at the target = dependent.
      const key = `${e.sourceId}|${e.targetId}`;
      return [{
        d: routeEdge(s, t, obstacles, key),
        isSummary: false,
        key,
      }];
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
