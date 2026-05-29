// Base (StatusBadge) is intentionally NOT exported — use curried variants or createStatusBadge().
export { createStatusBadge } from "./StatusBadge";
export type { StatusBadgeDataProps } from "./StatusBadge";
export * from "./variants";
// CountChip has no design-config props — already effectively curried, re-exported as-is.
export { CountChip } from "./CountChip";
export type { CountChipProps } from "./CountChip";
