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
// A level sits at its own pay — y is proportional to `value`, as an axis
// should be — and the band drawn there is as THICK as the headcount holding
// it. Those two facts fight each other, and the fight is resolved here rather
// than left to the consumer.
//
// Thickness wants to be generous: the whole point of the picture is that you
// can see a level fatten and thin, and a hairline cannot say that. But two pay
// levels close together have very little room between them, and bands that
// overlap turn the chart into a smear.
//
// So `perPersonWidth` is the SMALLER of two answers: the width that would fill
// a good fraction of the plot at the busiest moment, and the width at which the
// tightest pair of adjacent levels still clears a margin. The second is what
// stops a $9k and a $9.5k rail from merging; the first is what stops a sparse
// chart from being drawn in hairlines. Neither alone is right.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The chart does NO arithmetic on the consumer's counts beyond the width
//     scale and the stack. It never sums a level, never derives a headcount
//     from the transfers, and never reconciles the two against each other. If
//     a transfer says two people moved and the counts disagree, it draws both
//     — the disagreement is the consumer's to see, not this file's to hide.
//   • A count point is "from `at`, hold `count`". BEFORE a level's first
//     point, NOTHING is drawn: the chart will not invent a headcount it was
//     not given, so a level that appears mid-domain simply begins mid-plot.
//   • Times outside the domain are CLAMPED to it rather than painted
//     off-canvas, and every degenerate input (a zero-width time domain, no
//     levels at all, a level with no points) resolves to a finite number
//     rather than NaN.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { monthlyCells } from "../DateAxis/cells";
import { filter, find, join, map, sortBy, sum } from "../../fn";

/** A moment, as the consumer prefers to express it. */
export type TimeValue = Date | number;

/** The visible time span. The consumer's, never derived from the data. */
export type TimeDomain = readonly [TimeValue, TimeValue];

