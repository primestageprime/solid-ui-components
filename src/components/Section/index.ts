// Base (Section) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createSection } from "./Section";
export type { SectionDataProps } from "./Section";
export * from "./variants";
// No-config helpers — re-exported as-is.
export { StickyGroupHeader, SectionLabel } from "./StickyGroupHeader";
export type {
  StickyGroupHeaderProps,
  SectionLabelProps,
} from "./StickyGroupHeader";
