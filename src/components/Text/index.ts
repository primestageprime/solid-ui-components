// Base (Text) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createText } from "./Text";
export type { TextDataProps } from "./Text";
// Re-export every variant so adding a new one in variants.ts is automatically public.
export * from "./variants";
