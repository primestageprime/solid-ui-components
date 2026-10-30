import { describe, it, expect } from "vitest";
import { gridMove, numberGridCells } from "./numberGrid";

describe("numberGridCells", () => {
  it("marks picked, run, target and marker", () => {
    const cells = numberGridCells(3, 8, { value: 4, target: 6, marker: 3 });
    expect(cells.map((c) => c.n)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(cells.filter((c) => c.inRun).map((c) => c.n)).toEqual([5, 6]);
    expect(cells.find((c) => c.picked)?.n).toBe(4);
    expect(cells.find((c) => c.isTarget)?.n).toBe(6);
    expect(cells.find((c) => c.marked)?.n).toBe(3);
  });
  it("runs from `from` when nothing is picked, and is empty when to < from", () => {
    expect(
      numberGridCells(1, 4, { target: 2 })
        .filter((c) => c.inRun)
        .map((c) => c.n),
    ).toEqual([1, 2]);
    expect(numberGridCells(5, 4)).toEqual([]);
  });
});

describe("gridMove", () => {
  it("steps cells and rows, clamps at the edges, jumps Home/End", () => {
    expect(gridMove(0, "ArrowRight", 25, 10)).toBe(1);
    expect(gridMove(0, "ArrowLeft", 25, 10)).toBe(0);
    expect(gridMove(3, "ArrowDown", 25, 10)).toBe(13);
    expect(gridMove(17, "ArrowDown", 25, 10)).toBe(17);
    expect(gridMove(13, "ArrowUp", 25, 10)).toBe(3);
    expect(gridMove(3, "ArrowUp", 25, 10)).toBe(3);
    expect(gridMove(9, "Home", 25, 10)).toBe(0);
    expect(gridMove(0, "End", 25, 10)).toBe(24);
    expect(gridMove(0, "Enter", 25, 10)).toBeNull();
  });
});
