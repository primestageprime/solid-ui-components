// Base (ClampedText) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — add a variant in variants.ts).
export { createClampedText, clampLines, DEFAULT_CLAMP_LINES } from "./ClampedText";
export type {
  ClampedTextDataProps,
  ClampedTextOverrides,
  ClampedTextLines,
} from "./ClampedText";
export * from "./variants";
