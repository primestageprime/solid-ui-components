// ============================================
// LevelsTimeline geometry — the headless observation.
//
// Every number the SVG paints is decided in geometry.ts, so the whole chart is
// readable as a table without a browser. These tests PRINT that table as well
// as asserting on it: a rail chart is one of those shapes where a wrong width
// looks plausible in isolation and obviously wrong beside its neighbours, and
// a collapsed value domain draws a perfectly straight, perfectly wrong line.
//
// The printed observation carries four things: the value domain (a collapsed
// one is invisible in a span list), the per-span widths, the ribbon extents,
// and the change-x list that decides where the droplines fall.
// ============================================
import { describe, expect, it } from "vitest";
import { flatMap, map, sortBy } from "../../fn";
import {
  FLAG_RULE_TOP,
  MAX_STROKE,
  MIN_STROKE,
  type BandRun,
  type FlowBand,
  type Level,
  type Rail,
  type Taper,
  type Transfer,
  axisTicks,
  changeTimes,
  droplinePositions,
  levelsRailGeometry,
  maxCountOf,
  railSpans,
  strokeFor,
  bandPath,
  hCurve,
  flowWidth,
  perPersonWidth,
  taperHalves,
  transitionWidth,
  TRANSITION_FRACTION,
  MAX_TRANSITION,
  valueDomainOf,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
  VIEW_WIDTH,
  type Mutation,
  type TimeDomain,
  flagPositions,
  monthTicks,
  timeOf,
  xScaleFor,
  yScaleFor,
} from "./geometry";

const utc = (iso: string): Date => new Date(iso);

/** The bench's own span: a year of monthly levels. */
const DOMAIN: TimeDomain = [utc("2025-01-01"), utc("2026-01-01")];

const MUTATIONS: readonly Mutation[] = [
  { id: "m1", at: utc("2025-04-01"), label: "1" },
  { id: "m2", at: utc("2025-07-01"), label: "2" },
  { id: "m3", at: utc("2025-10-01"), label: "3" },
];

/** Round to 3dp so a table prints without float noise. */
const round = (n: number): number => Math.round(n * 1000) / 1000;

describe("timeOf", () => {
  it("reads a Date and a raw timestamp the same way", () => {
    expect(timeOf(utc("2025-01-01"))).toBe(Date.UTC(2025, 0, 1));
    expect(timeOf(1234)).toBe(1234);
  });
});

describe("xScaleFor", () => {
  it("puts the domain ends on the plot edges", () => {
    const x = xScaleFor(DOMAIN);
    expect(x(DOMAIN[0])).toBe(PLOT_LEFT);
    expect(x(DOMAIN[1])).toBe(PLOT_RIGHT);
  });

  it("is linear across the domain", () => {
    const x = xScaleFor([0, 100]);
    expect(round(x(50))).toBe(round((PLOT_LEFT + PLOT_RIGHT) / 2));
  });

  it("clamps outside the domain rather than painting off-canvas", () => {
    const x = xScaleFor(DOMAIN);
    expect(x(utc("2020-01-01"))).toBe(PLOT_LEFT);
    expect(x(utc("2030-01-01"))).toBe(PLOT_RIGHT);
  });

  it("reads a zero-width domain as the left edge instead of NaN", () => {
    const x = xScaleFor([5, 5]);
    expect(x(5)).toBe(PLOT_LEFT);
    expect(x(9)).toBe(PLOT_LEFT);
  });
});

describe("yScaleFor", () => {
  it("inverts: the domain top sits at the plot top", () => {
    const y = yScaleFor([0, 100]);
    expect(y(100)).toBe(PLOT_TOP);
    expect(y(0)).toBe(PLOT_BOTTOM);
  });

  it("reads a zero-height domain as the plot's middle instead of NaN", () => {
    const y = yScaleFor([7, 7]);
    expect(y(7)).toBe((PLOT_TOP + PLOT_BOTTOM) / 2);
  });
});

