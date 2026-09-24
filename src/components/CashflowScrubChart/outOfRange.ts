// ============================================
// Out-of-range markers — pure core, no DOM, no Solid.
//
// A domain that does not cover the data clips it: a FIXED y-axis range, or a
// line-based domain under a wider range cone. The chart then marks the one
// value the reader cannot see at each clipped edge — the global PEAK above
// the plot top, and the global TROUGH below the plot bottom — with a chevron
// and the compact value. One marker per edge suffices; its x is where that
// extreme happens.
//
// The candidates are every drawn value: the primary line, every balance
// series, and every fill BASELINE (a range cone's lower edge is a fill
// baseline, not a series, so without it the bottom edge never fired for the
// cone). The component collects them; this file only decides.
//
// `outOfRangeTable` prints the decision as text — the headless observation.
// ============================================

/** One drawn value at one cell, with its plot-space x and y (px). */
export interface RangePoint {
  readonly x: number;
  readonly y: number;
  readonly value: number;
}

/** The marker at one edge: where the extreme happens and what it is. */
export interface EdgeMarker {
  readonly x: number;
  readonly value: number;
}

/** Both edges' markers; `null` where nothing clips. */
export interface OutOfRange {
  readonly top: EdgeMarker | null;
  readonly bottom: EdgeMarker | null;
}

/** A value pinned EXACTLY on a nice-rounded domain edge maps within half a
 *  pixel of it; that is on the plot, not past it. */
export const OUT_OF_RANGE_EPS_PX = 0.5;

/** Distance in px the label centre keeps from each side of the plot, so a
 *  compact value ("$1.2M") never clips off the left or right edge. */
export const EDGE_LABEL_INSET = 28;

/**
 * The global peak past the plot top and the global trough past the plot
 * bottom, among `points`. Screen space decides "past" — y grows downward, so
 * above the top is `y < plotTop` — and the VALUE decides which point is the
 * extreme, so ties in pixels still name the true peak.
 */
export const outOfRange = (
  points: Iterable<RangePoint>,
  plotTop: number,
  plotBottom: number,
): OutOfRange => {
  let top: EdgeMarker | null = null;
  let bottom: EdgeMarker | null = null;
  // Running best per edge across one pass — a loop, not a fold, for the same
  // reason `extentOf` is one (helpers.ts).
  for (const p of points) {
    if (p.y < plotTop - OUT_OF_RANGE_EPS_PX && (!top || p.value > top.value))
      top = { x: p.x, value: p.value };
    if (
      p.y > plotBottom + OUT_OF_RANGE_EPS_PX &&
      (!bottom || p.value < bottom.value)
    )
      bottom = { x: p.x, value: p.value };
  }
  return { top, bottom };
};

/** The label's x: the marker's x held `EDGE_LABEL_INSET` inside the plot. */
export const edgeLabelX = (
  x: number,
  plotLeft: number,
  plotRight: number,
): number =>
  Math.min(Math.max(x, plotLeft + EDGE_LABEL_INSET), plotRight - EDGE_LABEL_INSET);

/**
 * The decision as a fixed-width table — one row per edge.
 *
 *     edge        x     value
 *     top       312    250000
 *     bottom        —         —
 */
export const outOfRangeTable = (result: OutOfRange): string => {
  const row = (edge: string, m: EdgeMarker | null) =>
    `${edge.padEnd(8)}${(m ? String(Math.round(m.x)) : "—").padStart(6)}${(m ? String(m.value) : "—").padStart(12)}`;
  return [
    `${"edge".padEnd(8)}${"x".padStart(6)}${"value".padStart(12)}`,
    row("top", result.top),
    row("bottom", result.bottom),
  ].join("\n");
};
