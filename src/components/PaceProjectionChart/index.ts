// Base (PaceProjectionChart) is intentionally NOT exported — use the curried variant ONLY.
export { createPaceProjectionChart } from "./PaceProjectionChart";
export type {
  PaceProjectionChartDataProps,
  PaceSeries,
  PaceMarker,
  PaceTick,
} from "./PaceProjectionChart";
export {
  projectionEnd,
  stackLabelRows,
  type PacePoint,
} from "./paceProjection";
export * from "./variants";
