// Barrel — the base component ships alongside the factory here, because a
// rail's formatter is often genuinely reactive (a currency the user switches),
// and forcing every consumer through a curried variant would hide that.
export { BandRail, createBandRail } from "./BandRail";
export type {
  BandRailProps,
  BandRailDataProps,
  BandRailOverrides,
} from "./BandRail";
export type {
  Band,
  LabelAnchor,
  LaneGeometry,
  PlacedBand,
  PlacedThreshold,
  Threshold,
  ThresholdSide,
} from "./types";

// ---- Deprecated aliases ----
//
// `ThresholdRail` was the name until the rail gained bands. It named one of two
// marks: the rail draws bands as well as thresholds, and the bands carry the
// answer while the thresholds carry only where it changes.
//
// `Threshold`, `ThresholdSide` and `PlacedThreshold` are NOT aliases. They keep
// their names, because a threshold is still exactly what they describe.
//
// thorcasting-ui imports `ThresholdRail` at two sites — see
// `docs/usage-manifest.json`. These aliases exist so that repo can move on its
// own schedule. Delete them one minor version after the consumer has moved.
//
// The CSS prefix gets no alias. `sui-threshold-rail__*` is now
// `sui-band-rail__*`, and duplicating every rule to keep the old class names
// costs more than the one consumer edit.

/** @deprecated Renamed to `BandRail` when the rail gained bands. Use that name. */
export { BandRail as ThresholdRail } from "./BandRail";
/** @deprecated Renamed to `createBandRail` when the rail gained bands. Use that name. */
export { createBandRail as createThresholdRail } from "./BandRail";
/** @deprecated Renamed to `BandRailProps` when the rail gained bands. Use that name. */
export type { BandRailProps as ThresholdRailProps } from "./BandRail";
/** @deprecated Renamed to `BandRailDataProps` when the rail gained bands. Use that name. */
export type { BandRailDataProps as ThresholdRailDataProps } from "./BandRail";
/** @deprecated Renamed to `BandRailOverrides` when the rail gained bands. Use that name. */
export type { BandRailOverrides as ThresholdRailOverrides } from "./BandRail";
