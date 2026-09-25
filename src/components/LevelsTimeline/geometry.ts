// ============================================
// LevelsTimeline geometry — pure, headless, no SVG node, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as RateGauge/geometry.ts and
// BandRail/bands.tsx): `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `Geometry.tsx` here would
// register as a new component owing its own depth header and its own showcase.
//
// EVERY number the chart paints is decided in this file, so the whole shape is
// readable as a table without a browser (geometry.test.ts prints one: the
// stack at each change, the per-span widths, the flow roots and the change-x
// list). The component does nothing but hand these strings and points to the
// DOM.
//
// ── WIDE BANDS ON A PROPORTIONAL AXIS ───────────────────────────────────────
//
// A level sits at its own VALUE — y is proportional to it, as an axis
// should be — and the band drawn there is as THICK as the count holding
// it. Those two facts fight each other, and the fight is resolved here rather
// than left to the consumer.
//
// Thickness wants to be generous: the whole point of the picture is that you
// can see a level fatten and thin, and a hairline cannot say that. But two
// levels close together have very little room between them, and bands that
// overlap turn the chart into a smear.
//
// So `perCountWidth` is the SMALLEST of several answers: an absolute ceiling
// of `MAX_BAND_PX` (Peter: a ribbon is no more than ten px thick), the width
// that would fill a good fraction of the plot at the busiest moment, the width
// at which the tightest pair of adjacent levels still clears a margin, and the
// width at which no band hangs off the plot's own edge. The ceiling is what
// makes a rail read as a rail on a wide consumer-pinned axis; the adjacency
// cap is what stops two rails a hair apart in value from merging; the fill
// width is what stops a sparse chart from being drawn in hairlines.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The chart does NO arithmetic on the consumer's counts beyond the width
//     scale and the stack. It never sums a level, never derives a count
//     from the transfers, and never reconciles the two against each other. If
//     a transfer says two moved and the counts disagree, it draws both
//     — the disagreement is the consumer's to see, not this file's to hide.
//   • A count point is "from `at`, hold `count`". BEFORE a level's first
//     point, NOTHING is drawn: the chart will not invent a count it was
//     not given, so a level that appears mid-domain simply begins mid-plot.
//   • Times outside the domain are CLAMPED to it rather than painted
//     off-canvas, and every degenerate input (a zero-width time domain, no
//     levels at all, a level with no points) resolves to a finite number
//     rather than NaN.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { hCurve } from "../../internal/geometry/hCurve";
import { linearScale } from "../Chart/scales";
import { monthlyCells } from "../DateAxis/cells";
import { filter, find, findIndex, join, map, sortBy, sum } from "../../fn";

/** A moment, as the consumer prefers to express it. */
export type TimeValue = Date | number;

/** The visible time span. The consumer's, never derived from the data. */
export type TimeDomain = readonly [TimeValue, TimeValue];

/**
 * A numbered event: a flag above the plot and a rule dropped through it.
 *
 * THE CHART NUMBERS ITS OWN FLAGS (Peter, 2026-09-24): 1, 2, 3… in time
 * order, so the box is one fixed width that always fits. `label` used to BE
 * the flag's text, and a consumer passing a date there ("09-18") had it
 * clipped to "09-1(" by an 18-unit box. It is no longer painted on the flag —
 * it names the event for assistive technology only.
 *
 * It stays REQUIRED on purpose. Making it optional looked additive, but
 * consumers also READ this type — two benches hand a `Mutation[]` straight to
 * `StackedTimelineChart`, whose events need a `label: string` — and an
 * optional field broke them at the type level. Unchanged type, changed paint.
 */
