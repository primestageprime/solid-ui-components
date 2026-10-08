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

/** A DOM box, as far as `chartToOverlay` needs one (a `DOMRect` fits). */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Explicit geometry to map chart (viewBox) units onto overlay pixels. */
export interface ChartToOverlayInput {
  /** The svg's `viewBox` width — the chart's own `width`. */
  viewBoxWidth: number;
  /** The svg's `viewBox` height — the chart's own `height`. */
  viewBoxHeight: number;
  /** The svg's on-screen box (`getBoundingClientRect`). */
  svgBox: Box;
  /** The overlay's on-screen box — the tooltip's positioning context. */
  overlayBox: Box;
}

/** `overlayPx = offset + chartUnits * scale`, per axis. */
export interface ChartToOverlay {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * How one chart unit lands on the overlay. The svg's default
 * `preserveAspectRatio` (xMidYMid meet) scales the viewBox UNIFORMLY by the
 * tighter axis and centres the slack, so the scale is the smaller of the two
 * ratios and each offset is the svg's own offset inside the overlay (a title
 * above it, say) plus half that axis's letterbox.
 *
 * An unmeasured (zero-size) svg maps 1:1 at the overlay origin — the identity
 * the chart had before anything measured, and what jsdom always reports.
 */
export function chartToOverlay(input: ChartToOverlayInput): ChartToOverlay {
  const { viewBoxWidth, viewBoxHeight, svgBox, overlayBox } = input;
  if (
    svgBox.width <= 0 ||
    svgBox.height <= 0 ||
    viewBoxWidth <= 0 ||
    viewBoxHeight <= 0
  ) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(
    svgBox.width / viewBoxWidth,
    svgBox.height / viewBoxHeight,
  );
  return {
    scale,
    offsetX:
      svgBox.left - overlayBox.left + (svgBox.width - viewBoxWidth * scale) / 2,
    offsetY:
      svgBox.top - overlayBox.top + (svgBox.height - viewBoxHeight * scale) / 2,
  };
}