describe("flagPositions", () => {
  const x = xScaleFor(DOMAIN);

  it("puts one flag per mutation, in time order, with its rule", () => {
    const flags = flagPositions(MUTATIONS, x);
    expect(flags).toHaveLength(3);
    expect(flags[0].x).toBeLessThan(flags[1].x);
    expect(flags[0].ruleTop).toBe(FLAG_RULE_TOP);
    expect(flags[0].ruleBottom).toBe(PLOT_BOTTOM);
  });

  it("keeps a flag's box on the canvas at either edge", () => {
    const flags = flagPositions(
      [
        { id: "a", at: DOMAIN[0], label: "1" },
        { id: "b", at: DOMAIN[1], label: "2" },
      ],
      x,
    );
    expect(flags[0].boxX).toBeGreaterThanOrEqual(0);
    expect(flags[1].boxX + flags[1].boxWidth).toBeLessThanOrEqual(VIEW_WIDTH);
  });
});

describe("monthTicks", () => {
  it("marks every month boundary in the domain", () => {
    const ticks = monthTicks(DOMAIN, xScaleFor(DOMAIN));
    expect(ticks).toHaveLength(13); // 2025-01 … 2026-01 inclusive
    expect(ticks[0].label).toBe("Jan");
    expect(ticks[12].label).toBe("Jan");
    expect(ticks[0].x).toBe(PLOT_LEFT);
  });
});

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

describe("maxCountOf", () => {
  it("is the largest headcount anywhere on the chart, transfers included", () => {
    expect(maxCountOf(LEVELS, TRANSFERS)).toBe(5);
  });

  it("is zero for an empty chart rather than -Infinity", () => {
    expect(maxCountOf([], [])).toBe(0);
  });

  it("counts a transfer larger than any standing headcount", () => {
    const big: readonly Transfer[] = [
      { at: 0, from: "l5", to: "l6", count: 99 },
    ];
    expect(maxCountOf(LEVELS, big)).toBe(99);
  });
});

describe("strokeFor", () => {
  it("scales as a PROPORTION of the chart's own maximum, not an absolute", () => {
    // The same count reads differently on a chart whose maximum differs —
    // that is the point: the picture works at any scale.
    expect(strokeFor(5, 5)).toBe(MAX_STROKE);
    expect(strokeFor(10, 10)).toBe(MAX_STROKE);
    expect(strokeFor(5, 10)).toBe(MIN_STROKE + 0.5 * (MAX_STROKE - MIN_STROKE));
  });

  it("gives the thinnest visible rail to a single person, never zero", () => {
    expect(strokeFor(1, 100)).toBeGreaterThanOrEqual(MIN_STROKE);
  });

  it("draws NOTHING where nobody holds the level", () => {
    expect(strokeFor(0, 5)).toBe(0);
    expect(strokeFor(-2, 5)).toBe(0);
  });

  it("reads an empty chart as the thinnest rail instead of NaN", () => {
    expect(strokeFor(3, 0)).toBe(MIN_STROKE);
  });

  it("clamps a count above the maximum rather than overflowing the rail", () => {
    expect(strokeFor(99, 5)).toBe(MAX_STROKE);
  });
});

