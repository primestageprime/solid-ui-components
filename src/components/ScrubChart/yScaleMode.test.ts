import { describe, it, expect } from "vitest";
import { scaleLinear } from "d3-scale";
import {
  DEFAULT_Y_FIT_MARGIN,
  fitCellRange,
  fitYDomain,
  widenToYFitBounds,
} from "./yScaleMode";

describe("fitCellRange", () => {
  it("answers the visible window in visible mode", () => {
    expect(fitCellRange("visible", [12, 30], 100)).toEqual([12, 30]);
  });

  it("answers every cell in series mode", () => {
    expect(fitCellRange("series", [12, 30], 100)).toEqual([0, 99]);
  });

  it("never returns a negative last index for an empty series", () => {
    expect(fitCellRange("series", [0, 0], 0)).toEqual([0, 0]);
  });
});

/** The tick values d3 draws for a domain, at the axis's tick count. */
const ticksOf = (domain: [number, number]): number[] =>
  scaleLinear().domain(domain).ticks(5);

/** The lowest tick the axis draws. */
const firstTick = (domain: [number, number]): number | undefined =>
  ticksOf(domain)[0];

/** The highest tick the axis draws. */
const lastTick = (domain: [number, number]): number | undefined =>
  ticksOf(domain).at(-1);

