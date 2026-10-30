import { describe, it, expect } from "vitest";
import { projectionEnd } from "./paceProjection";

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
