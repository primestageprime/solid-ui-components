// ============================================
// BandRail helpers — Depth 0, pure. No SolidJS, no DOM.
//
// Three jobs, all of them the reason a consumer cannot compose this rail from
// a slider plus a separate axis:
//   fitAnchor  — pick start/middle/end so a label stays inside the box.
//   laneOf     — stack colliding labels outward from the rail.
//   railExtents — size the viewBox around however many lanes got used.
//
// The first two are not written here. They are generic label geometry, so they
// live in `internal/geometry/labelLayout` and a chart label layer uses the same
// code. This file supplies the rail's own constants to them.
//
// Text is MEASURED BY ESTIMATE, not by getBBox. The design spec asks for
// getBBox in a real implementation, but jsdom implements no SVG layout, so
// every lane assertion would be unfalsifiable under it. The spec's own
// generous estimate is used instead: ~6.0px per monospace character at 10px.
// An earlier 5.0px estimate let through collisions that were plainly visible.
// ============================================
import { map } from "../../fn";
import {
  anchoredSpan,
  fitAnchor,
  laneOf,
} from "../../internal/geometry/labelLayout";
import type {
  LabelAnchor,
  LaneGeometry,
  PlacedThreshold,
  Threshold,
  ThresholdSide,
} from "./types";

/** Width of the viewBox. The rail's pixel size comes from CSS, not from this. */
export const VIEW_WIDTH = 700;
/** Gap between the box edge and each end of the rail. */
export const RAIL_INSET = 22;
/** Length of a lane-1 tick stroke. */
export const TICK_LENGTH = 10;
/** Distance between one lane and the next, measured outward from the rail. */
export const LANE_PITCH = 22;
/** Distance between the two text lines of one label. */
export const LINE_PITCH = 11;
/** Name baseline offset past the tick end, on the "above" side. */
export const NAME_GAP_ABOVE = 4;
/** Name baseline offset past the tick end, on the "below" side. */
export const NAME_GAP_BELOW = 11;
/** Headroom kept past the outermost text baseline. */
export const TEXT_PAD = 14;
/* ---- Thumb geometry, in viewBox units ----
   These live here, not in the component, because `labelBase` is floored at the
   thumb's reach. Held apart, the arrow's height and the floor that clears it
   were the same number written twice with nothing tying them together.

   Sized in viewBox units on purpose, NOT from a CSS pixel token.
   `valueFromClientX` needs the viewBox to keep its aspect ratio, and a
   pixel-sized thumb would make the reach a function of the rendered width — so
   the box height would move on resize and that conversion would break. The
   thumb shrinks at narrow widths because the whole drawing does, labels
   included; the rail is a fixed-aspect drawing meant to be read near 700 wide. */

/** Thumb arrow, measured from the rail. */
export const ARROW_HALF_WIDTH = 7.5;
export const ARROW_TIP_GAP = 9;
export const ARROW_TOP = 22;
export const STEM_HALF_WIDTH = 1.8;
/** The nesting ring, and the dot inside it. */
export const RING_RADIUS = 12.5;
export const DOT_RADIUS = 5;
/** Stroke width of one arc of the ring. */
export const ARC_STROKE = 2.5;

/**
 * How far the thumb reaches on each side of the rail.
 *
 * DERIVED from the shapes above rather than written down, so the floor that
 * keeps a lane-1 label clear of the thumb can never disagree with the thumb
 * actually drawn. Rounded up, because the floor only needs to be at least the
 * reach and a whole unit reads better in the box height.
 *
 * Above, the arrow is the taller of the two forms. Below, the ring is: the
 * arrow's stem reaches only `ARROW_TIP_GAP`.
 */
const ringOuterEdge = RING_RADIUS + ARC_STROKE / 2;
export const THUMB_REACH_ABOVE = Math.ceil(Math.max(ARROW_TOP, ringOuterEdge));
export const THUMB_REACH_BELOW = Math.ceil(
  Math.max(ARROW_TIP_GAP, ringOuterEdge),
);
/** Lane cap, per the design spec: stacked labels must not leave the box. */
export const MAX_LANES = 4;
/** Estimated width of one character at the rail's 10px monospace size. */
export const CHAR_WIDTH = 6.0;
/** Clear space demanded between two labels sharing a lane. */
export const LABEL_GUTTER = 4;
/**
 * How near the rail's value must come to a threshold before the thumb nests.
 * In viewBox units — a little over half the nesting ring's radius. The rail
 * does NOT snap: the value the consumer gets back is never rounded to a
 * threshold, because a dial that quietly edits its own output cannot be
 * trusted to report what the user chose.
 */
export const NEST_TOLERANCE = 4;

/** Estimated rendered width of a text line, in viewBox units. */
export const estimateTextWidth = (text: string): number =>
  text.length * CHAR_WIDTH;

/**
 * Re-exported from `internal/geometry/labelLayout`, where the rail's anchor
 * rule now lives. The rail's tests and its component read them from here.
 */
export { anchoredSpan, fitAnchor };

/** How far the tick stroke of `lane` reaches out from the rail. */
const tickReach = (lane: number): number =>
  TICK_LENGTH + LANE_PITCH * (lane - 1);

/**
 * How far the label band of lane 1 starts from the rail, on `side`.
 *
 * A lane-1 name baseline above the rail would otherwise land inside the
 * thumb's arrow, so the base is floored at the thumb's reach. Below the rail
 * the enlarged ring now reaches past a lane-1 tick, so the floor bites on both
 * sides — it did not before the thumb grew.
 */
