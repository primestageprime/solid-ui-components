/* SwimlaneChart — pure edge-routing geometry.
 *
 * Extracted from the component so the edge-view computation is a pure function
 * of its inputs (node positions, layout edges, side badges, per-edge ports) and
 * independently testable. The reactive component wraps it in a memo; see
 * SwimlaneChart.test.tsx for the characterization lock on the emitted paths. */
export type {
  EdgePorts,
  LayoutEdgeLike,
  NodePos,
  SideBadge,
  SideBadges,
  SummaryLike,
} from "./shared";
export type { EdgeView, EdgeViewsInput } from "./edge-views";
export { computeEdgeViews } from "./edge-views";
export { computeSideBadges } from "./side-badges";
export { computePortAssignments } from "./port-assignments";
export type {
  BoundaryBadge,
  BoundaryBadgesInput,
} from "./boundary-badges";
export { computeBoundaryBadges } from "./boundary-badges";
export type { ViewBounds, ViewBoundsInput } from "./view-bounds";
export { computeViewBounds } from "./view-bounds";
