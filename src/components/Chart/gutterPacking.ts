// ============================================
// gutterPacking — Depth 0, pure. Which row each right-gutter label draws in.
//
// The right rung stacks colliding labels one text row apart. It used to pick
// the row with the shared `laneOf` pass and then test the drawn box, and the
// two disagreed: `laneOf` measures every span at the label's own parked y,
// while the draw step hangs row n one pitch lower. A label that `laneOf` called
// clear could therefore collide once drawn, and the rung threw it away with a
// free row still under it.
//
// This packer removes the disagreement. It walks the rows the draw step really
// uses, box by box, so the row it returns is the row the caller draws. A label
// only spills when every row in the ladder is taken.
//
// The ladder, per label: its own parked row first, then each row below it, then
// each row above it. The rows above matter at the plot's bottom edge, where the
// clamp folds every row below back onto the parked row. Without them a label
// that ends at the edge loses its text to a neighbour that ends there too.
//
// Structural on purpose, like `laneOf`: the caller keeps its own label type and
// gets it back with a row. No DOM, no scale, no measurement — same inputs give
// the same output.
// ============================================
import { find, map, some, sortBy } from "../../fn";
import { boxesTouch, type Box, type PlotRect } from "./labelBoxes";

/** The least the packer needs to know about a label. */
export interface GutterLabel {
  /** Measured text width in px. */
  readonly width: number;
  /** Text row height in px. */
  readonly height: number;
  /** Pixel y the label asks to park at, before any clamp. */
  readonly endY: number;
}

/** The pixel vocabulary of the gutter. The caller owns these numbers. */
export interface GutterMetrics {
  /** Distance from one row's centre to the next row's centre. */
  readonly rowPitch: number;
  /** Clear space every pair of boxes demands. */
  readonly rowGap: number;
  /** Clear space between the plot's right edge and the text. */
  readonly gutterGap: number;
  /** Rows the packer may use, counted from the label's own row. */
  readonly maxRows: number;
}

/** One label with the row the packer gave it. */
export interface GutterRow<Label> {
  readonly label: Label;
  /** Pixel y of the text row's centre. */
  readonly y: number;
  /** Distance from the label's parked row, plus one. Rows at distance 1 above and below both report lane 2. Internal to gutterPacking. */
  readonly lane: number;
}

/** What the packer answers: the rows it filled, and the labels with no row. */
export interface GutterPacking<Label> {
  readonly rows: readonly GutterRow<Label>[];
  readonly spilled: readonly Label[];
}

/**
 * The y a gutter label parks at: the y it asks for, pulled far enough inside
 * the plot band for the whole text row to stay in frame.
 *
 * It CLAMPS, it never refuses. The frame buys the gutter before any scale
 * exists, so it cannot know where a line ends. A line that ends at the domain's
 * maximum ends at `plot.top` EXACTLY, and half a text row then hangs above the
 * frame. Refusing that label spends the gutter and draws nothing in it. A band
 * too short for one row parks the text at the band's centre, because a clamp
 * with no room left is still a number the caller can draw.
 */
export const parkedY = (y: number, height: number, plot: PlotRect): number => {
  const half = height / 2;
  const lo = plot.top + half;
  const hi = plot.bottom - half;
  return hi < lo ? (plot.top + plot.bottom) / 2 : Math.min(Math.max(y, lo), hi);
};

/** The box a gutter label covers once its row y is known. */
export const gutterBox = (
  label: GutterLabel,
  y: number,
  plot: PlotRect,
  gutterGap: number,
): Box => {
  const x0 = plot.right + gutterGap;
  const half = label.height / 2;
  return { x0, x1: x0 + label.width, y0: y - half, y1: y + half };
};

/**
 * The row offsets the packer tries, in order: the parked row, then each row
 * below it, then each row above it. Down before up, so an ordinary stack still
 * reads top to bottom.
 */
const rowSteps = (maxRows: number): readonly number[] =>
  map(
    (index: number) => (index < maxRows ? index : maxRows - 1 - index),
    [...Array(Math.max(2 * maxRows - 1, 0)).keys()],
  );

/** One candidate row: where it draws, and the box it covers there. */
interface RowCandidate {
  readonly y: number;
  readonly lane: number;
  readonly box: Box;
}

/** The candidate row `step` pitches from the label's parked row. */
const rowCandidate = (
  label: GutterLabel,
  park: number,
  step: number,
  plot: PlotRect,
  metrics: GutterMetrics,
): RowCandidate => {
  const y = parkedY(park + step * metrics.rowPitch, label.height, plot);
  return {
    y,
    lane: Math.abs(step) + 1,
    box: gutterBox(label, y, plot, metrics.gutterGap),
  };
};

/** The first row in the ladder whose box clears every box already drawn. */
const firstFreeRow = (
  label: GutterLabel,
  plot: PlotRect,
  metrics: GutterMetrics,
  taken: readonly Box[],
): RowCandidate | undefined => {
  const park = parkedY(label.endY, label.height, plot);
  return find(
    (row: RowCandidate) =>
      !some((other: Box) => boxesTouch(row.box, other, metrics.rowGap), taken),
    map(
      (step: number) => rowCandidate(label, park, step, plot, metrics),
      rowSteps(metrics.maxRows),
    ),
  );
};

/**
 * Give every label the first row in its ladder that no earlier label took.
 *
 * The walk runs top to bottom, so a label's row depends only on the labels
 * above it. The result is stable under input reorder for distinct parked y.
 * Ties resolve by input order.
 *
 * The loop is kept as a loop, like `laneOf`: each label reads the boxes the
 * earlier labels drew, so a combinator form would only hide the same carried
 * state. The arrays are local, so the function stays pure.
 *
 * @param labels  The gutter labels, in any order.
 * @param plot    The plot rectangle in pixel space.
 * @param metrics The gutter's pixel vocabulary.
 * @returns The filled rows, top to bottom, and the labels that found no row.
 */
export const packGutterRows = <Label extends GutterLabel>(
  labels: readonly Label[],
  plot: PlotRect,
  metrics: GutterMetrics,
): GutterPacking<Label> => {
  const rows: GutterRow<Label>[] = [];
  const taken: Box[] = [];
  const spilled: Label[] = [];
  const topDown = sortBy(
    (label: Label) => parkedY(label.endY, label.height, plot),
    labels,
  );
  for (const label of topDown) {
    const row = firstFreeRow(label, plot, metrics, taken);
    if (row === undefined) {
      spilled.push(label);
      continue;
    }
    taken.push(row.box);
    rows.push({ label, y: row.y, lane: row.lane });
  }
  return { rows, spilled };
};
