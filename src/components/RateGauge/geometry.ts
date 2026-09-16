// ============================================
// RateGauge geometry — pure, headless, no SVG node, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as BandRail/bands.tsx):
// `isEntryPath` in scripts/render-coverage.mjs matches any PascalCase `.tsx`
// under src/components/, so a `Geometry.tsx` here would register as a new
// component owing its own depth header and its own showcase.
//
// EVERY number the gauge paints is decided in this file, so the whole shape is
// readable as a table without a browser (geometry.test.ts prints one). The
// component does nothing but hand these strings and points to the DOM.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • Angles are MATH convention in degrees — 0 at 3 o'clock, positive
//     counter-clockwise (up the screen), negative clockwise (down). The
//     y-inversion SVG needs happens in exactly ONE place, `pointAt`.
//   • The gauge does NO arithmetic on the consumer's values beyond geometry
//     and the delta it is asked to announce. It never formats (`format` is
//     the consumer's) and it never snaps a value to anything.
//   • The zone split is the angle of ZERO, derived via `angleFor(domain, 0)`,
//     not a hardcoded horizontal. For a symmetric domain those are the same
//     number; for an asymmetric one a hardcoded horizontal would draw a
//     "zero" line that is not at zero.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { map } from "../../fn";

/** A value domain, mapped linearly onto [−90°, +90°]. */
export type Domain = readonly [number, number];

/** Which half of the ring a value falls in. `positive` includes zero itself. */
export type Zone = "positive" | "negative";

/** The three things the gauge labels, in stacking order top to bottom. */
export type LabelId = "value" | "delta" | "baseline";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The pivot: the arc's centre, on the left edge of a right-facing half ring. */
export interface Center {
  readonly cx: number;
  readonly cy: number;
}

/** A needle's tip plus the short perpendicular cap drawn across it. */
export interface NeedleTip extends Point {
  readonly cap: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
}

/** One label's row: where it sits, what it points at, and the leader between. */
export interface LabelRow {
  readonly id: LabelId;
  /** Left edge of the label text. */
  readonly x: number;
  /** Text baseline for the label, in viewBox units. */
  readonly y: number;
  /** The point on the ring (or on the bracket) this row is about. */
  readonly anchor: Point;
  /** `d` for the leader line from the anchor to the label. */
  readonly leader: string;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). A
// consumer scales the gauge by sizing its box; the viewBox does the rest.

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 190;
/** The pivot. Left of centre, because the ring opens to the left. */
export const CENTER: Center = { cx: 78, cy: 95 };
/** Ring radii — the annulus the two zones are painted into. */
export const RING_INNER = 58;
export const RING_OUTER = 76;
/** A needle stops just short of the ring's inner edge. */
export const NEEDLE_RADIUS = RING_INNER - 3;
/** The baseline's sweep wedge is a short sector near the pivot. */
export const WEDGE_RADIUS = 40;
/** The delta bracket rides outside the ring. */
export const BRACKET_RADIUS = RING_OUTER + 11;
/** Half-length of the cap drawn across a needle's tip. */
export const NEEDLE_CAP_HALF = 6;
/** Half-length of a bracket end cap, measured radially. */
export const BRACKET_CAP_HALF = 4;
/** The pivot dot. */
export const PIVOT_RADIUS = 4;

/** Left edge of the label column, and where its leaders turn horizontal. */
export const LABEL_X = 218;
const LEADER_ELBOW_X = LABEL_X - 14;
/** Vertical pitch between stacked label rows. */
const LABEL_PITCH = 34;

const DEGREES_PER_HALF_TURN = 180;
const QUARTER_TURN = 90;

const radians = (degrees: number): number => (degrees * Math.PI) / DEGREES_PER_HALF_TURN;

/**
 * Where a value sits on the dial, in degrees.
 *
 * Linear across the domain onto [−90°, +90°], clamped at both ends: a value
 * past either end parks at the pole rather than sweeping into the other half,
 * which would read as the opposite sign. A zero-width domain reads as the
 * centre rather than as NaN.
 */
export const angleFor = (domain: Domain, value: number): number => {
  const [low, high] = domain;
  const span = high - low;
  if (span === 0) return 0;
  const fraction = clamp((value - low) / span, 0, 1);
  return fraction * DEGREES_PER_HALF_TURN - QUARTER_TURN;
};

/**
 * The value the gauge actually DREW — the consumer's value, clamped.
 *
 * The delta is reported against this rather than against the raw value, so a
 * needle parked at the pole cannot announce a number the picture contradicts.
 */