export interface Mutation {
  readonly id: string;
  readonly at: TimeValue;
  /** The event's own name. Announced, never painted — the flag shows its number. */
  readonly label: string;
  /**
   * What changed at this event, one line each ("Payroll 1", "Person 2"). The
   * flag's hover tooltip lists them under the exact date. Optional: without
   * them the tooltip is the date alone.
   */
  readonly details?: readonly string[];
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A mutation, placed: the rule's x and the box the number sits in. */
export interface Flag {
  readonly id: string;
  /** The flag's painted text: its 1-based number in time order, as a string. */
  readonly label: string;
  /** The same number, as a number. */
  readonly number: number;
  /** The mutation's moment, in ms — what the tooltip dates and a drag moves. */
  readonly at: number;
  /** The consumer's name for the event (`Mutation.label`). Announced only. */
  readonly title: string;
  /** The tooltip's lines. Empty when the consumer gave none. */
  readonly details: readonly string[];
  /** Where the rule falls — the event's TRUE x, whatever the box does. */
  readonly x: number;
  /**
   * True when the box was nudged off its rule to clear a neighbour. The rule
   * then starts `FLAG_LEADER_DROP` lower, and a leader runs from the box's
   * bottom centre (`textX`, `FLAG_RULE_TOP`) to the rule's top (`x`, `ruleTop`).
   */
  readonly displaced: boolean;
  readonly ruleTop: number;
  readonly ruleBottom: number;
  /** The box: nudged clear of its neighbours, and kept on the canvas. */
  readonly boxX: number;
  readonly boxY: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** Where the number's text sits — the box's centre. */
  readonly textX: number;
  readonly textY: number;
}

/** One tick on the value axis: where it sits, and what it says. */
export interface ValueTick {
  readonly key: string;
  /** The value itself, unformatted — the label is the formatted one. */
  readonly value: number;
  readonly y: number;
  readonly label: string;
}

/**
 * One tick on the DATED bottom axis (Peter, 2026-09-24): a tick at every flag
 * date and at a moderate cadence between them, labelled with the exact day
 * wherever the label fits without overlapping another.
 */
export interface AxisTick {
  readonly key: string;
  /** The tick's moment, in ms. */
  readonly at: number;
  readonly x: number;
  /** `2026-09-01` for the first label and at a year change, `10-03` otherwise. */
  readonly label: string;
  /** False where the tick is drawn but its label would collide and is dropped. */
  readonly showLabel: boolean;
  /** True for a flag's own date — those claim a label before any filler does. */
  readonly event: boolean;
  /** The tick's length below the plot — an event's is longer. */
  readonly tickLength: number;
  /** Where the label's text anchor sits, and which end of the text it is. */
  readonly labelX: number;
  readonly labelY: number;
  readonly labelAnchor: "start" | "middle" | "end";
}

/** One month boundary on the bottom axis. */
export interface MonthTick {
  readonly key: string;
  readonly label: string;
  readonly x: number;
  /** False where the tick is drawn but its label is thinned out. */
  readonly showLabel: boolean;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). A
// consumer scales the chart by sizing its box; the viewBox does the rest.

export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 232;

/**
 * The flag band, above the plot: the boxed numbers live here.
 *
 * ONE width for every flag, and it fits TWO digits ("12") — Peter: the box
 * must not resize as the count grows. Derived from the digit width at the
 * 10px/600 the CSS sets on `.sui-levels-timeline__flag-label` (an estimate
 * that errs wide, like `Y_LABEL_CHAR_PX`, because this file cannot measure),
 * plus padding either side. It used to be a bare 18, which fit one digit.
 */
export const FLAG_DIGIT_PX = 6.4;
export const FLAG_MAX_DIGITS = 2;
export const FLAG_PAD_X = 4;
export const FLAG_BOX_WIDTH = Math.ceil(
  FLAG_MAX_DIGITS * FLAG_DIGIT_PX + FLAG_PAD_X * 2,
);
export const FLAG_BOX_HEIGHT = 16;
export const FLAG_BOX_TOP = 6;
/** A rule starts at the bottom of its flag box and drops through the plot. */
export const FLAG_RULE_TOP = FLAG_BOX_TOP + FLAG_BOX_HEIGHT;

// ── THE DATED AXIS, below the plot ──────────────────────────────────────────
//
// Peter, 2026-09-24: labels are exact days, HORIZONTAL, and sparse enough that
// they never overlap; a TICK MARK shows each event's exact position whether or
// not its label survives, and the flag tooltip carries the full date. (A 45°
// rotation was tried first and dropped the same day: its band cost a short
// card a third of its plot.) So the axis keeps its old, shallow band, and all
// the work is in WHICH labels are painted — see `datedAxisTicks`.

/** A cadence tick's length, below the plot. */
export const AXIS_TICK_LENGTH = 4;
/** An EVENT's tick: longer, so the exact position reads without a label. */
export const EVENT_TICK_LENGTH = 7;
/**
 * The width one character of a DATE label takes at the 9px the CSS sets on
 * `.sui-levels-timeline__tick-label`. Measured in the browser on 2026-09-24:
 * "2026-09-01" paints 54px wide, exactly 10 × 5.4. Same size as the value
 * axis' labels, so the same estimate as `Y_LABEL_CHAR_PX`.
 */
export const AXIS_LABEL_CHAR_PX = 5.4;
/** Clear air required between two painted labels, edge to edge. */
export const AXIS_LABEL_GAP = 8;
/**
 * A FILLER (cadence) label needs this much MORE air than an event's does:
 * flag dates are what the reader came for, and a filler crowding one is
 * noise. "Moderately dense" is this number.
 */
export const FILLER_LABEL_EXTRA_GAP = 16;

/** The plot proper. `PLOT_EDGE` is the plain margin at either side. */
export const PLOT_EDGE = 14;
export const PLOT_LEFT = PLOT_EDGE;
export const PLOT_RIGHT = VIEW_WIDTH - PLOT_EDGE;
export const PLOT_TOP = 36;
export const PLOT_BOTTOM = 190;
/**
 * The band below the plot that the axis lives in. Fixed in viewBox units, so
 * tick text stays the same size whatever height the chart is given.
 */
export const AXIS_BAND = VIEW_HEIGHT - PLOT_BOTTOM;
/**
 * Below this there is no plot left to speak of, even in compact chrome.
 * Low, because compact chrome is only 16 units — the old value of 120 was
 * sized for the full chrome and is not a floor a short box should hit.
 */
export const MIN_VIEW_HEIGHT = 72;

/** Narrower than this and there is no chart left, only margins. */
export const MIN_VIEW_WIDTH = 320;

/** The least of the box the PLOT may be reduced to before chrome gives way. */
export const MIN_PLOT_FRACTION = 0.6;
/** The axis, reduced to one tick row. Labels still thin by width, never overlap. */
export const COMPACT_AXIS_BAND = 14;
/** In compact chrome the plot starts here and the flags overlay its top. */
export const COMPACT_PLOT_TOP = 2;
/** Label every Nth tick in compact chrome — a full month row will not fit. */
export const COMPACT_LABEL_EVERY = 3;
// NOTE: since the dated axis (2026-09-24) `labelEvery` only thins
// `monthTicks`' own `showLabel`, which the painted axis no longer reads —
// `datedAxisTicks` takes month-tick POSITIONS only and decides labels by
// pitch. Kept because `monthTicks` is still exported and tested on its own.

// ── THE VALUE AXIS, in the left gutter ──────────────────────────────────────
//
// Peter, 2026-09-16: "Display the actual y-axis with ticks." A rail's height
// IS its value, so without an axis the reader can see that one rail sits above
// another and not what either of them is — the only figures on the chart were
// in a hover readout nobody sees in a screenshot.
//
// The ticks are NICE ones (1/2/5 × 10^k), and the nicing comes from
// `Chart/scales`' `linearScale().ticks()` rather than from a second
// implementation here: ADR 0010's core-plus-adapter, the same disposition as
// `monthlyCells` for the month axis. Two definitions of "a round number" is
// how two charts in one app come to disagree about what a round number is.

/** How many value ticks to aim for. d3-style nicing decides the actual count. */
export const Y_TICK_TARGET = 5;
/** …and in compact chrome, where a full ladder will not fit. */
export const COMPACT_Y_TICK_TARGET = 3;
/** The tick mark's own length, drawn to the LEFT of the axis line. */
export const Y_TICK_LENGTH = 4;
/** Clear air between a tick label and the axis line. */
export const Y_LABEL_GAP = 3;
/**
 * The width one character of a tick label takes, at the 9px the CSS sets on
 * `.sui-levels-timeline__y-tick-label`.
 *
 * ESTIMATED, not measured, and deliberately: geometry.ts is pure and has no
 * DOM to measure in, and the gutter has to be decided before anything is
 * painted. An estimate that is slightly WIDE costs a few units of plot nobody
 * notices; one that is narrow clips the consumer's labels, so this errs high.
 *
 * The font SIZE itself is not mirrored here. It lived as a `Y_LABEL_FONT_PX`
 * constant for one commit and nothing could read it — CSS cannot — so it was
 * a second definition of a number this file does not own. If the CSS font
 * size changes, this estimate is what has to change with it.
 */
export const Y_LABEL_CHAR_PX = 5.4;
/**
 * …but the gutter may never eat more than this share of the canvas.
 *
 * `formatValue` is the CONSUMER's, so the longest label is not this file's to
 * bound — a formatter returning twenty characters would otherwise collapse the
 * plot to nothing, which is the same failure `MIN_PLOT_FRACTION` guards
 * against vertically.
 */
export const MAX_GUTTER_FRACTION = 0.2;
export const AXIS_LABEL_Y = PLOT_BOTTOM + 20;

/**
 * Headroom kept at the top and bottom of the plot, as a fraction of its
 * height, for the outermost bands to grow into.
 *
 * This is a fraction of the PLOT, not of the value span, and that is the whole
 * point. Padding the value domain — the obvious thing, and what this did at
 * first — reserves an amount of y that depends on the consumer's own values,
 * so a chart whose levels happen to sit close together gets almost no headroom
 * and its outermost band hangs off the axis. Reserving plot space instead
 * guarantees the room is there whatever the numbers say.
 */
export const BAND_INSET_FRACTION = 0.18;

/**
 * The vertical layout, for one view height.
 *
 * The chart is normally sized by its WIDTH — `height: auto`, aspect fixed by
 * the viewBox — but a consumer that puts it in a box of definite height needs
 * it to use exactly that height instead, or it paints over whatever is below.
 * So every vertical position below the flag band is derived from a view
 * height rather than fixed.
 *
 * What does NOT scale: the flag band at the top, the axis band at the bottom,
 * and every font size. Those are chrome, and chrome that grew with the box
 * would make a tall chart look like a zoomed screenshot. Only the PLOT
 * stretches, which is the part that carries data.
 */
export interface Frame {
  /**
   * The viewBox WIDTH. Normally `VIEW_WIDTH`, but widened when the height has
   * been clamped up — see `frameForBox` for why that is not optional.
   */
  readonly viewWidth: number;
  readonly plotLeft: number;
  readonly plotRight: number;
  readonly viewHeight: number;
  readonly plotTop: number;
  readonly plotBottom: number;
  readonly plotHeight: number;
  readonly axisLabelY: number;
  readonly bandInset: number;
  /** True when the chrome has given way to keep the plot worth looking at. */
  readonly compact: boolean;
  /** Label every Nth axis tick. 1 in full chrome. */
  readonly labelEvery: number;
}

/**
 * The height below which FULL chrome would leave the plot too small to read.
 *
 * Derived rather than picked: full chrome is the flag band plus the axis band,
 * and the plot is required to keep `MIN_PLOT_FRACTION` of the box, so the
 * threshold is whatever height makes those two statements agree. Change the
 * fraction and the threshold follows.
 */
export const COMPACT_BELOW = (PLOT_TOP + AXIS_BAND) / (1 - MIN_PLOT_FRACTION);

/**
 * The vertical layout for one view height, in one of two chrome modes.
 *
 * COMPACT chrome is what stops a short box from being all frame and no chart.
 * The board reported a ~156px cell showing flags, an axis and rules but no
 * rails at all — the fixed 78 units of chrome had eaten the plot down to 46
 * units, and at that size the width caps collapsed to zero. So below
 * `COMPACT_BELOW` the flags OVERLAY the top of the plot rather than sitting in
 * a band of their own, and the axis shrinks to a single tick row. Nothing
 * changes size: the flags and the text are the same, they just stop
 * reserving space no short box can spare.
 */
export const frameFor = (
  viewHeight: number,
  viewWidth: number = VIEW_WIDTH,
  /**
   * The value axis' gutter, from `gutterWidth`. Omitted (every test that only
   * cares about vertical layout, and the default frame) leaves the plot where
   * it has always started, so nothing that does not ask for an axis moves.
   */
  gutter: number = 0,
): Frame => {
  const height = Math.max(MIN_VIEW_HEIGHT, viewHeight);
  const width = Math.max(MIN_VIEW_WIDTH, viewWidth);
  const compact = height < COMPACT_BELOW;
  const plotTop = compact ? COMPACT_PLOT_TOP : PLOT_TOP;
  const axisBand = compact ? COMPACT_AXIS_BAND : AXIS_BAND;
  const plotBottom = height - axisBand;
  const plotHeight = plotBottom - plotTop;
  return {
    viewWidth: width,
    plotLeft: Math.max(
      PLOT_LEFT,
      Math.min(gutter, width * MAX_GUTTER_FRACTION),
    ),
    plotRight: width - PLOT_EDGE,
    viewHeight: height,
    plotTop,
    plotBottom,
    plotHeight,
    axisLabelY: plotBottom + (compact ? 10 : 20),
    bandInset: plotHeight * BAND_INSET_FRACTION,
    compact,
    labelEvery: compact ? COMPACT_LABEL_EVERY : 1,
  };
};

/**
 * The frame for a MEASURED box — the one the component actually uses.
 *
 * ONE VIEWBOX UNIT IS ONE CSS PIXEL. That is the whole rule, and everything
 * awkward about sizing this chart came from not following it.
 *
 * The viewBox used to be a fixed 640 wide with the height derived from the
 * box's aspect. Two things went wrong with that, and they look unrelated until
 * the rule is written down:
 *
 *   • SCALE. A fixed 640 units across a 2218px card makes one unit 3.5 pixels,
 *     so a 9-unit label paints at 31px and the chart reads as a zoomed
 *     screenshot. The same label on a 718px card paints at 10px. Nothing in
 *     the data changed — only the card width.
 *   • LETTERBOXING. The height had a floor, and once the floor bit, the
 *     viewBox aspect stopped matching the box. SVG's default `xMidYMid meet`
 *     then scaled the drawing to fit and CENTRED it; the board measured its
 *     chart occupying 16% of the width of its own cell, which reads as "the
 *     rails do not render".
 *
 * Tracking the box in BOTH dimensions fixes both at once: the aspect then
 * matches by construction at every shape, and the pixel scale is 1 by
 * definition. Chrome, text and stroke widths are all quoted in units, so they
 * are now quoted in pixels — a 9px label is 9px on any card.
 *
 * `MIN_VIEW_HEIGHT` survives as a PLOT-QUALITY floor rather than an aspect
 * clamp. Where the box is shorter than the floor, the whole viewBox is scaled
 * up TOGETHER — both dimensions — so the aspect is still exactly the box's and
 * the chart merely draws at a smaller effective scale. It never letterboxes.
 */
export const frameForBox = (
  box: {
    readonly width: number;
    readonly height: number;
  },
  gutter: number = 0,
): Frame => {
  if (box.width <= 0 || box.height <= 0) return DEFAULT_FRAME;
  // Scaling BOTH dimensions is what keeps the aspect exact. Scaling one of
  // them was the letterbox.
  const scale = box.height < MIN_VIEW_HEIGHT ? MIN_VIEW_HEIGHT / box.height : 1;
  return frameFor(box.height * scale, box.width * scale, gutter);
};

/** The width-driven layout: what the chart uses when it is given no height. */
export const DEFAULT_FRAME: Frame = frameFor(VIEW_HEIGHT);

/**
 * The view height that makes the viewBox match a measured box's aspect, so the
 * drawing fills it exactly with no stretching and no letterboxing.
 *
 * A box with no height of its own reports the height the chart's own aspect
 * gave it, so this returns the default and nothing moves — the width-driven
 * behaviour is the same code path, not a special case.
 */
export const viewHeightFor = (box: {
  readonly width: number;
  readonly height: number;
}): number =>
  box.width <= 0 || box.height <= 0
    ? VIEW_HEIGHT
    : Math.max(MIN_VIEW_HEIGHT, (VIEW_WIDTH * box.height) / box.width);

/** Milliseconds for either spelling of a moment. */
export const timeOf = (at: TimeValue): number =>
  typeof at === "number" ? at : at.getTime();

/**
 * Time → x, clamped to the plot. A zero-width domain reads as the left edge
 * rather than dividing by zero.
 */
export const xScaleFor = (
  domain: TimeDomain,
  frame: Frame = DEFAULT_FRAME,
): ((at: TimeValue) => number) => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const span = end - start;
  if (span <= 0) return () => frame.plotLeft;
  return (at: TimeValue): number => {
    const fraction = (timeOf(at) - start) / span;
    return (
      frame.plotLeft +
      clamp(fraction, 0, 1) * (frame.plotRight - frame.plotLeft)
    );
  };
};

/** The mutations in time order — the order the flags are numbered in. */
export const inTimeOrder = (
  mutations: readonly Mutation[],
): readonly Mutation[] =>
  sortBy((mutation: Mutation) => timeOf(mutation.at), mutations);

