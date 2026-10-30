import { describe, it, expect } from "vitest";
import { projectionEnd, stackLabelRows } from "./paceProjection";

describe("projectionEnd", () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
  ];
  it("ends at (finishX, total) inside the window", () => {
    expect(projectionEnd(pts, 30, 15, 40)).toEqual({ x: 30, y: 15 });
  });
  it("is cut at the right edge when the finish lies beyond it", () => {
    expect(projectionEnd(pts, 30, 15, 20)).toEqual({ x: 20, y: 10 });
  });
  it("is null with no finish, no points, a finished series, or a finish behind the last point", () => {
    expect(projectionEnd(pts, null, 15, 40)).toBeNull();
    expect(projectionEnd([], 30, 15, 40)).toBeNull();
    expect(projectionEnd([{ x: 5, y: 15 }], 30, 15, 40)).toBeNull();
    expect(projectionEnd(pts, 8, 15, 40)).toBeNull();
  });
});

describe("stackLabelRows", () => {
  it("keeps apart captions on one row and stacks overlapping ones", () => {
    expect(
      stackLabelRows([
        { x: 10, width: 10 },
        { x: 100, width: 10 },
      ]),
    ).toEqual([0, 0]);
    expect(
      stackLabelRows([
        { x: 100, width: 60 },
        { x: 80, width: 40 },
      ]),
    ).toEqual([1, 0]);
    expect(stackLabelRows([])).toEqual([]);
  });
});