/** A numbered event: a flag above the plot and a rule dropped through it. */
export interface Mutation {
  readonly id: string;
  readonly at: TimeValue;
  /** The flag's own text — short by construction, e.g. "1". */
  readonly label: string;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A mutation, placed: the rule's x and the box the number sits in. */
export interface Flag {
  readonly id: string;
  readonly label: string;
  /** Where the rule falls, and the centre the box is hung from. */
  readonly x: number;
  readonly ruleTop: number;
  readonly ruleBottom: number;
  /** The box, nudged so it stays on the canvas at either edge. */
  readonly boxX: number;
  readonly boxY: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** Where the number's text sits — the box's centre. */
  readonly textX: number;
  readonly textY: number;
}

/** One month boundary on the bottom axis. */
export interface MonthTick {
  readonly key: string;
  readonly label: string;
  readonly x: number;
}

// ── the canvas ───────────────────────────────────────────────────────────────
// ONE size, deliberately (SUI: start with one, expand only on demand). A
// consumer scales the chart by sizing its box; the viewBox does the rest.

export const VIEW_WIDTH = 640;
export const VIEW_HEIGHT = 232;

/** The flag band, above the plot: the boxed numbers live here. */
export const FLAG_BOX_WIDTH = 18;
export const FLAG_BOX_HEIGHT = 16;
export const FLAG_BOX_TOP = 6;
/** A rule starts at the bottom of its flag box and drops through the plot. */
export const FLAG_RULE_TOP = FLAG_BOX_TOP + FLAG_BOX_HEIGHT;

/** The plot proper. */
export const PLOT_LEFT = 14;
export const PLOT_RIGHT = VIEW_WIDTH - 14;
export const PLOT_TOP = 36;
export const PLOT_BOTTOM = 190;
/**
 * The band below the plot that the axis lives in. Fixed in viewBox units, so
 * tick text stays the same size whatever height the chart is given.
 */
export const AXIS_BAND = VIEW_HEIGHT - PLOT_BOTTOM;
/** Below this there is no plot left to speak of, only chrome. */
export const MIN_VIEW_HEIGHT = 120;

/** The month axis, below the plot. */
export const AXIS_TICK_LENGTH = 4;
export const AXIS_LABEL_Y = PLOT_BOTTOM + 20;

/**
 * Headroom kept at the top and bottom of the plot, as a fraction of its
 * height, for the outermost bands to grow into.
 *
 * This is a fraction of the PLOT, not of the value span, and that is the whole
 * point. Padding the value domain — the obvious thing, and what this did at
 * first — reserves an amount of y that depends on the consumer's pay figures,
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
  readonly viewHeight: number;
  readonly plotBottom: number;
  readonly plotHeight: number;
  readonly axisLabelY: number;
  readonly bandInset: number;
}

export const frameFor = (viewHeight: number): Frame => {
  const height = Math.max(MIN_VIEW_HEIGHT, viewHeight);
  const plotBottom = height - AXIS_BAND;
  const plotHeight = plotBottom - PLOT_TOP;
  return {
    viewHeight: height,
    plotBottom,
    plotHeight,
    axisLabelY: plotBottom + 20,
    bandInset: plotHeight * BAND_INSET_FRACTION,
  };
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
export const xScaleFor = (domain: TimeDomain): ((at: TimeValue) => number) => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const span = end - start;
  if (span <= 0) return () => PLOT_LEFT;
  return (at: TimeValue): number => {
    const fraction = (timeOf(at) - start) / span;
    return PLOT_LEFT + clamp(fraction, 0, 1) * (PLOT_RIGHT - PLOT_LEFT);
  };
};

/** The numbered flags and their rules, in time order. */
export const flagPositions = (
  mutations: readonly Mutation[],
  xScale: (at: TimeValue) => number,
  frame: Frame = DEFAULT_FRAME,
): readonly Flag[] =>
  map(
    (mutation: Mutation) => placeFlag(mutation, xScale(mutation.at), frame),
    sortBy((mutation: Mutation) => timeOf(mutation.at), mutations),
  );

/**
 * One tick per month boundary in the domain. Built from DateAxis's own
 * `monthlyCells`, so the chart and the axis component agree on where a month
 * starts rather than each keeping its own calendar.
 */
export const monthTicks = (
  domain: TimeDomain,
  xScale: (at: TimeValue) => number,
): readonly MonthTick[] =>
  map(
    (cell: { start: Date }) => ({
      key: cell.start.toISOString(),
      label: MONTH_LABELS[cell.start.getUTCMonth()],
      x: xScale(cell.start),
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

const placeFlag = (mutation: Mutation, x: number, frame: Frame): Flag => {
  const boxX = clamp(x - FLAG_BOX_WIDTH / 2, 0, VIEW_WIDTH - FLAG_BOX_WIDTH);
  return {
    id: mutation.id,
    label: mutation.label,
    x,
    ruleTop: FLAG_RULE_TOP,
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
// The RAIL model — a line is a pay LEVEL, and the chart is a Sankey.
//
// A rail is a filled band whose THICKNESS is the headcount holding that level.
// The bands are STACKED, ordered by pay with the highest on top, separated by
// a fixed gap, and the stack is recomputed at every change — so a band's
// vertical position drifts as the ones around it thicken and thin, the way a
// stream chart's do. People moving between levels are FLOWS: wide translucent
// ribbons that leave one band's edge and arrive at another's, graduating from
// the source's colour to the destination's along the way.
//
// WIDTH CONSERVATION is exact and unconditional. The width scale is purely
// proportional — `count × perPerson`, with no floor — so
//
//     bandWidth(a) − bandWidth(c) === bandWidth(a − c)
//
// for every a and c, including a rail emptying to nothing. (An earlier version
// had an affine scale with a MIN_STROKE floor so that one person stayed
// visible on a hundred-person chart. That floor could not be conserved — it
// would be counted once per band — and it is no longer needed: `perPerson` is
// now sized so the whole stack fills most of the plot, which makes one person
// visibly wide by construction.)
// ============================================================================

/** "From `at`, hold `count` people at this level." */
export interface CountPoint {
  readonly at: TimeValue;
  readonly count: number;
}

/** One pay level: a band in the stack, thickening and thinning over time. */
export interface Level {
  readonly id: string;
  readonly label: string;
  /** The pay. Decides RANK in the stack — highest on top — and the label. */
  readonly value: number;
  readonly points: readonly CountPoint[];
}

/**
 * People moving at one moment, drawn as a flow.
 *
 * Both ends are OPTIONAL, and which ones are present is what the flow means:
 *
 *   • `from` and `to`  — a move between two levels. A raise.
 *   • `from` only      — a DEPARTURE: they left the system. The ribbon runs
 *                        out of the band's end and fades to nothing.
 *   • `to` only        — a HIRE: they joined from outside. The ribbon fades in
 *                        and arrives at the band's start.
 *   • neither          — nothing to draw; dropped.
 *
 * Optional ends are what let headcount be CONSERVED: every change in a band's
 * thickness has a matching flow, so a reader never sees a band thin with
 * nothing leaving it. A silent count drop is the one thing this chart must not
 * show, because it reads as a mistake.
 */
export interface Transfer {
  readonly at: TimeValue;
  /** Source level id. Absent means they joined from outside the system. */
  readonly from?: string;
  /** Destination level id. Absent means they left the system. */
  readonly to?: string;
  readonly count: number;
}

/** What a flow means, decided by which of its two ends are present. */
/**
 * What a flow is. The last two are both "the people who did not move", split
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
  | "hire"
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
  /** The largest TOTAL headcount at any one moment — one half of the width scale. */
  readonly peak: number;
  /** Thickness per person, after both caps. */
  readonly perPerson: number;
  readonly rails: readonly Rail[];
  readonly flows: readonly FlowBand[];
  readonly droplines: readonly Dropline[];
  readonly flags: readonly Flag[];
  readonly ticks: readonly MonthTick[];
}

/** How much of the plot's height the bands fill at the busiest moment. */
export const FILL_FRACTION = 0.6;
/** Clear air left between two adjacent levels' bands at their fattest. */
export const BAND_MARGIN = 4;

/** The plot's height — the space the stack is laid out in. */


/**
 * The width that fills a good fraction of the plot at the busiest moment.
 * Sized from the PEAK TOTAL headcount rather than the biggest single level: it
 * is all the bands together that occupy the plot.
 */
export const fillWidth = (peak: number, frame: Frame): number =>
  peak <= 0 ? 0 : (frame.plotHeight * FILL_FRACTION) / peak;

/**
 * The width at which the TIGHTEST pair of adjacent levels still clears
 * `BAND_MARGIN` between them, at their own fattest.
 *
 * Adjacent means next to each other in pay, which is the only pair that can
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
    const room = gap - BAND_MARGIN;
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
    const room = Math.min(y - PLOT_TOP, frame.plotBottom - y) - BAND_MARGIN;
    limits.push((2 * Math.max(0, room)) / most);
  }
  return limits.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...limits);
};

/**
 * Thickness per person: the smallest of three answers. See the header — the
 * fill width alone would smear close levels together and overrun the frame,
 * and either cap alone would draw a sparse chart in hairlines.
 */
export const perPersonWidth = (
  levels: readonly Level[],
  yScale: (value: number) => number,
  peak: number,
  frame: Frame,
): number =>
  Math.min(
    fillWidth(peak, frame),
    adjacencyWidth(levels, yScale),
    edgeWidth(levels, yScale, frame),
  );

/** A band's thickness. Purely proportional, so conservation is exact. */
export const bandWidth = (count: number, perPerson: number): number =>
  Math.max(0, count) * perPerson;

/** The largest total headcount at any one moment. */
export const peakHeadcount = (levels: readonly Level[]): number => {
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
export const transitionWidth = (): number =>
  clamp(
    (PLOT_RIGHT - PLOT_LEFT) * TRANSITION_FRACTION,
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
 * A cubic with HORIZONTAL tangents at both ends: both control points sit at
 * their own endpoint's y, half the span apart in x. That is the whole of the
 * Sankey look — a band leaves flat and arrives flat, so it blends into a
 * horizontal rail instead of meeting it at an angle.
 *
 * Because the construction is symmetric, the same two points traversed the
 * other way give the mirror-image curve — which is what lets a band's bottom
 * edge be walked backwards to close the shape.
 */
export const hCurve = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string => {
  const mid = (x0 + x1) / 2;
  return `C ${round3(mid)} ${round3(y0)}, ${round3(mid)} ${round3(y1)}, ${round3(x1)} ${round3(y1)}`;
};

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
 * headcount dwindled when it did not.
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
  /** Source level id. Absent on a hire. */
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
 * every change — it is the people who did not move, drawn as the flow they
 * are. Without it a rail with one person leaving out of four would show three
 * people vanishing into the gap and reappearing after it.
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
  perPerson: number,
  half: number,
  /** Every moment anything changes — a band stops and restarts at each. */
  moments: readonly number[],
  frame: Frame = DEFAULT_FRAME,
): readonly FlowBand[] => {
  const railById = new Map(map((rail: Rail) => [rail.id, rail] as const, rails));
  const ordered = sortBy((one: Transfer) => timeOf(one.at), transfers);
  const bands: FlowBand[] = [];

  for (const moment of moments) {
    const x = xScale(moment);
    const x0 = x - half;
    const x1 = x + half;
    const here = filter((one: Transfer) => timeOf(one.at) === moment, ordered);
    /** The band that stops at this change, and the one that starts after it. */
    const before = (rail: Rail) =>
      find((span: RailSpan) => Math.abs(span.x2 - x0) < CONTIGUITY_EPSILON, rail.spans);
    const after = (rail: Rail) =>
      find((span: RailSpan) => Math.abs(span.x1 - x1) < CONTIGUITY_EPSILON, rail.spans);

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
      const widthOf = (i: number) => bandWidth(here[i].count, perPerson);
      const otherY = (i: number, leaving: boolean, fallback: number): number => {
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
        hasFrom && hasTo ? "move" : hasFrom ? "departure" : "hire";
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


/** The levels' own range. No padding — the inset does that job now. */
export const valueDomainOf = (
  levels: readonly Level[],
): readonly [number, number] => {
  if (levels.length === 0) return [0, 1];
  const values = map((level: Level) => level.value, levels);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? [lo - 1, hi + 1] : [lo, hi];
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
  const top = PLOT_TOP + frame.bandInset;
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
  perPerson: number,
  half: number,
  /** Every moment anything changes ANYWHERE on the chart. */
  moments: readonly number[],
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
      x1: from <= PLOT_LEFT ? PLOT_LEFT : from + half,
      x2: to >= PLOT_RIGHT ? PLOT_RIGHT : to - half,
      y,
      count,
      width: bandWidth(count, perPerson),
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
export const transitionHalf = (changeXs: readonly number[]): number => {
  const stops = sortBy(
    (x: number) => x,
    [PLOT_LEFT, ...changeXs, PLOT_RIGHT],
  );
  const gaps: number[] = [];
  for (const [index, x] of stops.entries()) {
    const next = stops[index + 1];
    if (next !== undefined && next > x) gaps.push(next - x);
  }
  const room = gaps.length === 0 ? PLOT_RIGHT - PLOT_LEFT : Math.min(...gaps);
  return Math.min(transitionWidth() / 2, (room / 2) * 0.9);
};

// Peter, 2026-09-16: "don't label the series directly on the plot." There is
// no text inside the plot area at all now — only the axis ticks below it and
// the numbered flags above. A level's identity is its COLOUR, the
// announcement, and whatever the consumer puts outside the chart. The pay
// figure is still in `Level.label`, unpainted, for a legend to use.

/** The whole rail observation: scales resolved, bands, flows, rules, flags. */
export const levelsRailGeometry = (input: {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
  readonly domain: TimeDomain;
  /** The viewBox height to lay out in. Omitted = the width-driven default. */
  readonly viewHeight?: number;
}): LevelsRailGeometry => {
  const frame = frameFor(input.viewHeight ?? VIEW_HEIGHT);
  const xScale = xScaleFor(input.domain);
  const yDomain = valueDomainOf(input.levels);
  const yScale = yScaleFor(yDomain, frame);
  const peak = peakHeadcount(input.levels);
  const perPerson = perPersonWidth(input.levels, yScale, peak, frame);
  const moments = changeTimes(input.levels, input.transfers);
  const half = transitionHalf(map((time: number) => xScale(time), moments));
  const rails = map((level: Level) => {
    const spans = railSpans(
      level,
      xScale,
      yScale,
      input.domain[1],
      perPerson,
      half,
      moments,
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
    perPerson,
    rails,
    flows: flowBands(
      input.transfers,
      rails,
      xScale,
      perPerson,
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
    ticks: axisTicks(input.domain, xScale),
  };
};

// ── the axis ─────────────────────────────────────────────────────────────────

/**
 * Longest span, in months, that still gets a tick per month. Past this the
 * axis switches to one tick per YEAR: sixty-one month labels in the width of a
 * card is not an axis, it is a grey stripe.
 */
export const MONTHLY_TICK_LIMIT = 18;

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
): readonly MonthTick[] =>
  monthlyCells(asDate(domain[0]), asDate(domain[1])).length > MONTHLY_TICK_LIMIT
    ? yearTicks(domain, xScale)
    : monthTicks(domain, xScale);

// ── hover and pick ───────────────────────────────────────────────────────────

/** One row of the hover readout: what a level held at the hovered date. */
export interface LevelRow {
  readonly levelId: string;
  readonly label: string;
  readonly value: number;
  readonly count: number;
}

/**
 * What every level held at one moment, highest pay first, empties omitted.
 *
 * Ordered by pay rather than by the consumer's own order because the reader is
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
export const timeAtX = (domain: TimeDomain, x: number): number => {
  const start = timeOf(domain[0]);
  const end = timeOf(domain[1]);
  const span = end - start;
  if (span <= 0) return start;
  const fraction = clamp(
    (x - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT),
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
export const monthLabelOf = (time: number): string => {
  const at = new Date(time);
  return `${MONTH_LABELS[at.getUTCMonth()]} ${at.getUTCFullYear()}`;
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
 * Resolve a pointer x into a hover. The crosshair sits at the SNAPPED date's
 * x, not under the pointer: a rule that lands between two months would invite
 * the reader to believe the table describes the gap.
 */
export const hoverAt = (
  levels: readonly Level[],
  domain: TimeDomain,
  x: number,
): Hover => {
  const at = clamp(
    snapToMonth(timeAtX(domain, x)),
    timeOf(domain[0]),
    timeOf(domain[1]),
  );
  return { at, x: xScaleFor(domain)(at), rows: levelsAt(levels, at) };
};
