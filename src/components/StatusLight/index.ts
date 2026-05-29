// Base (StatusLight) is intentionally NOT exported — consumers use the curried
// variants or createStatusLight(). Internal users import "./StatusLight" directly.
export { createStatusLight } from "./StatusLight";
export type { StatusLightDataProps } from "./StatusLight";
export * from "./variants";