const labelBase = (side: ThresholdSide): number =>
  Math.max(
    TICK_LENGTH,
    side === "above" ? THUMB_REACH_ABOVE : THUMB_REACH_BELOW,
  );

/**
 * How far the label band of `lane` starts from the rail, on `side`.
 *
 * The floor applies to the base of the stack, not to each lane, so every lane
 * on a side shifts by the same amount and consecutive lanes stay one
 * `LANE_PITCH` apart. Flooring per lane would lift lane 1 alone and close the
 * gap between its value line and the name line of lane 2. The tick stroke is
 * measured separately by `tickReach` and keeps its length.
 *
 * `laneGeometry` and `sideExtent` both read this, so a lifted label and the
 * box sized to hold it can never disagree.
 */
const labelReach = (lane: number, side: ThresholdSide): number =>
  labelBase(side) + LANE_PITCH * (lane - 1);

/** Vertical positions of one lane on one side, given where the rail sits. */
export const laneGeometry = (
  lane: number,
  side: ThresholdSide,
  railY: number,
): LaneGeometry => {
  const reach = tickReach(lane);
  const band = labelReach(lane, side);
  if (side === "above") {
    const nameY = railY - band - NAME_GAP_ABOVE;
    return { tickEnd: railY - reach, nameY, valueY: nameY - LINE_PITCH };
  }
  const nameY = railY + band + NAME_GAP_BELOW;
  return { tickEnd: railY + reach, nameY, valueY: nameY + LINE_PITCH };
};

/** How far one side of the rail must extend to hold `laneCount` lanes. */
const sideExtent = (laneCount: number, side: ThresholdSide): number => {
  const thumb = side === "above" ? THUMB_REACH_ABOVE : THUMB_REACH_BELOW;
  if (laneCount === 0) return thumb + TEXT_PAD;
  const gap = side === "above" ? NAME_GAP_ABOVE : NAME_GAP_BELOW;
  const text = labelReach(laneCount, side) + gap + LINE_PITCH + TEXT_PAD;
  return Math.max(text, thumb + TEXT_PAD);
};

/**
 * Size the viewBox around the lanes that were actually used, so a rail with
 * one lane a side is not padded out to the height of a four-lane one.
 */
export const railExtents = (
  aboveLanes: number,
  belowLanes: number,
): { railY: number; height: number } => {
  const railY = sideExtent(aboveLanes, "above");
  return { railY, height: railY + sideExtent(belowLanes, "below") };
};

interface Candidate {
  threshold: Threshold;
  x: number;
  side: ThresholdSide;
  anchor: LabelAnchor;
  valueLabel: string;
  span: readonly [number, number];
}

/**
 * Place every threshold: project it onto the rail, fit its anchor, then stack
 * the two sides into lanes independently.
 *
 * `toX` is the caller's domain-to-viewBox projection. `format` renders the
 * second text line. Both sides get their own lane stack because `side` is the
 * consumer's declaration, not something this function is free to change.
 */
export const placeThresholds = (
  thresholds: readonly Threshold[],
  toX: (value: number) => number,
  format: (value: number) => string,
): {
  placed: readonly PlacedThreshold[];
  aboveLanes: number;
  belowLanes: number;
} => {
  const lo = RAIL_INSET;
  const hi = VIEW_WIDTH - RAIL_INSET;

  const toCandidate = (threshold: Threshold): Candidate => {
    const x = toX(threshold.value);
    const valueLabel = format(threshold.value);
    const width = Math.max(
      estimateTextWidth(threshold.label),
      estimateTextWidth(valueLabel),
    );
    const anchor = fitAnchor(x, width, lo, hi);
    return {
      threshold,
      x,
      side: threshold.side ?? "above",
      anchor,
      valueLabel,
      span: anchoredSpan(x, width, anchor),
    };
  };

  const candidates = map(toCandidate, thresholds);
  const onSide = (side: ThresholdSide): Candidate[] => {
    const out: Candidate[] = [];
    for (const c of candidates) if (c.side === side) out.push(c);
    return out;
  };

  const packing = { maxLanes: MAX_LANES, gutter: LABEL_GUTTER };
  const above = laneOf(onSide("above"), packing);
  const below = laneOf(onSide("below"), packing);

  const maxLane = (rows: readonly { lane: number }[]): number => {
    let max = 0;
    for (const row of rows) if (row.lane > max) max = row.lane;
    return max;
  };

  const strip = (c: Candidate & { lane: number }): PlacedThreshold => ({
    threshold: c.threshold,
    x: c.x,
    side: c.side,
    lane: c.lane,
    anchor: c.anchor,
    valueLabel: c.valueLabel,
  });

  return {
    placed: [...map(strip, above), ...map(strip, below)],
    aboveLanes: maxLane(above),
    belowLanes: maxLane(below),
  };
};

/**
 * The threshold the rail's value is sitting on, if any — the one the thumb
 * nests into. Nearest wins when two are within tolerance of each other.
 */
export const nestedThreshold = (
  placed: readonly PlacedThreshold[],
  valueX: number,
): PlacedThreshold | undefined => {
  let best: PlacedThreshold | undefined;
  let bestGap = NEST_TOLERANCE;
  for (const p of placed) {
    const gap = Math.abs(p.x - valueX);
    if (gap <= bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
};
