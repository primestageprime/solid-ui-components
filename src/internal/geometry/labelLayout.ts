// ============================================
// Placing a text label beside the thing it names — Depth 0, pure. No SolidJS,
// no DOM, no measurement. The caller measures its own text and hands the width
// in, because a rail estimates from character count while a chart measures on
// an offscreen canvas.
//
// Three steps, in the order a caller runs them:
//   fitAnchor     — pick start/middle/end so the box stays inside a span.
//   anchoredSpan  — the horizontal span the box then occupies.
//   laneOf        — stack boxes that still collide into outward lanes.
//
// Lifted out of ThresholdRail, which packed threshold labels along a rail with
// exactly this ladder. Nothing here knows about thresholds, series or ticks: a
// "label" is an x, a width and, after anchoring, a span.
// ============================================
import { sortBy } from "../../fn";

/** Where a label's text sits relative to its x — SVG `text-anchor` values. */
export type LabelAnchor = "start" | "middle" | "end";

/**
 * Pick the anchor that keeps a label of `width` centred at `x` inside
 * `[lo, hi]`. Middle wherever it fits; start when it would spill left; end
 * when it would spill right.
 */
export const fitAnchor = (
  x: number,
  width: number,
  lo: number,
  hi: number,
): LabelAnchor => {
  const half = width / 2;
  if (x - half < lo) return "start";
  if (x + half > hi) return "end";
  return "middle";
};

/** The horizontal span a label occupies once its anchor is known. */
export const anchoredSpan = (
  x: number,
  width: number,
  anchor: LabelAnchor,
): readonly [number, number] => {
  if (anchor === "start") return [x, x + width];
  if (anchor === "end") return [x - width, x];
  return [x - width / 2, x + width / 2];
};

/**
 * The least `laneOf` needs to know about a label: the point it names, and the
 * span its box covers. `x` orders the walk; `span` decides the collisions.
 *
 * Structural on purpose — a caller keeps its own richer row type and gets it
 * back with a lane added.
 */
export interface LaneBox {
  readonly x: number;
  readonly span: readonly [number, number];
}

/** How far apart lanes may stack, and how much clear space each pair demands. */
export interface LanePacking {
  /** Lane cap. Past it a box shares the outermost lane and may collide. */
  readonly maxLanes: number;
  /** Clear space demanded between two boxes sharing a lane. */
  readonly gutter: number;
}

/**
 * Give each box the lane nearest the baseline that it fits in without touching
 * one already placed there.
 *
 * Boxes are walked left to right, so a lane's occupied span is only ever its
 * rightmost box — no interval tree needed. Past `maxLanes` the box shares the
 * outermost lane and is allowed to collide, which every caller so far prefers
 * to a label leaving its frame.
 *
 * The loop is kept as a loop: each step reads the lane ends the earlier steps
 * wrote, so a combinator form would only hide the same carried state.
 */
export const laneOf = <Box extends LaneBox>(
  boxes: readonly Box[],
  packing: LanePacking,
): readonly (Box & { lane: number })[] => {
  const lastEnd: number[] = [];
  const out: (Box & { lane: number })[] = [];
  for (const box of sortBy((b: Box) => b.x, boxes)) {
    let lane = 1;
    while (
      lane <= packing.maxLanes &&
      lastEnd[lane] !== undefined &&
      box.span[0] < lastEnd[lane] + packing.gutter
    ) {
      lane += 1;
    }
    const placed = Math.min(lane, packing.maxLanes);
    lastEnd[placed] = box.span[1];
    out.push({ ...box, lane: placed });
  }
  return out;
};
