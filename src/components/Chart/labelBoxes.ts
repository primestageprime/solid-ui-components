// ============================================
// labelBoxes — Depth 0, pure. The box maths the label ladder stands on.
//
// Split out of labelPlacement.ts by concern, and to hold that module under the
// 500-line guidance. Nothing here knows about labels, zones or rungs: a box is
// four numbers, a series is a list of points, and every question asked of them
// is geometric.
//
// The one non-obvious member is `crossesAnySeries`. A caption that crosses a
// drawn line is unreadable even when it collides with no other text, so the
// body rung tests against the polylines as well as against the placed boxes.
// `segmentHitsBox` answers that with Liang-Barsky, which also reports a
// segment that lies wholly INSIDE the box — a label sitting on a flat line
// must fail the same test as one that crosses a steep one.
// ============================================
import { some } from "../../fn";

/** One point of a drawn series, in pixel space. */
export interface LabelPoint {
  readonly x: number;
  readonly y: number;
}

/** One drawn series, as the pixel polyline the chart paints. */
export type Polyline = readonly LabelPoint[];

/** The plot rectangle, in pixel space. */
export interface PlotRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** An axis-aligned box in pixel space. */
export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Two boxes touch when neither clears the other by `gap` on either axis. */
export const boxesTouch = (a: Box, b: Box, gap: number): boolean =>
  a.x0 < b.x1 + gap &&
  b.x0 < a.x1 + gap &&
  a.y0 < b.y1 + gap &&
  b.y0 < a.y1 + gap;

/** A box is inside the plot when no edge of it leaves the rectangle. */
export const boxInsidePlot = (box: Box, plot: PlotRect): boolean =>
  box.x0 >= plot.left &&
  box.x1 <= plot.right &&
  box.y0 >= plot.top &&
  box.y1 <= plot.bottom;

/**
 * Liang-Barsky: clip the segment `a → b` against the box and report whether
 * anything survives. A segment wholly inside the box survives too, so this
 * catches a label sitting on top of a line as well as one it crosses.
 *
 * The loop carries the clipped interval `[lo, hi]` from edge to edge, so a
 * combinator form would only hide the same state.
 */
export const segmentHitsBox = (
  a: LabelPoint,
  b: LabelPoint,
  box: Box,
): boolean => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: readonly (readonly [number, number])[] = [
    [-dx, a.x - box.x0],
    [dx, box.x1 - a.x],
    [-dy, a.y - box.y0],
    [dy, box.y1 - a.y],
  ];
  let lo = 0;
  let hi = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0 && r > hi) return false;
    if (p > 0 && r < lo) return false;
    if (p < 0 && r > lo) lo = r;
    if (p > 0 && r < hi) hi = r;
  }
  return lo <= hi;
};

/** True when any drawn series runs through the box. */
export const crossesAnySeries = (
  box: Box,
  polylines: readonly Polyline[],
): boolean =>
  some(
    (line: Polyline) =>
      some(
        (_point: LabelPoint, i: number) =>
          i > 0 && segmentHitsBox(line[i - 1], line[i], box),
        line,
      ),
    polylines,
  );
