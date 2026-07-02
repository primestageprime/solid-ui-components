/* SwimlaneChart geometry — shared input/view types.
 *
 * Domain types used across the geometry modules: node positions, layout edges,
 * collapsed-group summaries, and the side-badge geometry that both the
 * edge-view and boundary-badge computations read from. */

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
