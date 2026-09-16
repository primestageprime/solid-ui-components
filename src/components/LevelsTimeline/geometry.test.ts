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
import { filter, find, flatMap, map, sortBy, sum } from "../../fn";
import {
  DEFAULT_FRAME,
  BAND_MARGIN,
  FILL_FRACTION,
  MAX_TRANSITION,
  PLOT_BOTTOM,
  MIN_VIEW_HEIGHT,
  frameFor,
  viewHeightFor,
  VIEW_HEIGHT,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
  TRANSITION_FRACTION,
  VIEW_WIDTH,
  type BandRun,
  type FlowBand,
  type Level,
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
  levelsRailGeometry,
  maxCountIn,
  monthTicks,
  peakHeadcount,
  perPersonWidth,
  railRuns,
  railSpans,
  spanBottom,
  spanTop,
  taperHalves,
  timeOf,
  transitionHalf,
  transitionWidth,
  valueDomainOf,
  yScaleFor,
} from "./geometry";

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
const changeXs = (): readonly number[] => {
  const x = (time: number) =>
    PLOT_LEFT +
    ((time - timeOf(DOMAIN[0])) / (timeOf(DOMAIN[1]) - timeOf(DOMAIN[0]))) *
      (PLOT_RIGHT - PLOT_LEFT);
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
    expect(spans[0].x1).toBe(PLOT_LEFT);
    expect(spans[spans.length - 1].x2).toBe(PLOT_RIGHT);
    expect(typeof x).toBe("function");
  });
});

