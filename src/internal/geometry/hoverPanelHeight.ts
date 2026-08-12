// ============================================
// Height for a hover panel whose body is a list of one-line rows.
//
// A fixed-height panel divides its height among however many rows it is given,
// so the row height falls as the list grows and the labels eventually overlap
// each other. HeatStream's explanation preview hit this in production: 45
// explanation titles inside a `25vh` panel left 4.1px per row for 11px text,
// and the whole label column read as noise.
//
// The height is therefore driven by the content — one legible row each —
// floored so a short list still renders large marks, and capped so the panel
// can never grow off-screen. The viewport always wins: past the cap the rows
// share what is left and shrink evenly, which degrades far more gracefully
// than clipping the tail of the list.
//
// Returns a pixel number for the caller to set inline. Deliberately not a
// stylesheet rule — the row count is only known at runtime, and splitting the
// arithmetic between CSS and JS is what made the two drift apart before.
// ============================================

export interface HoverPanelHeightInput {
  /** Rows the panel must show. */
  rowCount: number;
  /** Height one row needs for its label to stay legible, in px. */
  rowPx: number;
  /** Everything that is not rows: padding, heading, the heading's margin. */
  chromePx: number;
  /** Floor, so a short list still gets a panel worth looking at. */
  minPx: number;
  /** Viewport height the panel has to fit inside. */
  viewportPx: number;
  /** Gap left between the panel and each viewport edge. */
  marginPx: number;
}

/** Content-driven panel height, floored at `minPx` and capped to the viewport. */
export const hoverPanelHeight = ({
  rowCount,
  rowPx,
  chromePx,
  minPx,
  viewportPx,
  marginPx,
}: HoverPanelHeightInput): number => {
  const wanted = Math.max(rowCount, 0) * rowPx + chromePx;
  const ceiling = Math.max(viewportPx - 2 * marginPx, 0);
  return Math.min(Math.max(wanted, minPx), ceiling);
};
