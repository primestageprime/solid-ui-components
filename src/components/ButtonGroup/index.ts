// Base (ButtonGroup) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createButtonGroup } from "./ButtonGroup";
export type { ButtonGroupDataProps } from "./ButtonGroup";
export * from "./variants";
