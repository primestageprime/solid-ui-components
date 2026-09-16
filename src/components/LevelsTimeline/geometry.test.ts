// ============================================
// LevelsTimeline geometry — the headless observation.
//
// Every number the SVG paints is decided in geometry.ts, so the whole chart is
// readable as a table without a browser. These tests PRINT that table as well
// as asserting on it: a stepped chart is one of those shapes where a wrong
// riser looks plausible in isolation and obviously wrong beside its neighbours,
// and a collapsed y-domain draws a perfectly straight, perfectly wrong line.
//
// The printed observation carries three things, not just the vertices: the
// y-domain (a collapsed one is invisible in a vertex list), the flag x
// positions (which is what ties a numbered mutation to the risers under it),
// and the step vertices themselves.
// ============================================
import { describe, expect, it } from "vitest";
import {
  FLAG_RULE_TOP,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
  VIEW_WIDTH,
  type Mutation,
  type Series,
  type TimeDomain,
  flagPositions,
  levelsTimelineGeometry,
  monthTicks,
  stepPath,
  stepVertices,
  timeOf,
  xScaleFor,
  yDomainOf,
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

const SERIES: readonly Series[] = [
  {
    id: "peter",
    label: "Peter",
    points: [
      { at: utc("2025-01-01"), level: 12000 },
      { at: utc("2025-04-01"), level: 15000 },
      { at: utc("2025-10-01"), level: 14000 },
    ],
  },
  {
    id: "adlai",
    label: "Adlai",
    points: [
      { at: utc("2025-01-01"), level: 8000 },
      { at: utc("2025-07-01"), level: 9500 },
    ],
  },
  {
    id: "total",
    label: "Total",
    primary: true,
    points: [
      { at: utc("2025-01-01"), level: 20000 },
      { at: utc("2025-04-01"), level: 23000 },
      { at: utc("2025-07-01"), level: 24500 },
      { at: utc("2025-10-01"), level: 23500 },
    ],
  },
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

describe("yDomainOf", () => {
  it("spans every series' levels, padded so no line rides the frame", () => {
    const [lo, hi] = yDomainOf(SERIES);
    expect(lo).toBeLessThan(8000);
    expect(hi).toBeGreaterThan(24500);
  });

  it("opens a flat chart up rather than collapsing to a zero-height band", () => {
    const flat: readonly Series[] = [
      { id: "f", label: "Flat", points: [{ at: 0, level: 15000 }] },
    ];
    const [lo, hi] = yDomainOf(flat);
    expect(hi).toBeGreaterThan(lo);
    expect(yScaleFor([lo, hi])(15000)).not.toBeNaN();
  });

  it("survives no series at all", () => {
    const [lo, hi] = yDomainOf([]);
    expect(hi).toBeGreaterThan(lo);
  });

  it("ignores a series with no points", () => {
    const [lo, hi] = yDomainOf([
      { id: "a", label: "A", points: [{ at: 0, level: 10 }] },
      { id: "b", label: "B", points: [] },
    ]);
    expect(Number.isNaN(lo)).toBe(false);
    expect(Number.isNaN(hi)).toBe(false);
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

describe("stepVertices", () => {
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(yDomainOf(SERIES));

  it("holds a level, then risers: horizontal run, vertical step, repeat", () => {
    const vertices = stepVertices(SERIES[0].points, x, y, DOMAIN[1]);
    // 3 points → start + (run, riser) × 2 + the final run to the domain end.
    expect(vertices).toHaveLength(6);
    // The riser pairs share an x; the run pairs share a y.
    expect(vertices[1].x).toBe(vertices[2].x);
    expect(vertices[0].y).toBe(vertices[1].y);
    expect(vertices[2].y).toBe(vertices[3].y);
  });

  it("starts at the first point, not at the domain start", () => {
    const late: readonly { at: Date; level: number }[] = [
      { at: utc("2025-07-01"), level: 100 },
    ];
    const vertices = stepVertices(late, x, y, DOMAIN[1]);
    expect(vertices[0].x).toBeGreaterThan(PLOT_LEFT);
  });

  it("runs the last level out to the domain end", () => {
    const vertices = stepVertices(SERIES[0].points, x, y, DOMAIN[1]);
    expect(vertices[vertices.length - 1].x).toBe(PLOT_RIGHT);
  });

  it("orders unsorted points rather than drawing a zig-zag", () => {
    const unsorted = [
      { at: utc("2025-10-01"), level: 14000 },
      { at: utc("2025-01-01"), level: 12000 },
      { at: utc("2025-04-01"), level: 15000 },
    ];
    expect(stepVertices(unsorted, x, y, DOMAIN[1])).toEqual(
      stepVertices(SERIES[0].points, x, y, DOMAIN[1]),
    );
  });

  it("draws nothing for a series with no points", () => {
    expect(stepVertices([], x, y, DOMAIN[1])).toEqual([]);
  });
});

describe("stepPath", () => {
  const x = xScaleFor(DOMAIN);
  const y = yScaleFor(yDomainOf(SERIES));

  it("is a moveto followed by linetos, never a NaN", () => {
    const d = stepPath(SERIES[0].points, x, y, DOMAIN[1]);
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain("L ");
    expect(d).not.toContain("NaN");
  });

  it("is empty — not 'M NaN' — for a series with no points", () => {
    expect(stepPath([], x, y, DOMAIN[1])).toBe("");
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

describe("levelsTimelineGeometry — the whole observation", () => {
  const geometry = levelsTimelineGeometry({
    series: SERIES,
    mutations: MUTATIONS,
    domain: DOMAIN,
  });

  it("carries one line per series, primary last so it paints on top", () => {
    expect(geometry.lines).toHaveLength(3);
    expect(geometry.lines[geometry.lines.length - 1].primary).toBe(true);
  });

  it("assigns each series a stable series-token index from its own order", () => {
    // `total` is painted last but keeps the token index of its input position.
    const total = geometry.lines.find((line) => line.id === "total");
    expect(total?.seriesIndex).toBe(3);
  });

  it("prints the table a reader checks the shape against", () => {
    const [lo, hi] = geometry.yDomain;
    console.table([
      { field: "yDomain.lo", value: round(lo) },
      { field: "yDomain.hi", value: round(hi) },
      { field: "plot", value: `${PLOT_LEFT}..${PLOT_RIGHT} x ${PLOT_TOP}..${PLOT_BOTTOM}` },
    ]);
    console.table(
      geometry.flags.map((flag) => ({
        id: flag.id,
        label: flag.label,
        x: round(flag.x),
        boxX: round(flag.boxX),
      })),
    );
    for (const line of geometry.lines) {
      console.table(
        line.vertices.map((vertex, index) => ({
          series: line.id,
          i: index,
          x: round(vertex.x),
          y: round(vertex.y),
        })),
      );
    }
    expect(geometry.flags).toHaveLength(3);
  });
});
