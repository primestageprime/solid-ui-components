// Base (StampedRow) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — add a variant in variants.ts).
export { createStampedRow, stampGlyph, formatStampTime, STAMP_GLYPHS } from "./StampedRow";
export type {
  StampedRowDataProps,
  StampedRowOverrides,
  StampKind,
  StampDensity,
} from "./StampedRow";
export * from "./variants";
