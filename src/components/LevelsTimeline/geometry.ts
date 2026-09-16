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

/** The month axis, below the plot. */
export const AXIS_TICK_LENGTH = 4;
export const AXIS_LABEL_Y = PLOT_BOTTOM + 20;

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
): readonly Flag[] =>
  map(
    (mutation: Mutation) => placeFlag(mutation, xScale(mutation.at)),
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

const placeFlag = (mutation: Mutation, x: number): Flag => {
  const boxX = clamp(x - FLAG_BOX_WIDTH / 2, 0, VIEW_WIDTH - FLAG_BOX_WIDTH);
  return {
    id: mutation.id,
    label: mutation.label,
    x,
    ruleTop: FLAG_RULE_TOP,
    ruleBottom: PLOT_BOTTOM,
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
export type FlowKind = "move" | "departure" | "hire";

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
  /** 1-based position in the CONSUMER's order — the `--sui-series-N` index. */
  readonly seriesIndex: number;
  readonly spans: readonly RailSpan[];
  /** The closed bands this rail paints as — one per contiguous stretch. */
  readonly runs: readonly BandRun[];
  /** Where the level's own short label sits. `undefined` if nobody holds it. */
  readonly labelAt?: Point;
  /** True when the first band is tall enough to carry its label INSIDE it. */
  readonly labelInside: boolean;
}

/** A thin rule at a change no numbered flag already marks. */
export interface Dropline {
  readonly key: string;
  readonly x: number;
}

export interface LevelsRailGeometry {
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
/** Headroom above and below the outermost levels, as a fraction of their span. */
export const Y_PAD_FRACTION = 0.12;
/** The half-height a FLAT chart is opened up to, where a fraction gives zero. */
export const FLAT_Y_PAD = 1;

/** The plot's height — the space the stack is laid out in. */
export const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

/**
 * The width that fills a good fraction of the plot at the busiest moment.
 * Sized from the PEAK TOTAL headcount rather than the biggest single level: it
 * is all the bands together that occupy the plot.
 */
export const fillWidth = (peak: number): number =>
  peak <= 0 ? 0 : (PLOT_HEIGHT * FILL_FRACTION) / peak;

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
 * Thickness per person: the smaller of the two answers. See the header — the
 * fill width alone would smear close levels together, and the adjacency width
 * alone would draw a sparse chart in hairlines.
 */
export const perPersonWidth = (
  levels: readonly Level[],
  yScale: (value: number) => number,
  peak: number,
): number => Math.min(fillWidth(peak), adjacencyWidth(levels, yScale));

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
 * Split a rail's spans into contiguous runs. A level that empties and comes
 * back is two separate bands, not one band with a pinch — the gap is real, and
 * drawing across it would invent a headcount nobody held.
 */
const contiguousRuns = (
  spans: readonly RailSpan[],
): readonly (readonly RailSpan[])[] => {
  const runs: RailSpan[][] = [];
  for (const span of spans) {
    const current = runs[runs.length - 1];
    const previous = current?.[current.length - 1];
    if (
      previous !== undefined &&
      Math.abs(previous.x2 - span.x1) < CONTIGUITY_EPSILON
    ) {
      current.push(span);
      continue;
    }
    runs.push([span]);
  }
  return runs;
};

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

/** A rail as closed bands, one per contiguous run, with blunt ends. */
export const railRuns = (spans: readonly RailSpan[]): readonly BandRun[] =>
  map(bandRunFor, contiguousRuns(spans));

const bandRunFor = (run: readonly RailSpan[]): BandRun => {
  const halves = taperHalves(run);
  const tapers = map(
    (span: RailSpan, index: number) => ({
      x: span.x2,
      half: halves[index],
      widthBefore: span.width,
      widthAfter: run[index + 1].width,
    }),
    run.slice(0, run.length - 1),
  );

  /** `edge` picks top or bottom; both are walked left to right. */
  const edgeFor = (pick: (span: RailSpan) => number): readonly EdgePoint[] => {
    const points: EdgePoint[] = [
      { x: run[0].x1, y: pick(run[0]), curved: false },
    ];
    for (const [index, span] of run.slice(0, run.length - 1).entries()) {
      const half = halves[index];
      points.push({ x: span.x2 - half, y: pick(span), curved: false });
      points.push({
        x: span.x2 + half,
        y: pick(run[index + 1]),
        curved: true,
      });
    }
    const last = run[run.length - 1];
    points.push({ x: last.x2, y: pick(last), curved: false });
    return points;
  };

  return {
    path: bandPath(edgeFor(spanTop), edgeFor(spanBottom)),
    tapers,
  };
};

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
  /** Token index of the source level — the left end of the gradient. */
  readonly fromSeriesIndex?: number;
  /** Token index of the destination level — the right end of the gradient. */
  readonly toSeriesIndex?: number;
}

/** A root slice on a band's edge: [top, bottom]. */
type Root = readonly [number, number];

const sameX = (a: number, b: number): boolean =>
  Math.abs(a - b) < CONTIGUITY_EPSILON;

/**
 * Allocate contiguous root slices along one edge of a band.
 *
 * This is the Sankey trick, and the reason a four-way fan does not tangle:
 * slices are laid down in the order of the OTHER end's position. Flows heading
 * up stack downwards from the top edge, topmost destination first; flows
 * heading down stack upwards from the bottom edge. Two flows leaving one band
 * at one moment therefore cannot cross on the way out.
 */
const allocate = (
  from: number,
  direction: 1 | -1,
  widths: readonly number[],
): readonly Root[] => {
  const roots: Root[] = [];
  let cursor = from;
  for (const width of widths) {
    const next = cursor + direction * width;
    roots.push(direction === 1 ? [cursor, next] : [next, cursor]);
    cursor = next;
  }
  return roots;
};

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

/**
 * Every flow as a band. Roots are taken from the bands' own edges, so a flow's
 * width at each end is exactly the width its rail loses or gains there — the
 * two shapes share their boundary points rather than being computed apart and
 * hoped to line up.
 *
 * A flow with an open end is a level stub: same width along its whole length,
 * running out of the band that is ending or into the one that is starting. It
 * is the GRADIENT that says which — fading out for a departure, in for a hire
 * — because the shape alone cannot, and a stub that wandered off somewhere
 * would imply a destination the chart does not have.
 */
export const flowBands = (
  transfers: readonly Transfer[],
  rails: readonly Rail[],
  xScale: (at: TimeValue) => number,
  perPerson: number,
): readonly FlowBand[] => {
  const railById = new Map(
    map((rail: Rail) => [rail.id, rail] as const, rails),
  );
  const ordered = sortBy((one: Transfer) => timeOf(one.at), transfers);
  const moments = sortBy(
    (time: number) => time,
    [...new Set(map((one: Transfer) => timeOf(one.at), ordered))],
  );
  const half = transitionWidth() / 2;
  const bands: FlowBand[] = [];

  for (const moment of moments) {
    const x = xScale(moment);
    const here = filter((one: Transfer) => timeOf(one.at) === moment, ordered);
    const srcRoot = new Map<number, Root>();
    const dstRoot = new Map<number, Root>();

    /** Where a band sits just before / just after this x. */
    const endingAt = (rail: Rail) =>
      find((span: RailSpan) => sameX(span.x2, x), rail.spans);
    const startingAt = (rail: Rail) =>
      find((span: RailSpan) => sameX(span.x1, x), rail.spans);
    const centreOf = (id: string | undefined, fallback: number): number => {
      const rail = id === undefined ? undefined : railById.get(id);
      return rail === undefined ? fallback : rail.y;
    };

    for (const rail of rails) {
      const before = endingAt(rail);
      const after = startingAt(rail);
      const mine = (index: number, side: "from" | "to"): boolean =>
        here[index][side] === rail.id;
      const indices = map((_one: Transfer, index: number) => index, here);
      const myCentre = rail.y;
      /** An open end has no band to aim at, so it keeps its own side. */
      const otherCentre = (index: number, leaving: boolean): number =>
        centreOf(
          leaving ? here[index].to : here[index].from,
          leaving ? myCentre + 1 : myCentre - 1,
        );
      const widthOf = (index: number): number =>
        bandWidth(here[index].count, perPerson);

      const leaving = filter((i: number) => mine(i, "from"), indices);
      const arriving = filter((i: number) => mine(i, "to"), indices);
      const outUp = sortBy(
        (i: number) => otherCentre(i, true),
        filter((i: number) => otherCentre(i, true) < myCentre, leaving),
      );
      const outDown = sortBy(
        (i: number) => -otherCentre(i, true),
        filter((i: number) => otherCentre(i, true) >= myCentre, leaving),
      );
      const inTop = sortBy(
        (i: number) => otherCentre(i, false),
        filter((i: number) => otherCentre(i, false) < myCentre, arriving),
      );
      const inBottom = sortBy(
        (i: number) => -otherCentre(i, false),
        filter((i: number) => otherCentre(i, false) >= myCentre, arriving),
      );

      const write = (
        target: Map<number, Root>,
        order: readonly number[],
        roots: readonly Root[],
      ): void => {
        for (const [slot, index] of order.entries())
          target.set(index, roots[slot]);
      };
      write(
        srcRoot,
        outUp,
        allocate(
          before === undefined ? myCentre : spanTop(before),
          1,
          map(widthOf, outUp),
        ),
      );
      write(
        srcRoot,
        outDown,
        allocate(
          before === undefined ? myCentre : spanBottom(before),
          -1,
          map(widthOf, outDown),
        ),
      );
      write(
        dstRoot,
        inTop,
        allocate(
          after === undefined ? myCentre : spanTop(after),
          1,
          map(widthOf, inTop),
        ),
      );
      write(
        dstRoot,
        inBottom,
        allocate(
          after === undefined ? myCentre : spanBottom(after),
          -1,
          map(widthOf, inBottom),
        ),
      );
    }

    for (const [index, one] of here.entries()) {
      const hasFrom = one.from !== undefined && railById.has(one.from);
      const hasTo = one.to !== undefined && railById.has(one.to);
      if (!hasFrom && !hasTo) continue;
      const kind: FlowKind =
        hasFrom && hasTo ? "move" : hasFrom ? "departure" : "hire";
      // A stub keeps the width and the height of the end it does have.
      const src = srcRoot.get(index) ?? dstRoot.get(index);
      const dst = dstRoot.get(index) ?? srcRoot.get(index);
      if (src === undefined || dst === undefined) continue;
      bands.push({
        key: `${one.from ?? "out"}-${one.to ?? "out"}-${moment}`,
        kind,
        count: one.count,
        x0: x - half,
        x1: x + half,
        srcTop: src[0],
        srcBottom: src[1],
        dstTop: dst[0],
        dstBottom: dst[1],
        path: flowPath(x - half, x + half, src, dst),
        fromSeriesIndex: hasFrom
          ? railById.get(one.from as string)?.seriesIndex
          : undefined,
        toSeriesIndex: hasTo
          ? railById.get(one.to as string)?.seriesIndex
          : undefined,
      });
    }
  }
  return bands;
};

// ── placing the levels ───────────────────────────────────────────────────────

/** Every level's value, padded. Never zero-height, never NaN. */
export const valueDomainOf = (
  levels: readonly Level[],
): readonly [number, number] => {
  if (levels.length === 0) return [0, 1];
  const values = map((level: Level) => level.value, levels);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const pad = span === 0 ? FLAT_Y_PAD : span * Y_PAD_FRACTION;
  return [lo - pad, hi + pad];
};

/** Value → y, inverted (the domain top sits at the plot top). */
export const yScaleFor = (
  yDomain: readonly [number, number],
): ((value: number) => number) => {
  const [lo, hi] = yDomain;
  const span = hi - lo;
  const middle = (PLOT_TOP + PLOT_BOTTOM) / 2;
  if (span <= 0) return () => middle;
  return (value: number): number =>
    PLOT_BOTTOM - clamp((value - lo) / span, 0, 1) * PLOT_HEIGHT;
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
): readonly RailSpan[] => {
  if (level.points.length === 0) return [];
  const ordered = sortBy((point: CountPoint) => timeOf(point.at), level.points);
  const y = yScale(level.value);
  const spans: RailSpan[] = [];
  for (const [index, point] of ordered.entries()) {
    if (point.count <= 0) continue;
    const next = ordered[index + 1];
    spans.push({
      levelId: level.id,
      x1: xScale(point.at),
      x2: xScale(next === undefined ? domainEnd : next.at),
      y,
      count: point.count,
      width: bandWidth(point.count, perPerson),
    });
  }
  return spans;
};

/** A band this tall can carry its label inside it and still be legible. */
export const RAIL_LABEL_MIN_HEIGHT = 13;
/** Clearance between a band's top edge and a label sitting above it. */
export const RAIL_LABEL_GAP = 4;
/** How far in from a band's left end its label starts. */
export const RAIL_LABEL_INSET = 4;

/**
 * Where a level's own short label goes.
 *
 * Inside the band when the band is tall enough to hold it, and just above the
 * band when it is not. A fat band with its label floating above it reads as a
 * label for the gap; a thin band with its label inside it is illegible. The
 * threshold is the band's height, so the same chart can do both at once —
 * which it does, because that is exactly what varying thickness means.
 */
const railLabelAt = (
  spans: readonly RailSpan[],
): { at: Point; inside: boolean } | undefined => {
  const first = spans[0];
  if (first === undefined) return undefined;
  const inside = first.width >= RAIL_LABEL_MIN_HEIGHT;
  return {
    at: {
      x: first.x1 + RAIL_LABEL_INSET,
      y: inside ? first.y : spanTop(first) - RAIL_LABEL_GAP,
    },
    inside,
  };
};

/** The whole rail observation: scales resolved, bands, flows, rules, flags. */
export const levelsRailGeometry = (input: {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
  readonly domain: TimeDomain;
}): LevelsRailGeometry => {
  const xScale = xScaleFor(input.domain);
  const yDomain = valueDomainOf(input.levels);
  const yScale = yScaleFor(yDomain);
  const peak = peakHeadcount(input.levels);
  const perPerson = perPersonWidth(input.levels, yScale, peak);
  const rails = map((level: Level, index: number) => {
    const spans = railSpans(level, xScale, yScale, input.domain[1], perPerson);
    const label = railLabelAt(spans);
    return {
      id: level.id,
      label: level.label,
      value: level.value,
      y: yScale(level.value),
      seriesIndex: index + 1,
      spans,
      runs: railRuns(spans),
      labelAt: label?.at,
      labelInside: label?.inside ?? false,
    };
  }, input.levels);
  return {
    yDomain,
    peak,
    perPerson,
    rails,
    flows: flowBands(input.transfers, rails, xScale, perPerson),
    droplines: droplinePositions(
      input.levels,
      input.transfers,
      input.mutations,
      input.domain,
      xScale,
    ),
    flags: flagPositions(input.mutations, xScale),
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
