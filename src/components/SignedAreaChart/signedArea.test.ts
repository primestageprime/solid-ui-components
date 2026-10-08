import { describe, expect, it } from "vitest";
import { signedAreaParts, signedExtent, traceSigned } from "./signedArea";

const pts = (ys: readonly number[]) => ys.map((y, x) => ({ x, y }));

describe("traceSigned", () => {
  it("adds nothing when every value is positive", () => {
    expect(traceSigned(pts([1, 2, 3]), 99)).toEqual(pts([1, 2, 3]));
  });
  it("adds nothing when every value is negative", () => {
    expect(traceSigned(pts([-1, -2, -3]), 99)).toEqual(pts([-1, -2, -3]));
  });
  it("inserts one interpolated vertex at a mid-segment crossing", () => {
    // 1 -> -3 crosses zero a quarter of the way along.
    expect(traceSigned(pts([1, -3]), 99)).toEqual([
      { x: 0, y: 1 },
      { x: 0.25, y: 0 },
      { x: 1, y: -3 },
    ]);
  });
  it("does not duplicate a crossing that lands exactly on a point", () => {
    expect(traceSigned(pts([1, 0, -1]), 99)).toEqual(pts([1, 0, -1]));
  });
  it("inserts a vertex where NOW falls inside a segment", () => {
    expect(traceSigned(pts([2, 4]), 0.5)).toEqual([
      { x: 0, y: 2 },
      { x: 0.5, y: 3 },
      { x: 1, y: 4 },
    ]);
  });
  it("orders a crossing and NOW inside the same segment", () => {
    const xs = traceSigned(pts([1, -3]), 0.6).map((v) => v.x);
    expect(xs).toEqual([0, 0.25, 0.6, 1]);
  });
});

describe("signedAreaParts", () => {
  it("flattens the opposite sign onto zero and splits at NOW", () => {
    const p = signedAreaParts(pts([1, -1, -2]), 1);
    expect(p.pastAbove).toEqual([
      { x: 0, y: 1 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(p.pastBelow).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: -1 },
    ]);
    expect(p.futureAbove.every((v) => v.y === 0)).toBe(true);
    expect(p.futureBelow).toEqual([
      { x: 1, y: -1 },
      { x: 2, y: -2 },
    ]);
  });
  it("shares the NOW vertex between actual and outlook", () => {
    const p = signedAreaParts(pts([2, 4]), 0.5);
    expect(p.actual.at(-1)).toEqual(p.outlook[0]);
  });
  it("is all outlook when NOW is before the data", () => {
    expect(signedAreaParts(pts([1, 2]), -5).actual).toEqual([]);
  });
});

describe("signedExtent", () => {
  it("always holds zero", () => {
    expect(signedExtent(pts([3, 5]))).toEqual([0, 5]);
    expect(signedExtent(pts([-3, -5]))).toEqual([-5, 0]);
  });
});
