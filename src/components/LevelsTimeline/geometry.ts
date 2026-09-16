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
import { join, map, sortBy } from "../../fn";

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
