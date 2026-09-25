// ============================================
// LevelsTimeline geometry — the headless observation.
//
// Every number the SVG paints is decided in geometry.ts, so the whole chart is
// readable as a table without a browser. These tests PRINT that table as well
// as asserting on it: a band chart is one of those shapes where a wrong width
// looks plausible in isolation and obviously wrong beside its neighbours.
//
// The printed observation carries the width scale and which of its two caps
// bound it, the per-span widths, the flow roots, and the change-x list that
// decides where the droplines fall.
// ============================================
import { describe, expect, it } from "vitest";
import { filter, find, flatMap, join, map, sortBy, sum } from "../../fn";
import {
  DEFAULT_FRAME,
  BAND_MARGIN,
  FILL_FRACTION,
  MAX_TRANSITION,
  PLOT_BOTTOM,
  MIN_PER_COUNT,
  MIN_PLOT_FRACTION,
  MIN_VIEW_HEIGHT,
  MIN_VIEW_WIDTH,
  frameFor,
  frameForBox,
  viewHeightFor,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
  TRANSITION_FRACTION,
  type BandRun,
  type FlowBand,
  type Level,
  type LevelRow,
  type Mutation,
  type Rail,
  type RailSpan,
  type Taper,
  type TimeDomain,
  type Transfer,
  adjacencyWidth,
  axisTicks,
  bandPath,
  bandWidth,
  changeTimes,
  countAt,
  droplinePositions,
  edgeWidth,
  fillWidth,
  flagPositions,
  hCurve,
  hoverAt,
  levelsAt,
  levelsRailGeometry,
  snapToMonth,
  timeAtX,
  maxCountIn,
  monthTicks,
  MAX_BAND_PX,
  MAX_GUTTER_FRACTION,
  COMPACT_Y_TICK_TARGET,
  gutterWidth,
  maxBandWidth,
  niceValueDomain,
  peakTotal,
  perCountWidth,
  quarterLabelOf,
  quarterTicks,
  railRuns,
  railSpans,
  spanBottom,
  spanTop,
  taperHalves,
  timeOf,
  transitionHalf,
  transitionWidth,
  valueDomainFor,
  valueDomainOf,
  valueTicks,
  xScaleFor,
  yScaleFor,
  EVENT_TICK_LENGTH,
  FLAG_GAP,
  FLAG_LEADER_DROP,
  FLAG_RULE_TOP,
  nudgeFlagCentres,
  weekTicks,
  levelsValueFit,
  pickDay,
  pickNearestMonth,
  FILLER_LABEL_EXTRA_GAP,
  abbreviateDates,
  axisLabelWidth,
  labelPlacement,
  AXIS_LABEL_GAP,
  AXIS_TICK_LENGTH,
  DAY_MS,
  DRAG_THRESHOLD_PX,
  FLAG_BOX_WIDTH,
  FLAG_DIGIT_PX,
  FLAG_MAX_DIGITS,
  FLAG_PAD_X,
  clampMutationTime,
  datedAxisTicks,
  dragTimeAt,
  isoDayOf,
  mutationNumbers,
  snapToDay,
} from "./geometry";
import type { AxisTick, Flag, Frame, ValueTick } from "./geometry";

const utc = (iso: string): Date => new Date(iso);

/** The bench's own span, shortened to a year so month ticks stay readable. */
const DOMAIN: TimeDomain = [utc("2025-01-01"), utc("2026-01-01")];

const MUTATIONS: readonly Mutation[] = [
  { id: "m1", at: utc("2025-04-01"), label: "1" },
  { id: "m2", at: utc("2025-07-01"), label: "2" },
  { id: "m3", at: utc("2025-10-01"), label: "3" },
];

const LEVELS: readonly Level[] = [
  {
    id: "l5",
    label: "L5",
    value: 5000,
    points: [
      { at: utc("2025-01-01"), count: 3 },
      { at: utc("2025-07-01"), count: 4 },
      { at: utc("2025-11-15"), count: 5 },
    ],
  },
  {
    id: "l6",
    label: "L6",
    value: 6500,
    points: [
      { at: utc("2025-01-01"), count: 4 },
      { at: utc("2025-04-01"), count: 2 },
    ],
  },
  {
    id: "l7",
    label: "L7",
    value: 8000,
    points: [
      { at: utc("2025-01-01"), count: 2 },
      { at: utc("2025-04-01"), count: 4 },
      { at: utc("2025-10-01"), count: 3 },
    ],
  },
  {
    id: "l8",
    label: "L8",
    value: 10000,
    points: [
      { at: utc("2025-07-01"), count: 1 },
      { at: utc("2025-10-01"), count: 2 },
    ],
  },
];

const TRANSFERS: readonly Transfer[] = [
  { at: utc("2025-04-01"), from: "l6", to: "l7", count: 2 },
  { at: utc("2025-10-01"), from: "l7", to: "l8", count: 1 },
];

/** Round to 3dp so a table prints without float noise. */
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** The change xs this fixture produces — what the transition half is sized from. */
const changeXs = (frame: Frame = geometryOf().frame): readonly number[] => {
  const x = (time: number) =>
    frame.plotLeft +
    ((time - timeOf(DOMAIN[0])) / (timeOf(DOMAIN[1]) - timeOf(DOMAIN[0]))) *
      (frame.plotRight - frame.plotLeft);
  return map(x, changeTimes(LEVELS, TRANSFERS));
};

const geometryOf = (
  levels: readonly Level[] = LEVELS,
  transfers: readonly Transfer[] = TRANSFERS,
  domain: TimeDomain = DOMAIN,
) => levelsRailGeometry({ levels, transfers, mutations: MUTATIONS, domain });

// ── the frame ────────────────────────────────────────────────────────────────

describe("timeOf", () => {
  it("reads a Date and a raw timestamp the same way", () => {
    expect(timeOf(utc("2025-01-01"))).toBe(Date.UTC(2025, 0, 1));
    expect(timeOf(1234)).toBe(1234);
  });
});

describe("xScaleFor", () => {
  const x = levelsRailGeometry;
  it("puts the domain ends on the plot edges and clamps outside it", () => {
    const geometry = geometryOf();
    const spans = geometry.rails[0].spans;
    // The plot's left edge is the value axis' gutter, not the bare margin.
    expect(spans[0].x1).toBe(geometry.frame.plotLeft);
    expect(spans[spans.length - 1].x2).toBe(geometry.frame.plotRight);
    expect(typeof x).toBe("function");
  });
});

