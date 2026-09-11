// ============================================
// referenceLine — pure geometry for a horizontal reference rule.
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// it takes explicit pixel geometry and returns the mark to draw. It reads no
// context, touches no cell, and knows no unit — a caller supplies numbers
// already converted to whatever pixel space it owns.
//
// Two adapters call this core:
//   - `Chart`'s `ReferenceLine` (Series.tsx) supplies PLOT-LOCAL pixels —
//     x1=0 sits at the plot's left edge.
//   - `ScrubChart`'s `ScrubChartReferenceLine` supplies FRAME-ABSOLUTE
//     pixels — x1=plotLeft sits at the plot's left edge instead.
// Neither fact belongs here. The core does arithmetic on whatever it is
// given; the adapter is where the coordinate difference is absorbed.
// ============================================

/** Explicit geometry a reference line needs. No scale, no unit, no context. */
export interface ReferenceLineGeometry {
  /** Y position of the rule, in the caller's own pixel space. */
  y: number;
  /** Left endpoint of the rule, in the caller's own pixel space. */
  x1: number;
  /** Right endpoint of the rule, in the caller's own pixel space. */
  x2: number;
  /** Caption text drawn at the rule's right end. Omit to draw no caption. */
  caption?: string;
  /** Px the caption sits inset from `x2` and above `y`. Default `4`. */
  captionInset?: number;
}

/** The rule's two endpoints, ready for an SVG `<line>`. */
export interface ReferenceLineSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** The caption's anchor, or `null` when the caller gave no caption text. */
export interface ReferenceLineCaption {
  x: number;
  y: number;
  text: string;
  textAnchor: "end";
}

/** A reference line's drawable geometry: one segment, one optional caption. */
export interface ReferenceLineMark {
  line: ReferenceLineSegment;
  caption: ReferenceLineCaption | null;
}

/**
 * Builds a horizontal reference line's geometry from explicit pixel inputs.
 *
 * Pure: the same geometry in always produces the same mark out. The caption
 * seats at the rule's right end, `captionInset` px inside `x2` and above
 * `y` — the only seat this mark offers; a caller that wants a different one
 * positions its own text from `line` instead of passing `caption`.
 */
export function buildReferenceLine(
  geometry: ReferenceLineGeometry,
): ReferenceLineMark {
  const inset = geometry.captionInset ?? 4;
  return {
    line: { x1: geometry.x1, x2: geometry.x2, y1: geometry.y, y2: geometry.y },
    caption: geometry.caption
      ? {
          x: geometry.x2 - inset,
          y: geometry.y - inset,
          text: geometry.caption,
          textAnchor: "end",
        }
      : null,
  };
}
