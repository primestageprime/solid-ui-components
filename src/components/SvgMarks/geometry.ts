// ============================================
// SvgMarks — the pure geometry cores (ADR 0010: a core returns DATA, not JSX).
//
// THE BOX CONTRACT. Every SVG mark draws INSIDE a box it is handed —
// `{ x, y, width, height }` in the caller's SVG coordinates — and never
// positions itself. The caller (a chart slot) does the layout, exactly as
// Layout components own geometry in HTML; the mark only paints. These
// functions are the arithmetic the marks share, with no Solid, no DOM and no
// unit: plain numbers in, plain numbers out.
// ============================================

/** Where a mark draws, in the caller's SVG user units. */
import { filter, map } from "../../fn";

export interface SvgBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Grow (or, negative, shrink) a box by `n` on every side. Never below zero size. */
export const inflate = (box: SvgBox, n: number): SvgBox => {
  const width = box.width + 2 * n;
  const height = box.height + 2 * n;
  return {
    x: width < 0 ? box.x + box.width / 2 : box.x - n,
    y: height < 0 ? box.y + box.height / 2 : box.y - n,
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
};

export const centerOf = (
  box: SvgBox,
): { readonly x: number; readonly y: number } => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/** One stretch of a bar, as FRACTIONS of the box width, and what paints it. */
export interface SegmentSpec {
  readonly from: number;
  readonly to: number;
  /** Any SVG paint: a colour, a `var(--sui-*)` token, or `url(#pattern)`. */
  readonly fill: string;
}

export interface SegmentRect {
  readonly x: number;
  readonly width: number;
  readonly fill: string;
  /** Starts exactly where the previous segment ended — draw a hairline between them. */
  readonly seam: boolean;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const TOUCH = 1e-9;

/**
 * Segments laid across a box. Fractions are clamped into [0, 1]; an empty
 * segment is dropped; a sliver is kept at least one unit wide so it is never
 * lost; a segment that begins where the previous one ended carries a seam.
 */
export const segmentRects = (
  box: SvgBox,
  segments: readonly SegmentSpec[],
): readonly SegmentRect[] => {
  const kept = filter(
    (s: SegmentSpec) => s.to > s.from,
    map((s) => ({ ...s, from: clamp01(s.from), to: clamp01(s.to) }), segments),
  );
  return map(
    (s: SegmentSpec, i) => ({
      x: box.x + s.from * box.width,
      width: Math.max(1, (s.to - s.from) * box.width),
      fill: s.fill,
      seam: i > 0 && Math.abs(kept[i - 1].to - s.from) < TOUCH,
    }),
    kept,
  );
};

/** A positioned piece of text. */
export interface PlacedText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

const PAD = 8;
const GAP = 8;

/**
 * A LEAD label at the box's left and a TRAIL label at its right, both on its
 * vertical middle. When both do not fit the trail is dropped first; when even
 * the lead does not fit, nothing is drawn. `glyph` is the width of one
 * character at the label size (the marks use a monospace face, so a count of
 * characters is a width).
 */
export const fitEndLabels = (
  box: SvgBox,
  lead: string | null,
  trail: string | null,
  glyph: number,
): { readonly lead: PlacedText | null; readonly trail: PlacedText | null } => {
  const y = box.y + box.height / 2;
  const leadW = lead ? lead.length * glyph : 0;
  const trailW = trail ? trail.length * glyph : 0;
  const both = PAD * 2 + leadW + (lead && trail ? GAP : 0) + trailW;
  const leadOnly = PAD * 2 + leadW;
  const leadAt = (): PlacedText | null =>
    lead ? { x: box.x + PAD, y, text: lead } : null;
  const trailAt = (): PlacedText | null =>
    trail ? { x: box.x + box.width - PAD, y, text: trail } : null;
  if (both <= box.width) return { lead: leadAt(), trail: trailAt() };
  if (lead && leadOnly <= box.width) return { lead: leadAt(), trail: null };
  return { lead: null, trail: null };
};