export const clampedValue = (domain: Domain, value: number): number => {
  const [low, high] = domain;
  return low <= high ? clamp(value, low, high) : clamp(value, high, low);
};

/**
 * Polar to SVG. The ONLY place y is inverted: +90° is up the screen, so every
 * builder that composes this inherits one consistent sign.
 */
export const pointAt = (center: Center, radius: number, degrees: number): Point => ({
  x: center.cx + radius * Math.cos(radians(degrees)),
  y: center.cy - radius * Math.sin(radians(degrees)),
});

/**
 * Which zone a value lights. Split at the ZERO angle, not at the horizontal.
 *
 * Zero itself reads `positive`: the zero line is the floor of the upper zone,
 * so a gauge parked at zero lights steadily instead of flickering between
 * tones as the value crosses.
 */
export const zoneOf = (domain: Domain, value: number): Zone =>
  angleFor(domain, value) >= angleFor(domain, 0) ? "positive" : "negative";

/**
 * SVG arc flags for a sweep from `from` to `to` in math degrees.
 *
 * `pointAt` has already flipped y, so the picture runs in standard maths
 * orientation: an increasing angle is counter-clockwise on screen, which is
 * SVG's sweep-flag 0.
 */
const arcFlags = (from: number, to: number): string =>
  `${Math.abs(to - from) > DEGREES_PER_HALF_TURN ? 1 : 0} ${to > from ? 0 : 1}`;