/** Each mutation's flag number, by id: 1, 2, 3… in time order. */
export const mutationNumbers = (
  mutations: readonly Mutation[],
): ReadonlyMap<string, number> =>
  new Map(
    map(
      (mutation: Mutation, index: number) => [mutation.id, index + 1] as const,
      inTimeOrder(mutations),
    ),
  );

/** The numbered flags and their rules, in time order. */
export const flagPositions = (
  mutations: readonly Mutation[],
  xScale: (at: TimeValue) => number,
  frame: Frame = DEFAULT_FRAME,
): readonly Flag[] => {
  const ordered = inTimeOrder(mutations);
  const xs = map((mutation: Mutation) => xScale(mutation.at), ordered);
  const centres = nudgeFlagCentres(xs, frame.viewWidth);
  return map(
    (mutation: Mutation, index: number) =>
      placeFlag(mutation, index + 1, xs[index], centres[index], frame),
    ordered,
  );
};

/** Clear air between two nudged flag boxes. */
export const FLAG_GAP = 2;
/**
 * How far below its box a DISPLACED flag's rule starts. The gap is spanned by
 * a leader from the box's centre to the rule's true x, so a nudged box still
 * points at the moment it names.
 */
export const FLAG_LEADER_DROP = 8;

/**
 * Where each flag's BOX centre goes, so that no two boxes overlap
 * (Peter, 2026-09-24): a box whose neighbour is too close NUDGES sideways just
 * enough to clear, and its rule stays at the true x.
 *
 * `xs` are the rules' x, in time order (so ascending). Boxes are laid out one
 * `FLAG_BOX_WIDTH + FLAG_GAP` pitch apart at the least. Overlapping boxes
 * merge into a CLUSTER centred on the mean of their true x's — so a pair
 * spreads symmetrically about its midpoint rather than one shoving the
 * other — and a cluster that then collides with its left neighbour merges
 * again. Each cluster is clamped to the canvas. The standard 1-D label
 * de-overlap: O(n), and a flag with room to spare is not moved at all.
 */
export const nudgeFlagCentres = (
  xs: readonly number[],
  viewWidth: number,
): readonly number[] => {
  const pitch = FLAG_BOX_WIDTH + FLAG_GAP;
  const lo = FLAG_BOX_WIDTH / 2;
  const hi = viewWidth - FLAG_BOX_WIDTH / 2;
  interface Cluster {
    count: number;
    sum: number;
  }
  /** The first box's centre: the cluster centred on its mean, on the canvas. */
  const firstCentre = (cluster: Cluster): number => {
    const span = (cluster.count - 1) * pitch;
    return clamp(
      cluster.sum / cluster.count - span / 2,
      lo,
      Math.max(lo, hi - span),
    );
  };
  const clusters: Cluster[] = [];
  for (const x of xs) {
    clusters.push({ count: 1, sum: x });
    for (;;) {
      const right = clusters[clusters.length - 1];
      const left = clusters[clusters.length - 2];
      if (left === undefined) break;
      if (firstCentre(left) + left.count * pitch <= firstCentre(right) + 1e-9)
        break;
      left.count += right.count;
      left.sum += right.sum;
      clusters.pop();
    }
  }
  const centres: number[] = [];
  for (const cluster of clusters) {
    const first = firstCentre(cluster);
    for (let k = 0; k < cluster.count; k += 1) centres.push(first + k * pitch);
  }
  return centres;
};

/**
 * One tick per month boundary in the domain. Built from DateAxis's own
 * `monthlyCells`, so the chart and the axis component agree on where a month
 * starts rather than each keeping its own calendar.
 */
export const monthTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
  labelEvery = 1,
): readonly MonthTick[] =>
  map(
    (cell: { start: Date }, index: number) => ({
      key: cell.start.toISOString(),
      label: MONTH_LABELS[cell.start.getUTCMonth()],
      x: xScale(cell.start),
      showLabel: index % Math.max(1, labelEvery) === 0,
    }),
    monthlyCells(asDate(domain[0]), asDate(domain[1])),
  );

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const asDate = (at: TimeValue): Date =>
  typeof at === "number" ? new Date(at) : at;

const placeFlag = (
  mutation: Mutation,
  number: number,
  x: number,
  /** The box's centre, from `nudgeFlagCentres` — already on the canvas. */
  centre: number,
  frame: Frame,
): Flag => {
  // Clamped to the frame's OWN width. It was clamped to the default 640, so
  // on a measured wide card every flag right of ~620 piled up there, detached
  // from its rule.
  const boxX = clamp(
    centre - FLAG_BOX_WIDTH / 2,
    0,
    frame.viewWidth - FLAG_BOX_WIDTH,
  );
  const displaced = Math.abs(boxX + FLAG_BOX_WIDTH / 2 - x) > 0.5;
  return {
    displaced,
    id: mutation.id,
    label: String(number),
    number,
    at: timeOf(mutation.at),
    title: mutation.label,
    details: mutation.details ?? [],
    x,
    ruleTop: displaced ? FLAG_RULE_TOP + FLAG_LEADER_DROP : FLAG_RULE_TOP,
    ruleBottom: frame.plotBottom,
    boxX,
    boxY: FLAG_BOX_TOP,
    boxWidth: FLAG_BOX_WIDTH,
    boxHeight: FLAG_BOX_HEIGHT,
    textX: boxX + FLAG_BOX_WIDTH / 2,
    textY: FLAG_BOX_TOP + FLAG_BOX_HEIGHT / 2,
  };
};

// ============================================================================
// The RAIL model — a line is a LEVEL, and the chart is a Sankey.
//
// A rail is a filled band whose THICKNESS is the count holding that level and
// whose position is its VALUE: the band is CENTRED on `y(value)`, top and
// bottom equidistant from it, so a rail thickening never appears to move.
// (An earlier reading of this file described the bands as a recomputed STACK
// whose members drift as their neighbours thicken. They do not and never did
// under the rail model — `spanTop`/`spanBottom` have always been `y ∓ w/2`.
// The prose was left over from the stepped model this replaced.)
// Movement between levels is a FLOW: wide translucent
// ribbons that leave one band's edge and arrive at another's, graduating from
// the source's colour to the destination's along the way.
//
// WIDTH CONSERVATION is exact and unconditional. The width scale is purely
// proportional — `count × perCount`, with no floor — so
//
//     bandWidth(a) − bandWidth(c) === bandWidth(a − c)
//
// for every a and c, including a rail emptying to nothing. (An earlier version
// had an affine scale with a MIN_STROKE floor so that a count of one stayed
// visible on a chart whose total ran to a hundred. That floor could not be
// conserved — it would be counted once per band — and it is no longer needed:
// `perCount` is now sized so the whole stack fills most of the plot, which
// makes a count of one visibly wide by construction.)
// ============================================================================

/** "From `at`, this level holds `count`." */
export interface CountPoint {
  readonly at: TimeValue;
  readonly count: number;
}

/** One level: a band in the stack, thickening and thinning over time. */
export interface Level {
  readonly id: string;
  readonly label: string;
  /** The level's own figure. Decides its y, and RANK in the stack. */
  readonly value: number;
  readonly points: readonly CountPoint[];
}

/**
 * A count moving between levels at one moment, drawn as a flow.
 *
 * Both ends are OPTIONAL, and which ones are present is what the flow means:
 *
 *   • `from` and `to`  — a move between two levels.
 *   • `from` only      — a DEPARTURE: it left the system. The ribbon runs
 *                        out of the band's end and fades to nothing.
 *   • `to` only        — an ARRIVAL: it joined from outside. The ribbon fades
 *                        in and arrives at the band's start.
 *   • neither          — nothing to draw; dropped.
 *
 * Optional ends are what let the total be CONSERVED: every change in a band's
 * thickness has a matching flow, so a reader never sees a band thin with
 * nothing leaving it. A silent count drop is the one thing this chart must not
 * show, because it reads as a mistake.
 */
export interface Transfer {
  readonly at: TimeValue;
  /** Source level id. Absent means it joined from outside the system. */
  readonly from?: string;
  /** Destination level id. Absent means it left the system. */
  readonly to?: string;
  readonly count: number;
}

/** What a flow means, decided by which of its two ends are present. */
/**
 * What a flow is. The last two are both "the count that did not move", split
 * apart because they must be PAINTED differently:
 *
 *   • `carry`        — the rail's width changed at this cap (some left, some
 *                      arrived), so the carry is narrower than the band it
 *                      came from and reads as traffic, like any other ribbon.
 *   • `continuation` — NOTHING happened to this rail here. It is only split at
 *                      all because something happened elsewhere on the chart,
 *                      and it must be painted exactly like the band so the
 *                      join is invisible. A rail with no change that read as
 *                      dashed would be inventing an event.
 */
export type FlowKind =
  | "move"
  | "departure"
  | "arrival"
  | "carry"
  | "continuation";

/** One stretch of a band: a horizontal run at `y`, `width` thick. */
export interface RailSpan {
  readonly levelId: string;
  readonly x1: number;
  readonly x2: number;
  readonly count: number;
  readonly width: number;
  /** The level's own y. Fixed: a level does not move, its thickness does. */
  readonly y: number;
}

/** The top and bottom edges of a span. */
export const spanTop = (span: RailSpan): number => span.y - span.width / 2;
export const spanBottom = (span: RailSpan): number => span.y + span.width / 2;

/** A rail: one level, stacked, with its bands. */
export interface Rail {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** Where the level sits — proportional to `value`. */
  readonly y: number;
  readonly spans: readonly RailSpan[];
  /** The closed bands this rail paints as — one per contiguous stretch. */
  readonly runs: readonly BandRun[];
}

/** A thin rule at a change no numbered flag already marks. */
export interface Dropline {
  readonly key: string;
  readonly x: number;
}

export interface LevelsRailGeometry {
  /** The vertical layout this was built in — what the component paints into. */
  readonly frame: Frame;
  readonly yDomain: readonly [number, number];
  /** The largest TOTAL at any one moment — one half of the width scale. */
  readonly peak: number;
  /** Thickness per unit of count, after both caps. */
  readonly perCount: number;
  readonly rails: readonly Rail[];
  readonly flows: readonly FlowBand[];
  readonly droplines: readonly Dropline[];
  readonly flags: readonly Flag[];
  /** The dated bottom axis — see `datedAxisTicks`. */
  readonly ticks: readonly AxisTick[];
  /** The value axis' ticks, in the left gutter. */
  readonly yTicks: readonly ValueTick[];
}

