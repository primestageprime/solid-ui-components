// Base (Section) is intentionally NOT exported — use curried variants or createSection().
export { createSection } from "./Section";
export type { SectionDataProps } from "./Section";
export * from "./variants";
// No-config helpers — re-exported as-is.
export { StickyGroupHeader, SectionLabel } from "./StickyGroupHeader";
export type { StickyGroupHeaderProps, SectionLabelProps } from "./StickyGroupHeader";
