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
import { map } from "../../fn";
import {
  FLAG_RULE_TOP,
  MAX_STROKE,
  MIN_STROKE,
  OPEN_FLOW_STUB,
  type Level,
  type Transfer,
  axisTicks,
  changeTimes,
  droplinePositions,
  levelsRailGeometry,
  maxCountOf,
  railSpans,
  strokeFor,
  transferRibbons,
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

describe("transferRibbons", () => {
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(valueDomainOf(LEVELS));
  const maxCount = maxCountOf(LEVELS, TRANSFERS);

  it("runs from the source rail to the destination rail at the change x", () => {
    const [first] = transferRibbons(TRANSFERS, LEVELS, x, y, maxCount);
    expect(first.x).toBe(x(utc("2025-04-01")));
    expect(first.y1).toBe(y(6500));
    expect(first.y2).toBe(y(8000));
    expect(first.fromId).toBe("l6");
    expect(first.toId).toBe("l7");
  });

  it("is as wide as the moving count on the SAME scale as the rails", () => {
    const [first] = transferRibbons(TRANSFERS, LEVELS, x, y, maxCount);
    expect(first.width).toBe(strokeFor(2, maxCount));
  });

  it("points upward for a raise — y2 is above y1 on the screen", () => {
    const [first] = transferRibbons(TRANSFERS, LEVELS, x, y, maxCount);
    expect(first.y2).toBeLessThan(first.y1);
  });

  it("skips a transfer naming a level the chart does not have", () => {
    const orphan: readonly Transfer[] = [
      { at: utc("2025-04-01"), from: "l6", to: "nowhere", count: 1 },
    ];
    expect(transferRibbons(orphan, LEVELS, x, y, maxCount)).toEqual([]);
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

  it("carries the ribbons, the flags and the un-numbered dropline", () => {
    expect(geometry.ribbons).toHaveLength(2);
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
      geometry.ribbons.map((ribbon) => ({
        from: ribbon.fromId,
        to: ribbon.toId,
        count: ribbon.count,
        x: round(ribbon.x),
        y1: round(ribbon.y1),
        y2: round(ribbon.y2),
        width: round(ribbon.width),
      })),
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
  const y = yScaleFor(valueDomainOf(LEVELS));
  const maxCount = maxCountOf(LEVELS, TRANSFERS);
  const ribbonsFor = (transfers: readonly Transfer[]) =>
    transferRibbons(transfers, LEVELS, x, y, maxCount);

  it("runs a departure OUTWARD from its source, below the rail", () => {
    const [leaving] = ribbonsFor([
      { at: utc("2025-07-01"), from: "l6", count: 1 },
    ]);
    expect(leaving.kind).toBe("departure");
    expect(leaving.y1).toBe(y(6500));
    expect(leaving.y2).toBe(y(6500) + OPEN_FLOW_STUB);
    expect(leaving.toId).toBeUndefined();
  });

  it("brings a hire DOWN INTO its destination, from above", () => {
    const [joining] = ribbonsFor([
      { at: utc("2025-07-01"), to: "l7", count: 1 },
    ]);
    expect(joining.kind).toBe("hire");
    expect(joining.y2).toBe(y(8000));
    expect(joining.y1).toBe(y(8000) - OPEN_FLOW_STUB);
    expect(joining.fromId).toBeUndefined();
  });

  it("puts the two on OPPOSITE sides of their rail, never to be confused", () => {
    const [leaving] = ribbonsFor([{ at: 0, from: "l7", count: 1 }]);
    const [joining] = ribbonsFor([{ at: 0, to: "l7", count: 1 }]);
    expect(leaving.y2).toBeGreaterThan(y(8000));
    expect(joining.y1).toBeLessThan(y(8000));
  });

  it("tones a hire by its DESTINATION — that is the rail it thickens", () => {
    const [joining] = ribbonsFor([{ at: 0, to: "l8", count: 1 }]);
    expect(joining.seriesIndex).toBe(4);
  });

  it("widths a one-ended flow on the same scale as everything else", () => {
    const [leaving] = ribbonsFor([{ at: 0, from: "l5", count: 3 }]);
    expect(leaving.width).toBe(strokeFor(3, maxCount));
  });

  it("drops a flow with neither end — there is nothing to draw", () => {
    expect(ribbonsFor([{ at: 0, count: 2 }])).toEqual([]);
  });

  it("drops a typo rather than drawing it as a departure", () => {
    // An absent end already MEANS the outside; a misspelt one must not look
    // the same, or a typo hides as a legitimate exit.
    expect(ribbonsFor([{ at: 0, from: "nope", to: "also-nope", count: 1 }])).toEqual(
      [],
    );
    expect(ribbonsFor([{ at: 0, from: "nope", count: 1 }])).toEqual([]);
  });

  it("stacks two flows leaving one level at one moment rather than merging", () => {
    // scenario-board's case: somebody is raised and somebody else leaves, both
    // at the same flag, out of the same rail.
    const both = ribbonsFor([
      { at: utc("2025-04-01"), from: "l6", to: "l7", count: 1 },
      { at: utc("2025-04-01"), from: "l6", count: 1 },
    ]);
    expect(both).toHaveLength(2);
    expect(map((ribbon) => ribbon.kind, both)).toEqual(["move", "departure"]);
    expect(both[0].x).toBe(both[1].x);
    // Distinct keys, so a keyed <For> renders both rather than one.
    expect(both[0].key).not.toBe(both[1].key);
  });

  it("empties a rail completely when everyone leaves it at once", () => {
    // The other half of scenario-board's case: the level's own count point
    // going to zero is what ends the rail. A zero span is never drawn, so
    // there is no hairline left behind.
    const emptied: Level = {
      id: "l6",
      label: "L6",
      value: 6500,
      points: [
        { at: utc("2025-01-01"), count: 2 },
        { at: utc("2025-04-01"), count: 0 },
      ],
    };
    const spans = railSpans(emptied, x, y, DOMAIN[1], maxCount);
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
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(valueDomainOf(LEVELS));
  const maxCount = maxCountOf(LEVELS, TRANSFERS);

  it("never lifts a hire into the highest level above the plot top", () => {
    const [joining] = transferRibbons(
      [{ at: 0, to: "l8", count: 1 }],
      LEVELS,
      x,
      y,
      maxCount,
    );
    expect(joining.y1).toBeGreaterThanOrEqual(PLOT_TOP);
    expect(joining.y1).toBeLessThan(joining.y2);
  });

  it("never drops a departure from the lowest level into the axis", () => {
    const [leaving] = transferRibbons(
      [{ at: 0, from: "l5", count: 1 }],
      LEVELS,
      x,
      y,
      maxCount,
    );
    expect(leaving.y2).toBeLessThanOrEqual(PLOT_BOTTOM);
    expect(leaving.y2).toBeGreaterThan(leaving.y1);
  });

  it("still runs the full stub where there is room for it", () => {
    const [leaving] = transferRibbons(
      [{ at: 0, from: "l7", count: 1 }],
      LEVELS,
      x,
      y,
      maxCount,
    );
    expect(leaving.y2 - leaving.y1).toBe(OPEN_FLOW_STUB);
  });
});
