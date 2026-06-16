// The base ScrollRegion IS exported (unlike ChartCanvas): it is height-agnostic
// and the primary, behaviour-bearing API. The factory + variants are optional
// convenience presets for bounded, non-flex call sites.
export { ScrollRegion, createScrollRegion, default } from "./ScrollRegion";
export type {
  ScrollRegionProps,
  ScrollRegionOverrides,
} from "./ScrollRegion";
export * from "./variants";
