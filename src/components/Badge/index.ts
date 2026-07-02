// Base (StatusBadge) is intentionally NOT exported — use curried variants or createStatusBadge().
export { createStatusBadge } from "./StatusBadge";
// StatusBadgeVariant is the public contract of createStatusBadge({ variant }) — exported so consumers can type the variant arg.
export type { StatusBadgeDataProps, StatusBadgeVariant } from "./StatusBadge";
export * from "./variants";
// CountChip has no design-config props — already effectively curried, re-exported as-is.
export { CountChip } from "./CountChip";
export type { CountChipProps } from "./CountChip";
// BaselineDot has no design-config props — re-exported as-is.
export { BaselineDot } from "./BaselineDot";
export type { BaselineDotProps } from "./BaselineDot";
// TagPill — free-text / split-lozenge tag; a Badge-family sibling of CountChip
// (a separate pill primitive in this folder, not a StatusBadge variant, because
// its data model differs). Data-only, re-exported as-is.
export { TagPill } from "./TagPill";
export type { TagPillProps, TagPillData, TagPillLabel, TagPillKeyValue } from "./TagPill";
// StatusChip — the EDITABLE sibling of StatusBadge (inline text edit + select).
// A separate Badge-family primitive, not a StatusBadge variant. Data-only.
export { StatusChip } from "./StatusChip";
export type { StatusChipProps } from "./StatusChip";
