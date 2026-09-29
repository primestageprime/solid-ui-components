// SvgMarks — Depth-1 SVG marks on the BOX CONTRACT: each draws inside a
// `{ x, y, width, height }` it is handed and never positions itself; colour is
// data. The folder imports nothing from the HTML component families, and the
// HTML families import nothing from it — only chart slots compose these — so
// it can move to its own package without untangling anything.
export { BoxRing, createBoxRing } from "./BoxRing";
export type {
  BoxRingDataProps,
  BoxRingOverrides,
  BoxRingProps,
} from "./BoxRing";
export { EndLabels, createEndLabels } from "./EndLabels";
export type {
  EndLabelsDataProps,
  EndLabelsOverrides,
  EndLabelsProps,
} from "./EndLabels";
export { GlyphBadge } from "./GlyphBadge";
export type { BadgeGlyph, GlyphBadgeProps } from "./GlyphBadge";
export { HatchPattern, createHatchPattern } from "./HatchPattern";
export type {
  HatchPatternDataProps,
  HatchPatternOverrides,
  HatchPatternProps,
} from "./HatchPattern";
export { SegmentBar, createSegmentBar } from "./SegmentBar";
export type {
  SegmentBarDataProps,
  SegmentBarOverrides,
  SegmentBarProps,
} from "./SegmentBar";
export { centerOf, fitEndLabels, inflate, segmentRects } from "./geometry";
export type { PlacedText, SegmentRect, SegmentSpec, SvgBox } from "./geometry";
