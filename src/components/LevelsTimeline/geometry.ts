// ============================================
// LevelsTimeline geometry — pure, headless, no SVG node, no Solid.
//
// Lowercase filename ON PURPOSE (same disposition as RateGauge/geometry.ts and
// BandRail/bands.tsx): `isEntryPath` in scripts/render-coverage.mjs matches any
// PascalCase `.tsx` under src/components/, so a `Geometry.tsx` here would
// register as a new component owing its own depth header and its own showcase.
//
// EVERY number the chart paints is decided in this file, so the whole shape is
// readable as a table without a browser (geometry.test.ts prints one, y-domain
// and flag positions included). The component does nothing but hand these
// strings and points to the DOM.
//
// Conventions, fixed here once so nothing downstream re-decides them:
//
//   • The chart does NO arithmetic on the consumer's values beyond the two
//     scales. It never derives a level, never totals a series, never formats.
//     A "total" series is the consumer's own pre-computed series like any
//     other; it is merely drawn heavier.
//   • A point is "from `at`, hold `level`" — step-AFTER. Horizontal runs joined
//     by vertical risers, and the last level runs out to the domain end.
//   • BEFORE a series' first point, NOTHING is drawn. The chart will not invent
//     a level it was not given, so a series that starts mid-domain simply
//     begins mid-plot. (The alternative — extending the first level back to the
//     domain start — is a consumer-visible choice and is on the /promote list
//     for Peter, not decided here.)
//   • Times outside the domain are CLAMPED to it rather than painted
//     off-canvas, and every degenerate domain (zero-width in x, zero-height in
//     y, no series at all) resolves to a finite number rather than NaN.
// ============================================
import { clamp } from "../../internal/math/clamp";
import { monthlyCells } from "../DateAxis/cells";
import { filter, join, map, sortBy } from "../../fn";

/** A moment, as the consumer prefers to express it. */
export type TimeValue = Date | number;

/** The visible time span. The consumer's, never derived from the data. */
export type TimeDomain = readonly [TimeValue, TimeValue];

/** "From `at`, hold `level`" — one step in a series. */
export interface LevelPoint {
  readonly at: TimeValue;
  readonly level: number;
}

/** One stepped line. `primary` draws heavier, in the primary ink. */
export interface Series {
  readonly id: string;
  readonly label: string;
  readonly primary?: boolean;
  readonly points: readonly LevelPoint[];
}

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

/** A series, drawn. `vertices` is what the table prints; `path` is what paints. */
export interface Line {
  readonly id: string;
  readonly label: string;
  readonly primary: boolean;
  /** 1-based position in the CONSUMER's order — the `--sui-series-N` index. */
  readonly seriesIndex: number;
  readonly vertices: readonly Point[];
  readonly path: string;
}

