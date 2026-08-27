// ============================================
// ThresholdRail helpers — Depth 0, pure. No SolidJS, no DOM.
//
// Three jobs, all of them the reason a consumer cannot compose this rail from
// a slider plus a separate axis:
//   fitAnchor  — pick start/middle/end so a label stays inside the box.
//   assignLanes — stack colliding labels outward from the rail.
//   railExtents — size the viewBox around however many lanes got used.
//
// Text is MEASURED BY ESTIMATE, not by getBBox. The design spec asks for
// getBBox in a real implementation, but jsdom implements no SVG layout, so
// every lane assertion would be unfalsifiable under it. The spec's own
// generous estimate is used instead: ~6.0px per monospace character at 10px.
// An earlier 5.0px estimate let through collisions that were plainly visible.
// ============================================
import { map, sortBy } from "../../fn";
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
/** How far the thumb reaches on each side of the rail. */
export const THUMB_REACH_ABOVE = 15;
export const THUMB_REACH_BELOW = 9;
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

/** Vertical positions of one lane on one side, given where the rail sits. */
export const laneGeometry = (
  lane: number,
  side: ThresholdSide,
  railY: number,
): LaneGeometry => {
  const reach = TICK_LENGTH + LANE_PITCH * (lane - 1);
  if (side === "above") {
    const tickEnd = railY - reach;
    const nameY = tickEnd - NAME_GAP_ABOVE;
    return { tickEnd, nameY, valueY: nameY - LINE_PITCH };
  }
  const tickEnd = railY + reach;
  const nameY = tickEnd + NAME_GAP_BELOW;
  return { tickEnd, nameY, valueY: nameY + LINE_PITCH };
};

/** How far one side of the rail must extend to hold `laneCount` lanes. */
const sideExtent = (laneCount: number, side: ThresholdSide): number => {
  const thumb = side === "above" ? THUMB_REACH_ABOVE : THUMB_REACH_BELOW;
  if (laneCount === 0) return thumb + TEXT_PAD;
  const gap = side === "above" ? NAME_GAP_ABOVE : NAME_GAP_BELOW;
  const reach = TICK_LENGTH + LANE_PITCH * (laneCount - 1);
  const text = reach + gap + LINE_PITCH + TEXT_PAD;
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
 * Give each candidate the lane nearest the rail that its label fits in
 * without touching one already placed there.
 *
 * Candidates are walked left to right, so a lane's occupied span is only ever
 * its rightmost label — no interval tree needed. Past `MAX_LANES` the label
 * shares the outermost lane and is allowed to collide, which the spec prefers
 * to a label leaving the box.
 */
const laneOf = (
  candidates: readonly Candidate[],
): readonly (Candidate & { lane: number })[] => {
  const lastEnd: number[] = [];
  const out: (Candidate & { lane: number })[] = [];
  for (const candidate of sortBy((c: Candidate) => c.x, candidates)) {
    let lane = 1;
    while (
      lane <= MAX_LANES &&
      lastEnd[lane] !== undefined &&
      candidate.span[0] < lastEnd[lane] + LABEL_GUTTER
    ) {
      lane += 1;
    }
    const placed = Math.min(lane, MAX_LANES);
    lastEnd[placed] = candidate.span[1];
    out.push({ ...candidate, lane: placed });
  }
  return out;
};

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

  const above = laneOf(onSide("above"));
  const below = laneOf(onSide("below"));

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