describe("valueDomainOf", () => {
  it("spans the levels' own values, padded", () => {
    const [lo, hi] = valueDomainOf(LEVELS);
    expect(lo).toBeLessThan(5000);
    expect(hi).toBeGreaterThan(10000);
  });

  it("opens up a single-level chart rather than collapsing it", () => {
    const [lo, hi] = valueDomainOf([LEVELS[0]]);
    expect(hi).toBeGreaterThan(lo);
  });

  it("survives no levels at all", () => {
    const [lo, hi] = valueDomainOf([]);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("railSpans", () => {
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(valueDomainOf(LEVELS));
  const maxCount = maxCountOf(LEVELS, TRANSFERS);

  it("holds one span per count point, out to the next change", () => {
    const spans = railSpans(LEVELS[1], x, y, DOMAIN[1], maxCount);
    expect(spans).toHaveLength(2);
    expect(spans[0].x2).toBe(spans[1].x1);
    expect(spans[1].x2).toBe(PLOT_RIGHT);
  });

  it("keeps a rail at ONE y — a level does not move, its thickness does", () => {
    const spans = railSpans(LEVELS[2], x, y, DOMAIN[1], maxCount);
    expect(new Set(map((span) => span.y, spans)).size).toBe(1);
  });

  it("thins where people leave and thickens where they arrive", () => {
    const [before, after] = railSpans(LEVELS[1], x, y, DOMAIN[1], maxCount);
    expect(after.width).toBeLessThan(before.width);
    const l7 = railSpans(LEVELS[2], x, y, DOMAIN[1], maxCount);
    expect(l7[1].width).toBeGreaterThan(l7[0].width);
  });

  it("starts a level that appears mid-chart at its own first point", () => {
    const spans = railSpans(LEVELS[3], x, y, DOMAIN[1], maxCount);
    expect(spans[0].x1).toBeGreaterThan(PLOT_LEFT);
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
    const spans = railSpans(emptied, x, y, DOMAIN[1], maxCount);
    expect(spans).toHaveLength(2);
    expect(spans[1].x1).toBe(x(utc("2025-09-01")));
  });

  it("draws nothing for a level with no points", () => {
    const empty: Level = { id: "e", label: "E", value: 1, points: [] };
    expect(railSpans(empty, x, y, DOMAIN[1], maxCount)).toEqual([]);
  });
});

describe("flowBands", () => {
  const x = xScaleFor(DOMAIN);
  const geometry = levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("spans a transition centred on the change, not a bare vertical", () => {
    const [first] = geometry.flows;
    const centre = x(utc("2025-04-01"));
    expect(first.x0).toBeLessThan(centre);
    expect(first.x1).toBeGreaterThan(centre);
    expect(round((first.x0 + first.x1) / 2)).toBe(round(centre));
  });

  it("roots in the rails it joins, source above destination for a raise", () => {
    const [first] = geometry.flows;
    expect(first.srcTop).toBeGreaterThan(first.dstTop);
    expect(first.kind).toBe("move");
  });

  it("is as wide at each end as the width its rail loses or gains", () => {
    const [first] = geometry.flows;
    const expected = flowWidth(2, geometry.maxCount);
    expect(round(first.srcBottom - first.srcTop)).toBe(round(expected));
    expect(round(first.dstBottom - first.dstTop)).toBe(round(expected));
  });

  it("closes its band and never emits a NaN", () => {
    for (const flow of geometry.flows) {
      expect(flow.path.startsWith("M ")).toBe(true);
      expect(flow.path.endsWith("Z")).toBe(true);
      expect(flow.path).not.toContain("NaN");
    }
  });
});

describe("changeTimes", () => {
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

  it("counts a transfer at a moment no count point mentions", () => {
    const extra: readonly Transfer[] = [
      { at: utc("2025-05-05"), from: "l5", to: "l6", count: 1 },
    ];
    expect(changeTimes(LEVELS, extra)).toContain(timeOf(utc("2025-05-05")));
  });
});

describe("droplinePositions", () => {
  const x = xScaleFor(DOMAIN);

  it("marks a change that no numbered flag already marks", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, MUTATIONS, DOMAIN, x);
    expect(lines).toHaveLength(1);
    expect(lines[0].x).toBe(x(utc("2025-11-15")));
  });

  it("yields to the flag's own rule where the two coincide", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, MUTATIONS, DOMAIN, x);
    const flagXs = new Set(map((flag) => flag.x, flagPositions(MUTATIONS, x)));
    for (const line of lines) expect(flagXs.has(line.x)).toBe(false);
  });

  it("does not rule the domain's own left edge — that is the frame", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, [], DOMAIN, x);
    expect(map((line) => line.x, lines)).not.toContain(PLOT_LEFT);
  });

  it("rules every change when no mutation is numbered at all", () => {
    const lines = droplinePositions(LEVELS, TRANSFERS, [], DOMAIN, x);
    expect(lines).toHaveLength(4); // the five changes, less the domain start
  });
});