/** How much of the plot's height the bands fill at the busiest moment. */
export const FILL_FRACTION = 0.6;
/** Clear air left between two adjacent levels' bands at their fattest. */
export const BAND_MARGIN = 4;
/**
 * …but never more than this share of the gap it has to fit inside.
 *
 * An ABSOLUTE margin is what emptied the board's short cell: with seven levels
 * in a 46-unit plot the tightest pair sat 3.74 units apart, the 4-unit margin
 * ate all of it, and the adjacency cap came out at exactly zero — so every
 * band was zero units tall and the chart drew its flags, its axis and its
 * rules over nothing at all. A margin that scales cannot do that: it takes a
 * share of the gap and always leaves the rest.
 */
export const BAND_MARGIN_FRACTION = 0.3;

/** The margin two levels `gap` apart actually get. */
export const marginFor = (gap: number): number =>
  Math.min(BAND_MARGIN, Math.max(0, gap) * BAND_MARGIN_FRACTION);

/** The plot's height — the space the stack is laid out in. */

/**
 * The width that fills a good fraction of the plot at the busiest moment.
 * Sized from the PEAK TOTAL rather than the biggest single level: it
 * is all the bands together that occupy the plot.
 */
export const fillWidth = (peak: number, frame: Frame): number =>
  peak <= 0 ? 0 : (frame.plotHeight * FILL_FRACTION) / peak;

/**
 * The width at which the TIGHTEST pair of adjacent levels still clears
 * `BAND_MARGIN` between them, at their own fattest.
 *
 * Adjacent means next to each other in value, which is the only pair that can
 * collide — a level two rungs up is behind a nearer one already. Each pair is
 * asked for the width at which half of each band, plus the margin, fits in the
 * gap between their two y's. `Infinity` when there is only one level: nothing
 * to collide with, so the fill width wins uncontested.
 */
export const adjacencyWidth = (
  levels: readonly Level[],
  yScale: (value: number) => number,
): number => {
  const byValue = sortBy((level: Level) => level.value, levels);
  const limits: number[] = [];
  for (const [index, level] of byValue.entries()) {
    const next = byValue[index + 1];
    if (next === undefined) continue;
    const gap = Math.abs(yScale(level.value) - yScale(next.value));
    const room = gap - marginFor(gap);
    const halves = (maxCountIn(level) + maxCountIn(next)) / 2;
    if (halves <= 0) continue;
    limits.push(Math.max(0, room) / halves);
  }
  return limits.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...limits);
};

/** The most anybody ever holds this one level. */
export const maxCountIn = (level: Level): number =>
  level.points.length === 0
    ? 0
    : Math.max(0, ...map((point: CountPoint) => point.count, level.points));

/**
 * The width at which no band overruns the plot's own top or bottom edge.
 *
 * The adjacency cap only polices the space BETWEEN levels; nothing in it stops
 * the outermost band from hanging off the axis, which is exactly what happened
 * on a two-level track whose bands wanted to be 92 units wide in a 154-unit
 * plot. Every level is asked how much room it has to its nearer edge.
 */
export const edgeWidth = (
  levels: readonly Level[],
  yScale: (value: number) => number,
  frame: Frame,
): number => {
  const limits: number[] = [];
  for (const level of levels) {
    const most = maxCountIn(level);
    if (most <= 0) continue;
    const y = yScale(level.value);
    const reach = Math.min(y - frame.plotTop, frame.plotBottom - y);
    const room = reach - marginFor(reach * 2);
    limits.push((2 * Math.max(0, room)) / most);
  }
  return limits.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...limits);
};

/**
 * The thickest a band may EVER be drawn (Peter, 2026-09-16: "The ribbons
 * should be no more than 10 px in height").
 *
 * viewBox units are px here — the viewBox is 1u/px by construction — so this
 * is the literal ten. It is an ABSOLUTE ceiling rather than one more
 * proportional cap, and that is the point: a rail centred on its value reads
 * as a rail at ten px whatever the axis behind it runs to, where a
 * proportional band on a consumer-pinned axis spanning a whole roster's range
 * drew as a slab.
 *
 * This REPLACED `soloWidth`, the fraction-of-the-plot cap that kept a lone
 * rail from becoming a wall (b9fa493). It is strictly tighter: that cap was
 * `plotHeight × 0.25 / most`, and the plot is never shorter than ~56 units
 * (`MIN_VIEW_HEIGHT` less the compact chrome), so it never resolved below
 * `14 / most`. A cap that can never bind is dead code, so it is gone rather
 * than left to be maintained — the tests that pinned its BEHAVIOUR now pin
 * this ceiling instead.
 */
export const MAX_BAND_PX = 10;

/** The width at which the fattest single band is exactly `MAX_BAND_PX`. */
export const maxBandWidth = (levels: readonly Level[]): number => {
  const counts = map((level: Level) => maxCountIn(level), levels);
  const most = counts.length === 0 ? 0 : Math.max(0, ...counts);
  return most <= 0 ? Number.POSITIVE_INFINITY : MAX_BAND_PX / most;
};

/**
 * Thickness per unit of count: the smallest of the answers. See the header —
 * the fill width alone would smear close levels together and overrun the
 * frame, any cap alone would draw a sparse chart in hairlines, and without
 * the solo cap a single level fills the plot with one slab.
 */
/**
 * The thinnest a band is ever drawn, whatever the caps say.
 *
 * A cap of zero means "there is no room", and the honest answer to that is
 * still not to draw nothing: a chart of invisible data looks broken, where
 * bands that touch merely look tight. So the caps floor here. Below the floor
 * adjacent bands may meet, which is a legible picture; zero is not a picture.
 */
export const MIN_PER_COUNT = 1;

export const perCountWidth = (
  levels: readonly Level[],
  yScale: (value: number) => number,
  peak: number,
  frame: Frame,
): number =>
  peak <= 0
    ? 0
    : // The ceiling is applied OUTSIDE the floor, so it wins: a chart whose
      // counts are high enough that ten px per band leaves less than a unit
      // each draws thin bands rather than a band over its own ten-px
      // promise. The floor's job is only that nothing resolves to zero.
      Math.min(
        maxBandWidth(levels),
        Math.max(
          MIN_PER_COUNT,
          Math.min(
            fillWidth(peak, frame),
            adjacencyWidth(levels, yScale),
            edgeWidth(levels, yScale, frame),
          ),
        ),
      );

/** A band's thickness. Purely proportional, so conservation is exact. */
export const bandWidth = (count: number, perCount: number): number =>
  Math.max(0, count) * perCount;

/** The largest total across all levels at any one moment. */
export const peakTotal = (levels: readonly Level[]): number => {
  const moments = changeTimes(levels, []);
  if (moments.length === 0) return 0;
  const totals = map(
    (time: number) => sum(map((level: Level) => countAt(level, time), levels)),
    moments,
  );
  return Math.max(0, ...totals);
};

/** What a level holds at `time` — zero before its first point. */
export const countAt = (level: Level, time: number): number => {
  let current = 0;
  for (const point of sortBy(
    (one: CountPoint) => timeOf(one.at),
    level.points,
  )) {
    if (timeOf(point.at) > time) break;
    current = point.count;
  }
  return Math.max(0, current);
};

/** Every moment anything changes — a count point or a transfer — deduped. */
export const changeTimes = (
  levels: readonly Level[],
  transfers: readonly Transfer[],
): readonly number[] => {
  const times = new Set<number>();
  for (const level of levels) {
    for (const point of level.points) times.add(timeOf(point.at));
  }
  for (const transfer of transfers) times.add(timeOf(transfer.at));
  return sortBy((time: number) => time, [...times]);
};

/**
 * A rule at every change a numbered flag does NOT already mark.
 *
 * Two omissions, both deliberate. The domain's own left edge is the frame, not
 * an event — everything starts somewhere, and ruling that tells the reader
 * nothing. And where a change coincides with a mutation, the flag's own rule
 * is drawn instead, so the reader never sees two rules in one column and
 * wonders what the second one means.
 */
export const droplinePositions = (
  levels: readonly Level[],
  transfers: readonly Transfer[],
  mutations: readonly Mutation[],
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
): readonly Dropline[] => {
  const start = timeOf(domain[0]);
  const flagged = new Set(
    map((mutation: Mutation) => timeOf(mutation.at), mutations),
  );
  const wanted = filter(
    (time: number) => time !== start && !flagged.has(time),
    changeTimes(levels, transfers),
  );
  return map(
    (time: number) => ({ key: String(time), x: xScale(time) }),
    wanted,
  );
};

// ── curves and bands ─────────────────────────────────────────────────────────

/** The transition width, as a fraction of the plot. Generous: the S is the point. */
export const TRANSITION_FRACTION = 0.11;
/** Narrow enough to stay a join rather than a journey… */
export const MIN_TRANSITION = 16;
/** …and wide enough that the S reads as an S. */
export const MAX_TRANSITION = 72;

/** How wide every blend is, for this plot. One number, shared by everything. */
export const transitionWidth = (frame: Frame = DEFAULT_FRAME): number =>
  clamp(
    (frame.plotRight - frame.plotLeft) * TRANSITION_FRACTION,
    MIN_TRANSITION,
    MAX_TRANSITION,
  );

const CONTIGUITY_EPSILON = 0.001;

/** Round to 3dp — a path string is read by humans in tests, not just parsers. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * One point on a band's edge. `curved` means it is reached from the previous
 * point by a cubic with horizontal tangents rather than by a straight line.
 */
export interface EdgePoint {
  readonly x: number;
  readonly y: number;
  readonly curved: boolean;
}

/**
 * The Sankey cubic. Moved to `src/internal/geometry/hCurve.ts` on 2026-09-17
 * when `Chart`'s `StackedAreaSeries` became its second call site; re-exported
 * here so this module stays the one place a reader of the chart's geometry
 * looks. See that file for what the construction is and why.
 */
export { hCurve } from "../../internal/geometry/hCurve";

/** An edge walked forwards, without its opening `M`. */
const forwardEdge = (points: readonly EdgePoint[]): string => {
  const parts: string[] = [];
  for (const [index, point] of points.entries()) {
    if (index === 0) continue;
    const previous = points[index - 1];
    parts.push(
      point.curved
        ? hCurve(previous.x, previous.y, point.x, point.y)
        : `L ${round3(point.x)} ${round3(point.y)}`,
    );
  }
  return join(" ", parts);
};

/** The same edge walked backwards. A segment keeps the curvedness of its END. */
const reverseEdge = (points: readonly EdgePoint[]): string => {
  const parts: string[] = [];
  for (let index = points.length - 1; index > 0; index -= 1) {
    const from = points[index];
    const to = points[index - 1];
    parts.push(
      from.curved
        ? hCurve(from.x, from.y, to.x, to.y)
        : `L ${round3(to.x)} ${round3(to.y)}`,
    );
  }
  return join(" ", parts);
};