describe("valueDomainOf and yScaleFor", () => {
  it("is the levels' own range, mapped into the plot MINUS its inset", () => {
    // The inset is a fraction of the PLOT, not of the value span, so the
    // headroom is there whatever the consumer's values happen to be.
    const [lo, hi] = valueDomainOf(LEVELS);
    expect([lo, hi]).toEqual([5000, 10000]);
    expect(yScaleFor([lo, hi])(hi)).toBeCloseTo(
      PLOT_TOP + DEFAULT_FRAME.bandInset,
      6,
    );
    expect(yScaleFor([lo, hi])(lo)).toBeCloseTo(
      DEFAULT_FRAME.plotBottom - DEFAULT_FRAME.bandInset,
      6,
    );
  });

  it("opens a flat chart up rather than collapsing it", () => {
    const [lo, hi] = valueDomainOf([LEVELS[0]]);
    expect(hi).toBeGreaterThan(lo);
    expect(yScaleFor([lo, hi])(5000)).not.toBeNaN();
  });

  it("survives no levels at all", () => {
    const [lo, hi] = valueDomainOf([]);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("flagPositions", () => {
  it("puts one flag per mutation, in time order, on the canvas", () => {
    const flags = flagPositions(MUTATIONS, (at) =>
      at === MUTATIONS[0].at ? PLOT_LEFT : PLOT_RIGHT,
    );
    expect(flags).toHaveLength(3);
    expect(flags[0].boxX).toBeGreaterThanOrEqual(0);
    expect(flags[2].boxX + flags[2].boxWidth).toBeLessThanOrEqual(VIEW_WIDTH);
  });
});

describe("axisTicks", () => {
  it("keeps a month cadence under a year", () => {
    const short: TimeDomain = [utc("2025-01-01"), utc("2025-07-01")];
    const ticks = axisTicks(short, (at) => timeOf(at) / 1e12);
    expect(ticks).toHaveLength(7);
    expect(ticks[0].label).toBe("Jan");
  });

  it("keeps MONTHS through a year — Peter: 6m and a year are months", () => {
    const ticks = axisTicks(DOMAIN, (at) => timeOf(at) / 1e12);
    expect(ticks).toHaveLength(13);
    expect(ticks[0].label).toBe("Jan");
  });

  it("switches to QUARTERS for two years — Peter: 2y is quarters", () => {
    const two: TimeDomain = [utc("2025-01-01"), utc("2027-01-01")];
    const ticks = axisTicks(two, (at) => timeOf(at) / 1e12);
    expect(map((tick) => tick.label, ticks)).toEqual([
      "2025-Q1",
      "2025-Q2",
      "2025-Q3",
      "2025-Q4",
      "2026-Q1",
      "2026-Q2",
      "2026-Q3",
      "2026-Q4",
      "2027-Q1",
    ]);
  });

  it("labels every quarter even in compact chrome — the row is sparse already", () => {
    const two: TimeDomain = [utc("2025-01-01"), utc("2027-01-01")];
    const ticks = axisTicks(two, (at) => timeOf(at) / 1e12, frameFor(140));
    expect(filter((tick) => tick.showLabel, ticks)).toHaveLength(ticks.length);
  });

  it("puts each quarter tick on its own boundary", () => {
    const two: TimeDomain = [utc("2025-01-01"), utc("2027-01-01")];
    const x = xScaleFor(two);
    const ticks = axisTicks(two, x);
    expect(ticks[0].x).toBe(x(utc("2025-01-01")));
    expect(ticks[1].x).toBe(x(utc("2025-04-01")));
    expect(ticks[2].x).toBe(x(utc("2025-07-01")));
    expect(ticks[3].x).toBe(x(utc("2025-10-01")));
  });

  it("switches to WEEKS for about three months, on ISO Mondays (UTC)", () => {
    // 2026-09-01 is a Tuesday: the first week tick is Monday 2026-09-07.
    const three: TimeDomain = [utc("2026-09-01"), utc("2026-12-01")];
    const ticks = axisTicks(three, (at) => timeOf(at) / 1e12);
    expect(ticks[0].label).toBe("2026-09-07");
    expect(ticks).toHaveLength(13);
    for (const tick of ticks) {
      expect(new Date(tick.key).getUTCDay()).toBe(1);
    }
    // …and a Monday start is its own first tick.
    const fromMonday = weekTicks(
      [utc("2026-09-07"), utc("2026-09-21")],
      () => 0,
    );
    expect(map((tick) => tick.label, fromMonday)).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("picks the cadence from the span at Peter's named durations", () => {
    const cadenceOf = (months: number): string => {
      const end = new Date(Date.UTC(2026, months, 1));
      const ticks = axisTicks(
        [utc("2026-01-01"), end],
        (at) => timeOf(at) / 1e12,
      );
      const gapDays =
        (Date.parse(ticks[1].key) - Date.parse(ticks[0].key)) / DAY_MS;
      if (gapDays === 7) return "week";
      if (gapDays <= 31) return "month";
      if (gapDays <= 92) return "quarter";
      return "year";
    };
    expect(map(cadenceOf, [3, 4, 6, 12, 15, 24, 35, 36, 60])).toEqual([
      "week",
      "week",
      "month",
      "month",
      "month",
      "quarter",
      "quarter",
      "year",
      "year",
    ]);
  });

  it("prints the drawn-tick table for 3m, 6m, 1y and 2y domains", () => {
    const spans: readonly [string, TimeDomain][] = [
      ["3m", [utc("2026-09-01"), utc("2026-12-01")]],
      ["6m", [utc("2026-09-01"), utc("2027-03-01")]],
      ["1y", [utc("2026-09-01"), utc("2027-09-01")]],
      ["2y", [utc("2026-09-01"), utc("2028-09-01")]],
    ];
    const pins: readonly Mutation[] = [
      { id: "a", at: utc("2026-10-03"), label: "a" },
      { id: "b", at: utc("2026-11-15"), label: "b" },
    ];
    for (const [name, domain] of spans) {
      const ticks = datedAxisTicks(domain, pins, xScaleFor(domain));
      console.log(
        `\n${name}: ${ticks.length} ticks\n${join(
          "\n",
          map(
            (tick: AxisTick) =>
              `${isoDayOf(tick.at)}  ${String(Math.round(tick.x)).padStart(4)}  ${tick.event ? "event " : "filler"}  ${tick.showLabel ? tick.label : "·"}`,
            ticks,
          ),
        )}`,
      );
      // Both events are ticked; the first always takes a label, and at 2y
      // the second (43 days on, ~35u) is too close for a flat one.
      expect(filter((tick: AxisTick) => tick.event, ticks)).toHaveLength(2);
      expect(find((tick: AxisTick) => tick.event, ticks)?.showLabel).toBe(true);
    }
  });

  it("switches to a year cadence rather than printing a grey stripe", () => {
    const long: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
    const ticks = axisTicks(long, (at) => timeOf(at) / 1e12);
    expect(map((tick) => tick.label, ticks)).toEqual([
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
    ]);
  });

  it("still exposes each cadence on its own, for a caller that wants one", () => {
    // There is no consumer-facing cadence option — the span picks it. These
    // stay reachable because the bench and the tests need to name one.
    expect(monthTicks(DOMAIN, () => PLOT_LEFT)).toHaveLength(13);
    expect(quarterTicks(DOMAIN, () => PLOT_LEFT)).toHaveLength(5);
    expect(weekTicks(DOMAIN, () => PLOT_LEFT)).toHaveLength(52);
  });
});

// ── the width scale, and its two caps ────────────────────────────────────────

describe("peakTotal", () => {
  it("is the largest TOTAL at any one moment", () => {
    // Not the biggest single level: it is all the bands together that occupy
    // the plot, so the peak is what the fill width is sized from.
    expect(peakTotal(LEVELS)).toBe(12);
  });

  it("is zero for an empty chart rather than -Infinity", () => {
    expect(peakTotal([])).toBe(0);
  });
});

describe("countAt", () => {
  it("holds a level's last count, and nothing before its first point", () => {
    expect(countAt(LEVELS[3], timeOf(utc("2025-01-01")))).toBe(0);
    expect(countAt(LEVELS[3], timeOf(utc("2025-07-01")))).toBe(1);
    expect(countAt(LEVELS[3], timeOf(utc("2025-12-01")))).toBe(2);
  });
});

describe("maxCountIn", () => {
  it("is the most anybody ever holds one level", () => {
    expect(maxCountIn(LEVELS[0])).toBe(5);
    expect(maxCountIn({ id: "e", label: "E", value: 1, points: [] })).toBe(0);
  });
});

describe("perCountWidth — the smallest of the caps", () => {
  const yScale = yScaleFor(valueDomainOf(LEVELS));

  it("fills a good fraction of the plot at the busiest moment", () => {
    expect(round(fillWidth(12, DEFAULT_FRAME))).toBe(
      round((DEFAULT_FRAME.plotHeight * FILL_FRACTION) / 12),
    );
  });

  it("keeps the TIGHTEST adjacent pair clear of each other", () => {
    expect(adjacencyWidth(LEVELS, yScale)).toBeGreaterThan(0);
    expect(adjacencyWidth(LEVELS, yScale)).toBeLessThan(
      Number.POSITIVE_INFINITY,
    );
  });

  it("keeps the outermost band inside the plot's own edges", () => {
    // The adjacency cap polices the space BETWEEN levels and nothing else; a
    // two-level track once wanted 92-unit bands in a 154-unit plot and hung
    // its lowest one off the axis.
    const two: readonly Level[] = [
      { id: "a", label: "A", value: 7000, points: [{ at: 0, count: 2 }] },
      { id: "b", label: "B", value: 9500, points: [{ at: 0, count: 2 }] },
    ];
    const scale = yScaleFor(valueDomainOf(two));
    expect(edgeWidth(two, scale, DEFAULT_FRAME)).toBeLessThan(
      fillWidth(2, DEFAULT_FRAME),
    );
    const perCount = perCountWidth(two, scale, 2, DEFAULT_FRAME);
    for (const level of two) {
      const half = bandWidth(2, perCount) / 2;
      expect(scale(level.value) - half).toBeGreaterThanOrEqual(PLOT_TOP);
      expect(scale(level.value) + half).toBeLessThanOrEqual(PLOT_BOTTOM);
    }
  });

  it("takes whichever cap binds — here the ten-px ceiling", () => {
    const perCount = perCountWidth(LEVELS, yScale, 12, DEFAULT_FRAME);
    expect(perCount).toBe(
      Math.min(
        maxBandWidth(LEVELS),
        fillWidth(12, DEFAULT_FRAME),
        adjacencyWidth(LEVELS, yScale),
        edgeWidth(LEVELS, yScale, DEFAULT_FRAME),
      ),
    );
    expect(perCount).toBe(maxBandWidth(LEVELS));
  });

  it("lets a proportional cap bind when it is tighter than the ceiling", () => {
    // Two levels a hair apart on a wide axis: the adjacency cap comes out
    // well under `MAX_BAND_PX`, and it is the one that decides the width.
    const tight: readonly Level[] = [
      { id: "a", label: "A", value: 8000, points: [{ at: 0, count: 1 }] },
      { id: "b", label: "B", value: 8060, points: [{ at: 0, count: 1 }] },
      { id: "c", label: "C", value: 20000, points: [{ at: 0, count: 1 }] },
    ];
    const scale = yScaleFor(valueDomainOf(tight));
    const perCount = perCountWidth(tight, scale, 3, DEFAULT_FRAME);
    expect(perCount).toBeLessThan(maxBandWidth(tight));
    expect(perCount).toBe(
      Math.max(
        MIN_PER_COUNT,
        Math.min(
          fillWidth(3, DEFAULT_FRAME),
          adjacencyWidth(tight, scale),
          edgeWidth(tight, scale, DEFAULT_FRAME),
        ),
      ),
    );
  });

  it("leaves only the edge cap when there is a single level", () => {
    expect(adjacencyWidth([LEVELS[0]], yScale)).toBe(Number.POSITIVE_INFINITY);
  });

  it("has NO floor — a count of one is wide because the scale is wide", () => {
    // The old affine scale needed a MIN_STROKE so a count of one stayed visible.
    // A floor cannot be conserved, and it is not needed now.
    expect(bandWidth(0, 7.391)).toBe(0);
    expect(bandWidth(1, 7.391)).toBe(7.391);
  });
});

describe("bandWidth — conservation is exact and unconditional", () => {
  it("holds for every pair, INCLUDING a rail emptying to nothing", () => {
    const perCount = 7.391;
    for (const [before, moving] of [
      [5, 3],
      [4, 1],
      [10, 7],
      [2, 2],
      [1, 1],
    ]) {
      expect(
        round(bandWidth(before, perCount) - bandWidth(moving, perCount)),
      ).toBe(round(bandWidth(before - moving, perCount)));
    }
  });

  it("never goes negative on a nonsense count", () => {
    expect(bandWidth(-4, 7.391)).toBe(0);
  });
});

// ── the bands ────────────────────────────────────────────────────────────────

describe("railSpans", () => {
  const geometry = geometryOf();

  it("stops SHORT of every change, leaving the transition to the ribbons", () => {
    // The node/link split: a band ends at x0 and the next begins at x1, and
    // the gap between them is exactly one transition, filled by ribbons.
    const l6 = geometry.rails[1];
    // Five change moments, and l6 is alive through all of them.
    expect(l6.spans).toHaveLength(5);
    const gap = l6.spans[1].x1 - l6.spans[0].x2;
    expect(round(gap)).toBe(
      round(2 * transitionHalf(changeXs(geometry.frame), geometry.frame)),
    );
  });

  it("runs flush to the plot edges, which are not changes", () => {
    const spans = geometry.rails[1].spans;
    expect(spans[0].x1).toBe(geometry.frame.plotLeft);
    expect(spans[spans.length - 1].x2).toBe(geometry.frame.plotRight);
  });

  it("keeps a rail at ONE y — a level does not move, its thickness does", () => {
    const l7 = geometry.rails[2];
    expect(new Set(map((span: RailSpan) => span.y, l7.spans)).size).toBe(1);
  });

  it("thins where counts leave and thickens where they arrive", () => {
    const [before, after] = geometry.rails[1].spans;
    expect(after.width).toBeLessThan(before.width);
    const l7 = geometry.rails[2].spans;
    expect(l7[1].width).toBeGreaterThan(l7[0].width);
  });

  it("starts a level that appears mid-chart at its own first point", () => {
    expect(geometry.rails[3].spans[0].x1).toBeGreaterThan(PLOT_LEFT);
  });

  it("draws no span across a stretch nobody holds", () => {
    const emptied: Level = {
      id: "gone",
      label: "Gone",
      value: 7000,
      points: [
        { at: utc("2025-01-01"), count: 2 },
        { at: utc("2025-06-01"), count: 0 },
        { at: utc("2025-09-01"), count: 1 },
      ],
    };
    const moments = changeTimes([emptied], []);
    const spans = railSpans(
      emptied,
      (at) => timeOf(at) / 1e10,
      () => 100,
      DOMAIN[1],
      7.391,
      0,
      moments,
    );
    // Alive for the first stretch and the last, absent for the middle one.
    expect(spans).toHaveLength(2);
  });

  it("draws nothing for a level with no points", () => {
    expect(
      railSpans(
        { id: "e", label: "E", value: 1, points: [] },
        () => 0,
        () => 0,
        DOMAIN[1],
        7.391,
        0,
        [0],
      ),
    ).toEqual([]);
  });
});

describe("adjacent bands never overlap", () => {
  // The cap exists for exactly this. Checked at EVERY change x, against every
  // pair of levels, because a chart that smears two rails together is worse
  // than one drawn a little thin.
  const geometry = geometryOf();

  it("leaves clear air between every pair of bands at every change", () => {
    // Straight at the invariant: at every moment, take each level's count,
    // give it the band it would be drawn with, and check that no two of them
    // touch. Nothing about spans or paths — just the widths and the y's.
    for (const time of changeTimes(LEVELS, TRANSFERS)) {
      const live = filter(
        (band: { top: number; bottom: number }) => band.bottom > band.top,
        map((rail: Rail) => {
          const level = find((one: Level) => one.id === rail.id, LEVELS);
          const half =
            bandWidth(countAt(level as Level, time), geometry.perCount) / 2;
          return { top: rail.y - half, bottom: rail.y + half };
        }, geometry.rails),
      );
      const ordered = sortBy((band: { top: number }) => band.top, live);
      for (const [index, band] of ordered.entries()) {
        if (index === 0) continue;
        expect(band.top).toBeGreaterThanOrEqual(ordered[index - 1].bottom);
      }
    }
  });

  it("keeps at least the margin between the tightest pair at their fattest", () => {
    const l5 = geometry.rails[0];
    const l6 = geometry.rails[1];
    const fattestL5 = Math.max(...map((s: RailSpan) => s.width, l5.spans));
    const fattestL6 = Math.max(...map((s: RailSpan) => s.width, l6.spans));
    const clear = Math.abs(l5.y - l6.y) - fattestL5 / 2 - fattestL6 / 2;
    expect(clear).toBeGreaterThanOrEqual(BAND_MARGIN - 0.001);
  });
});

describe("curves", () => {
  it("gives both ends HORIZONTAL tangents — the whole Sankey look", () => {
    expect(hCurve(0, 10, 20, 30)).toBe("C 10 10, 10 30, 20 30");
  });

  it("is symmetric, so an edge can be walked backwards to close a band", () => {
    expect(hCurve(20, 30, 0, 10)).toBe("C 10 30, 10 10, 0 10");
  });

  it("closes a band, and is empty for an empty edge", () => {
    const top = [
      { x: 0, y: 0, curved: false },
      { x: 10, y: 2, curved: true },
    ];
    const bottom = [
      { x: 0, y: 5, curved: false },
      { x: 10, y: 8, curved: true },
    ];
    expect(bandPath(top, bottom).startsWith("M 0 0")).toBe(true);
    expect(bandPath(top, bottom).endsWith("Z")).toBe(true);
    expect(bandPath([], bottom)).toBe("");
  });
});

describe("transitionWidth", () => {
  it("is a generous fraction of the plot — the S is the point", () => {
    const raw = (PLOT_RIGHT - PLOT_LEFT) * TRANSITION_FRACTION;
    expect(round(raw)).toBe(round((VIEW_WIDTH - PLOT_LEFT - 14) * 0.11));
    expect(transitionWidth()).toBe(Math.min(raw, MAX_TRANSITION));
  });
});

describe("taperHalves", () => {
  it("shortens a blend when two changes sit closer than a transition apart", () => {
    // A busy month is not a consumer error; the band must not fold over itself.
    const crowded: Level = {
      id: "busy",
      label: "Busy",
      value: 6000,
      points: [
        { at: utc("2025-01-01"), count: 1 },
        { at: utc("2025-01-05"), count: 2 },
        { at: utc("2025-01-09"), count: 3 },
      ],
    };
    const geometry = geometryOf([crowded], []);
    const halves = taperHalves(geometry.rails[0].spans);
    expect(halves[0]).toBeLessThan(transitionWidth() / 2);
    expect(halves[0]).toBeGreaterThan(0);
  });
});

describe("railRuns", () => {
  const geometry = geometryOf();

  it("closes every band and never emits a NaN", () => {
    for (const rail of geometry.rails) {
      for (const run of rail.runs) {
        expect(run.path.startsWith("M ")).toBe(true);
        expect(run.path.endsWith("Z")).toBe(true);
        expect(run.path).not.toContain("NaN");
      }
    }
  });

  it("ends BLUNT — a rail that starts mid-plot does not taper to a point", () => {
    // It is the ribbon that carries the change, not the rail's shape. A rail
    // tapering in would say the count grew when it did not.
    const l8 = geometry.rails[3];
    const start = l8.spans[0];
    const d = l8.runs[0].path;
    expect(d.startsWith(`M ${Math.round(start.x1 * 1000) / 1000} `)).toBe(true);
    // The opening move is at the band's TOP edge, not at its centre.
    expect(d).toContain(`${Math.round(spanTop(start) * 1000) / 1000}`);
  });

  it("is one blunt rectangle per span — nothing in a rail bends", () => {
    // All the curvature belongs to the ribbons now. A band that bent would be
    // a second way of saying what a ribbon already says.
    const l7 = geometry.rails[2];
    expect(l7.runs).toHaveLength(l7.spans.length);
    for (const run of l7.runs) {
      expect(run.path).not.toContain("C ");
      expect(run.tapers).toHaveLength(0);
    }
  });

  it("splits a level that empties and comes back into TWO bands", () => {
    const returning: Level = {
      id: "back",
      label: "Back",
      value: 7000,
      points: [
        { at: utc("2025-01-01"), count: 2 },
        { at: utc("2025-05-01"), count: 0 },
        { at: utc("2025-09-01"), count: 1 },
      ],
    };
    expect(geometryOf([returning], []).rails[0].runs).toHaveLength(2);
  });

  it("draws nothing at all for a level nobody ever holds", () => {
    expect(
      geometryOf([{ id: "e", label: "E", value: 1, points: [] }], []).rails[0]
        .runs,
    ).toHaveLength(0);
  });

  it("is reachable on its own, for a caller that already has spans", () => {
    const spans = geometryOf().rails[1].spans;
    expect(railRuns(spans)).toHaveLength(spans.length);
  });
});

// ── the flows ────────────────────────────────────────────────────────────────

describe("flowBands", () => {
  const geometry = geometryOf();
  const moves = () =>
    filter((flow: FlowBand) => flow.kind === "move", geometry.flows);

  it("spans a transition centred on the change, not a bare vertical", () => {
    const [first] = moves();
    const frame = geometryOf().frame;
    expect(first.x1 - first.x0).toBeCloseTo(
      2 * transitionHalf(changeXs(frame), frame),
      9,
    );
  });

  it("roots in the bands it joins, and is as wide as what moved", () => {
    const [first] = moves();
    const expected = bandWidth(2, geometry.perCount);
    expect(round(first.srcBottom - first.srcTop)).toBe(round(expected));
    expect(round(first.dstBottom - first.dstTop)).toBe(round(expected));
  });

  it("names both of its ends, so a reader can trace it to its levels", () => {
    const [first] = moves();
    expect(first.fromId).toBe("l6");
    expect(first.toId).toBe("l7");
    expect(first.kind).toBe("move");
  });

  it("closes its band and never emits a NaN", () => {
    for (const flow of geometry.flows) {
      expect(flow.path.startsWith("M ")).toBe(true);
      expect(flow.path.endsWith("Z")).toBe(true);
      expect(flow.path).not.toContain("NaN");
    }
  });
});

describe("one-ended flows — departures and arrivals", () => {
  /** Transfers only — the carry is tested in its own suite. */
  const flowsFor = (transfers: readonly Transfer[]) =>
    filter(
      (flow: FlowBand) => flow.kind !== "carry" && flow.kind !== "continuation",
      geometryOf(LEVELS, transfers).flows,
    );

  it("runs a departure out of its source, with no destination named", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 1 },
    ]);
    expect(leaving.kind).toBe("departure");
    expect(leaving.fromId).toBe("l6");
    expect(leaving.toId).toBeUndefined();
  });

  it("runs an arrival into its destination, with no source named", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l7", count: 1 }]);
    expect(joining.kind).toBe("arrival");
    expect(joining.fromId).toBeUndefined();
    expect(joining.toId).toBe("l7");
  });

  it("keeps a one-ended flow the same width along its whole length", () => {
    // It is the GRADIENT that says the flow is going nowhere, not the shape —
    // a stub that wandered off would imply a destination the chart has not got.
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 2 },
    ]);
    expect(round(leaving.srcBottom - leaving.srcTop)).toBe(
      round(leaving.dstBottom - leaving.dstTop),
    );
    expect(round(leaving.srcTop)).toBe(round(leaving.dstTop));
  });

  it("drops a flow with neither end, and a typo rather than faking a departure", () => {
    expect(flowsFor([{ at: utc("2025-07-01"), count: 2 }])).toEqual([]);
    expect(
      flowsFor([{ at: utc("2025-07-01"), from: "nope", count: 1 }]),
    ).toEqual([]);
  });

  it("stacks two flows leaving one level at one moment rather than merging", () => {
    const both = flowsFor([
      { at: utc("2025-04-01"), from: "l6", to: "l7", count: 1 },
      { at: utc("2025-04-01"), from: "l6", count: 1 },
    ]);
    expect(both).toHaveLength(2);
    expect(new Set(map((flow: FlowBand) => flow.key, both)).size).toBe(2);
  });
});