describe("fitYDomain", () => {
  it("pads both free ends and snaps the padded domain", () => {
    const [low, high] = fitYDomain(
      [10, 90],
      "visible",
      undefined,
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    // Padding widens 10..90 to 3.6..96.4; the snap rounds it outward.
    expect(low).toBeLessThanOrEqual(3.6);
    expect(high).toBeGreaterThanOrEqual(96.4);
  });

  it("orders an extent the caller passed the other way round", () => {
    expect(fitYDomain([90, 10], "visible", undefined, 0, 5)).toEqual(
      fitYDomain([10, 90], "visible", undefined, 0, 5),
    );
  });

  it("gives a flat extent a domain with height", () => {
    const [low, high] = fitYDomain([42, 42], "visible", undefined, 0.08, 5);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeLessThanOrEqual(42);
    expect(high).toBeGreaterThanOrEqual(42);
  });

  it("renders a pinned min exactly, with no margin below it", () => {
    const [low, high] = fitYDomain(
      [10, 90],
      "visible",
      { min: 0 },
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    expect(low).toBe(0);
    // The free end still takes the margin and the snap.
    expect(high).toBeGreaterThan(96);
  });

  it("renders a pinned max exactly while the min still snaps", () => {
    const [low, high] = fitYDomain(
      [10, 90],
      "visible",
      { max: 100 },
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    expect(high).toBe(100);
    expect(low).toBeLessThanOrEqual(3.6);
  });

  it("lets a mode pin override the shared pin for that mode only", () => {
    const pin = { min: 0, series: { min: -500 } };
    expect(fitYDomain([10, 90], "series", pin, 0.08, 5)[0]).toBe(-500);
    expect(fitYDomain([10, 90], "visible", pin, 0.08, 5)[0]).toBe(0);
  });

  it("returns two pinned ends exactly, with no padding and no snap", () => {
    expect(fitYDomain([10, 90], "visible", { min: 3, max: 7 }, 0.5, 5)).toEqual(
      [3, 7],
    );
  });

  it("pushes the free end out when a pin collapses the domain", () => {
    // Every value sits below the pinned floor, so the snapped max lands on or
    // under it. The min is pinned, so the max is the end that moves.
    const [low, high] = fitYDomain([-90, -10], "visible", { min: 0 }, 0.08, 5);
    expect(low).toBe(0);
    expect(high).toBeGreaterThan(0);
  });

  it("pushes the min out when the max is the pinned end", () => {
    const [low, high] = fitYDomain([10, 90], "visible", { max: 0 }, 0.08, 5);
    expect(high).toBe(0);
    expect(low).toBeLessThan(0);
  });
  // ── The FREE end lands on a nice bound ───────────────────────────────
  // The pin tests above read the PINNED end. A pipeline that skips the snap
  // whenever one end is pinned passes every one of them, and the reader gets
  // a ragged top. These two tests read the FREE end, and they ask the axis
  // for the tick that proves the bound is nice.

  it("snaps the free max to a nice bound when the min is pinned", () => {
    const domain = fitYDomain(
      [4, 6400],
      "visible",
      { min: 0 },
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    // The padding lifts 6400 to 6912. The snap then rounds it to 7000.
    expect(domain).toEqual([0, 7000]);
    // The axis carries a tick ON that bound, so the top gridline is labelled.
    expect(lastTick(domain)).toBe(7000);
  });

  it("snaps the free min to a nice bound when the max is pinned", () => {
    const domain = fitYDomain(
      [-4, -6400],
      "visible",
      { max: 0 },
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    expect(domain).toEqual([-7000, 0]);
    expect(firstTick(domain)).toBe(-7000);
  });

  it("snaps both free ends to nice bounds when nothing is pinned", () => {
    const domain = fitYDomain(
      [4, 6400],
      "visible",
      undefined,
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    // Both ends take the margin, so the padded span asks for a 2000 step.
    expect(domain).toEqual([-2000, 8000]);
    expect([firstTick(domain), lastTick(domain)]).toEqual([-2000, 8000]);
  });

  it("keeps two pinned ends exactly, and snaps neither", () => {
    // The caller states the whole domain, so no step of the pipeline runs.
    expect(
      fitYDomain(
        [4, 6400],
        "visible",
        { min: 37, max: 6377 },
        DEFAULT_Y_FIT_MARGIN,
        5,
      ),
    ).toEqual([37, 6377]);
  });
});

describe("widenToYFitBounds", () => {
  it("returns the domain unchanged when no mode has a bound", () => {
    expect(widenToYFitBounds([300, 900], "series", undefined)).toEqual([
      300, 900,
    ]);
  });

  it("returns the domain unchanged when the OTHER mode holds the bound", () => {
    expect(
      widenToYFitBounds([300, 900], "visible", { series: { min: 0 } }),
    ).toEqual([300, 900]);
  });

  it("drops the low end to a min the fit never reached", () => {
    expect(
      widenToYFitBounds([300, 900], "series", { series: { min: 0 } }),
    ).toEqual([0, 900]);
  });

  it("keeps a low end that already sits below the min", () => {
    // The bound includes, it does not override. The -50 cell stays visible.
    expect(
      widenToYFitBounds([-50, 900], "series", { series: { min: 0 } }),
    ).toEqual([-50, 900]);
  });

  it("lifts the high end to a max the fit never reached", () => {
    expect(
      widenToYFitBounds([0, 400], "visible", { visible: { max: 1000 } }),
    ).toEqual([0, 1000]);
  });

  it("keeps a high end that already sits above the max", () => {
    expect(
      widenToYFitBounds([0, 1200], "visible", { visible: { max: 1000 } }),
    ).toEqual([0, 1200]);
  });

  it("applies both edges of one bound", () => {
    expect(
      widenToYFitBounds([300, 400], "series", {
        series: { min: 0, max: 1000 },
      }),
    ).toEqual([0, 1000]);
  });

  it("gives each mode its own bound", () => {
    const bounds = { visible: { min: 0 }, series: { min: -500 } };
    expect(widenToYFitBounds([300, 900], "visible", bounds)[0]).toBe(0);
    expect(widenToYFitBounds([300, 900], "series", bounds)[0]).toBe(-500);
  });

  it("lands the floor on exactly zero after the margin and the snap", () => {
    // fitYDomain pads 300..900 and snaps it, which drops the low end below
    // 300. The bound then states the floor exactly, the way a pin does.
    const fitted = fitYDomain(
      [300, 900],
      "series",
      undefined,
      DEFAULT_Y_FIT_MARGIN,
      5,
    );
    expect(fitted[0]).not.toBe(0);
    expect(widenToYFitBounds(fitted, "series", { series: { min: 0 } })[0]).toBe(
      0,
    );
  });
});
