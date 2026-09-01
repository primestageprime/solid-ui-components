// ============================================
// Band placement and the arc ring — the pure half.
//
// Kept apart from helpers.test.ts, which already runs to 400 lines on the
// threshold placer alone. Everything here is arithmetic on numbers: jsdom
// implements no SVG layout, so anything asserted through the DOM would be
// asserting the rail's own width ESTIMATE rather than a measurement.
// ============================================
import { describe, expect, it } from "vitest";
import {
  ARC_GAP,
  arcLengths,
  bandHolds,
  jumpTargets,
  MAX_ARCS,
  placeBands,
  RAIL_INSET,
  RING_RADIUS,
  VIEW_WIDTH,
} from "./helpers";
import type { Band } from "./types";

/** The rail runs x=22 to x=678, so a domain of [0, 100] is 6.56 units a point. */
const DOMAIN: readonly [number, number] = [0, 100];
const toX = (v: number): number =>
  RAIL_INSET + (v / 100) * (VIEW_WIDTH - RAIL_INSET * 2);

const LEFT = RAIL_INSET;
const RIGHT = VIEW_WIDTH - RAIL_INSET;

const place = (bands: Band[]) => placeBands(bands, toX, DOMAIN);
const only = (bands: Band[]) => place(bands).placed[0];

describe("placeBands — the span and its ends", () => {
  it("spans both ends of a bounded band and caps each one", () => {
    const b = only([{ start: 25, end: 75, label: "safe" }]);
    expect(b.x1).toBe(186);
    expect(b.x2).toBe(514);
    expect(b.capStart).toBe(true);
    expect(b.capEnd).toBe(true);
  });

  it("runs an omitted end to the rail's right inset, and leaves it uncapped", () => {
    // "insolvent above $9.3k" — there is no crossing at the right end to draw.
    const b = only([{ start: 50, label: "insolvent" }]);
    expect(b.x1).toBe(350);
    expect(b.x2).toBe(RIGHT);
    expect(b.capStart).toBe(true);
    expect(b.capEnd).toBe(false);
  });

  it("runs an omitted start to the left inset, and leaves it uncapped", () => {
    const b = only([{ end: 50, label: "safe" }]);
    expect(b.x1).toBe(LEFT);
    expect(b.x2).toBe(350);
    expect(b.capStart).toBe(false);
    expect(b.capEnd).toBe(true);
  });

  it("spans the whole rail, uncapped, when a band states neither end", () => {
    const b = only([{ label: "always true" }]);
    expect(b.x1).toBe(LEFT);
    expect(b.x2).toBe(RIGHT);
    expect(b.capStart).toBe(false);
    expect(b.capEnd).toBe(false);
  });

  it("clamps a band that overhangs the domain, and does not cap where it was clipped", () => {
    // A consumer computing against a wider model than the rail shows is not
    // wrong. The bar is clipped to what the rail can draw; the cap remembers
    // that there was no crossing to mark there.
    const b = only([{ start: -40, end: 160, label: "wider than the rail" }]);
    expect(b.x1).toBe(LEFT);
    expect(b.x2).toBe(RIGHT);
    expect(b.capStart).toBe(false);
    expect(b.capEnd).toBe(false);
  });

  it("defaults a band to the side below the rail, where thresholds do not go", () => {
    // Thresholds default "above", bands default "below", so the two stacks
    // separate with the consumer doing nothing.
    expect(only([{ start: 10, end: 20, label: "b" }]).side).toBe("below");
    expect(only([{ start: 10, end: 20, label: "b", side: "above" }]).side).toBe(
      "above",
    );
  });
});