describe("levelsRailGeometry — the whole observation", () => {
  const geometry = levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("carries one rail per level, in the consumer's own order", () => {
    expect(map((rail) => rail.id, geometry.rails)).toEqual([
      "l5",
      "l6",
      "l7",
      "l8",
    ]);
    expect(geometry.rails[0].seriesIndex).toBe(1);
  });

  it("carries the flows, the flags and the un-numbered dropline", () => {
    expect(geometry.flows).toHaveLength(2);
    expect(geometry.flags).toHaveLength(3);
    expect(geometry.droplines).toHaveLength(1);
  });

  it("prints the table a reader checks the shape against", () => {
    const [lo, hi] = geometry.yDomain;
    console.table([
      { field: "valueDomain.lo", value: round(lo) },
      { field: "valueDomain.hi", value: round(hi) },
      { field: "maxCount", value: geometry.maxCount },
      { field: "stroke", value: `${MIN_STROKE}..${MAX_STROKE}` },
    ]);
    console.table(
      geometry.rails.flatMap((rail) =>
        rail.spans.map((span) => ({
          level: rail.label,
          y: round(span.y),
          x1: round(span.x1),
          x2: round(span.x2),
          count: span.count,
          width: round(span.width),
        })),
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
          srcBottom: round(flow.srcBottom),
          dstTop: round(flow.dstTop),
          dstBottom: round(flow.dstBottom),
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
    console.table(
      geometry.droplines.map((line) => ({ key: line.key, x: round(line.x) })),
    );
    expect(geometry.rails).toHaveLength(4);
  });
});

describe("rail labels", () => {
  const geometry = levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("sits just above the rail's left end, clear of its thickness", () => {
    const l5 = geometry.rails[0];
    expect(l5.labelAt?.x).toBe(PLOT_LEFT + 2);
    expect(l5.labelAt?.y).toBeLessThan(l5.spans[0].y - l5.spans[0].width / 2);
  });

  it("travels in with a level that appears mid-chart", () => {
    const l8 = geometry.rails[3];
    expect(l8.labelAt?.x).toBeGreaterThan(PLOT_LEFT + 2);
  });

  it("is absent for a level nobody ever holds — nothing to name", () => {
    const [rail] = levelsRailGeometry({
      levels: [{ id: "e", label: "E", value: 1, points: [] }],
      transfers: [],
      mutations: [],
      domain: DOMAIN,
    }).rails;
    expect(rail.labelAt).toBeUndefined();
  });
});

describe("axisTicks", () => {
  it("keeps a month cadence for a domain short enough to read", () => {
    const ticks = axisTicks(DOMAIN, xScaleFor(DOMAIN));
    expect(ticks).toHaveLength(13);
    expect(ticks[0].label).toBe("Jan");
  });

  it("switches to a year cadence rather than printing a grey stripe", () => {
    const long: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
    const ticks = axisTicks(long, xScaleFor(long));
    expect(map((tick) => tick.label, ticks)).toEqual([
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
    ]);
  });

  it("puts the first year tick on the plot's left edge", () => {
    const long: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
    expect(axisTicks(long, xScaleFor(long))[0].x).toBe(PLOT_LEFT);
  });
});

describe("one-ended flows — departures and hires", () => {
  const x = xScaleFor(DOMAIN);
  const flowsFor = (transfers: readonly Transfer[]) => {
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers,
      mutations: [],
      domain: DOMAIN,
    });
    return geometry.flows;
  };

  it("runs a departure OUTWARD and DOWN from its source", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 1 },
    ]);
    expect(leaving.kind).toBe("departure");
    expect(leaving.dstTop).toBeGreaterThan(leaving.srcTop);
  });

  it("brings a hire DOWN INTO its destination, from above", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l7", count: 1 }]);
    expect(joining.kind).toBe("hire");
    expect(joining.srcTop).toBeLessThan(joining.dstTop);
  });

  it("keeps a one-ended flow the same width along its whole length", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 2 },
    ]);
    expect(round(leaving.srcBottom - leaving.srcTop)).toBe(
      round(leaving.dstBottom - leaving.dstTop),
    );
  });

  it("tones a hire by its DESTINATION — that is the rail it thickens", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l8", count: 1 }]);
    expect(joining.seriesIndex).toBe(4);
  });

  it("drops a flow with neither end — there is nothing to draw", () => {
    expect(flowsFor([{ at: utc("2025-07-01"), count: 2 }])).toEqual([]);
  });

  it("drops a typo rather than drawing it as a departure", () => {
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
    expect(new Set(map((flow) => flow.key, both)).size).toBe(2);
    // The raise roots on the TOP edge, the departure on the BOTTOM one, so the
    // two cannot overlap however wide they get.
    const move = both.find((flow) => flow.kind === "move");
    const gone = both.find((flow) => flow.kind === "departure");
    expect(move?.srcBottom).toBeLessThanOrEqual((gone?.srcTop ?? 0) + 0.001);
  });

  it("empties a rail completely when everyone leaves it at once", () => {
    const emptied: Level = {
      id: "l6",
      label: "L6",
      value: 6500,
      points: [
        { at: utc("2025-01-01"), count: 2 },
        { at: utc("2025-04-01"), count: 0 },
      ],
    };
    const y = yScaleFor(valueDomainOf(LEVELS));
    const spans = railSpans(emptied, x, y, DOMAIN[1], 5);
    expect(spans).toHaveLength(1);
    expect(spans[0].x2).toBe(x(utc("2025-04-01")));
  });
});

