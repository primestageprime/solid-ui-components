// Base (ProgressCheck) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createProgressCheck } from "./ProgressCheck";
export type { ProgressCheckDataProps } from "./ProgressCheck";
export * from "./variants";