describe("the fan — several flows out of one rail at one moment", () => {
  // The stress case: a count of four leaving one level for four destinations on
  // one date. The roots must tile the band's edge in destination order, or the
  // ribbons cross each other at the root.
  const fanLevels: readonly Level[] = [
    {
      id: "c6",
      label: "$6k",
      value: 6000,
      points: [
        { at: utc("2025-01-01"), count: 4 },
        { at: utc("2025-06-01"), count: 0 },
      ],
    },
    ...map(
      (figure: number) => ({
        id: `c${figure}`,
        label: `L${figure / 1000}`,
        value: figure,
        points: [{ at: utc("2025-06-01"), count: 1 }],
      }),
      [6500, 7000, 7500, 8000],
    ),
  ];
  const fanTransfers: readonly Transfer[] = map(
    (figure: number) => ({
      at: utc("2025-06-01"),
      from: "c6",
      to: `c${figure}`,
      count: 1,
    }),
    [6500, 7000, 7500, 8000],
  );
  const geometry = levelsRailGeometry({
    levels: fanLevels,
    transfers: fanTransfers,
    mutations: [],
    domain: DOMAIN,
  });

  it("gives every flow its own root slice — none overlap", () => {
    const roots = sortBy((flow: FlowBand) => flow.srcTop, [...geometry.flows]);
    expect(roots).toHaveLength(4);
    for (const [index, flow] of roots.entries()) {
      if (index === 0) continue;
      // Touching is right — the slices tile the edge. Overlapping is not.
      expect(flow.srcTop).toBeGreaterThanOrEqual(
        roots[index - 1].srcBottom - 0.001,
      );
    }
  });

  it("orders the roots by DESTINATION — the standard Sankey trick", () => {
    const byRoot = sortBy((flow: FlowBand) => flow.srcTop, [...geometry.flows]);
    const destinations = map((flow: FlowBand) => flow.dstTop, byRoot);
    expect(destinations).toEqual([...destinations].sort((a, b) => a - b));
  });

  it("tiles the whole of the emptying band's edge", () => {
    const byRoot = sortBy((flow: FlowBand) => flow.srcTop, [...geometry.flows]);
    const first = byRoot[0];
    const last = byRoot[byRoot.length - 1];
    expect(round(last.srcBottom - first.srcTop)).toBe(
      round(bandWidth(4, geometry.perCount)),
    );
  });
});

// ── annotations ──────────────────────────────────────────────────────────────

describe("changeTimes and droplinePositions", () => {
  const x = (at: Parameters<typeof timeOf>[0]) => timeOf(at) / 1e10;

  it("is every moment anything changes, deduped and in order", () => {
    const times = changeTimes(LEVELS, TRANSFERS);
    expect(map((t) => new Date(t).toISOString().slice(0, 10), times)).toEqual([
      "2025-01-01",
      "2025-04-01",
      "2025-07-01",
      "2025-10-01",
      "2025-11-15",
    ]);
  });

  it("marks only a change that no numbered flag already marks", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, MUTATIONS, DOMAIN, x);
    expect(lines).toHaveLength(1);
    expect(lines[0].x).toBe(x(utc("2025-11-15")));
  });

  it("does not rule the domain's own left edge — that is the frame", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, [], DOMAIN, x);
    expect(lines).toHaveLength(4);
  });
});

// ── the printed observation ──────────────────────────────────────────────────