describe("one-ended flows stay inside the plot", () => {
  // The padding leaves a FIXED headroom above the highest rail — 14.9 units
  // for a 12% pad over this plot, whatever the data says — which is less than
  // OPEN_FLOW_STUB. Without clamping, a hire into the top level draws above
  // PLOT_TOP and a departure from the bottom one draws into the axis ticks,
  // and `overflow: visible` means both would be SEEN.
  const flowsFor = (transfers: readonly Transfer[]) =>
    levelsRailGeometry({
      levels: LEVELS,
      transfers,
      mutations: [],
      domain: DOMAIN,
    }).flows;

  it("never lifts a hire into the highest level above the plot top", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l8", count: 1 }]);
    expect(joining.srcTop).toBeGreaterThanOrEqual(PLOT_TOP);
  });

  it("never drops a departure from the lowest level into the axis", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l5", count: 1 },
    ]);
    expect(leaving.dstBottom).toBeLessThanOrEqual(PLOT_BOTTOM);
  });
});

describe("rail labels", () => {
  const geometry = levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("sits just above the rail's left end, clear of its thickness", () => {
    const l5 = geometry.rails[0];
    expect(l5.labelAt?.x).toBe(PLOT_LEFT + 2);
    expect(l5.labelAt?.y).toBeLessThan(l5.spans[0].y - l5.spans[0].width / 2);
  });

  it("travels in with a level that appears mid-chart", () => {
    const l8 = geometry.rails[3];
    expect(l8.labelAt?.x).toBeGreaterThan(PLOT_LEFT + 2);
  });

  it("is absent for a level nobody ever holds — nothing to name", () => {
    const [rail] = levelsRailGeometry({
      levels: [{ id: "e", label: "E", value: 1, points: [] }],
      transfers: [],
      mutations: [],
      domain: DOMAIN,
    }).rails;
    expect(rail.labelAt).toBeUndefined();
  });
});