/**
 * Close a band from its two edges: along the top, down the far cap, back along
 * the bottom, up the near cap. Both caps are BLUNT — a rail that starts or
 * empties ends square at the change x, because it is the ribbon that carries
 * the change, not the rail's shape. A rail tapering to a point would say the
 * count dwindled when it did not.
 */
export const bandPath = (
  top: readonly EdgePoint[],
  bottom: readonly EdgePoint[],
): string => {
  if (top.length === 0 || bottom.length === 0) return "";
  const last = bottom[bottom.length - 1];
  return join(" ", [
    `M ${round3(top[0].x)} ${round3(top[0].y)}`,
    forwardEdge(top),
    `L ${round3(last.x)} ${round3(last.y)}`,
    reverseEdge(bottom),
    "Z",
  ]);
};

/** One blend on a rail: where it is, how wide, and the two widths it joins. */
export interface Taper {
  readonly x: number;
  /** Half the transition, already shortened if a neighbouring change is close. */
  readonly half: number;
  readonly widthBefore: number;
  readonly widthAfter: number;
}

/** A contiguous stretch of a rail, as one closed band. */
export interface BandRun {
  readonly path: string;
  readonly tapers: readonly Taper[];
}

/**
 * Half-widths for a run's INTERNAL changes, shortened wherever two sit closer
 * together than a full transition apart. Without this, two nearby changes
 * would each claim the same stretch of x and the band would fold over itself —
 * and a consumer with a busy month is not doing anything wrong.
 */
export const taperHalves = (run: readonly RailSpan[]): readonly number[] => {
  const base = transitionWidth() / 2;
  const stops = map((span: RailSpan) => span.x2, run.slice(0, run.length - 1));
  const edges = [run[0].x1, ...stops, run[run.length - 1].x2];
  return map((x: number, index: number) => {
    const previous = edges[index];
    const next = edges[index + 2];
    const room = [
      base,
      ...(previous === undefined ? [] : [(x - previous) / 2]),
      ...(next === undefined ? [] : [(next - x) / 2]),
    ];
    return Math.max(0, Math.min(...room));
  }, stops);
};

/**
 * A rail as closed bands: ONE PER SPAN, each a blunt-ended rectangle.
 *
 * There are no curves in a rail any more and no tapers either. A band holds
 * one width for its whole length and stops square at the change; everything
 * that bends belongs to a ribbon. That is what a Sankey's node bars are, and
 * it is the only arrangement in which a join can be exactly flush: the band's
 * cap and the ribbon's root are the same two points.
 */
export const railRuns = (spans: readonly RailSpan[]): readonly BandRun[] =>
  map(
    (span: RailSpan) => ({
      path: bandPath(
        [
          { x: span.x1, y: spanTop(span), curved: false },
          { x: span.x2, y: spanTop(span), curved: false },
        ],
        [
          { x: span.x1, y: spanBottom(span), curved: false },
          { x: span.x2, y: spanBottom(span), curved: false },
        ],
      ),
      tapers: [],
    }),
    filter((span: RailSpan) => span.x2 > span.x1, spans),
  );

// ── flows ────────────────────────────────────────────────────────────────────

/** A flow, as a closed band rooted in the edges of the bands it joins. */
export interface FlowBand {
  readonly key: string;
  readonly kind: FlowKind;
  readonly count: number;
  /** The transition this flow spans. */
  readonly x0: number;
  readonly x1: number;
  readonly srcTop: number;
  readonly srcBottom: number;
  readonly dstTop: number;
  readonly dstBottom: number;
  readonly path: string;
  /** Source level id. Absent on an arrival. */
  readonly fromId?: string;
  /** Destination level id. Absent on a departure. */
  readonly toId?: string;
}

/** A root slice on a band's edge: [top, bottom]. */
type Root = readonly [number, number];

/** Two-point edges make the simplest possible band: one cubic each way. */
const flowPath = (x0: number, x1: number, src: Root, dst: Root): string =>
  bandPath(
    [
      { x: x0, y: src[0], curved: false },
      { x: x1, y: dst[0], curved: true },
    ],
    [
      { x: x0, y: src[1], curved: false },
      { x: x1, y: dst[1], curved: true },
    ],
  );

/** One slice of a band's cap: what leaves, arrives, or simply carries on. */
interface Slice {
  /** The flow this slice belongs to, or `undefined` for the carry. */
  readonly index?: number;
  readonly width: number;
  /** Where the other end of this slice is, which is what orders the stack. */
  readonly towards: number;
}

/** Lay slices down the cap, top to bottom, in the order of their far end. */
const sliceRoots = (
  top: number,
  slices: readonly Slice[],
): ReadonlyMap<number | "carry", Root> => {
  const roots = new Map<number | "carry", Root>();
  let cursor = top;
  for (const slice of sortBy((one: Slice) => one.towards, slices)) {
    roots.set(slice.index ?? "carry", [cursor, cursor + slice.width] as const);
    cursor += slice.width;
  }
  return roots;
};

/**
 * Every ribbon in the chart: one per transfer, plus a CARRY for each rail that
 * continues across a change.
 *
 * The carry is what makes a rail look continuous while its bands stop short of
 * every change — it is the count that did not move, drawn as the flow it
 * is. Without it a rail losing one out of four would show the other three
 * vanishing into the gap and reappearing after it.
 *
 * Every ribbon's four corners are slices of two bands' caps, so a join cannot
 * float: the same two numbers are the band's edge and the ribbon's edge. Where
 * the consumer's counts and transfers disagree, the carry's two ends differ
 * and the ribbon visibly tapers — which is the disagreement made visible
 * rather than hidden.
 */
export const flowBands = (
  transfers: readonly Transfer[],
  rails: readonly Rail[],
  xScale: (at: TimeValue) => number,
  perCount: number,
  half: number,
  /** Every moment anything changes — a band stops and restarts at each. */
  moments: readonly number[],
  frame: Frame = DEFAULT_FRAME,
): readonly FlowBand[] => {
  const railById = new Map(
    map((rail: Rail) => [rail.id, rail] as const, rails),
  );
  const ordered = sortBy((one: Transfer) => timeOf(one.at), transfers);
  const bands: FlowBand[] = [];

  for (const moment of moments) {
    const x = xScale(moment);
    const x0 = x - half;
    const x1 = x + half;
    const here = filter((one: Transfer) => timeOf(one.at) === moment, ordered);
    /** The band that stops at this change, and the one that starts after it. */
    const before = (rail: Rail) =>
      find(
        (span: RailSpan) => Math.abs(span.x2 - x0) < CONTIGUITY_EPSILON,
        rail.spans,
      );
    const after = (rail: Rail) =>
      find(
        (span: RailSpan) => Math.abs(span.x1 - x1) < CONTIGUITY_EPSILON,
        rail.spans,
      );

    const srcRoot = new Map<number, Root>();
    const dstRoot = new Map<number, Root>();
    const carries: {
      rail: Rail;
      from?: Root;
      to?: Root;
      /** True when nothing left and nothing arrived — an invisible join. */
      untouched: boolean;
    }[] = [];

    for (const rail of rails) {
      const leavingBand = before(rail);
      const arrivingBand = after(rail);
      if (leavingBand === undefined && arrivingBand === undefined) continue;
      const indices = map((_one: Transfer, index: number) => index, here);
      const out = filter((i: number) => here[i].from === rail.id, indices);
      const into = filter((i: number) => here[i].to === rail.id, indices);
      const widthOf = (i: number) => bandWidth(here[i].count, perCount);
      const otherY = (
        i: number,
        leaving: boolean,
        fallback: number,
      ): number => {
        const otherId = leaving ? here[i].to : here[i].from;
        const other = otherId === undefined ? undefined : railById.get(otherId);
        return other === undefined ? fallback : other.y;
      };

      if (leavingBand !== undefined) {
        // A flow with no destination sorts just past the rail's own y, so it
        // takes the outside slice rather than cutting through the carry.
        const slices: Slice[] = map(
          (i: number) => ({
            index: i,
            width: widthOf(i),
            towards: otherY(i, true, rail.y + frame.plotHeight),
          }),
          out,
        );
        const taken = sum(map((one: Slice) => one.width, slices));
        const carry = Math.max(0, leavingBand.width - taken);
        const roots = sliceRoots(spanTop(leavingBand), [
          ...slices,
          { width: carry, towards: rail.y },
        ]);
        for (const i of out) {
          const root = roots.get(i);
          if (root !== undefined) srcRoot.set(i, root);
        }
        if (carry > 0 && arrivingBand !== undefined) {
          carries.push({
            rail,
            from: roots.get("carry"),
            untouched: out.length === 0 && into.length === 0,
          });
        }
      }

      if (arrivingBand !== undefined) {
        const slices: Slice[] = map(
          (i: number) => ({
            index: i,
            width: widthOf(i),
            towards: otherY(i, false, rail.y - frame.plotHeight),
          }),
          into,
        );
        const taken = sum(map((one: Slice) => one.width, slices));
        const carry = Math.max(0, arrivingBand.width - taken);
        const roots = sliceRoots(spanTop(arrivingBand), [
          ...slices,
          { width: carry, towards: rail.y },
        ]);
        for (const i of into) {
          const root = roots.get(i);
          if (root !== undefined) dstRoot.set(i, root);
        }
        if (carry > 0 && leavingBand !== undefined) {
          const existing = carries[carries.length - 1];
          if (existing !== undefined && existing.rail.id === rail.id) {
            existing.to = roots.get("carry");
          }
        }
      }
    }

    for (const [index, one] of here.entries()) {
      const hasFrom = one.from !== undefined && railById.has(one.from);
      const hasTo = one.to !== undefined && railById.has(one.to);
      if (!hasFrom && !hasTo) continue;
      const kind: FlowKind =
        hasFrom && hasTo ? "move" : hasFrom ? "departure" : "arrival";
      const src = srcRoot.get(index) ?? dstRoot.get(index);
      const dst = dstRoot.get(index) ?? srcRoot.get(index);
      if (src === undefined || dst === undefined) continue;
      bands.push({
        key: `${one.from ?? "out"}-${one.to ?? "out"}-${moment}`,
        kind,
        count: one.count,
        x0,
        x1,
        srcTop: src[0],
        srcBottom: src[1],
        dstTop: dst[0],
        dstBottom: dst[1],
        path: flowPath(x0, x1, src, dst),
        fromId: hasFrom ? one.from : undefined,
        toId: hasTo ? one.to : undefined,
      });
    }

    for (const carry of carries) {
      if (carry.from === undefined || carry.to === undefined) continue;
      bands.push({
        key: `carry-${carry.rail.id}-${moment}`,
        kind: carry.untouched ? "continuation" : "carry",
        count: 0,
        x0,
        x1,
        srcTop: carry.from[0],
        srcBottom: carry.from[1],
        dstTop: carry.to[0],
        dstBottom: carry.to[1],
        path: flowPath(x0, x1, carry.from, carry.to),
        fromId: carry.rail.id,
        toId: carry.rail.id,
      });
    }
  }
  return bands;
};