/** One annular band of the ring, between two radii and two angles. */
export const ringArcPath = (
  center: Center,
  inner: number,
  outer: number,
  from: number,
  to: number,
): string => {
  if (from === to) return "";
  const outerStart = pointAt(center, outer, from);
  const outerEnd = pointAt(center, outer, to);
  const innerEnd = pointAt(center, inner, to);
  const innerStart = pointAt(center, inner, from);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${arcFlags(from, to)} ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${arcFlags(to, from)} ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

/**
 * A needle's tip at a value's angle, with the perpendicular cap across it.
 *
 * The cap is radial-perpendicular — it lies along the tangent — so it reads as
 * a crosshair on the dial however far round the needle has swung.
 */
export const needleEndpoint = (
  center: Center,
  radius: number,
  domain: Domain,
  value: number,
): NeedleTip => {
  const degrees = angleFor(domain, value);
  const tip = pointAt(center, radius, degrees);
  const tangent = {
    x: -Math.sin(radians(degrees)),
    y: -Math.cos(radians(degrees)),
  };
  return {
    x: tip.x,
    y: tip.y,
    cap: {
      x1: tip.x - tangent.x * NEEDLE_CAP_HALF,
      y1: tip.y - tangent.y * NEEDLE_CAP_HALF,
      x2: tip.x + tangent.x * NEEDLE_CAP_HALF,
      y2: tip.y + tangent.y * NEEDLE_CAP_HALF,
    },
  };
};

/**
 * The faint sector from the pivot between the zero line and the baseline —
 * the baseline's sweep. Nothing to fill when the baseline IS zero.
 */
export const wedgePath = (
  center: Center,
  radius: number,
  from: number,
  to: number,
): string => {
  if (from === to) return "";
  const start = pointAt(center, radius, from);
  const end = pointAt(center, radius, to);
  return [
    `M ${center.cx} ${center.cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${arcFlags(from, to)} ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

/**
 * The delta bracket: an arc outside the ring spanning the two needle angles,
 * with a short radial cap at each end. Nothing to draw when they coincide —
 * a zero-length bracket with two caps would read as a mark of its own.
 */
export const bracketPath = (
  center: Center,
  radius: number,
  from: number,
  to: number,
): string => {
  if (from === to) return "";
  const start = pointAt(center, radius, from);
  const end = pointAt(center, radius, to);
  const capEnds = map(
    (degrees: number) => ({
      near: pointAt(center, radius - BRACKET_CAP_HALF, degrees),
      far: pointAt(center, radius + BRACKET_CAP_HALF, degrees),
    }),
    [from, to],
  );
  const caps = map(
    (cap: { near: Point; far: Point }) =>
      `M ${cap.near.x} ${cap.near.y} L ${cap.far.x} ${cap.far.y}`,
    capEnds,
  );
  const arc = [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${arcFlags(from, to)} ${end.x} ${end.y}`,
  ].join(" ");
  return [arc, ...caps].join(" ");
};

/**
 * Which label sits where in the right-hand stack, top to bottom.
 *
 * Tied to value-vs-baseline, NOT to the zone: the stack mirrors the picture,
 * so the row order matches the order the two needles appear on the dial and
 * the leader lines never cross. A value sitting on its baseline has no delta
 * to announce, so that row is absent rather than empty.
 */
export const labelOrder = (baseline: number, value: number): readonly LabelId[] => {
  if (value === baseline) return ["value", "baseline"];
  return value > baseline
    ? ["value", "delta", "baseline"]
    : ["baseline", "delta", "value"];
};

/** What `gaugeGeometry` is asked about. */
export interface GaugeInput {
  readonly domain: Domain;
  readonly baseline: number;
  readonly value: number;
}

/** Everything the component paints. Nothing is decided after this. */
export interface GaugeGeometry {
  readonly zeroAngle: number;
  readonly baselineAngle: number;
  readonly valueAngle: number;
  readonly zone: Zone;
  /** The drawn value less the baseline — the number `format` is handed. */
  readonly delta: number;
  readonly positiveRing: string;
  readonly negativeRing: string;
  readonly wedge: string;
  readonly bracket: string;
  readonly zeroLine: { readonly x2: number; readonly y2: number };
  readonly baselineTip: NeedleTip;
  readonly valueTip: NeedleTip;
  readonly labels: readonly LabelId[];
  readonly rows: readonly LabelRow[];
}

/** Where a label row's leader starts on the dial. */
const anchorFor = (
  id: LabelId,
  angles: { zero: number; baseline: number; value: number },
): Point => {
  if (id === "baseline") return pointAt(CENTER, RING_OUTER, angles.baseline);
  if (id === "value") return pointAt(CENTER, RING_OUTER, angles.value);
  return pointAt(CENTER, BRACKET_RADIUS, (angles.baseline + angles.value) / 2);
};

/**
 * Stack the rows around the pivot's height at a fixed pitch, in the order
 * `labelOrder` gave. Fixed pitch rather than "wherever the anchor happens to
 * be" is the whole point: two needles a degree apart would otherwise stack
 * their labels on top of each other, which is the collision the component
 * exists to absorb.
 */
const labelRows = (
  ids: readonly LabelId[],
  angles: { zero: number; baseline: number; value: number },
): readonly LabelRow[] => {
  const top = CENTER.cy - (LABEL_PITCH * (ids.length - 1)) / 2;
  return map((id: LabelId, index: number) => {
    const y = top + index * LABEL_PITCH;
    const anchor = anchorFor(id, angles);
    return {
      id,
      x: LABEL_X,
      y,
      anchor,
      leader: `M ${anchor.x} ${anchor.y} L ${LEADER_ELBOW_X} ${y} L ${LABEL_X - 5} ${y}`,
    };
  }, ids);
};

/**
 * The whole dial for one reading. Call this once per render; the component
 * reads fields off it and paints, deciding nothing.
 */
export const gaugeGeometry = (input: GaugeInput): GaugeGeometry => {
  const drawn = clampedValue(input.domain, input.value);
  const drawnBaseline = clampedValue(input.domain, input.baseline);
  const zero = angleFor(input.domain, 0);
  const baselineAngle = angleFor(input.domain, input.baseline);
  const valueAngle = angleFor(input.domain, input.value);
  const zoneEnd = pointAt(CENTER, RING_OUTER, zero);
  const ids = labelOrder(drawnBaseline, drawn);
  return {
    zeroAngle: zero,
    baselineAngle,
    valueAngle,
    zone: zoneOf(input.domain, input.value),
    delta: drawn - drawnBaseline,
    positiveRing: ringArcPath(CENTER, RING_INNER, RING_OUTER, zero, QUARTER_TURN),
    negativeRing: ringArcPath(CENTER, RING_INNER, RING_OUTER, -QUARTER_TURN, zero),
    wedge: wedgePath(CENTER, WEDGE_RADIUS, zero, baselineAngle),
    bracket: bracketPath(CENTER, BRACKET_RADIUS, baselineAngle, valueAngle),
    zeroLine: { x2: zoneEnd.x, y2: zoneEnd.y },
    baselineTip: needleEndpoint(CENTER, NEEDLE_RADIUS, input.domain, input.baseline),
    valueTip: needleEndpoint(CENTER, NEEDLE_RADIUS, input.domain, input.value),
    labels: ids,
    rows: labelRows(ids, { zero, baseline: baselineAngle, value: valueAngle }),
  };
};