describe("axisTicks", () => {
  it("keeps a month cadence for a domain short enough to read", () => {
    const ticks = axisTicks(DOMAIN, xScaleFor(DOMAIN));
    expect(ticks).toHaveLength(13);
    expect(ticks[0].label).toBe("Jan");
  });

  it("switches to a year cadence rather than printing a grey stripe", () => {
    const long: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
    const ticks = axisTicks(long, xScaleFor(long));
    expect(map((tick) => tick.label, ticks)).toEqual([
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
      "2030",
    ]);
  });

  it("puts the first year tick on the plot's left edge", () => {
    const long: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
    expect(axisTicks(long, xScaleFor(long))[0].x).toBe(PLOT_LEFT);
  });
});

describe("one-ended flows — departures and hires", () => {
  const x = xScaleFor(DOMAIN);
  const flowsFor = (transfers: readonly Transfer[]) => {
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers,
      mutations: [],
      domain: DOMAIN,
    });
    return geometry.flows;
  };

  it("runs a departure OUTWARD and DOWN from its source", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 1 },
    ]);
    expect(leaving.kind).toBe("departure");
    expect(leaving.dstTop).toBeGreaterThan(leaving.srcTop);
  });

  it("brings a hire DOWN INTO its destination, from above", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l7", count: 1 }]);
    expect(joining.kind).toBe("hire");
    expect(joining.srcTop).toBeLessThan(joining.dstTop);
  });

  it("keeps a one-ended flow the same width along its whole length", () => {
    const [leaving] = flowsFor([
      { at: utc("2025-07-01"), from: "l6", count: 2 },
    ]);
    expect(round(leaving.srcBottom - leaving.srcTop)).toBe(
      round(leaving.dstBottom - leaving.dstTop),
    );
  });

  it("tones a hire by its DESTINATION — that is the rail it thickens", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l8", count: 1 }]);
    expect(joining.seriesIndex).toBe(4);
  });

  it("drops a flow with neither end — there is nothing to draw", () => {
    expect(flowsFor([{ at: utc("2025-07-01"), count: 2 }])).toEqual([]);
  });

  it("drops a typo rather than drawing it as a departure", () => {
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
    expect(new Set(map((flow) => flow.key, both)).size).toBe(2);
    // The raise roots on the TOP edge, the departure on the BOTTOM one, so the
    // two cannot overlap however wide they get.
    const move = both.find((flow) => flow.kind === "move");
    const gone = both.find((flow) => flow.kind === "departure");
    expect(move?.srcBottom).toBeLessThanOrEqual((gone?.srcTop ?? 0) + 0.001);
  });

  it("empties a rail completely when everyone leaves it at once", () => {
    const emptied: Level = {
      id: "l6",
      label: "L6",
      value: 6500,
      points: [
        { at: utc("2025-01-01"), count: 2 },
        { at: utc("2025-04-01"), count: 0 },
      ],
    };
    const y = yScaleFor(valueDomainOf(LEVELS));
    const spans = railSpans(emptied, x, y, DOMAIN[1], 5);
    expect(spans).toHaveLength(1);
    expect(spans[0].x2).toBe(x(utc("2025-04-01")));
  });
});

// ============================================
// The SANKEY pass — curves, bands, and the arithmetic that makes them blend.
// ============================================

describe("transitionWidth", () => {
  it("is a fraction of the plot, clamped so it stays a join", () => {
    const raw = (PLOT_RIGHT - PLOT_LEFT) * TRANSITION_FRACTION;
    expect(raw).toBeGreaterThan(MAX_TRANSITION);
    expect(transitionWidth()).toBe(MAX_TRANSITION);
  });
});

describe("hCurve", () => {
  it("gives both ends HORIZONTAL tangents — the whole Sankey look", () => {
    // Control points sit at their OWN endpoint's y, so the curve leaves and
    // arrives flat and blends into a horizontal rail.
    expect(hCurve(0, 10, 20, 30)).toBe("C 10 10, 10 30, 20 30");
  });

  it("puts both control points at the midpoint in x", () => {
    expect(hCurve(100, 5, 140, 5)).toBe("C 120 5, 120 5, 140 5");
  });

  it("is symmetric, so an edge can be walked backwards to close a band", () => {
    // Same two points the other way round describes the mirror-image curve.
    expect(hCurve(20, 30, 0, 10)).toBe("C 10 30, 10 10, 0 10");
  });
});

