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
import { map, sortBy } from "../../fn";
import { clamp } from "../../internal/math/clamp";
import {
  anchoredSpan,
  fitAnchor,
  laneOf,
} from "../../internal/geometry/labelLayout";
import type {
  Band,
  LabelAnchor,
  LaneGeometry,
  PlacedBand,
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

/* ---- Bands ---- */
/** Stroke width of a band's bar. */
export const BAND_THICKNESS = 3;
/** Gap between a band's bar and its own label. */
export const BAND_LABEL_GAP = 4;
/** Clear space between the label of one band lane and the bar of the next. */
export const BAND_LANE_GAP = 4;

/**
 * How far a band's label reaches past its bar.
 *
 * ONE definition, read by `bandGeometry` when it draws and by `bandStackReach`
 * when the box is sized. Held apart, the two computed the same distance from
 * different numbers and disagreed by 15.5 units, which put every threshold
 * label inside the band labels it was supposed to stack outside of.
 *
 * The far edge is the same on both sides even though the BASELINE is not: text
 * sits above its baseline, so an "above" label's baseline is nearer the bar by
 * one line and its far edge is not.
 */
export const BAND_LABEL_REACH =
  BAND_THICKNESS / 2 + BAND_LABEL_GAP + LINE_PITCH;

/**
 * Distance between one band lane and the next.
 *
 * DERIVED, not chosen. A lane has to hold a bar and the label under it, or
 * consecutive lanes draw their bars through each other's text — which is what
 * a hand-set 15 did against a label that needs 18.
 */
export const BAND_LANE_PITCH =
  BAND_LABEL_REACH + BAND_THICKNESS / 2 + BAND_LANE_GAP;
/** Half-height of the cap stroke drawn at a band's bounded end. */
export const BAND_CAP_HALF = 3.5;

/* ---- The arc ring ---- */
/** Viewbox units of clear space between two arcs of the thumb ring. */
export const ARC_GAP = 3;
/**
 * Past this many active bands the ring gives up on arcs and draws one neutral
 * circle. At ten arcs each is twice the stroke width and reads as a dash; the
 * dimmed bars carry the message from there.
 */
export const MAX_ARCS = 8;
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

/** The outermost lane a placement used. Zero when nothing was placed. */
const maxLane = (rows: readonly { lane: number }[]): number => {
  let max = 0;
  for (const row of rows) if (row.lane > max) max = row.lane;
  return max;
};

/**
 * Hold an x inside the rail's ends.
 *
 * A band may start before the domain or end after it — a consumer computing
 * "insolvent above $9.3k" against a domain that stops at $11.5k is not wrong,
 * and neither is one whose span runs off both ends. The bar is clamped to what
 * the rail can draw; `capStart` and `capEnd` remember which ends were real.
 */
const clampToRail = (x: number): number =>
  clamp(x, RAIL_INSET, VIEW_WIDTH - RAIL_INSET);

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
const thumbReach = (side: ThresholdSide): number =>
  side === "above" ? THUMB_REACH_ABOVE : THUMB_REACH_BELOW;

/**
 * How far the band stack on `side` reaches out from the rail.
 *
 * Zero bands reach nothing, so a rail with no bands is sized exactly as it was
 * before bands existed.
 */
export const bandStackReach = (
  bandLanes: number,
  side: ThresholdSide,
): number =>
  bandLanes === 0 ? 0 : bandLaneReach(bandLanes, side) + BAND_LABEL_REACH;

/**
 * How far the band stack's `lane` sits from the rail, on `side`.
 *
 * Floored at the thumb's reach for the same reason the labels are: lane 1 would
 * otherwise be drawn through the thumb.
 */
export const bandLaneReach = (lane: number, side: ThresholdSide): number =>
  Math.max(TICK_LENGTH, thumbReach(side)) + BAND_LANE_PITCH * (lane - 1);

/**
 * How far the label band of lane 1 starts from the rail, on `side`.
 *
 * Three floors, and the largest wins: a lane-1 tick, the thumb, and whatever
 * the band stack occupies. Bands sit NEAREST the rail and the threshold labels
 * stack outside them, so every band lane pushes the labels out by one
 * `BAND_LANE_PITCH`.
 */
const labelBase = (side: ThresholdSide, bandLanes = 0): number =>
  Math.max(TICK_LENGTH, thumbReach(side), bandStackReach(bandLanes, side));

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
const labelReach = (lane: number, side: ThresholdSide, bandLanes = 0): number =>
  labelBase(side, bandLanes) + LANE_PITCH * (lane - 1);

/**
 * Vertical positions of one BAND lane, given where the rail sits.
 *
 * Read by the drawing and by `sideExtent`, the same way `laneGeometry` is, so
 * a bar and the box sized to hold it can never disagree.
 */
export const bandGeometry = (
  lane: number,
  side: ThresholdSide,
  railY: number,
): { barY: number; labelY: number } => {
  const reach = bandLaneReach(lane, side);
  if (side === "above") {
    const barY = railY - reach;
    // Text sits ABOVE its baseline, so an above label's baseline is one line
    // nearer the bar than a below label's. Both far edges land on
    // BAND_LABEL_REACH, which is what the box is sized from.
    return { barY, labelY: barY - BAND_LABEL_REACH + LINE_PITCH };
  }
  const barY = railY + reach;
  return { barY, labelY: barY + BAND_LABEL_REACH };
};

/** Vertical positions of one lane on one side, given where the rail sits. */
export const laneGeometry = (
  lane: number,
  side: ThresholdSide,
  railY: number,
  bandLanes = 0,
): LaneGeometry => {
  const reach = tickReach(lane);
  // `toLabel`, not `band` — a band is now a thing on this rail, and reusing the
  // word for "how far out the label sits" would read as one.
  const toLabel = labelReach(lane, side, bandLanes);
  if (side === "above") {
    const nameY = railY - toLabel - NAME_GAP_ABOVE;
    return { tickEnd: railY - reach, nameY, valueY: nameY - LINE_PITCH };
  }
  const nameY = railY + toLabel + NAME_GAP_BELOW;
  return { tickEnd: railY + reach, nameY, valueY: nameY + LINE_PITCH };
};

/** How far one side of the rail must extend to hold `laneCount` lanes. */
const sideExtent = (
  laneCount: number,
  side: ThresholdSide,
  bandLanes = 0,
): number => {
  const thumb = thumbReach(side);
  // The outermost band's own label still needs room when no threshold label
  // stacks outside it to provide that room.
  const bands =
    bandLanes === 0 ? 0 : bandStackReach(bandLanes, side) + TEXT_PAD;
  if (laneCount === 0) return Math.max(thumb + TEXT_PAD, bands);
  const gap = side === "above" ? NAME_GAP_ABOVE : NAME_GAP_BELOW;
  const text =
    labelReach(laneCount, side, bandLanes) + gap + LINE_PITCH + TEXT_PAD;
  return Math.max(text, thumb + TEXT_PAD, bands);
};

/**
 * Size the viewBox around the lanes that were actually used, so a rail with
 * one lane a side is not padded out to the height of a four-lane one.
 */
export const railExtents = (
  aboveLanes: number,
  belowLanes: number,
  aboveBandLanes = 0,
  belowBandLanes = 0,
): { railY: number; height: number } => {
  const railY = sideExtent(aboveLanes, "above", aboveBandLanes);
  return {
    railY,
    height: railY + sideExtent(belowLanes, "below", belowBandLanes),
  };
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

/**
 * Place every band: clamp its span to the rail, note which ends are its own,
 * then stack the two sides into lanes independently.
 *
 * BANDS NEVER SHARE A LANE. `laneOf` forces a box into the outermost lane past
 * its cap and lets it collide, which is right for a label — a crowded label
 * still reads as two labels, while one that leaves the frame is gone. It is
 * wrong for a bar: two bars superimposed at one lane's y read as a SINGLE bar
 * spanning the union of both extents, a span that neither band claims. That is
 * not a crowded picture, it is a false one. So the cap is `Infinity` and the
 * box grows instead. Height is visible and the consumer's own doing; a bar
 * drawn across a range nobody asked for is neither.
 *
 * `toX` is the caller's domain-to-viewBox projection. `domain` supplies the
 * default for an omitted end — a default, not arithmetic on the band's values.
 */
export const placeBands = (
  bands: readonly Band[],
  toX: (value: number) => number,
  domain: readonly [number, number],
): {
  placed: readonly PlacedBand[];
  aboveLanes: number;
  belowLanes: number;
} => {
  const lo = RAIL_INSET;
  const hi = VIEW_WIDTH - RAIL_INSET;

  interface BandBox {
    band: Band;
    x: number;
    x1: number;
    x2: number;
    capStart: boolean;
    capEnd: boolean;
    side: ThresholdSide;
    anchor: LabelAnchor;
    span: readonly [number, number];
  }

  const toBox = (band: Band): BandBox => {
    const startValue = band.start ?? domain[0];
    const endValue = band.end ?? domain[1];
    const x1 = clampToRail(toX(startValue));
    const x2 = clampToRail(toX(endValue));
    // An end is CAPPED when the band's own value falls inside the rail. A band
    // running off the end has no crossing to draw there.
    const capStart = band.start !== undefined && toX(startValue) > lo;
    const capEnd = band.end !== undefined && toX(endValue) < hi;

    const width = estimateTextWidth(band.label);
    const middle = (x1 + x2) / 2;
    const anchor = fitAnchor(middle, width, lo, hi);
    // The lane box is the wider of the bar and its label: a short bar under a
    // long label still has to clear its neighbour by the label's width.
    const labelSpan = anchoredSpan(middle, width, anchor);
    return {
      band,
      x: x1,
      x1,
      x2,
      capStart,
      capEnd,
      side: band.side ?? "below",
      anchor,
      span: [Math.min(x1, labelSpan[0]), Math.max(x2, labelSpan[1])],
    };
  };

  const boxes = map(toBox, bands);
  const onSide = (side: ThresholdSide): BandBox[] => {
    const out: BandBox[] = [];
    for (const b of boxes) if (b.side === side) out.push(b);
    return out;
  };

  const packing = {
    maxLanes: Number.POSITIVE_INFINITY,
    gutter: LABEL_GUTTER,
  };
  const above = laneOf(onSide("above"), packing);
  const below = laneOf(onSide("below"), packing);

  const strip = (b: BandBox & { lane: number }): PlacedBand => ({
    band: b.band,
    x1: b.x1,
    x2: b.x2,
    capStart: b.capStart,
    capEnd: b.capEnd,
    side: b.side,
    lane: b.lane,
    anchor: b.anchor,
  });

  return {
    placed: [...map(strip, above), ...map(strip, below)],
    aboveLanes: maxLane(above),
    belowLanes: maxLane(below),
  };
};

/** Whether `value` falls inside `band`, reading an omitted end as the domain end. */
export const bandHolds = (
  band: Band,
  value: number,
  domain: readonly [number, number],
): boolean =>
  value >= (band.start ?? domain[0]) && value <= (band.end ?? domain[1]);

/**
 * Arc lengths for `count` active bands around a ring of `radius`.
 *
 * One band returns a single full circle, which is exactly the ring the rail
 * drew before bands existed. Past `MAX_ARCS` the caller draws one neutral ring
 * instead; this returns an empty list to say so, rather than arcs too short to
 * read.
 */
export const arcLengths = (
  count: number,
  radius: number,
): { circumference: number; arc: number; gap: number }[] => {
  const circumference = 2 * Math.PI * radius;
  if (count <= 0 || count > MAX_ARCS) return [];
  if (count === 1) return [{ circumference, arc: circumference, gap: 0 }];
  const arc = (circumference - ARC_GAP * count) / count;
  const out: { circumference: number; arc: number; gap: number }[] = [];
  for (let i = 0; i < count; i += 1)
    out.push({ circumference, arc, gap: ARC_GAP });
  return out;
};

/**
 * Every value where the answer changes: the thresholds, plus the ends a band
 * actually claims. Sorted, and deduplicated so a band end that coincides with
 * a threshold is not a double stop for PageUp and PageDown.
 */
export const jumpTargets = (
  thresholds: readonly Threshold[],
  bands: readonly Band[],
): readonly number[] => {
  const seen = new Set<number>();
  for (const t of thresholds) seen.add(t.value);
  for (const b of bands) {
    if (b.start !== undefined) seen.add(b.start);
    if (b.end !== undefined) seen.add(b.end);
  }
  return sortBy((n: number) => n, [...seen]);
};
