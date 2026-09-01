import { describe, expect, it } from "vitest";
import { anchoredSpan, fitAnchor, laneOf } from "./labelLayout";

// A 0..100 frame with round widths keeps every expected span readable.
const LO = 0;
const HI = 100;

// One packing for the whole lane suite, so a lane number below is only ever
// about the spans that produced it.
const PACKING = { maxLanes: 4, gutter: 4 };

/** A row richer than `LaneBox`, to prove the extra field survives `laneOf`. */
const box = (name: string, x: number, span: readonly [number, number]) => ({
  name,
  x,
  span,
});

describe("fitAnchor", () => {
  it("centres a label that fits on both sides", () => {
    expect(fitAnchor(50, 20, LO, HI)).toBe("middle");
  });

  it("starts a label that would spill past the low edge", () => {
    expect(fitAnchor(5, 20, LO, HI)).toBe("start");
  });

  it("ends a label that would spill past the high edge", () => {
    expect(fitAnchor(95, 20, LO, HI)).toBe("end");
  });

  it("keeps middle when the label exactly touches an edge", () => {
    expect(fitAnchor(10, 20, LO, HI)).toBe("middle");
    expect(fitAnchor(90, 20, LO, HI)).toBe("middle");
  });

  it("prefers start over end when the label outgrows the whole span", () => {
    expect(fitAnchor(50, 400, LO, HI)).toBe("start");
  });

  it("reads lo and hi, not zero and a width", () => {
    expect(fitAnchor(30, 20, 25, 75)).toBe("start");
    expect(fitAnchor(70, 20, 25, 75)).toBe("end");
  });
});

describe("anchoredSpan", () => {
  it("runs right from x when anchored start", () => {
    expect(anchoredSpan(10, 30, "start")).toEqual([10, 40]);
  });

  it("runs left from x when anchored end", () => {
    expect(anchoredSpan(90, 30, "end")).toEqual([60, 90]);
  });

  it("straddles x when anchored middle", () => {
    expect(anchoredSpan(50, 30, "middle")).toEqual([35, 65]);
  });

  it("collapses to a point at zero width", () => {
    expect(anchoredSpan(50, 0, "middle")).toEqual([50, 50]);
  });

  it("agrees with the anchor fitAnchor picked, for every anchor", () => {
    const spanFor = (x: number, width: number) =>
      anchoredSpan(x, width, fitAnchor(x, width, LO, HI));
    expect(spanFor(5, 20)).toEqual([5, 25]);
    expect(spanFor(50, 20)).toEqual([40, 60]);
    expect(spanFor(95, 20)).toEqual([75, 95]);
  });
});

describe("laneOf", () => {
  it("keeps every box in lane 1 when none collide", () => {
    const lanes = laneOf(
      [box("a", 10, [0, 20]), box("b", 50, [40, 60]), box("c", 90, [80, 100])],
      PACKING,
    );
    expect(lanes.map((row) => row.lane)).toEqual([1, 1, 1]);
  });

  it("pushes a colliding box to the next lane out", () => {
    const lanes = laneOf(
      [box("a", 10, [0, 20]), box("b", 15, [10, 30])],
      PACKING,
    );
    expect(lanes.map((row) => [row.name, row.lane])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("counts the gutter as a collision", () => {
    // b starts 2 past a's end — clear, but inside the gutter of 4.
    const lanes = laneOf(
      [box("a", 10, [0, 20]), box("b", 30, [22, 40])],
      PACKING,
    );
    expect(lanes.map((row) => row.lane)).toEqual([1, 2]);
  });

  it("returns to lane 1 once the gutter is satisfied", () => {
    const lanes = laneOf(
      [box("a", 10, [0, 20]), box("b", 40, [24, 44])],
      PACKING,
    );
    expect(lanes.map((row) => row.lane)).toEqual([1, 1]);
  });

  it("stacks a pile of overlapping boxes outward, one lane each", () => {
    const pile = [0, 1, 2, 3].map((i) => box(`b${i}`, i, [i, i + 20]));
    expect(laneOf(pile, PACKING).map((row) => row.lane)).toEqual([1, 2, 3, 4]);
  });

  it("shares the outermost lane past the cap rather than leaving the frame", () => {
    const pile = [0, 1, 2, 3, 4, 5].map((i) => box(`b${i}`, i, [i, i + 20]));
    expect(laneOf(pile, PACKING).map((row) => row.lane)).toEqual([
      1, 2, 3, 4, 4, 4,
    ]);
  });

  it("honours a packing of one lane by collapsing every box into it", () => {
    const pile = [0, 1, 2].map((i) => box(`b${i}`, i, [i, i + 20]));
    expect(
      laneOf(pile, { maxLanes: 1, gutter: 4 }).map((row) => row.lane),
    ).toEqual([1, 1, 1]);
  });

  it("packs tighter with a zero gutter than with a wide one", () => {
    const pair = [box("a", 10, [0, 20]), box("b", 30, [22, 40])];
    expect(laneOf(pair, { maxLanes: 4, gutter: 0 }).map((r) => r.lane)).toEqual(
      [1, 1],
    );
    expect(laneOf(pair, { maxLanes: 4, gutter: 8 }).map((r) => r.lane)).toEqual(
      [1, 2],
    );
  });

  it("walks left to right whatever order the caller passed", () => {
    const shuffled = [box("c", 90, [80, 100]), box("a", 10, [0, 20])];
    expect(laneOf(shuffled, PACKING).map((row) => row.name)).toEqual([
      "a",
      "c",
    ]);
  });

  it("orders by x, not by where the span starts", () => {
    // `right` is anchored end, so its span reaches left of `left`'s span.
    const rows = [box("left", 50, [50, 70]), box("right", 60, [20, 60])];
    expect(laneOf(rows, PACKING).map((row) => row.name)).toEqual([
      "left",
      "right",
    ]);
  });

  it("keeps the caller's own fields on every placed row", () => {
    const [only] = laneOf([box("named", 10, [0, 20])], PACKING);
    expect(only).toEqual({ name: "named", x: 10, span: [0, 20], lane: 1 });
  });

  it("mutates no input row", () => {
    const input = box("a", 10, [0, 20]);
    laneOf([input], PACKING);
    expect(input).toEqual({ name: "a", x: 10, span: [0, 20] });
  });

  it("places nothing when given nothing", () => {
    expect(laneOf([], PACKING)).toEqual([]);
  });
});
