// ============================================
// tooltipPlacement — pure geometry for a measured-width tooltip flip.
//
// A CORE per docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md:
// it takes explicit pixel geometry and returns the tooltip's x. It reads no
// context, touches no cell, and knows no unit.
//
// `Chart`'s `ChartTooltip` (Tooltip.tsx) calls this with plot-local numbers.
// `ScrubChart`'s `ScrubChartTooltip` calls it with frame-absolute numbers.
// Both measure the rendered tooltip's own width (a ref + `observeSize`, or
// `getBBox`) before calling in — measuring is the adapter's job, since it is
// the only side that owns a DOM node.
// ============================================

/** Explicit geometry a tooltip flip needs. No scale, no unit, no context. */
export interface TooltipPlacementInput {
  /** Anchor's pixel x — typically the hovered point's x. */
  anchorX: number;
  /** Tooltip's rendered (measured) width in px. */
  tipWidth: number;
  /** Px the tooltip sits offset from the anchor when placed to its right,
   *  and the gap kept when flipped to its left. */
  offsetX: number;
  /** Left edge of the region the tooltip must stay inside. */
  boundsLeft: number;
  /** Right edge of the region the tooltip must stay inside. */
  boundsRight: number;
}

/**
 * Picks the tooltip's left-edge x from a MEASURED width, not a midpoint
 * guess: preferred placement sits `offsetX` right of `anchorX`; when that
 * would run past `boundsRight` it flips to `offsetX` left of `anchorX`
 * instead; when even the flipped placement would run past `boundsLeft` (the
 * tooltip is wider than the available span) it pins to whichever edge loses
 * less.
 *
 * Pure: the same geometry in always produces the same x out.
 */
export function placeTooltipX(input: TooltipPlacementInput): number {
  const { anchorX, tipWidth, offsetX, boundsLeft, boundsRight } = input;
  const preferred = anchorX + offsetX;
  if (preferred + tipWidth <= boundsRight) return preferred;
  const flipped = anchorX - offsetX - tipWidth;
  if (flipped >= boundsLeft) return flipped;
  return Math.max(boundsLeft, boundsRight - tipWidth);
}