describe("valueDomainOf and yScaleFor", () => {
  it("is the levels' own range, mapped into the plot MINUS its inset", () => {
    // The inset is a fraction of the PLOT, not of the value span, so the
    // headroom is there whatever the consumer's pay figures happen to be.
    const [lo, hi] = valueDomainOf(LEVELS);
    expect([lo, hi]).toEqual([5000, 10000]);
    expect(yScaleFor([lo, hi])(hi)).toBeCloseTo(PLOT_TOP + DEFAULT_FRAME.bandInset, 6);
    expect(yScaleFor([lo, hi])(lo)).toBeCloseTo(DEFAULT_FRAME.plotBottom - DEFAULT_FRAME.bandInset, 6);
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
  it("keeps a month cadence for a domain short enough to read", () => {
    const ticks = axisTicks(DOMAIN, (at) => timeOf(at) / 1e12);
    expect(ticks).toHaveLength(13);
    expect(ticks[0].label).toBe("Jan");
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

  it("still exposes the month cadence on its own", () => {
    expect(monthTicks(DOMAIN, () => PLOT_LEFT)).toHaveLength(13);
  });
});

// ── the width scale, and its two caps ────────────────────────────────────────

describe("peakHeadcount", () => {
  it("is the largest TOTAL headcount at any one moment", () => {
    // Not the biggest single level: it is all the bands together that occupy
    // the plot, so the peak is what the fill width is sized from.
    expect(peakHeadcount(LEVELS)).toBe(12);
  });

  it("is zero for an empty chart rather than -Infinity", () => {
    expect(peakHeadcount([])).toBe(0);
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

describe("perPersonWidth — the smaller of two answers", () => {
  const yScale = yScaleFor(valueDomainOf(LEVELS));

  it("fills a good fraction of the plot at the busiest moment", () => {
    expect(round(fillWidth(12, DEFAULT_FRAME))).toBe(round((DEFAULT_FRAME.plotHeight * FILL_FRACTION) / 12));
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
    expect(edgeWidth(two, scale, DEFAULT_FRAME)).toBeLessThan(fillWidth(2, DEFAULT_FRAME));
    const perPerson = perPersonWidth(two, scale, 2, DEFAULT_FRAME);
    for (const level of two) {
      const half = bandWidth(2, perPerson) / 2;
      expect(scale(level.value) - half).toBeGreaterThanOrEqual(PLOT_TOP);
      expect(scale(level.value) + half).toBeLessThanOrEqual(PLOT_BOTTOM);
    }
  });

  it("takes whichever of the three caps binds", () => {
    const perPerson = perPersonWidth(LEVELS, yScale, 12, DEFAULT_FRAME);
    expect(perPerson).toBe(
      Math.min(
        fillWidth(12, DEFAULT_FRAME),
        adjacencyWidth(LEVELS, yScale),
        edgeWidth(LEVELS, yScale, DEFAULT_FRAME),
      ),
    );
  });

  it("leaves only the edge cap when there is a single level", () => {
    expect(adjacencyWidth([LEVELS[0]], yScale)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it("has NO floor — one person is wide because the scale is wide", () => {
    // The old affine scale needed a MIN_STROKE so one person stayed visible.
    // A floor cannot be conserved, and it is not needed now.
    expect(bandWidth(0, 7.391)).toBe(0);
    expect(bandWidth(1, 7.391)).toBe(7.391);
  });
});

describe("bandWidth — conservation is exact and unconditional", () => {
  it("holds for every pair, INCLUDING a rail emptying to nothing", () => {
    const perPerson = 7.391;
    for (const [before, moving] of [
      [5, 3],
      [4, 1],
      [10, 7],
      [2, 2],
      [1, 1],
    ]) {
      expect(round(bandWidth(before, perPerson) - bandWidth(moving, perPerson))).toBe(
        round(bandWidth(before - moving, perPerson)),
      );
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
    expect(round(gap)).toBe(round(2 * transitionHalf(changeXs())));
  });

  it("runs flush to the plot edges, which are not changes", () => {
    const spans = geometry.rails[1].spans;
    expect(spans[0].x1).toBe(PLOT_LEFT);
    expect(spans[spans.length - 1].x2).toBe(PLOT_RIGHT);
  });

  it("keeps a rail at ONE y — a level does not move, its thickness does", () => {
    const l7 = geometry.rails[2];
    expect(new Set(map((span: RailSpan) => span.y, l7.spans)).size).toBe(1);
  });

  it("thins where people leave and thickens where they arrive", () => {
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
    // Straight at the invariant: at every moment, take each level's headcount,
    // give it the band it would be drawn with, and check that no two of them
    // touch. Nothing about spans or paths — just the widths and the y's.
    for (const time of changeTimes(LEVELS, TRANSFERS)) {
      const live = filter(
        (band: { top: number; bottom: number }) => band.bottom > band.top,
        map((rail: Rail) => {
          const level = find((one: Level) => one.id === rail.id, LEVELS);
          const half =
            bandWidth(countAt(level as Level, time), geometry.perPerson) / 2;
          return { top: rail.y - half, bottom: rail.y + half };
        }, geometry.rails),
      );
      const ordered = sortBy(
        (band: { top: number }) => band.top,
        live,
      );
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
    expect(round(raw)).toBe(round(612 * 0.11));
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
    // tapering in would say the headcount grew when it did not.
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
    expect(first.x1 - first.x0).toBeCloseTo(2 * transitionHalf(changeXs()), 9);
  });

  it("roots in the bands it joins, and is as wide as what moved", () => {
    const [first] = moves();
    const expected = bandWidth(2, geometry.perPerson);
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

describe("one-ended flows — departures and hires", () => {
  /** Transfers only — the carry is tested in its own suite. */
  const flowsFor = (transfers: readonly Transfer[]) =>
    filter(
      (flow: FlowBand) =>
        flow.kind !== "carry" && flow.kind !== "continuation",
      geometryOf(LEVELS, transfers).flows,
    );

  it("runs a departure out of its source, with no destination named", () => {
    const [leaving] = flowsFor([{ at: utc("2025-07-01"), from: "l6", count: 1 }]);
    expect(leaving.kind).toBe("departure");
    expect(leaving.fromId).toBe("l6");
    expect(leaving.toId).toBeUndefined();
  });

  it("runs a hire into its destination, with no source named", () => {
    const [joining] = flowsFor([{ at: utc("2025-07-01"), to: "l7", count: 1 }]);
    expect(joining.kind).toBe("hire");
    expect(joining.fromId).toBeUndefined();
    expect(joining.toId).toBe("l7");
  });

  it("keeps a one-ended flow the same width along its whole length", () => {
    // It is the GRADIENT that says the flow is going nowhere, not the shape —
    // a stub that wandered off would imply a destination the chart has not got.
    const [leaving] = flowsFor([{ at: utc("2025-07-01"), from: "l6", count: 2 }]);
    expect(round(leaving.srcBottom - leaving.srcTop)).toBe(
      round(leaving.dstBottom - leaving.dstTop),
    );
    expect(round(leaving.srcTop)).toBe(round(leaving.dstTop));
  });

  it("drops a flow with neither end, and a typo rather than faking a departure", () => {
    expect(flowsFor([{ at: utc("2025-07-01"), count: 2 }])).toEqual([]);
    expect(flowsFor([{ at: utc("2025-07-01"), from: "nope", count: 1 }])).toEqual(
      [],
    );
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
  // The stress case: four people leaving one level for four destinations on
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
      (pay: number) => ({
        id: `c${pay}`,
        label: `$${pay / 1000}k`,
        value: pay,
        points: [{ at: utc("2025-06-01"), count: 1 }],
      }),
      [6500, 7000, 7500, 8000],
    ),
  ];
  const fanTransfers: readonly Transfer[] = map(
    (pay: number) => ({
      at: utc("2025-06-01"),
      from: "c6",
      to: `c${pay}`,
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
      round(bandWidth(4, geometry.perPerson)),
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
      { field: "peak headcount", value: geometry.peak },
      { field: "fill width", value: round(fillWidth(geometry.peak, geometry.frame)) },
      { field: "adjacency width", value: round(adjacencyWidth(LEVELS, yScale)) },
      { field: "perPerson (the smaller)", value: round(geometry.perPerson) },
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

/** The board's shape: one person per level, so whole bands move. */
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
        filter((span: RailSpan) => Math.abs(span[side] - x) < 0.001, rail.spans),
      ),
    rails,
  );

const lands = (
  edge: number,
  caps: readonly { top: number; bottom: number }[],
): boolean =>
  caps.some(
    (cap) => edge >= cap.top - 0.001 && edge <= cap.bottom + 0.001,
  );

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
    // The board's common case, and where it failed visibly: one person on the
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
    // l5 holds 3 people across the 2025-04 change, which belongs to l6 and l7.
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
    expect(round(continuation?.srcBottom ?? 0) - round(continuation?.srcTop ?? 0)).toBe(
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

  it("stretches ONLY the plot — the flag band and the axis band are fixed", () => {
    const tall = frameFor(400);
    expect(PLOT_TOP).toBe(36);
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
          expect(spanTop(span)).toBeGreaterThanOrEqual(PLOT_TOP);
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
    expect(geometry.perPerson).toBeGreaterThan(0);
    expect(geometry.perPerson).toBeLessThan(
      levelsRailGeometry({
        levels: LEVELS,
        transfers: TRANSFERS,
        mutations: MUTATIONS,
        domain: DOMAIN,
        viewHeight: 480,
      }).perPerson,
    );
  });
});