describe("levelsRailGeometry — the whole observation", () => {
  const geometry = geometryOf();

  it("carries one rail per level, in the consumer's own order", () => {
    expect(map((rail: Rail) => rail.id, geometry.rails)).toEqual([
      "l5",
      "l6",
      "l7",
      "l8",
    ]);
    expect(geometry.rails[0].value).toBe(5000);
  });

  it("carries the flows, the flags and the un-numbered dropline", () => {
    expect(
      filter(
        (flow: FlowBand) =>
          flow.kind !== "carry" && flow.kind !== "continuation",
        geometry.flows,
      ),
    ).toHaveLength(2);
    expect(geometry.flags).toHaveLength(3);
    expect(geometry.droplines).toHaveLength(1);
  });

  it("prints the table a reader checks the shape against", () => {
    const yScale = yScaleFor(geometry.yDomain);
    console.table([
      { field: "peak total", value: geometry.peak },
      {
        field: "fill width",
        value: round(fillWidth(geometry.peak, geometry.frame)),
      },
      {
        field: "adjacency width",
        value: round(adjacencyWidth(LEVELS, yScale)),
      },
      { field: "perCount (the smaller)", value: round(geometry.perCount) },
      { field: "transition", value: transitionWidth() },
    ]);
    console.table(
      flatMap(
        (rail: Rail) =>
          map(
            (span: RailSpan) => ({
              level: rail.label,
              y: round(span.y),
              x1: round(span.x1),
              x2: round(span.x2),
              count: span.count,
              width: round(span.width),
            }),
            rail.spans,
          ),
        geometry.rails,
      ),
    );
    console.table(
      map(
        (flow: FlowBand) => ({
          flow: flow.key,
          kind: flow.kind,
          count: flow.count,
          x0: round(flow.x0),
          x1: round(flow.x1),
          srcTop: round(flow.srcTop),
          dstTop: round(flow.dstTop),
          width: round(flow.srcBottom - flow.srcTop),
        }),
        geometry.flows,
      ),
    );
    console.table(
      flatMap(
        (rail: Rail) =>
          map(
            (taper: Taper) => ({
              level: rail.label,
              x: round(taper.x),
              half: round(taper.half),
              widthBefore: round(taper.widthBefore),
              widthAfter: round(taper.widthAfter),
            }),
            flatMap((run: BandRun) => [...run.tapers], rail.runs),
          ),
        geometry.rails,
      ),
    );
    expect(geometry.rails).toHaveLength(4);
  });
});

// ============================================
// FLUSH JOINS — Peter, looking at the board: "these look terrible! the
// transitions don't connect to the horizontal lines."
//
// The guarantee this suite exists to hold: every ribbon corner is a point on a
// band's cap at the same x. Not close to one — the same number. Nothing in the
// picture may float.
// ============================================

/** A count of one per level, so whole bands move. */
const BOARD_LEVELS: readonly Level[] = [
  {
    id: "L2",
    label: "A · L2",
    value: 2000,
    points: [
      { at: utc("2025-01-01"), count: 1 },
      { at: utc("2025-04-01"), count: 0 },
    ],
  },
  {
    id: "L3",
    label: "A · L3",
    value: 3000,
    points: [{ at: utc("2025-04-01"), count: 1 }],
  },
  {
    id: "L4",
    label: "B · L4",
    value: 4000,
    points: [
      { at: utc("2025-01-01"), count: 2 },
      { at: utc("2025-07-01"), count: 1 },
    ],
  },
  {
    id: "L6",
    label: "B · L6",
    value: 6000,
    points: [{ at: utc("2025-07-01"), count: 1 }],
  },
];

const BOARD_TRANSFERS: readonly Transfer[] = [
  { at: utc("2025-04-01"), from: "L2", to: "L3", count: 1 },
  { at: utc("2025-07-01"), from: "L4", to: "L6", count: 1 },
];

const capsAt = (rails: readonly Rail[], x: number, side: "x1" | "x2") =>
  flatMap(
    (rail: Rail) =>
      map(
        (span: RailSpan) => ({ top: spanTop(span), bottom: spanBottom(span) }),
        filter(
          (span: RailSpan) => Math.abs(span[side] - x) < 0.001,
          rail.spans,
        ),
      ),
    rails,
  );

const lands = (
  edge: number,
  caps: readonly { top: number; bottom: number }[],
): boolean =>
  caps.some((cap) => edge >= cap.top - 0.001 && edge <= cap.bottom + 0.001);

describe("flush joins", () => {
  for (const [name, levels, transfers] of [
    ["the three-track shape", LEVELS, TRANSFERS],
    ["the board's shape — whole bands move", BOARD_LEVELS, BOARD_TRANSFERS],
  ] as const) {
    describe(name, () => {
      const geometry = levelsRailGeometry({
        levels,
        transfers,
        mutations: [],
        domain: DOMAIN,
      });

      it("roots all four corners of every ribbon on a band's cap", () => {
        expect(geometry.flows.length).toBeGreaterThan(0);
        for (const flow of geometry.flows) {
          const left = capsAt(geometry.rails, flow.x0, "x2");
          const right = capsAt(geometry.rails, flow.x1, "x1");
          expect(lands(flow.srcTop, left)).toBe(true);
          expect(lands(flow.srcBottom, left)).toBe(true);
          expect(lands(flow.dstTop, right)).toBe(true);
          expect(lands(flow.dstBottom, right)).toBe(true);
        }
      });

      it("leaves no gap and no overlap — the S owns exactly [x0, x1]", () => {
        for (const flow of geometry.flows) {
          for (const rail of geometry.rails) {
            for (const span of rail.spans) {
              // No band may intrude into a transition.
              const intrudes =
                span.x1 < flow.x1 - 0.001 && span.x2 > flow.x0 + 0.001;
              expect(intrudes).toBe(false);
            }
          }
        }
      });

      it("conserves width across every cap", () => {
        // What leaves a cap plus what carries on equals the band that ended.
        for (const rail of geometry.rails) {
          for (const span of rail.spans) {
            const leaving = filter(
              (flow: FlowBand) =>
                Math.abs(flow.x0 - span.x2) < 0.001 &&
                lands(flow.srcTop, [
                  { top: spanTop(span), bottom: spanBottom(span) },
                ]),
              geometry.flows,
            );
            if (leaving.length === 0) continue;
            const used = sum(
              map((flow: FlowBand) => flow.srcBottom - flow.srcTop, leaving),
            );
            expect(used).toBeLessThanOrEqual(span.width + 0.001);
          }
        }
      });
    });
  }

  it("makes a whole band that moves the SAME SHAPE as its ribbon's root", () => {
    // The tight case, and where it failed visibly: a count of one on the
    // level, so the band does not thin — it ends, and the ribbon IS its
    // continuation. Root and cap must be the same two numbers.
    const geometry = levelsRailGeometry({
      levels: BOARD_LEVELS,
      transfers: BOARD_TRANSFERS,
      mutations: [],
      domain: DOMAIN,
    });
    const move = geometry.flows.find(
      (flow) => flow.kind === "move" && flow.fromId === "L2",
    );
    const source = geometry.rails[0];
    const ending = source.spans[source.spans.length - 1];
    expect(move).toBeDefined();
    expect(round(move?.srcTop ?? -1)).toBe(round(spanTop(ending)));
    expect(round(move?.srcBottom ?? -1)).toBe(round(spanBottom(ending)));
    expect(round(move?.x0 ?? -1)).toBe(round(ending.x2));
  });

  it("bridges an untouched rail with a carry of equal width at both ends", () => {
    const geometry = geometryOf();
    const carries = filter(
      (flow: FlowBand) => flow.kind === "carry" || flow.kind === "continuation",
      geometry.flows,
    );
    expect(carries.length).toBeGreaterThan(0);
    const straight = filter(
      (flow: FlowBand) =>
        Math.abs(
          flow.srcBottom - flow.srcTop - (flow.dstBottom - flow.dstTop),
        ) < 0.001,
      carries,
    );
    expect(straight.length).toBeGreaterThan(0);
  });
});

describe("continuations — a rail nothing happened to must not read as dashed", () => {
  const geometry = geometryOf();

  it("marks a cap where nothing left and nothing arrived as a CONTINUATION", () => {
    // l5 holds 3 across the 2025-04 change, which belongs to l6 and l7.
    // It is split there only because the chart splits every rail at every
    // change; nothing happened to IT.
    const at = changeXs()[1];
    const continuation = find(
      (flow: FlowBand) =>
        flow.kind === "continuation" &&
        Math.abs((flow.x0 + flow.x1) / 2 - at) < 0.001 &&
        flow.fromId === "l5",
      geometry.flows,
    );
    expect(continuation).toBeDefined();
    // Same width both ends, so the join is geometrically invisible too.
    expect(
      round(continuation?.srcBottom ?? 0) - round(continuation?.srcTop ?? 0),
    ).toBe(
      round(continuation?.dstBottom ?? 0) - round(continuation?.dstTop ?? 0),
    );
  });

  it("keeps a CARRY where the rail's width really did change", () => {
    // l7 gains two at 2025-04, so its carry is narrower than the band after it.
    const at = changeXs()[1];
    const carry = find(
      (flow: FlowBand) =>
        flow.kind === "carry" &&
        Math.abs((flow.x0 + flow.x1) / 2 - at) < 0.001 &&
        flow.fromId === "l7",
      geometry.flows,
    );
    expect(carry).toBeDefined();
  });

  it("names the SAME level at both ends either way — it is one rail", () => {
    for (const flow of filter(
      (one: FlowBand) => one.kind === "carry" || one.kind === "continuation",
      geometry.flows,
    )) {
      expect(flow.fromId).toBe(flow.toId);
    }
  });
});

describe("fill-height", () => {
  it("keeps the width-driven layout when the box has no height of its own", () => {
    // A box with no height reports exactly the height our own aspect gave it,
    // so the default comes back and nothing moves. One code path, not two.
    expect(viewHeightFor({ width: 640, height: 232 })).toBe(VIEW_HEIGHT);
    expect(viewHeightFor({ width: 1280, height: 464 })).toBe(VIEW_HEIGHT);
  });

  it("matches the viewBox to a box that DOES have a height", () => {
    // 800x320 is 2.5:1, so 640 wide wants 256 tall.
    expect(viewHeightFor({ width: 800, height: 320 })).toBe(256);
  });

  it("survives a box that has not been laid out yet", () => {
    expect(viewHeightFor({ width: 0, height: 0 })).toBe(VIEW_HEIGHT);
    expect(viewHeightFor({ width: 800, height: 0 })).toBe(VIEW_HEIGHT);
  });

  it("refuses to shrink past the point where there is any plot left", () => {
    expect(viewHeightFor({ width: 2000, height: 10 })).toBe(MIN_VIEW_HEIGHT);
    expect(frameFor(10).plotHeight).toBeGreaterThan(0);
  });

  it("keeps the plot at 60% of the box or better, at every height", () => {
    for (const viewHeight of [MIN_VIEW_HEIGHT, 100, 156, 195, 232, 480]) {
      const frame = frameFor(viewHeight);
      expect(frame.plotHeight / frame.viewHeight).toBeGreaterThanOrEqual(
        MIN_PLOT_FRACTION - 1e-9,
      );
    }
  });

  it("stretches ONLY the plot — the chrome bands are fixed", () => {
    const tall = frameFor(400);
    expect(tall.compact).toBe(false);
    expect(tall.plotTop).toBe(PLOT_TOP);
    expect(tall.viewHeight - tall.plotBottom).toBe(
      DEFAULT_FRAME.viewHeight - DEFAULT_FRAME.plotBottom,
    );
    expect(tall.plotHeight).toBeGreaterThan(DEFAULT_FRAME.plotHeight);
  });

  it("lays the whole chart out inside whatever height it is given", () => {
    for (const viewHeight of [160, 232, 320, 480]) {
      const geometry = levelsRailGeometry({
        levels: LEVELS,
        transfers: TRANSFERS,
        mutations: MUTATIONS,
        domain: DOMAIN,
        viewHeight,
      });
      const frame = geometry.frame;
      expect(frame.viewHeight).toBe(viewHeight);
      for (const rail of geometry.rails) {
        for (const span of rail.spans) {
          expect(spanTop(span)).toBeGreaterThanOrEqual(frame.plotTop);
          expect(spanBottom(span)).toBeLessThanOrEqual(frame.plotBottom);
        }
      }
      // The axis and the flags' rules stay inside the viewBox too.
      expect(frame.axisLabelY).toBeLessThanOrEqual(frame.viewHeight);
      for (const flag of geometry.flags) {
        expect(flag.ruleBottom).toBe(frame.plotBottom);
      }
    }
  });

  it("still fits the bands when the box is squashed", () => {
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers: TRANSFERS,
      mutations: MUTATIONS,
      domain: DOMAIN,
      viewHeight: MIN_VIEW_HEIGHT,
    });
    expect(geometry.perCount).toBeGreaterThan(0);
    expect(geometry.perCount).toBeLessThan(
      levelsRailGeometry({
        levels: LEVELS,
        transfers: TRANSFERS,
        mutations: MUTATIONS,
        domain: DOMAIN,
        viewHeight: 480,
      }).perCount,
    );
  });
});

