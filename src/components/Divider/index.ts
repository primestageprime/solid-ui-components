// Base (Divider) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createDivider } from "./Divider";
export type { DividerDataProps } from "./Divider";
export * from "./variants";
