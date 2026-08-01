// Base (TruthIndicator) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createTruthIndicator } from "./TruthIndicator";
export type { TruthIndicatorDataProps } from "./TruthIndicator";
export * from "./variants";