export interface LevelsTimelineGeometry {
  readonly yDomain: readonly [number, number];
  /** Paint order: every other series first, the primary one last, on top. */
  readonly lines: readonly Line[];
  readonly flags: readonly Flag[];
  readonly ticks: readonly MonthTick[];
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

/** Every level across every series, padded. Never zero-height, never NaN. */
export const yDomainOf = (
  series: readonly Series[],
): readonly [number, number] => {
  const levels = allLevels(series);
  if (levels.length === 0) return [0, 1];
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const span = hi - lo;
  const pad = span === 0 ? FLAT_Y_PAD : span * Y_PAD_FRACTION;
  return [lo - pad, hi + pad];
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

/**
 * The step-after corners, in paint order: the first point, then a horizontal
 * run and a vertical riser per later point, then the last level run out to
 * `domainEnd`. Points are sorted, so unordered consumer data still steps
 * forwards.
 */
export const stepVertices = (
  points: readonly LevelPoint[],
  xScale: (at: TimeValue) => number,
  yScale: (level: number) => number,
  domainEnd: TimeValue,
): readonly Point[] => {
  if (points.length === 0) return [];
  const ordered = sortBy((point: LevelPoint) => timeOf(point.at), points);
  const corners: Point[] = [];
  const pushPoint = (point: Point): void => {
    const last = corners[corners.length - 1];
    if (last && last.x === point.x && last.y === point.y) return;
    corners.push(point);
  };
  let previousY = yScale(ordered[0].level);
  pushPoint({ x: xScale(ordered[0].at), y: previousY });
  for (const point of ordered.slice(1)) {
    const x = xScale(point.at);
    const y = yScale(point.level);
    pushPoint({ x, y: previousY });
    pushPoint({ x, y });
    previousY = y;
  }
  pushPoint({ x: xScale(domainEnd), y: previousY });
  return corners;
};

/** The same corners as an SVG `d`. Empty — never `"M NaN"` — for no points. */
export const stepPath = (
  points: readonly LevelPoint[],
  xScale: (at: TimeValue) => number,
  yScale: (level: number) => number,
  domainEnd: TimeValue,
): string => pathFrom(stepVertices(points, xScale, yScale, domainEnd));

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

/** The whole observation: scales resolved, every series stepped, flags placed. */
export const levelsTimelineGeometry = (input: {
  readonly series: readonly Series[];
  readonly mutations: readonly Mutation[];
  readonly domain: TimeDomain;
}): LevelsTimelineGeometry => {
  const xScale = xScaleFor(input.domain);
  const yDomain = yDomainOf(input.series);
  const yScale = yScaleFor(yDomain);
  const lines = map(
    (series: Series, index: number) =>
      lineFor(series, index, xScale, yScale, input.domain[1]),
    input.series,
  );
  return {
    yDomain,
    // The primary series paints last so it sits on top of the others; its
    // token index still comes from the consumer's own order.
    lines: sortBy((line: Line) => (line.primary ? 1 : 0), lines),
    flags: flagPositions(input.mutations, xScale),
    ticks: monthTicks(input.domain, xScale),
  };
};

// ── internals ────────────────────────────────────────────────────────────────

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

const allLevels = (series: readonly Series[]): readonly number[] => {
  const levels: number[] = [];
  for (const one of series) {
    for (const point of one.points) levels.push(point.level);
  }
  return levels;
};

const pathFrom = (vertices: readonly Point[]): string => {
  if (vertices.length === 0) return "";
  const commands = map(
    (vertex: Point, index: number) =>
      `${index === 0 ? "M" : "L"} ${vertex.x} ${vertex.y}`,
    vertices,
  );
  return join(" ", commands);
};

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

const lineFor = (
  series: Series,
  index: number,
  xScale: (at: TimeValue) => number,
  yScale: (level: number) => number,
  domainEnd: TimeValue,
): Line => {
  const vertices = stepVertices(series.points, xScale, yScale, domainEnd);
  return {
    id: series.id,
    label: series.label,
    primary: series.primary === true,
    seriesIndex: index + 1,
    vertices,
    path: pathFrom(vertices),
  };
};

// ============================================================================
// The RAIL model (Peter, 2026-09-16) — a line is a pay LEVEL, not a person.
//
// The stepped model above is DEPRECATED but still shipped: scenario-board
// consumes it today, so it is moved off at its own pace and deleted only once
// nothing reads it. Everything below is the addition, standing beside it.
//
// The two models differ in what VARIES along a line:
//
//   • stepped  — y moves, thickness is constant. A person's pay steps up.
//   • rail     — y is FIXED, thickness moves. A pay level does not go
//                anywhere; what changes is how many people hold it.
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

/** People moving between two levels at one moment. A raise, drawn as a flow. */
export interface Transfer {
  readonly at: TimeValue;
  /** Source level id. */
  readonly from: string;
  /** Destination level id. */
  readonly to: string;
  readonly count: number;
}

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
  readonly fromId: string;
  readonly toId: string;
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
  const ordered = sortBy(
    (transfer: Transfer) => timeOf(transfer.at),
    transfers,
  );
  const ribbons: Ribbon[] = [];
  for (const transfer of ordered) {
    const fromIndex = indexById.get(transfer.from);
    const toIndex = indexById.get(transfer.to);
    if (fromIndex === undefined || toIndex === undefined) continue;
    ribbons.push({
      key: `${transfer.from}-${transfer.to}-${timeOf(transfer.at)}`,
      fromId: transfer.from,
      toId: transfer.to,
      count: transfer.count,
      x: xScale(transfer.at),
      y1: yScale(levels[fromIndex].value),
      y2: yScale(levels[toIndex].value),
      width: strokeFor(transfer.count, maxCount),
      seriesIndex: fromIndex + 1,
    });
  }
  return ribbons;
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