// ── placing the levels ───────────────────────────────────────────────────────

/** The room reserved at each end of the plot for the outermost bands. */

/** Open a range that has no height, so no scale built from it divides by zero. */
const openOut = (lo: number, hi: number): readonly [number, number] =>
  lo === hi ? [lo - 1, hi + 1] : [lo, hi];

/**
 * The value extent the rails occupy — the FIT a held axis
 * (`createAxisWaterMarks`) tracks. Only levels someone ever holds count: a
 * level with no one in it draws nothing, so it must not stretch the axis.
 * Null when nothing is drawn.
 */
export const levelsValueFit = (
  levels: readonly Level[],
): { readonly min: number; readonly max: number } | null => {
  const values = map(
    (level: Level) => level.value,
    filter((level: Level) => maxCountIn(level) > 0, levels),
  );
  return values.length === 0
    ? null
    : { min: Math.min(...values), max: Math.max(...values) };
};

/** The levels' own range. No padding — the inset does that job now. */
export const valueDomainOf = (
  levels: readonly Level[],
): readonly [number, number] => {
  if (levels.length === 0) return [0, 1];
  const values = map((level: Level) => level.value, levels);
  return openOut(Math.min(...values), Math.max(...values));
};

/**
 * The y range to draw against: the consumer's, if it gave one, else the
 * levels' own.
 *
 * A PINNED domain is what stops the rails reshuffling vertically while a value
 * moves. Derived from the data, the scale follows it — raise one level and
 * every OTHER rail slides, because the range they are all drawn against just
 * changed. That is right for a chart read on its own and wrong for a board
 * whose whole point is watching one rail move against a fixed scale.
 *
 * A pinned domain is normalised the same way the derived one is (a zero-height
 * range is opened out) and is NOT widened to fit the data: a level outside it
 * clamps to the edge, exactly as a date outside the time domain does. The
 * consumer said where the axis runs; silently moving it would defeat pinning
 * it.
 */
export const valueDomainFor = (
  levels: readonly Level[],
  pinned?: readonly [number, number],
): readonly [number, number] =>
  pinned === undefined
    ? niceValueDomain(valueDomainOf(levels))
    : openOut(Math.min(...pinned), Math.max(...pinned));

/**
 * The nice tick values inside a range, from `Chart/scales` (see the header).
 *
 * `linearScale().ticks()` starts at the first multiple of its step inside the
 * range and stops at the last, so every tick returned is ON the axis — the
 * caller never has to filter one back off the end.
 */
export const valueTicks = (
  yDomain: readonly [number, number],
  count: number = Y_TICK_TARGET,
): readonly number[] => linearScale(yDomain, [0, 1]).ticks(count);

/**
 * Round a DERIVED range out to whole ticks, so the axis begins and ends on a
 * labelled one.
 *
 * Only the derived range is nicened. A PINNED range is the consumer's
 * statement about where the axis runs, and quietly widening it to the nearest
 * round number is the same betrayal as widening it to fit the data.
 *
 * A range narrower than one step yields fewer than two ticks and there is no
 * step to round to; it is returned untouched rather than collapsed.
 */
/** Trim the FP noise a divide-then-multiply leaves behind. */
const trim = (value: number): number =>
  Math.abs(value) < 1e-12 ? 0 : Math.round(value * 1e9) / 1e9;

export const niceValueDomain = (
  yDomain: readonly [number, number],
  count: number = Y_TICK_TARGET,
): readonly [number, number] => {
  const ticks = valueTicks(yDomain, count);
  if (ticks.length < 2) return yDomain;
  const step = ticks[1] - ticks[0];
  if (step <= 0) return yDomain;
  const [lo, hi] = yDomain;
  // Trimmed, because `floor(lo / step) * step` is a division followed by a
  // multiplication and the round trip does not always land on the number it
  // started from — an axis that drifts by a billionth per render is an axis
  // whose ticks are never quite its ends.
  return [
    trim(Math.floor(lo / step) * step),
    trim(Math.ceil(hi / step) * step),
  ];
};

/**
 * One value tick, placed and formatted.
 *
 * `format` is the CONSUMER's `formatValue`, and the axis uses the same one the
 * hover readout does — an axis reading `9000` beside a readout reading `$9k`
 * is two charts in one frame.
 */
export const valueTickMarks = (
  yDomain: readonly [number, number],
  yScale: (value: number) => number,
  frame: Frame,
  format: (value: number) => string = String,
): readonly ValueTick[] =>
  map(
    (value: number) => ({
      key: String(value),
      value,
      y: yScale(value),
      label: format(value),
    }),
    valueTicks(yDomain, frame.compact ? COMPACT_Y_TICK_TARGET : Y_TICK_TARGET),
  );

/**
 * The gutter the axis needs: its longest label, plus the tick and the gap.
 *
 * Estimated from the character count (see `Y_LABEL_CHAR_PX`) because this file
 * is pure. The caller passes the ALREADY FORMATTED labels, so a consumer's
 * format decides the gutter and this function never has to know what one
 * looks like.
 */
export const gutterWidth = (labels: readonly string[]): number => {
  const lengths = map((label: string) => label.length, labels);
  const longest = lengths.length === 0 ? 0 : Math.max(0, ...lengths);
  return longest === 0
    ? PLOT_LEFT
    : longest * Y_LABEL_CHAR_PX + Y_LABEL_GAP + Y_TICK_LENGTH;
};

/**
 * Value → y, inverted, mapped into the plot MINUS its inset at each end — so
 * the highest level sits `BAND_INSET` below the plot top with room for its
 * band, rather than on the edge with half of it outside.
 */
export const yScaleFor = (
  yDomain: readonly [number, number],
  frame: Frame = DEFAULT_FRAME,
): ((value: number) => number) => {
  const [lo, hi] = yDomain;
  const span = hi - lo;
  const top = frame.plotTop + frame.bandInset;
  const bottom = frame.plotBottom - frame.bandInset;
  const middle = (top + bottom) / 2;
  if (span <= 0) return () => middle;
  return (value: number): number =>
    bottom - clamp((value - lo) / span, 0, 1) * (bottom - top);
};

/**
 * One span per count point, each running to the next change (or the domain
 * end). A span nobody holds is omitted entirely, which is what lets a level
 * empty out for a stretch and come back without a band across the gap.
 */
export const railSpans = (
  level: Level,
  xScale: (at: TimeValue) => number,
  yScale: (value: number) => number,
  domainEnd: TimeValue,
  perCount: number,
  half: number,
  /** Every moment anything changes ANYWHERE on the chart. */
  moments: readonly number[],
  frame: Frame = DEFAULT_FRAME,
): readonly RailSpan[] => {
  if (level.points.length === 0) return [];
  const y = yScale(level.value);
  const endTime = timeOf(domainEnd);
  const spans: RailSpan[] = [];
  for (const [index, time] of moments.entries()) {
    const count = countAt(level, time);
    if (count <= 0) continue;
    const until = moments[index + 1] ?? endTime;
    if (until <= time) continue;
    const from = xScale(time);
    const to = xScale(until);
    spans.push({
      levelId: level.id,
      // The band STOPS short of every change and starts again after it. The
      // gap is not empty: it is where the ribbons live, and they are what make
      // the rail continuous. This is the node/link split a Sankey is built on,
      // and it is what guarantees a flush join — a ribbon's ends ARE slices of
      // the caps the bands stop at, so nothing can float.
      //
      // EVERY rail is split at EVERY change, not only at its own: a flow can
      // then always find a cap to root in, even at a moment this level's own
      // count did not change. A rail that nothing happened to is bridged by a
      // carry of identical width at both ends, which draws as a straight
      // continuation and costs the reader nothing.
      x1: from <= frame.plotLeft ? frame.plotLeft : from + half,
      x2: to >= frame.plotRight ? frame.plotRight : to - half,
      y,
      count,
      width: bandWidth(count, perCount),
    });
  }
  return spans;
};

/**
 * Half the transition, for this chart.
 *
 * One number for the WHOLE chart rather than one per change, because a
 * ribbon's two ends are slices of two different bands' caps: if those bands
 * trimmed themselves by different amounts the ribbon could not be flush at
 * both ends. Shortened when two changes sit close enough together that a full
 * transition either side would eat the band between them.
 */
export const transitionHalf = (
  changeXs: readonly number[],
  frame: Frame = DEFAULT_FRAME,
): number => {
  const stops = sortBy(
    (x: number) => x,
    [frame.plotLeft, ...changeXs, frame.plotRight],
  );
  const gaps: number[] = [];
  for (const [index, x] of stops.entries()) {
    const next = stops[index + 1];
    if (next !== undefined && next > x) gaps.push(next - x);
  }
  const room =
    gaps.length === 0 ? frame.plotRight - frame.plotLeft : Math.min(...gaps);
  return Math.min(transitionWidth(frame) / 2, (room / 2) * 0.9);
};

// Peter, 2026-09-16: "don't label the series directly on the plot." There is
// no text inside the plot area at all now — only the axis ticks below it and
// the numbered flags above. A level's identity is its COLOUR, the
// announcement, and whatever the consumer puts outside the chart. The level's
// own text is still in `Level.label`, unpainted, for a legend to use.