describe("bandPath", () => {
  const top = [
    { x: 0, y: 0, curved: false },
    { x: 10, y: 2, curved: true },
  ];
  const bottom = [
    { x: 0, y: 5, curved: false },
    { x: 10, y: 8, curved: true },
  ];

  it("closes: down the top, across, back along the bottom, across again", () => {
    const path = bandPath(top, bottom);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).toContain("L 10 8");
  });

  it("is empty for an empty edge rather than a lone moveto", () => {
    expect(bandPath([], bottom)).toBe("");
    expect(bandPath(top, [])).toBe("");
  });
});

describe("flowWidth — the conservation identity", () => {
  it("is EXACTLY the difference a flow makes to a rail's width", () => {
    // This is why flowWidth exists beside strokeFor: strokeFor is affine, so
    // measuring a flow with it would count the MIN_STROKE floor twice.
    for (const [before, moving] of [
      [5, 3],
      [4, 1],
      [10, 7],
      [9, 8],
    ]) {
      expect(round(strokeFor(before, 10) - flowWidth(moving, 10))).toBe(
        round(strokeFor(before - moving, 10)),
      );
    }
  });

  it("has exactly ONE exception, at a rail emptying to nothing", () => {
    // strokeFor(0) is 0, not MIN_STROKE, because an empty level is an absence
    // rather than a thin one. So the floor has nowhere to go and is absorbed
    // by the taper to zero. This is the documented limit of conservation, and
    // it is confined to a band already on its way out.
    expect(strokeFor(2, 10) - flowWidth(2, 10)).toBeCloseTo(MIN_STROKE, 9);
    expect(strokeFor(0, 10)).toBe(0);
  });

  it("is the proportional slope per person, with no floor in it", () => {
    expect(flowWidth(1, 10)).toBe(perPersonWidth(10));
    expect(perPersonWidth(10)).toBe((MAX_STROKE - MIN_STROKE) / 10);
  });

  it("reads an empty chart as zero rather than NaN", () => {
    expect(flowWidth(3, 0)).toBe(0);
    expect(perPersonWidth(0)).toBe(0);
  });

  it("never goes negative on a nonsense count", () => {
    expect(flowWidth(-4, 10)).toBe(0);
  });
});

describe("taperHalves", () => {
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(valueDomainOf(LEVELS));

  it("gives a flush end no blend at all — it is a cap, not a change", () => {
    const spans = railSpans(LEVELS[1], x, y, DOMAIN[1], 5);
    const halves = taperHalves(spans, false, false);
    expect(halves[0]).toBe(0);
    expect(halves[halves.length - 1]).toBe(0);
  });

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
    const spans = railSpans(crowded, x, y, DOMAIN[1], 5);
    const halves = taperHalves(spans, false, true);
    const gap = spans[1].x1 - spans[0].x1;
    expect(halves[1]).toBeLessThanOrEqual(gap / 2);
    expect(halves[1]).toBeLessThan(transitionWidth() / 2);
  });
});