describe("placeBands — lanes", () => {
  it("keeps two bands that do not overlap in the same lane", () => {
    const { placed, belowLanes } = place([
      { start: 0, end: 10, label: "a" },
      { start: 80, end: 100, label: "b" },
    ]);
    expect(placed.map((p) => p.lane)).toEqual([1, 1]);
    expect(belowLanes).toBe(1);
  });

  it("stacks overlapping bands outward, one lane each", () => {
    const { placed, belowLanes } = place([
      { start: 0, end: 60, label: "a" },
      { start: 40, end: 100, label: "b" },
    ]);
    expect(placed.map((p) => p.lane)).toEqual([1, 2]);
    expect(belowLanes).toBe(2);
  });

  it("NEVER superimposes two bars, however many overlap", () => {
    // The whole reason bands pass maxLanes: Infinity. Two bars at one lane's y
    // read as a SINGLE bar spanning the union of both extents — a span that
    // neither band claims. A crowded label is survivable; a false one is not.
    const twelve: Band[] = Array.from({ length: 12 }, (_, i) => ({
      start: 0,
      end: 100,
      label: `band ${i}`,
    }));
    const { placed, belowLanes } = place(twelve);
    expect(belowLanes).toBe(12);
    expect(new Set(placed.map((p) => p.lane)).size).toBe(12);
  });

  it("stacks each side independently", () => {
    const { aboveLanes, belowLanes } = place([
      { start: 0, end: 100, label: "a", side: "above" },
      { start: 0, end: 100, label: "b", side: "above" },
      { start: 0, end: 100, label: "c" },
    ]);
    expect(aboveLanes).toBe(2);
    expect(belowLanes).toBe(1);
  });

  it("clears a neighbour by the label's width when the bar is shorter than its text", () => {
    // The lane box is the wider of the bar and its label. Two short bars a few
    // units apart still collide if their labels do.
    const { belowLanes } = place([
      { start: 49, end: 50, label: "a very long label indeed" },
      { start: 51, end: 52, label: "another very long label" },
    ]);
    expect(belowLanes).toBe(2);
  });
});

describe("bandHolds", () => {
  it("holds inside its own span, including both ends", () => {
    const band: Band = { start: 25, end: 75, label: "safe" };
    expect(bandHolds(band, 25, DOMAIN)).toBe(true);
    expect(bandHolds(band, 50, DOMAIN)).toBe(true);
    expect(bandHolds(band, 75, DOMAIN)).toBe(true);
    expect(bandHolds(band, 24, DOMAIN)).toBe(false);
    expect(bandHolds(band, 76, DOMAIN)).toBe(false);
  });

  it("reads an omitted end as the domain end", () => {
    expect(bandHolds({ start: 50, label: "x" }, 100, DOMAIN)).toBe(true);
    expect(bandHolds({ end: 50, label: "x" }, 0, DOMAIN)).toBe(true);
    expect(bandHolds({ label: "x" }, 50, DOMAIN)).toBe(true);
  });
});

describe("arcLengths", () => {
  const circumference = 2 * Math.PI * RING_RADIUS;

  it("draws one full circle for a single active band", () => {
    // Exactly the ring the rail drew before bands existed.
    const arcs = arcLengths(1, RING_RADIUS);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].arc).toBeCloseTo(circumference, 6);
    expect(arcs[0].gap).toBe(0);
  });

  it("splits the circumference into equal arcs with one gap each", () => {
    const arcs = arcLengths(3, RING_RADIUS);
    expect(arcs).toHaveLength(3);
    const consumed = arcs.reduce((sum, a) => sum + a.arc + a.gap, 0);
    expect(consumed).toBeCloseTo(circumference, 6);
    expect(arcs.every((a) => a.gap === ARC_GAP)).toBe(true);
  });

  it("keeps every arc the same length, so no band reads as larger than another", () => {
    const arcs = arcLengths(4, RING_RADIUS);
    expect(new Set(arcs.map((a) => a.arc)).size).toBe(1);
  });

  it("gives up past MAX_ARCS rather than drawing arcs too short to read", () => {
    // At ten arcs each is twice the stroke width and reads as a dash. The
    // caller draws one neutral ring instead and the dimmed bars carry it.
    expect(arcLengths(MAX_ARCS, RING_RADIUS)).toHaveLength(MAX_ARCS);
    expect(arcLengths(MAX_ARCS + 1, RING_RADIUS)).toEqual([]);
  });

  it("draws nothing when no band holds, so the arrow can take over", () => {
    expect(arcLengths(0, RING_RADIUS)).toEqual([]);
  });
});

describe("jumpTargets", () => {
  it("collects the thresholds and the ends a band actually claims", () => {
    expect(
      jumpTargets(
        [{ value: 10, label: "t" }],
        [{ start: 30, end: 60, label: "b" }],
      ),
    ).toEqual([10, 30, 60]);
  });

  it("skips an omitted end, which is a domain edge and not a crossing", () => {
    expect(jumpTargets([], [{ start: 30, label: "b" }])).toEqual([30]);
    expect(jumpTargets([], [{ label: "b" }])).toEqual([]);
  });

  it("stops once where a band end coincides with a threshold", () => {
    expect(
      jumpTargets(
        [{ value: 30, label: "t" }],
        [{ start: 30, end: 60, label: "b" }],
      ),
    ).toEqual([30, 60]);
  });

  it("sorts, so PageUp and PageDown can walk the list in order", () => {
    expect(
      jumpTargets(
        [{ value: 90, label: "t" }],
        [{ start: 20, end: 5, label: "b" }],
      ),
    ).toEqual([5, 20, 90]);
  });
});
