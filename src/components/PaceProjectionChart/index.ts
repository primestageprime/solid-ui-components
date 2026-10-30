// Base (PaceProjectionChart) is intentionally NOT exported — use the curried variant ONLY.
export { createPaceProjectionChart } from "./PaceProjectionChart";
export type {
  PaceProjectionChartDataProps,
  PaceSeries,
  PaceTick,
} from "./PaceProjectionChart";
export { projectionEnd, type PacePoint } from "./paceProjection";
export * from "./variants";
