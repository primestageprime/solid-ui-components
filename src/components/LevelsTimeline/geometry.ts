// ============================================
// LevelsTimeline geometry — pure, headless, no SVG node, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as RateGauge/geometry.ts and
// BandRail/bands.tsx): `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `Geometry.tsx` here would
// register as a new component owing its own depth header and its own showcase.
//
// EVERY number the chart paints is decided in this file, so the whole shape is
// readable as a table without a browser (geometry.test.ts prints one: the value
// domain, the per-span widths, the ribbon extents and the change-x list). The
// component does nothing but hand these strings and points to the DOM.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The chart does NO arithmetic on the consumer's counts beyond the width
//     scale. It never sums a level, never derives a headcount from the
//     transfers, and never reconciles the two against each other. If a
//     transfer says two people moved and the counts disagree, it draws both —
//     the disagreement is the consumer's to see, not this file's to hide.
//   • A count point is "from `at`, hold `count`". BEFORE a level's first
//     point, NOTHING is drawn: the chart will not invent a headcount it was
//     not given, so a level that appears mid-domain simply begins mid-plot.
//   • A LEVEL IS KEYED BY ITS `value`, and `value` IS ITS y. Two levels with
//     the same value are therefore drawn on top of each other. That is the
//     consumer's constraint to satisfy — either one chart per group, as the
//     bench does with its three tracks, or values that are already distinct
//     across the whole chart. There is no group dimension in this API; see the
//     /promote questions for whether there should be.
//   • Times outside the domain are CLAMPED to it rather than painted
//     off-canvas, and every degenerate input (a zero-width time domain, a
//     flat value domain, no levels at all, a level with no points) resolves to
//     a finite number rather than NaN.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { monthlyCells } from "../DateAxis/cells";
import { filter, map, sortBy } from "../../fn";

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

/**
 * How much headroom the y-domain gets above and below the extremes, as a
 * fraction of their span — so no line is painted along the frame itself.
 */
export const Y_PAD_FRACTION = 0.12;
/** The half-height a FLAT chart is opened up to, where a fraction gives zero. */
export const FLAT_Y_PAD = 1;

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

