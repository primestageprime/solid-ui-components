// src/components/ScrubChart/scales.test.ts
import { describe, it, expect } from "vitest";
import { layoutCells, xToCell } from "./scales";

const DEFAULT = {
  cellCount: 22,
  chartWidth: 880,
  selectedFraction: 2 / 3,
  sideCompression: 28,
};

describe("layoutCells", () => {
  it("at integer selectedAnim, focused cell is exactly selectedFraction of chartWidth", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect(r - l).toBeCloseTo(DEFAULT.chartWidth * DEFAULT.selectedFraction, 1);
  });

  it("active window widths sum to chartWidth", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const total = layout.activeWindow
      .map((i) => layout.bounds[i][1] - layout.bounds[i][0])
      .reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(DEFAULT.chartWidth, 1);
  });

  it("focused cell centre sits at chartWidth/2 at integer selectedAnim", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect((l + r) / 2).toBeCloseTo(DEFAULT.chartWidth / 2, 1);
  });

  it("at fractional selectedAnim, two cells share the focus width", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8.5 });
    const w8 = layout.bounds[8][1] - layout.bounds[8][0];
    const w9 = layout.bounds[9][1] - layout.bounds[9][0];
    expect(w8).toBeCloseTo(w9, 1);
    expect(w8).toBeGreaterThan(layout.bounds[7][1] - layout.bounds[7][0]); // wider than a pure side cell
    expect(w8).toBeLessThan(DEFAULT.chartWidth * DEFAULT.selectedFraction);  // narrower than full focus
  });

  it("derives sideWindow from selectedFraction × sideCompression", () => {
    // (1 - 2/3) * 28 / (2 * 2/3) = (1/3 * 28) / (4/3) = 7
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    expect(layout.sideWindow).toBe(7);
    // Active window should include selected ± sideWindow.
    expect(layout.activeWindow).toContain(1);
    expect(layout.activeWindow).toContain(15);
    expect(layout.activeWindow).not.toContain(0);
    expect(layout.activeWindow).not.toContain(16);
  });

  it("clamps sideWindow to 0 when knobs leave no room for side cells", () => {
    const layout = layoutCells({
      cellCount: 20,
      chartWidth: 880,
      selectedFraction: 0.95,
      sideCompression: 4, // 0.05 * 4 / 1.9 = 0.105 < 1
      selectedAnim: 8,
    });
    expect(layout.sideWindow).toBe(0);
    // Active window is just the focused cell.
    expect(layout.activeWindow).toEqual([8]);
    // Focused cell expands to fill (width === chartWidth).
    expect(layout.bounds[8][1] - layout.bounds[8][0]).toBeCloseTo(880, 1);
  });

  it("handles selected near the start (fewer left-side cells)", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 2 });
    expect(layout.activeWindow[0]).toBe(0); // can't go below 0
    // Visible cells on the left side: 0, 1 (only 2 instead of 7).
    expect(layout.bounds[0][0]).toBeGreaterThanOrEqual(0);
  });

  it("handles selected near the end (fewer right-side cells)", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 20 });
    expect(layout.activeWindow.at(-1)).toBe(21); // last cell index = 21
  });

  it("extrapolates bounds for cells outside the active window", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    // Cell 0 is outside the active window (window starts at 1).
    expect(layout.bounds[0]).toBeDefined();
    // Cell 0's left edge is off-canvas (the right edge sits at x = bounds[1][0] = 0).
    expect(layout.bounds[0][0]).toBeLessThan(0);
    expect(layout.bounds[0][1]).toBeLessThanOrEqual(0);
  });
});

describe("xToCell", () => {
  it("returns the focused cell index for x at chart centre", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    expect(xToCell(DEFAULT.chartWidth / 2, layout)).toBeCloseTo(8, 2);
  });

  it("returns a fractional value within the focused cell", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    const [l, r] = layout.bounds[8];
    expect(xToCell(l + (r - l) * 0.25, layout)).toBeCloseTo(8 - 0.25, 2);
    expect(xToCell(l + (r - l) * 0.75, layout)).toBeCloseTo(8 + 0.25, 2);
  });

  it("clamps to nearest visible cell when x is outside the chart range", () => {
    const layout = layoutCells({ ...DEFAULT, selectedAnim: 8 });
    // Far left → leftmost visible cell.
    expect(xToCell(-1000, layout)).toBe(layout.activeWindow[0]);
    // Far right → rightmost visible cell.
    expect(xToCell(99999, layout)).toBe(layout.activeWindow.at(-1));
  });
});