describe("levelsAt — the hover readout's rows", () => {
  it("is every level holding anything, highest value first", () => {
    const rows = levelsAt(LEVELS, utc("2025-08-01"));
    expect(map((row: LevelRow) => row.label, rows)).toEqual([
      "L8",
      "L7",
      "L6",
      "L5",
    ]);
    expect(map((row: LevelRow) => row.count, rows)).toEqual([1, 4, 2, 4]);
  });

  it("leaves out a level nobody holds — a row of zero is noise", () => {
    // L8 has nobody before 2025-07.
    const rows = levelsAt(LEVELS, utc("2025-02-01"));
    expect(map((row: LevelRow) => row.label, rows)).not.toContain("L8");
  });

  it("carries the value through unformatted — that is the consumer's", () => {
    const [top] = levelsAt(LEVELS, utc("2025-08-01"));
    expect(top.value).toBe(10000);
  });

  it("is empty before anything starts, rather than throwing", () => {
    expect(levelsAt(LEVELS, utc("2024-01-01"))).toEqual([]);
    expect(levelsAt([], utc("2025-08-01"))).toEqual([]);
  });
});

describe("timeAtX — the inverse scale", () => {
  it("round-trips the domain ends", () => {
    expect(timeAtX(DOMAIN, PLOT_LEFT)).toBe(timeOf(DOMAIN[0]));
    expect(timeAtX(DOMAIN, PLOT_RIGHT)).toBe(timeOf(DOMAIN[1]));
  });

  it("round-trips a date through both scales", () => {
    const x = xScaleFor(DOMAIN);
    const at = timeOf(utc("2025-07-01"));
    expect(Math.round(timeAtX(DOMAIN, x(at)) / 1000)).toBe(
      Math.round(at / 1000),
    );
  });

  it("clamps outside the plot rather than extrapolating", () => {
    expect(timeAtX(DOMAIN, -500)).toBe(timeOf(DOMAIN[0]));
    expect(timeAtX(DOMAIN, 9999)).toBe(timeOf(DOMAIN[1]));
  });

  it("reads a zero-width domain as its start instead of NaN", () => {
    expect(timeAtX([5, 5], 300)).toBe(5);
  });
});

describe("snapToMonth", () => {
  const day = (time: number) => new Date(time).toISOString().slice(0, 10);

  it("snaps back to the month it is in when that is nearer", () => {
    expect(day(snapToMonth(timeOf(utc("2025-07-05"))))).toBe("2025-07-01");
  });

  it("snaps forward to the next month when THAT is nearer", () => {
    expect(day(snapToMonth(timeOf(utc("2025-07-28"))))).toBe("2025-08-01");
  });

  it("leaves a boundary exactly where it is", () => {
    expect(day(snapToMonth(timeOf(utc("2025-07-01"))))).toBe("2025-07-01");
  });

  it("crosses a year boundary the same way", () => {
    expect(day(snapToMonth(timeOf(utc("2025-12-28"))))).toBe("2026-01-01");
  });
});

describe("hoverAt", () => {
  const x = xScaleFor(DOMAIN);

  it("puts the crosshair on the SNAPPED date, not under the pointer", () => {
    // A rule landing between two months would invite the reader to believe
    // the table describes the gap.
    const pointer = x(utc("2025-07-05"));
    const hover = hoverAt(LEVELS, DOMAIN, pointer);
    expect(hover.x).toBe(x(utc("2025-07-01")));
    expect(hover.x).not.toBe(pointer);
  });

  it("reports the rows for the snapped date", () => {
    const hover = hoverAt(LEVELS, DOMAIN, x(utc("2025-08-10")));
    expect(new Date(hover.at).toISOString().slice(0, 10)).toBe("2025-08-01");
    expect(hover.rows).toHaveLength(4);
  });

  it("never leaves the domain, even snapping past its end", () => {
    const hover = hoverAt(LEVELS, DOMAIN, PLOT_RIGHT);
    expect(hover.at).toBeLessThanOrEqual(timeOf(DOMAIN[1]));
    expect(hover.x).toBeLessThanOrEqual(PLOT_RIGHT);
  });
});

describe("compact chrome — the board's short cell", () => {
  /** Seven levels across three bands, a count of one each. */
  const BOARD: readonly Level[] = map(
    (figure: number) => ({
      id: `L${figure}`,
      label: `L${figure}`,
      value: figure,
      points: [{ at: utc("2025-01-01"), count: 1 }],
    }),
    [2000, 3000, 4000, 6000, 7000, 9000, 10000],
  );

  it("draws rails with POSITIVE height in an 800x156 box", () => {
    // The regression: full chrome (78 of 125 units) left a 46-unit plot, the
    // tightest of seven unevenly-spaced levels sat 3.74 units apart, the
    // absolute 4-unit margin ate all of it, and the adjacency cap came out at
    // exactly ZERO — so every band was zero tall and the chart drew its flags,
    // axis and rules over nothing.
    const geometry = levelsRailGeometry({
      levels: BOARD,
      transfers: [],
      mutations: MUTATIONS,
      domain: DOMAIN,
      box: { width: 800, height: 156 },
    });
    expect(geometry.frame.compact).toBe(true);
    expect(geometry.perCount).toBeGreaterThan(0);
    expect(geometry.rails).toHaveLength(7);
    for (const rail of geometry.rails) {
      expect(rail.spans.length).toBeGreaterThan(0);
      for (const span of rail.spans) {
        expect(span.width).toBeGreaterThan(0);
        expect(spanBottom(span) - spanTop(span)).toBeGreaterThan(0);
      }
      expect(rail.runs.length).toBeGreaterThan(0);
    }
  });

  it("never lets a cap of zero mean a band of zero", () => {
    // Tightly-stacked levels in a short plot: the caps may say there is no
    // room, and the answer is still a visible band, not an invisible one.
    const tight: readonly Level[] = map(
      (figure: number) => ({
        id: `t${figure}`,
        label: `t${figure}`,
        value: figure,
        points: [{ at: utc("2025-01-01"), count: 1 }],
      }),
      [1000, 1010, 1020, 1030, 1040, 1050],
    );
    const geometry = levelsRailGeometry({
      levels: tight,
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      box: { width: 2202, height: 116 },
    });
    expect(geometry.perCount).toBeGreaterThanOrEqual(MIN_PER_COUNT);
    for (const rail of geometry.rails) {
      for (const span of rail.spans) expect(span.width).toBeGreaterThan(0);
    }
  });

  it("thins dated labels rather than overlapping them in a narrow box", () => {
    // A sub-year domain on a narrow card: nine month ticks, too close for a
    // label each at the filler clearance, so some stay bare ticks.
    const short: TimeDomain = [utc("2025-01-01"), utc("2025-11-01")];
    const geometry = levelsRailGeometry({
      levels: BOARD,
      transfers: [],
      mutations: MUTATIONS,
      domain: short,
      box: { width: MIN_VIEW_WIDTH, height: 156 },
    });
    const labelled = filter((tick) => tick.showLabel, geometry.ticks);
    expect(geometry.ticks).toHaveLength(11);
    expect(labelled.length).toBeLessThan(geometry.ticks.length);
    expect(labelled.length).toBeGreaterThan(2);
  });

  it("keeps full chrome when the box can afford it", () => {
    const geometry = levelsRailGeometry({
      levels: BOARD,
      transfers: [],
      mutations: MUTATIONS,
      domain: DOMAIN,
      box: { width: 800, height: 320 },
    });
    expect(geometry.frame.compact).toBe(false);
    expect(geometry.frame.plotTop).toBe(PLOT_TOP);
    // A one-year domain is months: thirteen ticks, and the three flags fall
    // on month starts, so they are among them.
    expect(geometry.ticks).toHaveLength(13);
    expect(
      filter((tick) => tick.event && tick.showLabel, geometry.ticks),
    ).toHaveLength(3);
  });
});

describe("frameForBox — one unit is one CSS pixel", () => {
  const aspectOf = (frame: { viewWidth: number; viewHeight: number }) =>
    frame.viewWidth / frame.viewHeight;

  it("IS the box, when the box is big enough to be taken literally", () => {
    const frame = frameForBox({ width: 800, height: 320 });
    expect(frame.viewWidth).toBe(800);
    expect(frame.viewHeight).toBe(320);
    // One unit is one pixel, so a 9-unit label is 9px on any card.
    expect(aspectOf(frame)).toBeCloseTo(800 / 320, 6);
  });

  it("matches the aspect of a WIDE SHORT box — the board's real shape", () => {
    // 2218x134 is 16.6:1. The old fixed-640 viewBox was 2.76:1 there, and
    // `meet` drew the whole chart into 16% of the cell's width.
    const frame = frameForBox({ width: 2218, height: 134 });
    expect(aspectOf(frame)).toBeCloseTo(2218 / 134, 6);
    expect(frame.viewWidth).toBe(2218);
    expect(frame.viewHeight).toBe(134);
  });

  it("keeps the aspect EXACT when the plot-quality floor bites", () => {
    // Both dimensions scale together, so this is a smaller effective scale,
    // never a letterbox.
    const frame = frameForBox({ width: 2202, height: 40 });
    expect(frame.viewHeight).toBe(MIN_VIEW_HEIGHT);
    expect(aspectOf(frame)).toBeCloseTo(2202 / 40, 6);
    expect(frame.viewWidth).toBeGreaterThan(2202);
  });

  it("holds the pixel scale constant across card widths", () => {
    // The whole point: the same label is the same size on both cards.
    const narrow = frameForBox({ width: 718, height: 260 });
    const wide = frameForBox({ width: 2218, height: 260 });
    expect(narrow.viewHeight).toBe(260);
    expect(wide.viewHeight).toBe(260);
    expect(wide.viewWidth / 2218).toBe(narrow.viewWidth / 718);
  });

  it("scales the plot with the box, not just the frame", () => {
    const frame = frameForBox({ width: 2218, height: 134 });
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers: TRANSFERS,
      mutations: MUTATIONS,
      domain: DOMAIN,
      box: { width: 2218, height: 134 },
    });
    const rail = geometry.rails[0];
    const last = rail.spans[rail.spans.length - 1];
    expect(last.x2).toBe(frame.plotRight);
    expect(last.x2).toBeGreaterThan(VIEW_WIDTH);
  });

  it("refuses a box too narrow to hold a chart at all", () => {
    expect(frameForBox({ width: 100, height: 300 }).viewWidth).toBe(
      MIN_VIEW_WIDTH,
    );
  });

  it("falls back to the default before the box has been laid out", () => {
    expect(frameForBox({ width: 0, height: 0 })).toBe(DEFAULT_FRAME);
  });
});

