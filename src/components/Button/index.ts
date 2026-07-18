// Base (Button) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createButton } from "./Button";
export type { ButtonDataProps } from "./Button";
export * from "./variants";