/** Level → y, inverted (the domain top sits at the plot top). */
export const yScaleFor = (
  yDomain: readonly [number, number],
): ((level: number) => number) => {
  const [lo, hi] = yDomain;
  const span = hi - lo;
  const middle = (PLOT_TOP + PLOT_BOTTOM) / 2;
  if (span <= 0) return () => middle;
  return (level: number): number =>
    PLOT_BOTTOM - clamp((level - lo) / span, 0, 1) * (PLOT_BOTTOM - PLOT_TOP);
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
  const boxX = clamp(
    x - FLAG_BOX_WIDTH / 2,
    0,
    VIEW_WIDTH - FLAG_BOX_WIDTH,
  );
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
// The RAIL model (Peter, 2026-09-16) — a line is a pay LEVEL, not a person.
//
// This REPLACED a stepped model in which y moved and thickness was constant —
// a person's pay stepping up. That path was carried alongside this one until
// its last consumer (scenario-board) migrated, then deleted in one commit.
// The difference was in what VARIES along a line: there, y; here, thickness.
// A pay level does not go anywhere; what changes is how many people hold it.
//
// So a rail has no risers at all. It is a run of horizontal SPANS at one y,
// each as thick as the headcount holding that level over that stretch. People
// moving between levels are not a step in either line — they are a FLOW, drawn
// as a ribbon from the source rail to the destination rail at the moment of
// the move, on the same width scale, so the lower rail visibly thins and the
// upper one thickens across that x.
//
// Thickness is a PROPORTION of the chart's own maximum, never an absolute
// count, so the picture reads the same for a team of six and a company of six
// hundred. The chart does no arithmetic on the consumer's counts beyond that
// one scale: it never sums a level, never derives a headcount from the
// transfers, and never reconciles the two against each other. If a transfer
// says two people moved and the counts disagree, the chart draws both — the
// disagreement is the consumer's to see, not this file's to paper over.
// ============================================================================

/** "From `at`, hold `count` people at this level." */
export interface CountPoint {
  readonly at: TimeValue;
  readonly count: number;
}

/** One pay level: a rail at a fixed y, thickening and thinning over time. */
export interface Level {
  readonly id: string;
  readonly label: string;
  /** The rail's y, in the consumer's own units — a pay figure or a rank. */
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
 *                        outward, below the source rail, and fades out.
 *   • `to` only        — a HIRE: they joined from outside. The ribbon arrives
 *                        from above the destination rail, fading in.
 *   • neither          — nothing to draw; dropped.
 *
 * Modelling both ends as optional is what lets headcount be CONSERVED across a
 * transfer set: every change in a level's count has a matching flow, so a
 * reader never sees a rail thin with nothing leaving it. A silent count drop
 * is the one thing this chart must not show, because it reads as a mistake.
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

/** One stretch of a rail: a horizontal run at `y`, `width` thick. */
export interface RailSpan {
  readonly levelId: string;
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly count: number;
  readonly width: number;
}

/** A rail: one level, placed, with its spans. */
export interface Rail {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly y: number;
  /** 1-based position in the CONSUMER's order — the `--sui-series-N` index. */
  readonly seriesIndex: number;
  readonly spans: readonly RailSpan[];
  /**
   * Where the level's own short label sits: just above the rail's LEFT END,
   * wherever that is. A level that appears mid-chart carries its label in with
   * it rather than announcing itself at an edge it does not reach.
   * `undefined` when nobody ever holds the level, so there is nothing to name.
   */
  readonly labelAt?: Point;
}

/** A flow between two rails: a vertical ribbon at one x. */
export interface Ribbon {
  readonly key: string;
  readonly kind: FlowKind;
  readonly fromId?: string;
  readonly toId?: string;
  readonly count: number;
  readonly x: number;
  /** The source rail's y. */
  readonly y1: number;
  /** The destination rail's y. */
  readonly y2: number;
  readonly width: number;
  /** The source level's 1-based token index — a flow wears its ORIGIN's tone. */
  readonly seriesIndex: number;
}

/** A thin rule at a change no numbered flag already marks. */
export interface Dropline {
  readonly key: string;
  readonly x: number;
}

export interface LevelsRailGeometry {
  readonly yDomain: readonly [number, number];
  /** The largest headcount anywhere — the denominator of every width. */
  readonly maxCount: number;
  readonly rails: readonly Rail[];
  readonly ribbons: readonly Ribbon[];
  readonly droplines: readonly Dropline[];
  readonly flags: readonly Flag[];
  readonly ticks: readonly MonthTick[];
}

/** The thinnest a rail anybody holds is ever drawn. One person must be visible. */
export const MIN_STROKE = 1.5;
/** The thickest — reached by whoever holds the chart's own maximum. */
export const MAX_STROKE = 10;

/**
 * How far a one-ended flow runs past its rail, into the space where the rest
 * of the world is. Short: it is an exit, not a journey, and a long stub would
 * read as a move to a level the chart forgot to draw.
 *
 * It is CLAMPED to the plot, and it has to be. The padding leaves a fixed
 * headroom above the highest rail — `(1 + PAD) / (1 + 2·PAD)` of the plot
 * height, which for a 12% pad over a 154-unit plot is 14.9 units, whatever
 * the data says — so an unclamped 16-unit stub would draw a hire into the top
 * level ABOVE `PLOT_TOP`, and a departure from the bottom level down into the
 * axis ticks. `overflow: visible` on the canvas means it would be drawn, not
 * cropped. Clamping rather than shrinking the constant, so this survives
 * somebody retuning the padding.
 */
export const OPEN_FLOW_STUB = 16;

/**
 * Width for a headcount, as a proportion of the chart's maximum.
 *
 * Zero people is drawn as NOTHING rather than as a hairline: an empty level is
 * an absence, and a hairline would read as "one person, roughly".
 */
export const strokeFor = (count: number, maxCount: number): number => {
  if (count <= 0) return 0;
  if (maxCount <= 0) return MIN_STROKE;
  const fraction = clamp(count / maxCount, 0, 1);
  return MIN_STROKE + fraction * (MAX_STROKE - MIN_STROKE);
};

/** The largest headcount anywhere on the chart, standing or moving. */
export const maxCountOf = (
  levels: readonly Level[],
  transfers: readonly Transfer[],
): number => {
  const counts = allCounts(levels, transfers);
  return counts.length === 0 ? 0 : Math.max(...counts);
};

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

/**
 * One span per count point, each running to the next change (or the domain
 * end). A span nobody holds is omitted entirely, which is what lets a level
 * empty out for a stretch and come back without a line across the gap.
 */
export const railSpans = (
  level: Level,
  xScale: (at: TimeValue) => number,
  yScale: (value: number) => number,
  domainEnd: TimeValue,
  maxCount: number,
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
      width: strokeFor(point.count, maxCount),
    });
  }
  return spans;
};

/**
 * The flows. A ribbon wears its SOURCE's tone: the reader is watching a
 * quantity leave one rail, and it is the departure that needs explaining.
 * A transfer naming a level the chart does not have is dropped rather than
 * drawn to nowhere.
 */
export const transferRibbons = (
  transfers: readonly Transfer[],
  levels: readonly Level[],
  xScale: (at: TimeValue) => number,
  yScale: (value: number) => number,
  maxCount: number,
): readonly Ribbon[] => {
  const indexById = new Map(
    map((level: Level, index: number) => [level.id, index] as const, levels),
  );
  const yOf = (id: string): number | undefined => {
    const index = indexById.get(id);
    return index === undefined ? undefined : yScale(levels[index].value);
  };
  const ordered = sortBy(
    (transfer: Transfer) => timeOf(transfer.at),
    transfers,
  );
  const ribbons: Ribbon[] = [];
  for (const transfer of ordered) {
    const placed = placeFlow(transfer, yOf, indexById);
    if (placed === undefined) continue;
    ribbons.push({
      key: `${transfer.from ?? "out"}-${transfer.to ?? "out"}-${timeOf(
        transfer.at,
      )}`,
      kind: placed.kind,
      fromId: transfer.from,
      toId: transfer.to,
      count: transfer.count,
      x: xScale(transfer.at),
      y1: placed.y1,
      y2: placed.y2,
      width: strokeFor(transfer.count, maxCount),
      seriesIndex: placed.seriesIndex,
    });
  }
  return ribbons;
};