describe("a band is never thicker than MAX_BAND_PX", () => {
  // This describe was the SOLO cap's (b9fa493: "a lone rail is a rail, not a
  // wall"). That cap was a fraction of the plot and could never bind below
  // 14 units per head; the absolute ten-px ceiling replaced it, and these
  // tests now pin the ceiling — which is the behaviour they always meant.
  const SOLO: readonly Level[] = [
    {
      id: "one",
      label: "One",
      value: 80000,
      points: [{ at: utc("2025-01-01"), count: 2 }],
    },
  ];
  const BOX = { width: 1329, height: 188 };

  const soloGeometry = (levels: readonly Level[] = SOLO) =>
    levelsRailGeometry({
      levels,
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      box: BOX,
    });

  it("does not let one level absorb the whole fill allowance", () => {
    // Before: `fillWidth` grants the PEAK 60% of the plot, and with a single
    // level that one band took all of it — 103 units in a 172-unit plot.
    const span = soloGeometry().rails[0].spans[0];
    expect(span.width).toBeLessThanOrEqual(MAX_BAND_PX + 0.001);
    expect(span.width).toBeGreaterThan(0);
  });

  it("leaves air above and below it", () => {
    const geometry = soloGeometry();
    const span = geometry.rails[0].spans[0];
    const frame = geometry.frame;
    expect(spanTop(span) - frame.plotTop).toBeGreaterThan(20);
    expect(frame.plotBottom - spanBottom(span)).toBeGreaterThan(20);
  });

  it("still thickens in proportion as the level fills up", () => {
    // The ceiling divides by the same peak count, so relative thickness over
    // time is untouched: two of a peak of five is still two fifths.
    const growing: readonly Level[] = [
      {
        id: "one",
        label: "One",
        value: 80000,
        points: [
          { at: utc("2025-01-01"), count: 2 },
          { at: utc("2025-07-01"), count: 5 },
        ],
      },
    ];
    const [first, last] = soloGeometry(growing).rails[0].spans;
    expect(round(last.width / first.width)).toBe(round(5 / 2));
    expect(last.width).toBeLessThanOrEqual(MAX_BAND_PX + 0.001);
  });

  it("holds for a STACK, and for counts far too high to fit", () => {
    // The ceiling is per BAND, so the fattest band on the chart is the one
    // that touches it — whatever the rest of the stack is doing.
    const crowded: readonly Level[] = map(
      (figure: number) => ({
        id: `p${figure}`,
        label: `L${figure / 1000}`,
        value: figure,
        points: [{ at: utc("2025-01-01"), count: 40 }],
      }),
      [60000, 70000, 80000, 90000],
    );
    const widths = flatMap(
      (rail: { spans: readonly RailSpan[] }) =>
        map((span: RailSpan) => span.width, rail.spans),
      soloGeometry(crowded).rails,
    );
    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) {
      expect(width).toBeLessThanOrEqual(MAX_BAND_PX + 0.001);
    }
  });

  it("is the cap that binds, not one of the proportional three", () => {
    const frame = frameForBox(BOX);
    const yScale = yScaleFor(valueDomainOf(SOLO), frame);
    expect(maxBandWidth(SOLO)).toBe(MAX_BAND_PX / 2);
    expect(perCountWidth(SOLO, yScale, peakTotal(SOLO), frame)).toBe(
      maxBandWidth(SOLO),
    );
    expect(maxBandWidth(SOLO)).toBeLessThan(
      Math.min(
        fillWidth(peakTotal(SOLO), frame),
        adjacencyWidth(SOLO, yScale),
        edgeWidth(SOLO, yScale, frame),
      ),
    );
  });

  it("counts only levels anybody HOLDS — an empty level has no band", () => {
    const withGhosts: readonly Level[] = [
      ...SOLO,
      { id: "ghost", label: "Ghost", value: 90000, points: [] },
    ];
    expect(maxBandWidth(withGhosts)).toBe(maxBandWidth(SOLO));
  });

  it("centres every band on its own value", () => {
    // Peter, 2026-09-16: "The ribbons should be centered on the correct
    // amounts." A band's top and bottom are equidistant from y(value), so a
    // rail thickening never appears to move.
    const geometry = soloGeometry(LEVELS);
    for (const rail of geometry.rails) {
      for (const span of rail.spans) {
        expect(round(rail.y - spanTop(span))).toBe(
          round(spanBottom(span) - rail.y),
        );
        expect(round(span.y)).toBe(round(rail.y));
      }
    }
  });
});

describe("the value axis", () => {
  const BOX = { width: 1329, height: 188 };
  const geometryWith = (
    valueDomain?: readonly [number, number],
    box: { width: number; height: number } = BOX,
  ) =>
    levelsRailGeometry({
      levels: LEVELS,
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      box,
      valueDomain,
      formatValue: (value: number) => `$${value / 1000}k`,
    });

  it("puts every tick inside the value domain, in order", () => {
    const geometry = geometryWith();
    const [lo, hi] = geometry.yDomain;
    expect(geometry.yTicks.length).toBeGreaterThanOrEqual(2);
    for (const tick of geometry.yTicks) {
      expect(tick.value).toBeGreaterThanOrEqual(lo);
      expect(tick.value).toBeLessThanOrEqual(hi);
    }
    const values = map((tick: ValueTick) => tick.value, geometry.yTicks);
    expect(values).toEqual(sortBy((value: number) => value, values));
  });

  it("labels a tick with the CONSUMER's formatter", () => {
    const geometry = geometryWith([60000, 100000]);
    const labels = map((tick: ValueTick) => tick.label, geometry.yTicks);
    expect(labels).toContain("$80k");
  });

  it("places a tick where the scale places its value", () => {
    const geometry = geometryWith();
    const yScale = yScaleFor(geometry.yDomain, geometry.frame);
    for (const tick of geometry.yTicks) {
      expect(round(tick.y)).toBe(round(yScale(tick.value)));
    }
  });

  it("reserves a gutter for the labels, and the plot starts after it", () => {
    const geometry = geometryWith([60000, 100000]);
    const labels = map((tick: ValueTick) => tick.label, geometry.yTicks);
    // The plot starts at the gutter or at the first date label's leftward
    // reach (PLOT_LEFT), whichever is further in.
    expect(geometry.frame.plotLeft).toBe(
      Math.max(PLOT_LEFT, gutterWidth(labels)),
    );
    const wide = levelsRailGeometry({
      levels: LEVELS,
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      box: BOX,
      valueDomain: [60000, 100000],
      formatValue: (value: number) => `$${value}.00/yr`,
    });
    const wideLabels = map((tick: ValueTick) => tick.label, wide.yTicks);
    expect(wide.frame.plotLeft).toBe(gutterWidth(wideLabels));
    expect(wide.frame.plotLeft).toBeGreaterThan(PLOT_LEFT);
    // …and nothing is drawn to the left of it.
    const firstSpan = geometry.rails[0].spans[0];
    expect(firstSpan.x1).toBeGreaterThanOrEqual(geometry.frame.plotLeft);
  });

  it("never lets the gutter eat the plot, however long a label is", () => {
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      box: BOX,
      formatValue: (value: number) => `a very long label indeed ${value}`,
    });
    expect(geometry.frame.plotLeft).toBeLessThanOrEqual(
      geometry.frame.viewWidth * MAX_GUTTER_FRACTION,
    );
    expect(geometry.frame.plotRight).toBeGreaterThan(geometry.frame.plotLeft);
  });

  it("thins to fewer ticks in compact chrome", () => {
    const short = geometryWith(undefined, { width: 1329, height: 60 });
    expect(short.frame.compact).toBe(true);
    expect(short.yTicks.length).toBeLessThanOrEqual(COMPACT_Y_TICK_TARGET + 1);
    expect(short.yTicks.length).toBeGreaterThan(0);
  });

  it("rounds a DERIVED domain out to whole ticks", () => {
    // 5000..10000 is already round; a ragged one is what proves the nicing.
    expect(niceValueDomain([4300, 9100])).toEqual([4000, 10000]);
    const ragged: readonly Level[] = map(
      (figure: number) => ({
        id: `r${figure}`,
        label: `L${figure}`,
        value: figure,
        points: [{ at: utc("2025-01-01"), count: 1 }],
      }),
      [4300, 9100],
    );
    expect(valueDomainFor(ragged)).toEqual([4000, 10000]);
  });

  it("leaves a PINNED domain exactly as the consumer gave it", () => {
    // Widening a pin to the nearest round number is the same betrayal as
    // widening it to fit the data.
    expect(valueDomainFor(LEVELS, [4300, 9100])).toEqual([4300, 9100]);
    expect(geometryWith([4300, 9100]).yDomain).toEqual([4300, 9100]);
  });

  it("returns a range too narrow for a step untouched", () => {
    // One tick or none: there is no step to round to, so nothing is rounded.
    expect(valueTicks([1.05, 1.15], 1)).toHaveLength(1);
    expect(niceValueDomain([1.05, 1.15], 1)).toEqual([1.05, 1.15]);
  });

  it("does not drift a range that is ALREADY on whole ticks", () => {
    // Floor/ceil on a step derived by division is where FP noise would
    // creep in and widen an axis by a billionth on every render.
    expect(niceValueDomain([5000, 10000])).toEqual([5000, 10000]);
    expect(niceValueDomain([0, 1])).toEqual([0, 1]);
  });
});

describe("quarterLabelOf", () => {
  it("names the quarter a moment falls in", () => {
    expect(quarterLabelOf(utc("2025-01-01"))).toBe("2025-Q1");
    expect(quarterLabelOf(utc("2025-02-14"))).toBe("2025-Q1");
    expect(quarterLabelOf(utc("2025-04-01"))).toBe("2025-Q2");
    expect(quarterLabelOf(utc("2025-09-30"))).toBe("2025-Q3");
    expect(quarterLabelOf(utc("2025-12-31"))).toBe("2025-Q4");
  });

  it("takes a Date or a raw timestamp, like everything else here", () => {
    expect(quarterLabelOf(timeOf(utc("2026-07-05")))).toBe("2026-Q3");
    expect(quarterLabelOf(utc("2026-07-05"))).toBe("2026-Q3");
  });

  it("is the SAME format the axis paints — one definition, not two", () => {
    // The board reimplemented this because there was nothing to call. If the
    // two ever drift, the chart and the chips beside it read as different
    // clocks.
    const ticks = quarterTicks(DOMAIN, (at) => timeOf(at) / 1e12);
    expect(ticks[0].label).toBe(quarterLabelOf(DOMAIN[0]));
    expect(ticks[2].label).toBe(quarterLabelOf(utc("2025-07-01")));
  });
});