describe("railRuns", () => {
  const geometry = levelsRailGeometry({
    levels: LEVELS,
    transfers: TRANSFERS,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("closes every band and never emits a NaN", () => {
    for (const rail of geometry.rails) {
      for (const run of rail.runs) {
        expect(run.path.startsWith("M ")).toBe(true);
        expect(run.path.endsWith("Z")).toBe(true);
        expect(run.path).not.toContain("NaN");
      }
    }
  });

  it("carries a taper for every count change on the rail", () => {
    // l7 steps 2 → 4 → 3, so two changes and two tapers.
    const l7 = geometry.rails[2];
    expect(flatMap((run: BandRun) => [...run.tapers], l7.runs)).toHaveLength(2);
  });

  it("splits a level that empties and comes back into TWO bands", () => {
    // Drawing one band across the gap would invent a headcount nobody held.
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
    const [rail] = levelsRailGeometry({
      levels: [returning],
      transfers: [],
      mutations: [],
      domain: DOMAIN,
    }).rails;
    expect(rail.runs).toHaveLength(2);
    expect(rail.runs[0].endsOpen).toBe(true);
    expect(rail.runs[1].startsOpen).toBe(true);
  });

  it("tapers a level that appears mid-plot in, and leaves a flush edge flush", () => {
    const l8 = geometry.rails[3];
    expect(l8.runs[0].startsOpen).toBe(true);
    const l5 = geometry.rails[0];
    expect(l5.runs[0].startsOpen).toBe(false);
  });

  it("draws nothing at all for a level nobody ever holds", () => {
    const [rail] = levelsRailGeometry({
      levels: [{ id: "e", label: "E", value: 1, points: [] }],
      transfers: [],
      mutations: [],
      domain: DOMAIN,
    }).rails;
    expect(rail.runs).toHaveLength(0);
  });
});

describe("the fan — several flows out of one rail at one moment", () => {
  // Track C's stress case: four people leaving one level for four different
  // destinations on one date. The roots must tile the rail's edge in
  // destination order, or the bands cross each other at the root.
  const SOURCE = 6000;
  const fanLevels: readonly Level[] = [
    {
      id: "c6",
      label: "$6k",
      value: SOURCE,
      points: [
        { at: utc("2025-01-01"), count: 4 },
        { at: utc("2026-04-01"), count: 0 },
      ],
    },
    ...map(
      (pay: number) => ({
        id: `c${pay}`,
        label: `$${pay / 1000}k`,
        value: pay,
        points: [{ at: utc("2026-04-01"), count: 1 }],
      }),
      [6500, 7000, 7500, 8000],
    ),
  ];
  const fanTransfers: readonly Transfer[] = map(
    (pay: number) => ({
      at: utc("2026-04-01"),
      from: "c6",
      to: `c${pay}`,
      count: 1,
    }),
    [6500, 7000, 7500, 8000],
  );
  const LONG: TimeDomain = [utc("2025-01-01"), utc("2030-01-01")];
  const geometry = levelsRailGeometry({
    levels: fanLevels,
    transfers: fanTransfers,
    mutations: [],
    domain: LONG,
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
    // Topmost destination gets the topmost slice, so no two bands cross.
    const byRoot = sortBy((flow: FlowBand) => flow.srcTop, [...geometry.flows]);
    const destinations = map((flow: FlowBand) => flow.dstTop, byRoot);
    expect(destinations).toEqual([...destinations].sort((a, b) => a - b));
  });

  it("tiles the whole of the emptying rail's edge, top to bottom", () => {
    const byRoot = sortBy((flow: FlowBand) => flow.srcTop, [...geometry.flows]);
    const first = byRoot[0];
    const last = byRoot[byRoot.length - 1];
    const railY = geometry.rails[0].y;
    const width = geometry.rails[0].spans[0].width;
    // Four people leaving a four-person rail: the roots span the proportional
    // part of its width. The MIN_STROKE floor is what is left over, and it is
    // absorbed by the taper to zero.
    expect(round(last.srcBottom - first.srcTop)).toBe(
      round(flowWidth(4, geometry.maxCount)),
    );
    expect(first.srcTop).toBeGreaterThanOrEqual(railY - width / 2 - 0.001);
  });
});

describe("width conservation at a transition", () => {
  it("rail before − flows out + flows in === rail after, within epsilon", () => {
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers: TRANSFERS,
      mutations: MUTATIONS,
      domain: DOMAIN,
    });
    const l6 = geometry.rails[1];
    const taper = flatMap((run: BandRun) => [...run.tapers], l6.runs)[0];
    const leaving = flowWidth(2, geometry.maxCount);
    expect(
      Math.abs(taper.widthBefore - leaving - taper.widthAfter),
    ).toBeLessThan(0.001);
  });
});
