// Barrel — the base component ships alongside the factory here, because a
// rail's formatter is often genuinely reactive (a currency the user switches),
// and forcing every consumer through a curried variant would hide that.
export { ThresholdRail, createThresholdRail } from "./ThresholdRail";
export type {
  ThresholdRailProps,
  ThresholdRailDataProps,
  ThresholdRailOverrides,
} from "./ThresholdRail";
export type {
  LabelAnchor,
  LaneGeometry,
  PlacedThreshold,
  Threshold,
  ThresholdSide,
} from "./types";
