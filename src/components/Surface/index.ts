// Base (Surface) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createSurface } from "./Surface";
export type { SurfaceDataProps } from "./Surface";
export * from "./variants";
