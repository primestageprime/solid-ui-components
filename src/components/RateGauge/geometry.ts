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
import { filter, join, map, sortBy, sum } from "../../fn";

/** A value domain, mapped linearly onto [−90°, +90°]. */
export type Domain = readonly [number, number];

/** Which half of the ring a value falls in. `positive` includes zero itself. */
export type Zone = "positive" | "negative";

/**
 * What a callout names. `valueAndBaseline` is the collapsed row used when the
 * two needles coincide: one anchor cannot carry two leaders, and two rows
 * pointing at the same dot read as a mistake rather than as a coincidence.
 */
export type LabelId = "value" | "delta" | "baseline" | "valueAndBaseline";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The pivot: the arc's centre, on the left edge of a right-facing half ring. */
export interface Center {
  readonly cx: number;
  readonly cy: number;
}

/** A needle's tip plus the cap arc drawn across it. */
export interface NeedleTip extends Point {
  /** `d` for a short arc concentric with the ring, centred on the needle. */
  readonly capArc: string;
}

/**
 * One HUD callout: a terminal on the dial, an elbowed leader out to a shared
 * label column, and the row the label sits on.
 */
export interface Callout {
  readonly id: LabelId;
  /** The point on the dial the callout names. Carries the terminal mark. */
  readonly anchor: Point;
  /** Angle of the anchor, in math degrees — the stub runs out along it. */
  readonly angle: number;
  /** How far past the anchor the radial stub runs. */
  readonly stub: number;
  /** Where the row WANTED to sit: the stub's end, before any spacing. */
  readonly naturalY: number;
  /** Where the row actually sits, after the spacing pass. */
  readonly y: number;
  /** x of the shared label column — where the horizontal run ends. */
  readonly labelX: number;
  /** Where the label text starts, just past the column's tick. */
  readonly textX: number;
  /** The leader's corners, anchor first. Tests read these; the path is built from them. */
  readonly points: readonly Point[];
  /** `d` for the leader, built from `points`. */
  readonly leader: string;
  /**
   * Whether to draw the terminal dot. False when the dot would sit on top of
   * a mark it does not name — see `dotIsClear`.
   */
  readonly showDot: boolean;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). A
// consumer scales the gauge by sizing its box; the viewBox does the rest.

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 190;
/** The pivot. Left of centre, because the ring opens to the left. */
export const CENTER: Center = { cx: 66, cy: 95 };
/** Ring radii — the annulus the two zones are painted into. */
export const RING_INNER = 48;
export const RING_OUTER = 64;
/**
 * The live needle stops well short of the ring's inner edge, and the gap is
 * the point: a clock hand that touches its own dial reads as stuck to it.
 * The cap lives inside that clearance rather than hugging the band — asked
 * for in that order, and clearance wins.
 */
export const VALUE_NEEDLE_RADIUS = RING_INNER - 6;
/**
 * The baseline needle stops SHORTER, and not only because it is the secondary
 * mark. It is what keeps the value's cap arc off it: the cap lives on the
 * circle at `VALUE_NEEDLE_RADIUS`, and it spans more than the angle between
 * two nearly-equal needles — at the near-baseline fixture they are 1.2° apart
 * against a 10° cap. Narrowing the cap until it cleared would make it
 * invisible, so the reference stops before the circle the cap occupies.
 */
export const BASELINE_NEEDLE_RADIUS = RING_INNER - 10;
/**
 * How far the delta sector reaches from the pivot. It stops at the baseline
 * needle's own length, so it reads as the area those two needles enclose
 * rather than as a third mark with an edge of its own.
 */
export const SECTOR_RADIUS = RING_INNER - 10;
/** The delta bracket rides outside the ring. */
export const BRACKET_RADIUS = RING_OUTER + 10;
/** Half-length of a bracket end cap, measured radially. */
export const BRACKET_CAP_HALF = 4;
/** Half the cap arc's stroke, so its radial footprint can be reasoned about. */
export const CAP_STROKE_HALF = 1.25;
/** Radius of the filled terminal dot on a callout's anchor. */
export const TERMINAL_RADIUS = 2.5;
/** The pivot dot. */
export const PIVOT_RADIUS = 4;

