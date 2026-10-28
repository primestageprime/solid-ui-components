// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  gutterBox,
  spreadGutterRows,
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

describe("spreadGutterRows", () => {
  const ys = (labels: readonly GutterLabel[]) =>
    spreadGutterRows(labels, PLOT, METRICS).rows.map((row) => row.y);

  it("packs nothing when given nothing", () => {
    expect(spreadGutterRows([], PLOT, METRICS)).toEqual({
      rows: [],
      spilled: [],
    });
  });

  it("leaves a lone label on its own line-end y, in lane 1", () => {
    const { rows } = spreadGutterRows([at(50)], PLOT, METRICS);
    expect(rows.map((row) => [row.y, row.lane])).toEqual([[50, 1]]);
  });

  it("puts every label at its own line-end y when no two collide", () => {
    expect(ys([at(10), at(30), at(50), at(70), at(90)])).toEqual([
      10, 30, 50, 70, 90,
    ]);
  });

  it("spreads two labels at one y evenly about that y", () => {
    expect(ys([at(50), at(50)])).toEqual([43.5, 56.5]);
  });

  it("moves colliding labels apart by the minimum gap only", () => {
    // 50 and 53 collide. They centre on their mean, 51.5, one pitch apart.
    expect(ys([at(50), at(53)])).toEqual([45, 58]);
  });

  it("keeps the labels in the order of their line-end ys at the plot bottom", () => {
    // The greedy packer put the second bottom label ABOVE the label for 90.
    const { rows } = spreadGutterRows(
      [at(100), at(90), at(99)],
      PLOT,
      METRICS,
    );
    expect(rows.map((row) => row.label.endY)).toEqual([90, 99, 100]);
    expect(rows.map((row) => row.y)).toEqual([68.5, 81.5, 94.5]);
  });

  it("merges a chain of collisions into one evenly spaced stack", () => {
    expect(ys([at(50), at(60), at(70)])).toEqual([47, 60, 73]);
  });

  it("does not move a label that clears the stack", () => {
    expect(ys([at(30), at(30), at(80)])).toEqual([23.5, 36.5, 80]);
  });

  it("answers the same rows whatever order the labels arrive in", () => {
    const forward = spreadGutterRows([at(20), at(25), at(60)], PLOT, METRICS);
    const reversed = spreadGutterRows([at(60), at(25), at(20)], PLOT, METRICS);
    expect(reversed.rows).toEqual(forward.rows);
  });

  it("spills the LAST label in input order when the lane cap is reached", () => {
    const oneRow: GutterMetrics = { ...METRICS, maxRows: 1 };
    const first = { ...at(50), width: 20 };
    const second = { ...at(50), width: 30 };
    const { rows, spilled } = spreadGutterRows([first, second], PLOT, oneRow);
    expect(rows.map((row) => [row.label, row.y])).toEqual([[first, 50]]);
    expect(spilled).toEqual([second]);
  });

  it("spills what the plot band cannot hold, never drawing outside it", () => {
    // 63px holds five 11px rows on a 13px pitch.
    const short: PlotRect = { left: 0, top: 0, right: 200, bottom: 63 };
    const wide: GutterMetrics = { ...METRICS, maxRows: 10 };
    const labels = [0, 1, 2, 3, 4, 5].map((i) => ({ ...at(30), width: i }));
    const { rows, spilled } = spreadGutterRows(labels, short, wide);
    expect(rows.map((row) => row.y)).toEqual([5.5, 18.5, 31.5, 44.5, 57.5]);
    expect(spilled).toEqual([labels[5]]);
  });
});
