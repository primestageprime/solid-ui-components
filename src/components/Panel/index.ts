// Base (Panel) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createPanel } from "./Panel";
export type { PanelDataProps } from "./Panel";
export * from "./variants";
