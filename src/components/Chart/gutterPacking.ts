// ============================================
// gutterPacking — Depth 0, pure. Which row each right-gutter label draws in.
//
// Each right-gutter label names the END of a line, so its centre sits at the
// y where that line ends. Only when two boxes would touch do the labels move,
// and then by the least distance: they form a stack one minimum gap apart,
// centred on the mean of their own ys, kept in the order of those ys and kept
// inside the plot band.
//
// The packer this replaced (owner bug, 2026-10-27) took each label's own row,
// else the next row DOWN, else a row UP. At the plot's bottom edge that put a
// later label above an earlier one, so "Starting balance" floated over "Cash
// floor" while its line ended at the bottom, and a whole cluster slid down
// away from its lines.
//
// Structural on purpose, like `laneOf`: the caller keeps its own label type and
// gets it back with a row. No DOM, no scale, no measurement — same inputs give
// the same output.
// ============================================
import { filter, flatMap, map, sortBy } from "../../fn";
import type { Box, PlotRect } from "./labelBoxes";

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

/** One label with its input position, which decides who spills first. */
interface Ranked<Label> {
  readonly label: Label;
  readonly rank: number;
  readonly park: number;
}

/** Labels that collided, laid one minimum gap apart from `start`. */
interface Stack<Label> {
  readonly members: readonly Ranked<Label>[];
  /** Offset of each member's centre from the first member's centre. */
  readonly offsets: readonly number[];
  /** Pixel y of the first member's centre. */
  readonly start: number;
}

/** The least centre-to-centre distance that keeps two boxes clear. */
const minGap = (a: GutterLabel, b: GutterLabel, metrics: GutterMetrics) =>
  (a.height + b.height) / 2 + metrics.rowGap;

const lastOf = <T>(items: readonly T[]): T => items[items.length - 1];

/**
 * The start that puts the stack's centres as near their parked ys as the plot
 * band allows: the mean wish (least total move), clamped into the band. A
 * stack taller than the band starts at the top, and its overflow spills.
 */
const placedStack = <Label extends GutterLabel>(
  members: readonly Ranked<Label>[],
  offsets: readonly number[],
  plot: PlotRect,
): Stack<Label> => {
  const wish =
    members.reduce((total, m, i) => total + m.park - offsets[i], 0) /
    members.length;
  const lo = plot.top + members[0].label.height / 2;
  const hi = plot.bottom - lastOf(members).label.height / 2 - lastOf(offsets);
  return { members, offsets, start: Math.max(lo, Math.min(hi, wish)) };
};

/** Two stacks as one, the second laid one minimum gap under the first. */
const joined = <Label extends GutterLabel>(
  upper: Stack<Label>,
  lower: Stack<Label>,
  plot: PlotRect,
  metrics: GutterMetrics,
): Stack<Label> => {
  const shift =
    lastOf(upper.offsets) +
    minGap(lastOf(upper.members).label, lower.members[0].label, metrics);
  return placedStack(
    [...upper.members, ...lower.members],
    [...upper.offsets, ...map((o: number) => o + shift, lower.offsets)],
    plot,
  );
};

/** Whether `lower` starts closer under `upper` than the minimum gap. */
const stacksCollide = <Label extends GutterLabel>(
  upper: Stack<Label>,
  lower: Stack<Label>,
  metrics: GutterMetrics,
): boolean =>
  lower.start - (upper.start + lastOf(upper.offsets)) <
  minGap(lastOf(upper.members).label, lower.members[0].label, metrics);

/** Push one stack onto the top-down list, merging upward while it collides. */
const pushStack = <Label extends GutterLabel>(
  stacks: readonly Stack<Label>[],
  next: Stack<Label>,
  plot: PlotRect,
  metrics: GutterMetrics,
): readonly Stack<Label>[] => {
  const upper = stacks[stacks.length - 1];
  return upper !== undefined && stacksCollide(upper, next, metrics)
    ? pushStack(stacks.slice(0, -1), joined(upper, next, plot, metrics), plot, metrics)
    : [...stacks, next];
};

/** One row per label: each at its parked y, colliding labels spread apart. */
const spreadRows = <Label extends GutterLabel>(
  ranked: readonly Ranked<Label>[],
  plot: PlotRect,
  metrics: GutterMetrics,
): readonly (GutterRow<Label> & { readonly rank: number; readonly fits: boolean })[] =>
  flatMap(
    (stack: Stack<Label>) =>
      map((m: Ranked<Label>, i: number) => {
        const y = stack.start + stack.offsets[i];
        const half = m.label.height / 2;
        const moved = Math.abs(y - m.park) / metrics.rowPitch;
        const lane = Math.ceil(moved - MOVE_TOLERANCE) + 1;
        return {
          label: m.label,
          y,
          lane,
          rank: m.rank,
          fits:
            lane <= metrics.maxRows &&
            y - half >= plot.top - MOVE_TOLERANCE &&
            y + half <= plot.bottom + MOVE_TOLERANCE,
        };
      }, stack.members),
    ranked.reduce<readonly Stack<Label>[]>(
      (stacks, m) =>
        pushStack(stacks, placedStack([m], [0], plot), plot, metrics),
      [],
    ),
  );

/** Below a thousandth of a pixel, a move is rounding, not a move. */
const MOVE_TOLERANCE = 1e-6;

/**
 * Give every gutter label a row at the y where its line ends.
 *
 * A label sits at its own parked y (`parkedY` of its `endY`) unless its box
 * would touch a neighbour's. Labels that would touch form a STACK: one
 * minimum gap apart (half of each height plus `rowGap`), in the order of
 * their parked ys, and centred on the mean of those ys, so the total move is
 * the least possible. A stack never leaves the plot band; at an edge it
 * slides inward and can merge with the next stack. Order by y always holds,
 * so a label never sits on the wrong side of a neighbour's line.
 *
 * A label spills when its row would sit more than `maxRows - 1` pitches
 * from its own y, or outside the band. The LAST label in input order among
 * those that do not fit spills first, then the rest spread again. So a
 * caller lists the labels it most wants kept first.
 *
 * @param labels  The gutter labels, most important first.
 * @param plot    The plot rectangle in pixel space.
 * @param metrics The gutter's pixel vocabulary.
 * @returns The filled rows, top to bottom, and the labels that found no row,
 *          in the order they spilled.
 */
export const spreadGutterRows = <Label extends GutterLabel>(
  labels: readonly Label[],
  plot: PlotRect,
  metrics: GutterMetrics,
): GutterPacking<Label> => {
  // By the RAW end y: two ends past one edge clamp to one parked y, and the
  // clamp keeps their order, so the row order still follows the lines.
  const ranked = sortBy(
    (m: Ranked<Label>) => m.label.endY,
    map(
      (label: Label, rank: number) => ({
        label,
        rank,
        park: parkedY(label.endY, label.height, plot),
      }),
      labels,
    ),
  );
  const rows = spreadRows(ranked, plot, metrics);
  const misfits = filter((row) => !row.fits, rows);
  if (misfits.length === 0) {
    return {
      rows: map(({ label, y, lane }) => ({ label, y, lane }), rows),
      spilled: [],
    };
  }
  const drop = misfits.reduce((a, b) => (b.rank > a.rank ? b : a)).label;
  const rest = spreadGutterRows(
    filter((label: Label) => label !== drop, labels),
    plot,
    metrics,
  );
  return { rows: rest.rows, spilled: [drop, ...rest.spilled] };
};
