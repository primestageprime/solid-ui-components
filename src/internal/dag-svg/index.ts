// Shared SVG render utilities — not a Primitive; consumed by the DagChart
// and SwimlaneChart Primitives. Living outside src/components/ marks this
// as a utility module rather than a component surface, so Primitives that
// import from here aren't violating the "no cross-Primitive component
// imports" rule. These helpers are intentionally headless (no own CSS):
// each consuming Primitive provides classes that hook into its own
// stylesheet.

export { DagArrowMarker } from "./DagArrowMarker";
export type { DagArrowMarkerProps } from "./DagArrowMarker";
export { DagSvgNode } from "./DagSvgNode";
export type { DagSvgNodeProps } from "./DagSvgNode";
export { DagSvgEdge } from "./DagSvgEdge";
export type { DagSvgEdgeProps } from "./DagSvgEdge";
export {
  orthogonalStepPath,
  bezierThroughChannelPath,
  bezierAvoidingObstacles,
} from "./edge-routing";
export type { EdgeRect, ObstacleRect } from "./edge-routing";
export { orthogonalAvoidingObstacles } from "./orthogonal-routing";
export type { OrthogonalRouteOptions } from "./orthogonal-routing";