/**
 * Where a flow's two ends sit, and what it is. A one-ended flow gets a stub
 * into the outside: a departure runs DOWN from its source and a hire comes
 * DOWN INTO its destination from above, so the two sit on opposite sides of
 * their rail and can never be read for each other.
 *
 * A flow naming a level the chart does not have is dropped rather than drawn
 * to nowhere — "nowhere" is what an absent end already means, and drawing a
 * typo the same way as a departure would hide it.
 */
/** Keep a stub's open end inside the plot. See OPEN_FLOW_STUB for why. */
const intoPlot = (y: number): number => clamp(y, PLOT_TOP, PLOT_BOTTOM);

const placeFlow = (
  transfer: Transfer,
  yOf: (id: string) => number | undefined,
  indexById: ReadonlyMap<string, number>,
):
  | { kind: FlowKind; y1: number; y2: number; seriesIndex: number }
  | undefined => {
  const fromY = transfer.from === undefined ? undefined : yOf(transfer.from);
  const toY = transfer.to === undefined ? undefined : yOf(transfer.to);
  const indexOf = (id: string | undefined): number =>
    (id === undefined ? undefined : indexById.get(id)) ?? 0;
  if (transfer.from !== undefined && transfer.to !== undefined) {
    if (fromY === undefined || toY === undefined) return undefined;
    // A move wears its SOURCE's tone: the reader is watching a quantity leave.
    return {
      kind: "move",
      y1: fromY,
      y2: toY,
      seriesIndex: indexOf(transfer.from) + 1,
    };
  }
  if (transfer.from !== undefined) {
    if (fromY === undefined) return undefined;
    return {
      kind: "departure",
      y1: fromY,
      y2: intoPlot(fromY + OPEN_FLOW_STUB),
      seriesIndex: indexOf(transfer.from) + 1,
    };
  }
  if (transfer.to !== undefined) {
    if (toY === undefined) return undefined;
    // A hire wears its DESTINATION's tone — that is the rail it thickens.
    return {
      kind: "hire",
      y1: intoPlot(toY - OPEN_FLOW_STUB),
      y2: toY,
      seriesIndex: indexOf(transfer.to) + 1,
    };
  }
  return undefined;
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
 * nothing. And where a change coincides with a mutation, the flag's own rule is
 * drawn instead, so the reader never sees two rules in one column and wonders
 * what the second one means.
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

/**
 * Longest span, in months, that still gets a tick per month. Past this the
 * axis switches to one tick per YEAR: sixty-one month labels in the width of a
 * card is not an axis, it is a grey stripe. The threshold is the component's
 * own legibility decision about its own axis — it is not derived from, and
 * cannot be overridden by, the consumer's data.
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
  monthlyCells(asDate(domain[0]), asDate(domain[1])).length >
  MONTHLY_TICK_LIMIT
    ? yearTicks(domain, xScale)
    : monthTicks(domain, xScale);

/** Clearance between a rail's top edge and the baseline of its label. */
export const RAIL_LABEL_GAP = 4;

/** Just above the left end of the first span anybody holds. */
const railLabelAt = (spans: readonly RailSpan[]): Point | undefined => {
  const first = spans[0];
  if (first === undefined) return undefined;
  return { x: first.x1 + 2, y: first.y - first.width / 2 - RAIL_LABEL_GAP };
};

/** The whole rail observation: scales resolved, rails, flows, rules, flags. */
export const levelsRailGeometry = (input: {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly mutations: readonly Mutation[];
  readonly domain: TimeDomain;
}): LevelsRailGeometry => {
  const xScale = xScaleFor(input.domain);
  const yDomain = valueDomainOf(input.levels);
  const yScale = yScaleFor(yDomain);
  const maxCount = maxCountOf(input.levels, input.transfers);
  const spansOf = (level: Level): readonly RailSpan[] =>
    railSpans(level, xScale, yScale, input.domain[1], maxCount);
  return {
    yDomain,
    maxCount,
    rails: map(
      (level: Level, index: number) => ({
        id: level.id,
        label: level.label,
        value: level.value,
        y: yScale(level.value),
        seriesIndex: index + 1,
        spans: spansOf(level),
        labelAt: railLabelAt(spansOf(level)),
      }),
      input.levels,
    ),
    ribbons: transferRibbons(
      input.transfers,
      input.levels,
      xScale,
      yScale,
      maxCount,
    ),
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

const allCounts = (
  levels: readonly Level[],
  transfers: readonly Transfer[],
): readonly number[] => {
  const counts: number[] = [];
  for (const level of levels) {
    for (const point of level.points) counts.push(point.count);
  }
  for (const transfer of transfers) counts.push(transfer.count);
  return counts;
};