/** The whole rail observation: scales resolved, bands, flows, rules, flags. */
export const levelsRailGeometry = (input: {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
  readonly domain: TimeDomain;
  /** The viewBox height to lay out in. Omitted = the width-driven default. */
  readonly viewHeight?: number;
  /** The MEASURED box, which wins over `viewHeight` when both are given. */
  readonly box?: { readonly width: number; readonly height: number };
  /**
   * Pin the y range instead of deriving it from the levels, so the rails hold
   * still while a value moves. Omitted, the levels' own range is used.
   */
  readonly valueDomain?: readonly [number, number];
  /**
   * The consumer's own formatter, used for the VALUE AXIS' labels (and so for
   * the gutter they are measured into). The component passes the same one it
   * gives the hover readout.
   */
  readonly formatValue?: (value: number) => string;
}): LevelsRailGeometry => {
  // The gutter has to be known before the frame, because it IS the frame's
  // left edge — so the range and its labels are decided first, against a
  // provisional frame that only the tick COUNT is taken from.
  const yDomain = valueDomainFor(input.levels, input.valueDomain);
  const provisional =
    input.box === undefined
      ? frameFor(input.viewHeight ?? VIEW_HEIGHT)
      : frameForBox(input.box);
  const format = input.formatValue ?? String;
  const gutter = gutterWidth(
    map(
      (value: number) => format(value),
      valueTicks(
        yDomain,
        provisional.compact ? COMPACT_Y_TICK_TARGET : Y_TICK_TARGET,
      ),
    ),
  );
  const frame =
    input.box === undefined
      ? frameFor(input.viewHeight ?? VIEW_HEIGHT, VIEW_WIDTH, gutter)
      : frameForBox(input.box, gutter);
  const xScale = xScaleFor(input.domain, frame);
  const yScale = yScaleFor(yDomain, frame);
  const peak = peakTotal(input.levels);
  const perCount = perCountWidth(input.levels, yScale, peak, frame);
  const moments = changeTimes(input.levels, input.transfers);
  const half = transitionHalf(
    map((time: number) => xScale(time), moments),
    frame,
  );
  const rails = map((level: Level) => {
    const spans = railSpans(
      level,
      xScale,
      yScale,
      input.domain[1],
      perCount,
      half,
      moments,
      frame,
    );
    return {
      id: level.id,
      label: level.label,
      value: level.value,
      y: yScale(level.value),
      spans,
      runs: railRuns(spans),
    };
  }, input.levels);
  return {
    frame,
    yDomain,
    peak,
    perCount,
    rails,
    flows: flowBands(
      input.transfers,
      rails,
      xScale,
      perCount,
      half,
      moments,
      frame,
    ),
    droplines: droplinePositions(
      input.levels,
      input.transfers,
      input.mutations,
      input.domain,
      xScale,
    ),
    flags: flagPositions(input.mutations, xScale, frame),
    ticks: datedAxisTicks(input.domain, input.mutations, xScale, frame),
    yTicks: valueTickMarks(yDomain, yScale, frame, format),
  };
};

// ── the axis ─────────────────────────────────────────────────────────────────

/**
 * The axis has FOUR cadences, and the span picks one (Peter, 2026-09-24:
 * "show tickmarks at the interesting thresholds (based on the total
 * duration). For the 3 month projection that's weeks. For 6m and a year
 * that's months. For 2y that's quarters."):
 *
 *   • up to ~4 months (≤ `WEEKLY_UP_TO_DAYS`) — per WEEK, on ISO weeks: every
 *                                              Monday, 00:00 UTC.
 *   • up to 15 months    — per MONTH (6m and a year both land here).
 *   • 16 to 35 months    — per QUARTER (2y lands here).
 *   • three years and up — per YEAR.
 *
 * Every cadence tick is DRAWN; which of them get a LABEL is decided later by
 * `datedAxisTicks`' collision rule, so a dense cadence costs ink, never
 * overlap. The cut-points sit halfway-ish between Peter's named spans, so a
 * 3-month projection with a few days' slack either side still reads in weeks.
 *
 * Per ADR 0010 a mark is a CORE plus an adapter, and the core here is already
 * shared: the calendar itself is `monthlyCells`, imported from DateAxis, so
 * the chart and that component cannot disagree about where a month is. What
 * is left — these thresholds, and the decision to thin labels rather than
 * drop ticks — is EDITORIAL, not mechanism: it is this chart's answer to how
 * much axis a 640-unit viewBox can carry. No other chart can reuse a judgement
 * about a viewBox it does not have, so it stays private here rather than
 * moving to `src/internal/`.
 */
export const WEEKLY_UP_TO_DAYS = 125;
export const QUARTERLY_FROM_MONTHS = 16;
export const YEARLY_FROM_MONTHS = 36;

/** 0 = Sunday … 1 = Monday, as `getUTCDay` counts. ISO weeks start Monday. */
const MONDAY = 1;

/**
 * One tick per ISO week start (Monday 00:00 UTC) inside the domain. The UTC
 * day is used throughout, like every other date in this file, so a week
 * boundary never drifts with the viewer's time zone.
 */
export const weekTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
): readonly MonthTick[] => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const midnight = Math.ceil(start / DAY_MS) * DAY_MS;
  const weekday = new Date(midnight).getUTCDay();
  const first = midnight + ((MONDAY - weekday + 7) % 7) * DAY_MS;
  const ticks: MonthTick[] = [];
  for (let at = first; at <= end; at += 7 * DAY_MS) {
    ticks.push({
      key: new Date(at).toISOString(),
      label: isoDayOf(at),
      x: xScale(at),
      showLabel: true,
    });
  }
  return ticks;
};

/** Quarter boundaries are the Januarys, Aprils, Julys and Octobers. */
const QUARTER_MONTHS = [0, 3, 6, 9];

/** One tick per quarter boundary, labelled `2026-Q3`. */
export const quarterTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
): readonly MonthTick[] =>
  map(
    (cell: { start: Date }) => ({
      key: cell.start.toISOString(),
      label: quarterLabelOf(cell.start),
      x: xScale(cell.start),
      // A quarter row is already sparse; thinning it would leave gaps of
      // nothing, so every quarter keeps its label even in compact chrome.
      showLabel: true,
    }),
    filter(
      (cell: { start: Date }) =>
        QUARTER_MONTHS.includes(cell.start.getUTCMonth()),
      monthlyCells(asDate(domain[0]), asDate(domain[1])),
    ),
  );

/** One tick per January in the domain, labelled with the year. */
export const yearTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
): readonly MonthTick[] =>
  map(
    (cell: { start: Date }) => ({
      key: cell.start.toISOString(),
      label: String(cell.start.getUTCFullYear()),
      x: xScale(cell.start),
      // A year row is already sparse; thinning it would leave gaps of nothing.
      showLabel: true,
    }),
    filter(
      (cell: { start: Date }) => cell.start.getUTCMonth() === 0,
      monthlyCells(asDate(domain[0]), asDate(domain[1])),
    ),
  );

/**
 * Month ticks for a short domain, year ticks for a long one. The cadence is
 * chosen from the span alone, so the same chart stays readable whether it is
 * shown a quarter or a decade.
 */
export const axisTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
  frame: Frame = DEFAULT_FRAME,
): readonly MonthTick[] => {
  // Cells INCLUDE both ends, so a one-year domain is thirteen of them and
  // twelve months of span. The span is what the cadence is chosen from.
  const days = (timeOf(domain[1]) - timeOf(domain[0])) / DAY_MS;
  if (days <= WEEKLY_UP_TO_DAYS) return weekTicks(domain, xScale);
  const months = monthlyCells(asDate(domain[0]), asDate(domain[1])).length - 1;
  if (months >= YEARLY_FROM_MONTHS) return yearTicks(domain, xScale);
  if (months >= QUARTERLY_FROM_MONTHS) return quarterTicks(domain, xScale);
  return monthTicks(domain, xScale, frame.labelEvery);
};

/** `2026-09-01`, from UTC fields — the only place the day format lives. */
export const isoDayOf = (at: TimeValue): string => {
  const on = new Date(timeOf(at));
  return `${on.getUTCFullYear()}-${pad2(on.getUTCMonth() + 1)}-${pad2(on.getUTCDate())}`;
};

/** `09-01` — the day without its year. */
export const monthDayOf = (at: TimeValue): string => {
  const on = new Date(timeOf(at));
  return `${pad2(on.getUTCMonth() + 1)}-${pad2(on.getUTCDate())}`;
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

const yearOf = (time: number): number => new Date(time).getUTCFullYear();

/**
 * Dates, abbreviated the way a reader of a row of them wants: the FIRST in
 * full (`2026-10-01`), then `MM-DD` until the year changes, then full again
 * (`2026-10-01 | 11-01 | 2027-01-13 | 02-10`).
 *
 * ONE rule, shared: the dated axis labels its painted ticks with it and a
 * consumer's change tabs label their chips with it, so the two rows can never
 * disagree about when a year is worth writing. Pass the dates in the order
 * they are read; each label depends on its predecessor, so a delete re-derives
 * the row (drop `2027-01-13` above and `02-10` becomes `2027-02-10`).
 */
export const abbreviateDates = (
  dates: readonly TimeValue[],
): readonly string[] =>
  map(
    (at: TimeValue, index: number) =>
      index === 0 || yearOf(timeOf(dates[index - 1])) !== yearOf(timeOf(at))
        ? isoDayOf(at)
        : monthDayOf(at),
    dates,
  );

/** A candidate tick, before the labels are decided. */
interface TickCandidate {
  readonly at: number;
  readonly event: boolean;
}

/** How a label of `width` sits about its tick at `x`, kept on the canvas. */
export const labelPlacement = (
  x: number,
  width: number,
  viewWidth: number,
): {
  readonly anchor: "start" | "middle" | "end";
  readonly left: number;
  readonly right: number;
} => {
  if (x - width / 2 < 0) return { anchor: "start", left: x, right: x + width };
  if (x + width / 2 > viewWidth)
    return { anchor: "end", left: x - width, right: x };
  return { anchor: "middle", left: x - width / 2, right: x + width / 2 };
};

/** A label's estimated painted width — see `AXIS_LABEL_CHAR_PX`. */
export const axisLabelWidth = (label: string): number =>
  label.length * AXIS_LABEL_CHAR_PX;

/**
 * THE DATED AXIS (Peter, 2026-09-24, from a sketch, then revised the same
 * day: "ensure that the labels are sparse enough. Use tick mark to show the
 * exact position").
 *
 *   • A TICK at every flag date — longer than a cadence tick
 *     (`EVENT_TICK_LENGTH`) — whether or not its label survives. The tick is
 *     the exact position; the flag's tooltip is the exact date.
 *   • FILLER ticks between, at the span's cadence (months, quarters or years —
 *     `axisTicks`, unchanged) plus the domain's own start.
 *   • Labels are HORIZONTAL and never overlap. Events claim labels first, in
 *     time order; fillers after, and a filler needs `FILLER_LABEL_EXTRA_GAP`
 *     more air. A candidate is painted only if, with it added, every pair of
 *     neighbouring painted labels still clears `AXIS_LABEL_GAP` edge to edge —
 *     widths from the ACTUAL labels, which `abbreviateDates` derives from the
 *     painted set. (Adding a label can only SHORTEN the one after it — it may
 *     lose its year, never gain one — so a set that cleared stays clear.)
 *   • A label that would hang off the canvas anchors at its start or end
 *     instead of its middle, so the first and last need no extra margin.
 *
 * A flag outside the domain gets no tick: the flag itself clamps to the edge,
 * but a tick at the edge claiming a date that is not there would lie.
 */
export const datedAxisTicks = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  xScale: (at: TimeValue) => number,
  frame: Frame = DEFAULT_FRAME,
): readonly AxisTick[] => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const inDomain = (time: number): boolean => time >= start && time <= end;
  const eventTimes = new Set(
    filter(
      inDomain,
      map((mutation: Mutation) => timeOf(mutation.at), mutations),
    ),
  );
  const fillerTimes = new Set(
    filter(
      (time: number) => inDomain(time) && !eventTimes.has(time),
      [
        start,
        ...map(
          (tick: MonthTick) => Date.parse(tick.key),
          axisTicks(domain, xScale, frame),
        ),
      ],
    ),
  );
  const candidates: readonly TickCandidate[] = sortBy(
    (one: TickCandidate) => one.at,
    [
      ...map((at: number) => ({ at, event: true }), [...eventTimes]),
      ...map((at: number) => ({ at, event: false }), [...fillerTimes]),
    ],
  );

  /** The painted set's spans, in x order, with its labels re-derived. */
  const spansOf = (painted: readonly number[]) => {
    const ordered = sortBy((time: number) => time, painted);
    const labels = abbreviateDates(ordered);
    return map((time: number, index: number) => {
      const x = xScale(time);
      const label = labels[index];
      return {
        at: time,
        x,
        label,
        ...labelPlacement(x, axisLabelWidth(label), frame.viewWidth),
      };
    }, ordered);
  };

  /** Does `painted` plus `one` still clear? A filler asks for more air. */
  const fits = (painted: readonly number[], one: TickCandidate): boolean => {
    const spans = spansOf([...painted, one.at]);
    for (const [index, span] of spans.entries()) {
      const next = spans[index + 1];
      if (next === undefined) continue;
      const involves = span.at === one.at || next.at === one.at;
      const gap =
        AXIS_LABEL_GAP + (involves && !one.event ? FILLER_LABEL_EXTRA_GAP : 0);
      if (span.right + gap > next.left) return false;
    }
    return true;
  };

  let painted: readonly number[] = [];
  for (const one of [
    ...filter((c: TickCandidate) => c.event, candidates),
    ...filter((c: TickCandidate) => !c.event, candidates),
  ]) {
    if (fits(painted, one)) painted = [...painted, one.at];
  }

  const spanAt = new Map(
    map((span) => [span.at, span] as const, spansOf(painted)),
  );
  return map((one: TickCandidate) => {
    const x = xScale(one.at);
    const span = spanAt.get(one.at);
    return {
      key: String(one.at),
      at: one.at,
      x,
      label: span?.label ?? monthDayOf(one.at),
      showLabel: span !== undefined,
      event: one.event,
      tickLength: one.event ? EVENT_TICK_LENGTH : AXIS_TICK_LENGTH,
      labelX: x,
      labelY: frame.axisLabelY,
      labelAnchor: span?.anchor ?? "middle",
    };
  }, candidates);
};

