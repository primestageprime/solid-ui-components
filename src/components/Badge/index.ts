// Base (StatusBadge) is intentionally NOT exported — use curried variants or createStatusBadge().
export { createStatusBadge } from "./StatusBadge";
// StatusBadgeVariant is the public contract of createStatusBadge({ variant }) — exported so consumers can type the variant arg.
export type { StatusBadgeDataProps, StatusBadgeVariant } from "./StatusBadge";
export * from "./variants";
// CountChip has no design-config props — already effectively curried, re-exported as-is.
export { CountChip } from "./CountChip";
export type { CountChipProps } from "./CountChip";