/**
 * Half-span of the needle's cap arc, in degrees either side of the needle.
 *
 * Narrow on purpose (Peter, 2026-09-16, reversing a widening): ~7 units of
 * chord at the cap's radius, which at small sizes reads as a straight tip
 * mark. That is fine — the geometry is a real arc, so the gauge blown up to
 * any size shows the curvature rather than having to fake it later. A cap wide
 * enough to look curved at thumbnail size is too wide at full size.
 */
export const CAP_ARC_HALF_SPAN = 5;

/**
 * The label column: every leader's horizontal run ends here, and every label
 * starts just past the tick that marks it. One column is what makes the stack
 * read as a HUD callout set rather than as three unrelated pointers.
 */
export const LABEL_X = 186;
/** Half-height of the vertical tick that terminates a run at the column. */
export const COLUMN_TICK_HALF = 4;
/** Gap between the column tick and the first letter of the label. */
const TEXT_GAP = 6;

/**
 * Where every leader finishes turning and becomes horizontal.
 *
 * This shared gutter is what makes the crossing argument hold. Diagonals live
 * strictly LEFT of it and horizontal runs strictly right of it, so a leader
 * that is still descending can never cut across a run that has already
 * levelled out — which is exactly the crossing the fixed-pitch stack used to
 * produce. It sits clear of the longest possible stub end.
 */
const ELBOW_X = LABEL_X - 10;

/**
 * How far a stub runs radially past its anchor before the leader turns.
 *
 * Fixed, so every stub reads as the same gesture — it is the needle's own
 * angle continued outward, which is what ties a row to its mark.
 */
export const CALLOUT_STUB = 12;
/**
 * Where every leader stops being radial and turns: the vertical gutter at the
 * rightmost point of the turn circle.
 *
 * Together with `ELBOW_X` this is what makes "leaders never cross" a property
 * of the routing rather than a hope. Each leader is radial out to a COMMON
 * turn circle, horizontal to this gutter, diagonal to `ELBOW_X`, then
 * horizontal to the column — and each of those four bands is disjoint from the
 * others in x, so a segment of one kind can only ever meet a segment of the
 * same kind:
 *
 *   • radial stubs share a centre, so they cannot cross each other;
 *   • the horizontals are at distinct heights, so they cannot cross each other;
 *   • the diagonals all start on one vertical and end on another, with their
 *     heights in the same order at both ends, so they are nested.
 *
 * The one case that could have defeated this — a stub crossing another
 * leader's horizontal — cannot happen either: a stub at angle θ only reaches
 * as high as the turn circle at θ, and a horizontal at angle φ only reaches as
 * far left as the turn circle at φ, so an overlap in x forces φ ≥ θ while an
 * overlap in y forces φ ≤ θ. Only φ = θ satisfies both, and two callouts never
 * share an angle.
 */

/**
 * Minimum distance between two label rows: a line's height plus a gap.
 *
 * This is the whole spacing heuristic's unit. Rows want to sit at their
 * anchor's height and are pushed apart only as far as this, so the stack stays
 * as close to the picture as legibility allows.
 */
export const CALLOUT_PITCH = 18;
/** Rows stay this far inside the viewBox, top and bottom. */
const CALLOUT_MARGIN = 12;

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
 * The cap across a needle's tip: a short arc CONCENTRIC with the ring, not a
 * straight chord.
 *
 * A straight cap is a tangent, and a tangent visibly leaves the circle at both
 * ends — at this radius the error is small but the eye reads it as a mark that
 * does not belong to the dial. An arc at the needle's own radius is a segment
 * of the ring's own edge, so the cap reads as part of the instrument.
 */