// ── dragging a flag ──────────────────────────────────────────────────────────
//
// Peter, 2026-09-24: a flag is DRAGGED along x to move its event's date, snapped
// to the day, and it can never pass a neighbour — it clamps to one day after
// the previous flag and one day before the next. That keeps time order, so a
// flag never renumbers under the pointer. The chart only REPORTS the new date
// (`onMoveMutation`); the consumer moves the event and re-renders.

export const DAY_MS = 86_400_000;

/**
 * How far the pointer must travel, in viewBox units (= CSS px), before a press
 * on a flag is a DRAG rather than a click. Below it, the press still selects.
 */
export const DRAG_THRESHOLD_PX = 3;

/** The nearest UTC midnight. */
export const snapToDay = (time: number): number =>
  Math.round(time / DAY_MS) * DAY_MS;

/**
 * Where a mutation may be moved to: `time`, snapped to the day, clamped to
 * (previous flag + 1 day) … (next flag − 1 day) and to the domain.
 *
 * Neighbours are the adjacent mutations IN TIME ORDER. When the room is
 * empty — neighbours on consecutive days — the mutation stays where it is
 * rather than being forced onto a neighbour. An unknown id is returned as
 * the snapped time, unclamped by neighbours.
 */
export const clampMutationTime = (
  mutations: readonly Mutation[],
  id: string,
  time: number,
  domain?: TimeDomain,
): number => {
  const ordered = inTimeOrder(mutations);
  const index = findIndex((mutation: Mutation) => mutation.id === id, ordered);
  const current = index < 0 ? undefined : timeOf(ordered[index].at);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const lows = [
    ...(index > 0 && previous !== undefined
      ? [timeOf(previous.at) + DAY_MS]
      : []),
    ...(domain === undefined ? [] : [timeOf(domain[0])]),
  ];
  const highs = [
    ...(index >= 0 && next !== undefined ? [timeOf(next.at) - DAY_MS] : []),
    ...(domain === undefined ? [] : [timeOf(domain[1])]),
  ];
  const low = lows.length === 0 ? Number.NEGATIVE_INFINITY : Math.max(...lows);
  const high =
    highs.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...highs);
  if (low > high) return current ?? snapToDay(time);
  return clamp(snapToDay(time), low, high);
};

/** A drag's pointer x, resolved to the date the flag may move to. */
export const dragTimeAt = (
  mutations: readonly Mutation[],
  id: string,
  x: number,
  domain: TimeDomain,
  frame: Frame = DEFAULT_FRAME,
): number =>
  clampMutationTime(mutations, id, timeAtX(domain, x, frame), domain);

/**
 * Where a flag's hover tooltip hangs: just under its box, so it never covers
 * the number being hovered.
 */
export const FLAG_TIP_TOP = FLAG_RULE_TOP + 4;

// ── hover and pick ───────────────────────────────────────────────────────────

/** One row of the hover readout: what a level held at the hovered date. */
export interface LevelRow {
  readonly levelId: string;
  readonly label: string;
  readonly value: number;
  readonly count: number;
}

/**
 * What every level held at one moment, highest value first, empties omitted.
 *
 * Ordered by value rather than by the consumer's own order because the reader is
 * looking at a vertical stack and expects the table to read the same way down.
 * A level nobody holds is left out entirely — a table of zeroes is noise, and
 * the picture does not draw them either.
 */
export const levelsAt = (
  levels: readonly Level[],
  at: TimeValue,
): readonly LevelRow[] => {
  const time = timeOf(at);
  const rows = map(
    (level: Level) => ({
      levelId: level.id,
      label: level.label,
      value: level.value,
      count: countAt(level, time),
    }),
    sortBy((level: Level) => -level.value, levels),
  );
  return filter((row: LevelRow) => row.count > 0, rows);
};

/** x → time. The inverse of `xScaleFor`, clamped to the domain. */
export const timeAtX = (
  domain: TimeDomain,
  x: number,
  frame: Frame = DEFAULT_FRAME,
): number => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const span = end - start;
  if (span <= 0) return start;
  const fraction = clamp(
    (x - frame.plotLeft) / (frame.plotRight - frame.plotLeft),
    0,
    1,
  );
  return start + fraction * span;
};

/**
 * The month boundary nearest `time`.
 *
 * MONTH precision, deliberately: the chart's own axis is months or years, the
 * levels change on month boundaries in every fixture anybody has shown it, and
 * a readout that said "14 March" while the picture only resolves months would
 * be claiming precision the chart has not got. It also makes the hover land on
 * the same dates a consumer would create a mutation at, which is the point of
 * `onPick`.
 */
export const snapToMonth = (time: number): number => {
  const at = new Date(time);
  const start = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1);
  const next = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
  return time - start <= next - time ? start : next;
};

/** `Jul 2025` — the readout's own header. Short, and month-precise like the snap. */
export const monthLabelOf = (at: TimeValue): string => {
  const on = new Date(timeOf(at));
  return `${MONTH_LABELS[on.getUTCMonth()]} ${on.getUTCFullYear()}`;
};

/**
 * `2025-Q3` — the axis's quarter label, and the only place this format lives.
 *
 * Exported because a consumer showing dates BESIDE this chart has to agree
 * with its axis or the two read as different clocks: the scenario board's
 * as-of chips say `2025-Q3 · Jul`, and were reimplementing this format from
 * the inside of `quarterTicks` because there was nothing to call.
 */
export const quarterLabelOf = (at: TimeValue): string => {
  const on = new Date(timeOf(at));
  return `${on.getUTCFullYear()}-Q${Math.floor(on.getUTCMonth() / 3) + 1}`;
};

/** Everything the hover readout needs, from one pointer x. */
export interface Hover {
  /** The snapped date. This is also what `onPick` reports. */
  readonly at: number;
  /** Where the crosshair is drawn — the snapped date's own x, not the pointer's. */
  readonly x: number;
  readonly rows: readonly LevelRow[];
}

/**
 * A PICK STRATEGY: how a raw pointer moment becomes the date a click reports
 * (Peter, 2026-09-24: "The base chart should register the create-at-click
 * strategy … make it so we can pass in the click function"). Pure, and it
 * must return a moment INSIDE `domain`.
 *
 * Only one ships, `pickDay`. A month-start or cluster-to-a-start-date strategy
 * is a later feature; it is one more function of this shape, not a new prop.
 */
export type PickStrategy = (raw: number, domain: TimeDomain) => number;

/**
 * THE WHOLE-DAY PICK: the UTC day the pointer is over — its midnight, floored
 * rather than rounded, so a click anywhere in a day's column is that day —
 * clamped to the domain.
 */
export const pickDay: PickStrategy = (raw, domain) =>
  clamp(
    Math.floor(raw / DAY_MS) * DAY_MS,
    timeOf(domain[0]),
    timeOf(domain[1]),
  );

/**
 * The fallback when no strategy is passed: the nearest month start, clamped.
 *
 * @deprecated Pass a pick strategy (`pickAt`, e.g. `pickDay`). This is what
 * every chart did before strategies existed, kept so that no existing caller
 * changes behaviour silently; it goes once they have all chosen one.
 */
export const pickNearestMonth: PickStrategy = (raw, domain) =>
  clamp(snapToMonth(raw), timeOf(domain[0]), timeOf(domain[1]));

/**
 * Resolve a pointer x into a hover. The crosshair sits at the PICKED date's
 * x, not under the pointer — the same date a click would report, so the rule
 * never promises a spot the click then moves, and never lands in a gap the
 * table does not describe.
 */
export const hoverAt = (
  levels: readonly Level[],
  domain: TimeDomain,
  x: number,
  frame: Frame = DEFAULT_FRAME,
  pick: PickStrategy = pickNearestMonth,
): Hover => {
  const at = pick(timeAtX(domain, x, frame), domain);
  return { at, x: xScaleFor(domain, frame)(at), rows: levelsAt(levels, at) };
};
