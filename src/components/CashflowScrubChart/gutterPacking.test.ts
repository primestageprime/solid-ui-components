import { describe, expect, it } from "vitest";
import {
  gutterBox,
  packGutterRows,
  parkedY,
  type GutterLabel,
  type GutterMetrics,
} from "./gutterPacking";
import type { PlotRect } from "./labelBoxes";

/** A 200x100 plot with round edges keeps every expected coordinate readable. */
const PLOT: PlotRect = { left: 0, top: 0, right: 200, bottom: 100 };

/** The chart's own numbers: an 11px row, 2px of clear space, four rows. */
const METRICS: GutterMetrics = {
  rowPitch: 13,
  rowGap: 2,
  gutterGap: 6,
  maxRows: 4,
};

const at = (endY: number): GutterLabel => ({ width: 14, height: 11, endY });

describe("parkedY", () => {
  it("keeps the whole text row inside the plot band", () => {
    expect(parkedY(PLOT.top, 11, PLOT)).toBe(5.5);
    expect(parkedY(PLOT.bottom, 11, PLOT)).toBe(94.5);
    expect(parkedY(50, 11, PLOT)).toBe(50);
  });

  it("centres the row in a band too short to hold it", () => {
    const thin: PlotRect = { left: 0, top: 40, right: 200, bottom: 44 };
    expect(parkedY(0, 11, thin)).toBe(42);
  });
});

describe("gutterBox", () => {
  it("starts the box one gap past the plot's right edge", () => {
    expect(gutterBox(at(50), 50, PLOT, METRICS.gutterGap)).toEqual({
      x0: 206,
      x1: 220,
      y0: 44.5,
      y1: 55.5,
    });
  });
});

describe("packGutterRows", () => {
  it("packs nothing when given nothing", () => {
    expect(packGutterRows([], PLOT, METRICS)).toEqual({
      rows: [],
      spilled: [],
    });
  });

  it("leaves a lone label on its own parked row", () => {
    const { rows } = packGutterRows([at(50)], PLOT, METRICS);
    expect(rows.map((row) => [row.y, row.lane])).toEqual([[50, 1]]);
  });

  it("moves a colliding label to the next row below", () => {
    const { rows, spilled } = packGutterRows([at(50), at(53)], PLOT, METRICS);
    expect(rows.map((row) => row.y)).toEqual([50, 66]);
    expect(spilled).toEqual([]);
  });

  it("walks the labels top to bottom, whatever order they arrive in", () => {
    const forward = packGutterRows([at(20), at(60)], PLOT, METRICS);
    const reversed = packGutterRows([at(60), at(20)], PLOT, METRICS);
    expect(reversed.rows).toEqual(forward.rows);
  });

  it("spills a label when one row is all the gutter allows", () => {
    const oneRow: GutterMetrics = { ...METRICS, maxRows: 1 };
    const { rows, spilled } = packGutterRows([at(50), at(53)], PLOT, oneRow);
    expect(rows).toHaveLength(1);
    expect(spilled).toEqual([at(53)]);
  });

  it("takes the row above when the clamp blocks every row below", () => {
    const { rows } = packGutterRows(
      [at(PLOT.bottom), at(PLOT.bottom)],
      PLOT,
      METRICS,
    );
    expect(rows.map((row) => [row.y, row.lane])).toEqual([
      [94.5, 1],
      [81.5, 2],
    ]);
  });
});
