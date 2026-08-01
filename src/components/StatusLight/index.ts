// Base (StatusLight) is intentionally NOT exported — consumers use the curried
// variants ONLY (no create* factories at call sites). Internal users import "./StatusLight" directly.
export { createStatusLight } from "./StatusLight";
export type { StatusLightDataProps } from "./StatusLight";
export * from "./variants";