export const capArc = (
  center: Center,
  radius: number,
  degrees: number,
  halfSpan: number,
): string => {
  if (halfSpan === 0) return "";
  const from = degrees + halfSpan;
  const to = degrees - halfSpan;
  const start = pointAt(center, radius, from);
  const end = pointAt(center, radius, to);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcFlags(from, to)} ${end.x} ${end.y}`;
};

/**
 * A needle's tip at a value's angle, with the cap arc across it.
 */
export const needleEndpoint = (
  center: Center,
  radius: number,
  domain: Domain,
  value: number,
): NeedleTip => {
  const degrees = angleFor(domain, value);
  const tip = pointAt(center, radius, degrees);
  return {
    x: tip.x,
    y: tip.y,
    capArc: capArc(center, radius, degrees, CAP_ARC_HALF_SPAN),
  };
};

/**
 * The faint sector from the pivot between the two needles — the visual BODY of
 * the delta, shading the same angular range the bracket spans outside the ring.
 *
 * It used to run from the zero line to the baseline, showing the baseline's own
 * sweep. That answered a question nobody asked: the reader wants the CHANGE,
 * and the change is the angle between where the rate was and where it is.
 * Nothing to fill when the two coincide, which is the same "no delta" the
 * collapsed single callout and the absent bracket already say.
 */
export const sectorPath = (
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

/** What `gaugeGeometry` is asked about. */
export interface GaugeInput {
  readonly domain: Domain;
  readonly baseline: number;
  readonly value: number;
}

/** Everything the component paints. Nothing is decided after this. */
export interface GaugeGeometry {
  /** The consumer's value, clamped — what the needle actually points at. */
  readonly drawnValue: number;
  /** The consumer's baseline, clamped. */
  readonly drawnBaseline: number;
  readonly zeroAngle: number;
  readonly baselineAngle: number;
  readonly valueAngle: number;
  readonly zone: Zone;
  /** The drawn value less the baseline — the number `format` is handed. */
  readonly delta: number;
  readonly positiveRing: string;
  readonly negativeRing: string;
  readonly deltaSector: string;
  readonly bracket: string;
  readonly zeroLine: { readonly x2: number; readonly y2: number };
  readonly baselineTip: NeedleTip;
  readonly valueTip: NeedleTip;
  /** The HUD callouts, in anchor order, already placed and elbowed. */
  readonly callouts: readonly Callout[];
}

/**
 * A mark the dial already draws, as the radial band it occupies over an
 * angular span. Everything a terminal dot could land on reduces to one of
 * these, which is what lets the overlap test be arithmetic rather than a
 * list of special cases.
 */
interface MarkBand {
  readonly inner: number;
  readonly outer: number;
  readonly from: number;
  readonly to: number;
}

/** Does a dot at this anchor overlap that band, radially AND angularly? */
const hitsBand = (radius: number, angle: number, band: MarkBand): boolean => {
  const radial =
    radius + TERMINAL_RADIUS > band.inner && radius - TERMINAL_RADIUS < band.outer;
  const low = Math.min(band.from, band.to);
  const high = Math.max(band.from, band.to);
  return radial && angle >= low && angle <= high;
};

/** Two dots collide when their discs touch. */
export const dotsCollide = (a: Point, b: Point): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) < TERMINAL_RADIUS * 2;

/**
 * Whether a callout's terminal dot should be drawn.
 *
 * A dot exists to say "this is the thing I am naming". Sitting on top of some
 * OTHER mark it therefore reads as a blemish on that mark rather than as a
 * terminal — so the dot is dropped and the leader starts bare from the anchor.
 *
 * The one mark a dot may sit on is the one its own callout names: the delta's
 * anchor is the middle of the bracket, and a dot there is the terminal for the
 * bracket, not damage to it. That exception is the whole reason this is a rule
 * rather than "hide all the dots" — without it every dot would drop, since the
 * needle callouts are anchored on the ring's outer edge.
 */
const dotIsClear = (
  radius: number,
  angle: number,
  /** Every mark EXCEPT the one this callout names — the caller drops that one. */
  marks: readonly MarkBand[],
  otherAnchors: readonly Point[],
): boolean => {
  const anchor = pointAt(CENTER, radius, angle);
  for (const other of otherAnchors) {
    if (dotsCollide(anchor, other)) return false;
  }
  for (const band of marks) {
    if (hitsBand(radius, angle, band)) return false;
  }
  return true;
};

/** The marks a dot can land on, for one reading of the dial. */
const markBands = (angles: {
  baseline: number;
  value: number;
}): { readonly ring: MarkBand; readonly cap: MarkBand; readonly bracket: MarkBand } => ({
  ring: { inner: RING_INNER, outer: RING_OUTER, from: -QUARTER_TURN, to: QUARTER_TURN },
  cap: {
    inner: VALUE_NEEDLE_RADIUS - CAP_STROKE_HALF,
    outer: VALUE_NEEDLE_RADIUS + CAP_STROKE_HALF,
    from: angles.value - CAP_ARC_HALF_SPAN,
    to: angles.value + CAP_ARC_HALF_SPAN,
  },
  bracket: {
    inner: BRACKET_RADIUS - BRACKET_CAP_HALF,
    outer: BRACKET_RADIUS + BRACKET_CAP_HALF,
    from: angles.baseline,
    to: angles.value,
  },
});

/** One callout before the spacing pass has decided where its row sits. */
interface Unplaced {
  readonly id: LabelId;
  readonly angle: number;
  readonly radius: number;
}

/**
 * The circle every leader turns on: one stub past the outermost anchor.
 *
 * A COMMON circle, not a common stub length, and that is the whole trick. It
 * means a callout's stub is longer the further inside the dial its anchor
 * sits — the needle tips reach further than the bracket's midpoint — and it is
 * what puts every turn point in the same angular order as its anchor. An
 * earlier draft lengthened individual stubs to relieve crowded anchors
 * instead; that separated the elbows but let a long stub cut clean across a
 * neighbour's leader, which the crossing test caught.
 */
const TURN_RADIUS = BRACKET_RADIUS + CALLOUT_STUB;
const TURN_X = CENTER.cx + TURN_RADIUS;

/**
 * The spacing heuristic, and the reason the leaders cannot cross.
 *
 * Each row wants to sit at its own stub's height. Walking top to bottom, a row
 * is pushed down only as far as one PITCH below the row above it — never
 * further — so the stack stays as close to the picture as legibility allows
 * and the rows stay in anchor order. Because the rows keep that order and
 * every leader runs monotonically right to the same column, no two leaders can
 * meet.
 *
 * The pushes are all downwards, which would drag the block off its anchors, so
 * the whole group is then shifted back up by the MEAN displacement. That keeps
 * the stack centred on the marks it names without disturbing the pitch, and it
 * is a rigid shift, so it cannot reintroduce a crossing. A final clamp keeps
 * the block inside the viewBox — again as one rigid shift.
 */
const placeRows = (naturals: readonly number[]): readonly number[] => {
  if (naturals.length === 0) return [];
  const pushed: number[] = [];
  for (const natural of naturals) {
    const floor =
      pushed.length === 0 ? natural : Math.max(natural, pushed[pushed.length - 1] + CALLOUT_PITCH);
    pushed.push(floor);
  }
  const displacement = sum(map((y: number, index: number) => y - naturals[index], pushed));
  let shift = -displacement / pushed.length;
  const top = pushed[0] + shift;
  const bottom = pushed[pushed.length - 1] + shift;
  if (top < CALLOUT_MARGIN) shift += CALLOUT_MARGIN - top;
  else if (bottom > VIEW_HEIGHT - CALLOUT_MARGIN) {
    shift -= bottom - (VIEW_HEIGHT - CALLOUT_MARGIN);
  }
  return map((y: number) => y + shift, pushed);
};

/**
 * Build one callout's leader: radial stub to the turn circle, horizontal to
 * the gutter, a dogleg to the row's height, then the run to the label column.
 *
 * The dogleg exists only because the spacing pass moved the row off the height
 * its anchor asked for; it is the only segment that is neither radial nor
 * horizontal.
 */
const leaderPoints = (
  anchor: Point,
  turn: Point,
  rowY: number,
): readonly Point[] => {
  const gutter = { x: TURN_X, y: turn.y };
  const elbow = { x: ELBOW_X, y: rowY };
  const runEnd = { x: LABEL_X, y: rowY };
  // A turn point already ON the gutter (the 3 o'clock callout) needs no
  // horizontal approach, and a row that landed at its natural height needs no
  // dogleg. Emitting either as a zero-length segment would draw a visible
  // stutter at the joint.
  const approach = turn.x === TURN_X ? [] : [gutter];
  const dogleg = turn.y === rowY ? [] : [elbow];
  return [anchor, turn, ...approach, ...dogleg, runEnd];
};

/**
 * Every callout for one reading, in anchor order, placed and elbowed.
 *
 * The order is not prescribed anywhere: it FALLS OUT of sorting the anchors by
 * height. Above the baseline that reads name / delta / Baseline, below it the
 * reverse — the same orders the fixed table used to hardcode, but now they are
 * a consequence of the picture instead of a second place for it to be wrong.
 */
const placeCallouts = (
  angles: { zero: number; baseline: number; value: number },
  collapsed: boolean,
  hasBracket: boolean,
): readonly Callout[] => {
  const unplaced: readonly Unplaced[] = collapsed
    ? [{ id: "valueAndBaseline", angle: angles.value, radius: RING_OUTER }]
    : [
        { id: "value", angle: angles.value, radius: RING_OUTER },
        { id: "baseline", angle: angles.baseline, radius: RING_OUTER },
        ...(hasBracket
          ? [
              {
                id: "delta" as LabelId,
                angle: (angles.baseline + angles.value) / 2,
                radius: BRACKET_RADIUS,
              },
            ]
          : []),
      ];
  // Sort by where each leader LEAVES the dial — its turn point, not its
  // anchor. Sorting by the anchor is the subtly wrong choice: the delta's
  // anchor sits on the bracket, further out than the needle tips, so a value
  // only just above its baseline puts the delta's anchor HIGHER than the
  // value's while both turn at the same circle in the other order. Ordering
  // rows against their own exit heights is what makes leaders cross.
  const exits = map((callout: Unplaced) => {
    const turn = pointAt(CENTER, TURN_RADIUS, callout.angle);
    return { callout, turn, stub: TURN_RADIUS - callout.radius, naturalY: turn.y };
  }, unplaced);
  const sorted = sortBy((e: { naturalY: number }) => e.naturalY, exits);
  const ordered = map((e: { callout: Unplaced }) => e.callout, sorted);
  const stubs = map((e: { stub: number }) => e.stub, sorted);
  const naturals = map((e: { naturalY: number }) => e.naturalY, sorted);
  const turns = map((e: { turn: Point }) => e.turn, sorted);
  const rows = placeRows(naturals);
  const bands = markBands(angles);
  const anchors = map(
    (callout: Unplaced) => pointAt(CENTER, callout.radius, callout.angle),
    ordered,
  );
  return map((callout: Unplaced, index: number) => {
    const anchor = anchors[index];
    const points = leaderPoints(anchor, turns[index], rows[index]);
    // Every mark except the one this callout names. The delta names the
    // bracket, so a dot on the bracket is its terminal rather than a blemish;
    // every other callout is anchored on the ring, which it does NOT name.
    const others =
      callout.id === "delta"
        ? [bands.ring, bands.cap]
        : [bands.ring, bands.cap, bands.bracket];
    const neighbours = filter((_: Point, i: number) => i !== index, anchors);
    return {
      id: callout.id,
      showDot: dotIsClear(callout.radius, callout.angle, others, neighbours),
      anchor,
      angle: callout.angle,
      stub: stubs[index],
      naturalY: naturals[index],
      y: rows[index],
      labelX: LABEL_X,
      textX: LABEL_X + TEXT_GAP,
      points,
      leader: join(
        " ",
        map((p: Point, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, points),
      ),
    };
  }, ordered);
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
  const collapsed = drawn === drawnBaseline;
  const bracket = bracketPath(CENTER, BRACKET_RADIUS, baselineAngle, valueAngle);
  return {
    drawnValue: drawn,
    drawnBaseline: drawnBaseline,
    zeroAngle: zero,
    baselineAngle,
    valueAngle,
    zone: zoneOf(input.domain, input.value),
    delta: drawn - drawnBaseline,
    positiveRing: ringArcPath(CENTER, RING_INNER, RING_OUTER, zero, QUARTER_TURN),
    negativeRing: ringArcPath(CENTER, RING_INNER, RING_OUTER, -QUARTER_TURN, zero),
    deltaSector: sectorPath(CENTER, SECTOR_RADIUS, baselineAngle, valueAngle),
    bracket,
    zeroLine: { x2: zoneEnd.x, y2: zoneEnd.y },
    baselineTip: needleEndpoint(
      CENTER,
      BASELINE_NEEDLE_RADIUS,
      input.domain,
      input.baseline,
    ),
    valueTip: needleEndpoint(
      CENTER,
      VALUE_NEEDLE_RADIUS,
      input.domain,
      input.value,
    ),
    callouts: placeCallouts(
      { zero, baseline: baselineAngle, value: valueAngle },
      collapsed,
      bracket !== "",
    ),
  };
};