describe("a pinned value domain holds the rails still", () => {
  // A MIDDLE rail is what makes this test honest: the lowest level always
  // sits at the bottom of the scale whatever the top is, so watching it prove
  // nothing. The middle one moves iff the range moves.
  const moving = (figure: number): readonly Level[] => [
    {
      id: "low",
      label: "Low",
      value: 60000,
      points: [{ at: utc("2025-01-01"), count: 1 }],
    },
    {
      id: "mid",
      label: "Mid",
      value: 80000,
      points: [{ at: utc("2025-01-01"), count: 1 }],
    },
    {
      id: "moves",
      label: "Moves",
      value: figure,
      points: [{ at: utc("2025-01-01"), count: 1 }],
    },
  ];
  const PINNED: readonly [number, number] = [50000, 120000];
  const geometryFor = (
    figure: number,
    valueDomain?: readonly [number, number],
  ) =>
    levelsRailGeometry({
      levels: moving(figure),
      transfers: [],
      mutations: [],
      domain: DOMAIN,
      valueDomain,
    });

  it("is byte-identical to today when the prop is omitted", () => {
    const derived = geometryFor(100000);
    expect(derived.yDomain).toEqual(valueDomainOf(moving(100000)));
    expect(derived.rails[1].y).toBe(
      yScaleFor(valueDomainOf(moving(100000)), derived.frame)(80000),
    );
  });

  it("holds the OTHER rail still while one value moves", () => {
    // Unpinned, raising one level slides them all: the range they are all
    // drawn against just changed.
    const before = geometryFor(90000, PINNED);
    const after = geometryFor(110000, PINNED);
    expect(after.rails[1].y).toBe(before.rails[1].y);
    // …and the one that moved has moved.
    expect(after.rails[2].y).not.toBe(before.rails[2].y);
  });

  it("is exactly what the unpinned scale would NOT do", () => {
    const loose = geometryFor(110000);
    const tight = geometryFor(90000);
    // Proof the test above is testing something: without pinning, the
    // untouched MIDDLE rail moves too.
    expect(loose.rails[1].y).not.toBe(tight.rails[1].y);
  });

  it("clamps a level outside the pin rather than widening it", () => {
    // The consumer said where the axis runs; silently moving it would defeat
    // pinning it.
    const outside = geometryFor(400000, PINNED);
    expect(outside.yDomain).toEqual(PINNED);
    expect(outside.rails[2].y).toBe(
      yScaleFor(PINNED, outside.frame)(PINNED[1]),
    );
  });

  it("takes a reversed pin without turning the chart upside down", () => {
    expect(
      levelsRailGeometry({
        levels: moving(80000),
        transfers: [],
        mutations: [],
        domain: DOMAIN,
        valueDomain: [120000, 50000],
      }).yDomain,
    ).toEqual(PINNED);
  });

  it("opens out a zero-height pin instead of dividing by zero", () => {
    const flat = geometryFor(80000, [80000, 80000]);
    expect(flat.yDomain[1]).toBeGreaterThan(flat.yDomain[0]);
    for (const rail of flat.rails) expect(rail.y).not.toBeNaN();
  });
});

// ── numbered, dated, draggable flags (Peter, 2026-09-24) ─────────────────────

describe("numbered flags", () => {
  /** Peter's sketch: five events, 4 and 5 close together, one unlabelled. */
  const SKETCH: readonly Mutation[] = [
    {
      id: "raise",
      at: utc("2026-10-03"),
      label: "10-03",
      details: ["Person 2"],
    },
    { id: "start", at: utc("2026-09-01"), label: "09-01" },
    {
      id: "hire",
      at: utc("2026-11-15"),
      label: "",
      details: ["Payroll 1", "Person 3"],
    },
    { id: "late", at: utc("2027-01-10"), label: "late" },
    { id: "early", at: utc("2027-01-03"), label: "early" },
  ];
  const SKETCH_DOMAIN: TimeDomain = [utc("2026-09-01"), utc("2027-01-15")];

  it("numbers flags 1..n in TIME order, ignoring the consumer's label", () => {
    const flags = flagPositions(SKETCH, xScaleFor(SKETCH_DOMAIN));
    expect(map((flag) => [flag.id, flag.label], flags)).toEqual([
      ["start", "1"],
      ["raise", "2"],
      ["hire", "3"],
      ["early", "4"],
      ["late", "5"],
    ]);
    expect(mutationNumbers(SKETCH).get("late")).toBe(5);
    // The label survives as the announced title; details ride along.
    expect(flags[1].title).toBe("10-03");
    expect(flags[2].title).toBe("");
    expect(flags[2].details).toEqual(["Payroll 1", "Person 3"]);
    expect(flags[3].details).toEqual([]);
    expect(flags[0].at).toBe(timeOf(utc("2026-09-01")));
  });

  it("uses ONE box width, and it fits two digits", () => {
    expect(FLAG_BOX_WIDTH).toBeGreaterThanOrEqual(
      FLAG_MAX_DIGITS * FLAG_DIGIT_PX + 2 * FLAG_PAD_X,
    );
    const many: readonly Mutation[] = map(
      (day: number) => ({
        id: `d${day}`,
        at: utc(`2026-09-${day < 10 ? `0${day}` : day}`),
        label: `d${day}`,
      }),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
    const flags: readonly Flag[] = flagPositions(
      many,
      xScaleFor(SKETCH_DOMAIN),
    );
    expect(flags[11].label).toBe("12");
    expect(new Set(map((flag) => flag.boxWidth, flags))).toEqual(
      new Set([FLAG_BOX_WIDTH]),
    );
  });

  it("keeps a right-edge flag on its rule in a WIDE measured frame", () => {
    // The box was clamped to the default 640, so on a 2000-wide card a flag
    // at x≈1980 sat at 622 with its rule a card-width away.
    const frame = frameForBox({ width: 2000, height: 300 });
    const flags = flagPositions(
      [{ id: "end", at: SKETCH_DOMAIN[1], label: "end" }],
      xScaleFor(SKETCH_DOMAIN, frame),
      frame,
    );
    expect(flags[0].textX).toBeCloseTo(flags[0].x, 6);
    expect(flags[0].boxX + flags[0].boxWidth).toBeLessThanOrEqual(
      frame.viewWidth,
    );
  });

  it("keeps two flags 13 days apart from overlapping on a ~1000px card", () => {
    // The reported thorcasting case. Boxes collide when the gap in days is
    // under FLAG_BOX_WIDTH × domainDays / plotWidth: on this 12-month frame
    // that is ~8 days, so 13 clears; on a 36-month domain it would not.
    const frame = frameForBox({ width: 1000, height: 250 });
    const year: TimeDomain = [utc("2026-01-01"), utc("2027-01-01")];
    const flags = flagPositions(
      [
        { id: "a", at: utc("2026-09-05"), label: "09-05" },
        { id: "b", at: utc("2026-09-18"), label: "09-18" },
      ],
      xScaleFor(year, frame),
      frame,
    );
    expect(flags[0].boxX + flags[0].boxWidth).toBeLessThanOrEqual(
      flags[1].boxX,
    );
    const collideBelowDays =
      (FLAG_BOX_WIDTH * 365) / (frame.plotRight - frame.plotLeft);
    expect(collideBelowDays).toBeLessThan(13);
  });

  it("prints the sketch as a table — flags, then the dated axis", () => {
    const geometry = levelsRailGeometry({
      levels: [],
      transfers: [],
      mutations: SKETCH,
      domain: SKETCH_DOMAIN,
    });
    const flagTable = map(
      (flag) => ({
        n: flag.label,
        id: flag.id,
        date: isoDayOf(flag.at),
        x: Math.round(flag.x * 10) / 10,
        boxX: Math.round(flag.boxX * 10) / 10,
        details: join(", ", flag.details),
      }),
      geometry.flags,
    );
    const axisTable = map(
      (tick) => ({
        date: isoDayOf(tick.at),
        x: Math.round(tick.x * 10) / 10,
        event: tick.event,
        label: tick.showLabel ? tick.label : "·",
      }),
      geometry.ticks,
    );
    console.table(flagTable);
    console.table(axisTable);
    // Every flag date carries a label, in the sketch's own format.
    expect(
      map(
        (tick: AxisTick) => tick.label,
        filter(
          (tick: AxisTick) => tick.event && tick.showLabel,
          geometry.ticks,
        ),
      ),
    ).toEqual(["2026-09-01", "10-03", "11-15", "2027-01-03"]);
    // Pins 4 and 5 are too close for two flat labels: 5 keeps its event tick,
    // the tooltip carries its date.
    const late = find(
      (tick: AxisTick) => tick.at === timeOf(utc("2027-01-10")),
      geometry.ticks,
    );
    expect(late?.event).toBe(true);
    expect(late?.showLabel).toBe(false);
    // The first painted label is full, and so is the first after a year change.
    const painted = filter((tick) => tick.showLabel, geometry.ticks);
    expect(painted[0].label).toBe("2026-09-01");
  });
});

describe("flag collision — boxes nudge, rules stay", () => {
  const pitch = FLAG_BOX_WIDTH + FLAG_GAP;
  const noOverlap = (flags: readonly Flag[]) => {
    for (const [index, flag] of flags.entries()) {
      const next = flags[index + 1];
      if (next !== undefined) {
        expect(flag.boxX + flag.boxWidth + FLAG_GAP).toBeLessThanOrEqual(
          next.boxX + 1e-9,
        );
      }
    }
  };

  it("leaves flags with room to spare exactly where they were", () => {
    expect(nudgeFlagCentres([100, 200, 300], VIEW_WIDTH)).toEqual([
      100, 200, 300,
    ]);
  });

  it("spreads a colliding pair SYMMETRICALLY about its midpoint", () => {
    const [a, b] = nudgeFlagCentres([300, 304], VIEW_WIDTH);
    expect(b - a).toBeCloseTo(pitch, 9);
    expect((a + b) / 2).toBeCloseTo(302, 9);
  });

  it("merges a cascade — three flags a day apart become one even row", () => {
    const centres = nudgeFlagCentres([300, 302, 304, 400], VIEW_WIDTH);
    expect(centres[1] - centres[0]).toBeCloseTo(pitch, 9);
    expect(centres[2] - centres[1]).toBeCloseTo(pitch, 9);
    expect(centres[1]).toBeCloseTo(302, 9);
    expect(centres[3]).toBe(400);
  });

  it("keeps a nudged cluster on the canvas at either edge", () => {
    const left = nudgeFlagCentres([1, 2], VIEW_WIDTH);
    expect(left[0]).toBe(FLAG_BOX_WIDTH / 2);
    const right = nudgeFlagCentres(
      [VIEW_WIDTH - 2, VIEW_WIDTH - 1],
      VIEW_WIDTH,
    );
    expect(right[1]).toBe(VIEW_WIDTH - FLAG_BOX_WIDTH / 2);
    expect(right[1] - right[0]).toBeCloseTo(pitch, 9);
  });

  it("keeps flags ONE DAY apart clickable: no overlap, rules at the true x, leaders drawn", () => {
    const year: TimeDomain = [utc("2026-01-01"), utc("2027-01-01")];
    const scale = xScaleFor(year);
    const flags = flagPositions(
      [
        { id: "a", at: utc("2026-06-01"), label: "a" },
        { id: "b", at: utc("2026-06-02"), label: "b" },
        { id: "c", at: utc("2026-09-01"), label: "c" },
      ],
      scale,
    );
    noOverlap(flags);
    expect(flags[0].x).toBe(scale(utc("2026-06-01")));
    expect(flags[1].x).toBe(scale(utc("2026-06-02")));
    expect(map((flag) => flag.displaced, flags)).toEqual([true, true, false]);
    expect(flags[0].ruleTop).toBe(FLAG_RULE_TOP + FLAG_LEADER_DROP);
    expect(flags[2].ruleTop).toBe(FLAG_RULE_TOP);
    // The nudge is sideways only, and each box sits on its own side of the pair.
    expect(flags[0].textX).toBeLessThan(flags[0].x);
    expect(flags[1].textX).toBeGreaterThan(flags[1].x);
  });

  it("never overlaps, however many flags pile into one week", () => {
    const year: TimeDomain = [utc("2026-01-01"), utc("2027-01-01")];
    const pile: readonly Mutation[] = map(
      (day: number) => ({
        id: `p${day}`,
        at: utc(`2026-12-${day < 10 ? `0${day}` : day}`),
        label: "",
      }),
      [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    );
    const flags = flagPositions(pile, xScaleFor(year));
    noOverlap(flags);
    for (const flag of flags) {
      expect(flag.boxX + flag.boxWidth).toBeLessThanOrEqual(VIEW_WIDTH);
    }
  });
});

describe("the dated axis", () => {
  const DOMAIN_Q: TimeDomain = [utc("2026-09-01"), utc("2027-01-15")];
  const x = xScaleFor(DOMAIN_Q);
  const painted = (ticks: readonly AxisTick[]) =>
    filter((tick: AxisTick) => tick.showLabel, ticks);
  const spanOf = (tick: AxisTick) =>
    labelPlacement(tick.x, axisLabelWidth(tick.label), VIEW_WIDTH);

  it("labels a flag date before any filler, and drops a colliding filler", () => {
    // 10-02 is a day off the Oct 1 month tick: the flag keeps its label, the
    // month tick goes bare.
    const ticks = datedAxisTicks(
      DOMAIN_Q,
      [{ id: "a", at: utc("2026-10-02"), label: "a" }],
      x,
    );
    const oct1 = find((tick) => tick.at === timeOf(utc("2026-10-01")), ticks);
    const oct2 = find((tick) => tick.at === timeOf(utc("2026-10-02")), ticks);
    expect(oct2?.showLabel).toBe(true);
    expect(oct2?.event).toBe(true);
    expect(oct1?.showLabel).toBe(false);
  });

  it("keeps two close flags as two EVENT TICKS but one label", () => {
    const ticks = datedAxisTicks(
      DOMAIN_Q,
      [
        { id: "a", at: utc("2026-11-10"), label: "a" },
        { id: "b", at: utc("2026-11-11"), label: "b" },
      ],
      x,
    );
    const events = filter((tick) => tick.event, ticks);
    expect(events).toHaveLength(2);
    expect(map((tick) => tick.showLabel, events)).toEqual([true, false]);
    // The exact position is still marked, by a longer tick.
    expect(map((tick) => tick.tickLength, events)).toEqual([
      EVENT_TICK_LENGTH,
      EVENT_TICK_LENGTH,
    ]);
    expect(find((tick) => !tick.event, ticks)?.tickLength).toBe(
      AXIS_TICK_LENGTH,
    );
  });

  it("writes the year only on the first painted label and at a year change", () => {
    const labels = map(
      (tick: AxisTick) => tick.label,
      painted(datedAxisTicks(DOMAIN_Q, [], x)),
    );
    expect(labels).toEqual([
      "2026-09-01",
      "10-01",
      "11-01",
      "12-01",
      "2027-01-01",
    ]);
  });

  it("never lets two painted labels overlap, however crowded", () => {
    const crowded: readonly Mutation[] = map(
      (day: number) => ({
        id: `d${day}`,
        at: utc(`2026-11-${day < 10 ? `0${day}` : day}`),
        label: `d${day}`,
      }),
      [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
    );
    const shown = painted(datedAxisTicks(DOMAIN_Q, crowded, x));
    expect(shown.length).toBeGreaterThan(2);
    for (const [index, tick] of shown.entries()) {
      const next = shown[index + 1];
      if (next !== undefined) {
        expect(spanOf(tick).right + AXIS_LABEL_GAP).toBeLessThanOrEqual(
          spanOf(next).left + 1e-9,
        );
      }
    }
    // …and every one of the ten still has its tick.
    expect(
      filter((tick) => tick.event, datedAxisTicks(DOMAIN_Q, crowded, x)),
    ).toHaveLength(10);
  });

  it("gives a filler more air than an event", () => {
    // Just wide enough for an event beside an event, not for a filler.
    expect(FILLER_LABEL_EXTRA_GAP).toBeGreaterThan(0);
  });

  it("gives no tick to a flag outside the domain", () => {
    const ticks = datedAxisTicks(
      DOMAIN_Q,
      [{ id: "out", at: utc("2027-03-01"), label: "out" }],
      x,
    );
    expect(filter((tick) => tick.event, ticks)).toHaveLength(0);
  });

  it("anchors an edge label inward so it stays on the canvas", () => {
    const ticks = painted(datedAxisTicks(DOMAIN_Q, [], x));
    expect(ticks[0].labelAnchor).toBe("start");
    expect(spanOf(ticks[0]).left).toBeGreaterThanOrEqual(0);
    for (const tick of ticks) {
      expect(spanOf(tick).right).toBeLessThanOrEqual(VIEW_WIDTH);
    }
    expect(labelPlacement(VIEW_WIDTH - 2, 54, VIEW_WIDTH).anchor).toBe("end");
    expect(labelPlacement(300, 54, VIEW_WIDTH).anchor).toBe("middle");
  });

  it("keeps the old shallow band — horizontal labels cost no height", () => {
    const frame = frameFor(VIEW_HEIGHT);
    expect(frame.viewHeight - frame.plotBottom).toBe(42);
    expect(MIN_VIEW_HEIGHT).toBe(72);
    expect(PLOT_LEFT).toBe(14);
    for (const tick of datedAxisTicks(
      DOMAIN_Q,
      [],
      xScaleFor(DOMAIN_Q, frame),
      frame,
    )) {
      expect(tick.labelY).toBe(frame.axisLabelY);
    }
  });
});

describe("abbreviateDates — one rule for the axis and the change tabs", () => {
  it("writes the year first and at each year change", () => {
    expect(
      abbreviateDates([
        utc("2026-10-01"),
        utc("2026-11-01"),
        utc("2027-01-13"),
        utc("2027-02-10"),
      ]),
    ).toEqual(["2026-10-01", "11-01", "2027-01-13", "02-10"]);
  });

  it("re-derives after a delete — 02-10 regains its year", () => {
    expect(
      abbreviateDates([
        utc("2026-10-01"),
        utc("2026-11-01"),
        utc("2027-02-10"),
      ]),
    ).toEqual(["2026-10-01", "11-01", "2027-02-10"]);
  });

  it("is empty for nothing and full for one", () => {
    expect(abbreviateDates([])).toEqual([]);
    expect(abbreviateDates([timeOf(utc("2026-10-01"))])).toEqual([
      "2026-10-01",
    ]);
  });

  it("is what the axis paints", () => {
    const domain: TimeDomain = [utc("2026-09-01"), utc("2027-01-15")];
    const shown = filter(
      (tick: AxisTick) => tick.showLabel,
      datedAxisTicks(domain, [], xScaleFor(domain)),
    );
    expect(map((tick: AxisTick) => tick.label, shown)).toEqual(
      abbreviateDates(map((tick: AxisTick) => tick.at, shown)),
    );
  });
});

describe("dragging a flag — the neighbour clamp", () => {
  /** Peter's example: pins on 2026-09-01 and 2026-10-15. */
  const PINS: readonly Mutation[] = [
    { id: "b", at: utc("2026-10-15"), label: "b" },
    { id: "a", at: utc("2026-09-01"), label: "a" },
    { id: "c", at: utc("2026-12-01"), label: "c" },
  ];
  const DRAG_DOMAIN: TimeDomain = [utc("2026-08-01"), utc("2027-01-31")];
  const day = (iso: string): number => timeOf(utc(iso));

  it("stops the 09-01 pin at 2026-10-14 — one day before its neighbour", () => {
    expect(
      isoDayOf(clampMutationTime(PINS, "a", day("2026-11-20"), DRAG_DOMAIN)),
    ).toBe("2026-10-14");
  });

  it("stops the 10-15 pin at 2026-09-02 going left and 2026-11-30 going right", () => {
    expect(
      isoDayOf(clampMutationTime(PINS, "b", day("2026-08-10"), DRAG_DOMAIN)),
    ).toBe("2026-09-02");
    expect(
      isoDayOf(clampMutationTime(PINS, "b", day("2027-01-20"), DRAG_DOMAIN)),
    ).toBe("2026-11-30");
  });

  it("lets the end pins run to the domain, and no further", () => {
    expect(
      isoDayOf(clampMutationTime(PINS, "a", day("2026-01-01"), DRAG_DOMAIN)),
    ).toBe("2026-08-01");
    expect(
      isoDayOf(clampMutationTime(PINS, "c", day("2028-01-01"), DRAG_DOMAIN)),
    ).toBe("2027-01-31");
  });

  it("snaps to the nearest UTC day", () => {
    const noonish = day("2026-10-01") + 13 * 3_600_000;
    expect(isoDayOf(snapToDay(noonish))).toBe("2026-10-02");
    expect(isoDayOf(clampMutationTime(PINS, "b", noonish, DRAG_DOMAIN))).toBe(
      "2026-10-02",
    );
    expect(snapToDay(day("2026-10-01") + 11 * 3_600_000) % DAY_MS).toBe(0);
  });

  it("stays put when its neighbours leave it no room", () => {
    const squeezed: readonly Mutation[] = [
      { id: "x", at: utc("2026-10-01"), label: "x" },
      { id: "y", at: utc("2026-10-02"), label: "y" },
      { id: "z", at: utc("2026-10-03"), label: "z" },
    ];
    expect(isoDayOf(clampMutationTime(squeezed, "y", day("2026-12-01")))).toBe(
      "2026-10-02",
    );
  });

  it("resolves a pointer x to a clamped day", () => {
    const frame = frameFor(VIEW_HEIGHT);
    const scale = xScaleFor(DRAG_DOMAIN, frame);
    // Dragged all the way to the right edge: the neighbour wins.
    expect(
      isoDayOf(dragTimeAt(PINS, "a", frame.plotRight, DRAG_DOMAIN, frame)),
    ).toBe("2026-10-14");
    // Dragged onto its own x: stays on its own day.
    expect(
      isoDayOf(
        dragTimeAt(PINS, "a", scale(utc("2026-09-01")), DRAG_DOMAIN, frame),
      ),
    ).toBe("2026-09-01");
    expect(DRAG_THRESHOLD_PX).toBeGreaterThan(0);
  });
});

describe("pick strategies — what a click on the plot reports", () => {
  const WINDOW: TimeDomain = [utc("2026-08-01"), utc("2027-02-01")];
  const at = (iso: string): number => timeOf(new Date(iso));

  it("pickDay: the whole day under the pointer, floored, clamped to the domain", () => {
    const table = map(
      (raw: string) => [raw, isoDayOf(pickDay(at(raw), WINDOW))],
      [
        "2026-10-17T00:00:00Z",
        "2026-10-17T11:59:00Z",
        "2026-10-17T23:59:59Z",
        "2026-12-31T18:00:00Z",
        "2026-07-10T12:00:00Z",
        "2027-03-10T12:00:00Z",
      ],
    );
    console.table(table);
    expect(map(([, day]) => day, table)).toEqual([
      "2026-10-17",
      "2026-10-17",
      "2026-10-17",
      "2026-12-31",
      "2026-08-01",
      "2027-02-01",
    ]);
  });

  it("the deprecated fallback still snaps to the nearest month, as before", () => {
    expect(isoDayOf(pickNearestMonth(at("2026-10-17T00:00:00Z"), WINDOW))).toBe(
      "2026-11-01",
    );
    expect(isoDayOf(pickNearestMonth(at("2026-10-10T00:00:00Z"), WINDOW))).toBe(
      "2026-10-01",
    );
  });

  it("puts the hover crosshair on the date the strategy picks", () => {
    const frame = frameFor(VIEW_HEIGHT);
    const scale = xScaleFor(WINDOW, frame);
    const x = scale(utc("2026-10-17T15:00:00Z"));
    const byDay = hoverAt([], WINDOW, x, frame, pickDay);
    expect(isoDayOf(byDay.at)).toBe("2026-10-17");
    expect(byDay.x).toBe(scale(utc("2026-10-17")));
    // No strategy: the month, exactly as before.
    expect(isoDayOf(hoverAt([], WINDOW, x, frame).at)).toBe("2026-11-01");
  });
});

describe("levelsValueFit — what a held value axis tracks", () => {
  it("spans the levels anyone holds, and ignores empty ones", () => {
    const levels: readonly Level[] = [
      { id: "a", label: "a", value: 80_000, points: [{ at: 0, count: 2 }] },
      { id: "b", label: "b", value: 110_000, points: [{ at: 0, count: 1 }] },
      {
        id: "ghost",
        label: "g",
        value: 500_000,
        points: [{ at: 0, count: 0 }],
      },
      { id: "none", label: "n", value: 1, points: [] },
    ];
    expect(levelsValueFit(levels)).toEqual({ min: 80_000, max: 110_000 });
    expect(levelsValueFit([])).toBeNull();
  });
});
