// ============================================
// numberGrid — pure cell model + keyboard movement for NumberPickGrid.
// No Solid, no DOM.
// ============================================

export interface NumberGridMarks {
  /** The picked number: drawn filled, announced as pressed. */
  value?: number;
  /** A number to call out without picking it (e.g. the last saved one): dashed outline. */
  marker?: number;
  /** End of the highlighted run: the run is value+1 … target, tinted, and target gets a heavy outline. */
  target?: number;
}

export interface NumberGridCell {
  n: number;
  picked: boolean;
  marked: boolean;
  /** Inside value+1 … target (or from … target when nothing is picked). */
  inRun: boolean;
  isTarget: boolean;
}

/** One cell per number from `from` to `to` inclusive (empty when to < from). */
export function numberGridCells(
  from: number,
  to: number,
  marks: NumberGridMarks = {},
): NumberGridCell[] {
  const start = marks.value === undefined ? from : marks.value + 1;
  const cells: NumberGridCell[] = [];
  for (let n = from; n <= to; n++) {
    cells.push({
      n,
      picked: n === marks.value,
      marked: n === marks.marker,
      inRun: marks.target !== undefined && n >= start && n <= marks.target,
      isTarget: n === marks.target,
    });
  }
  return cells;
}

/**
 * The cell index a key moves focus to, or null when the key is not a
 * movement key. Left/Right step one cell, Up/Down one row, Home/End jump to
 * the first/last cell; movement clamps at the edges rather than wrapping.
 */
export function gridMove(
  index: number,
  key: string,
  count: number,
  columns: number,
): number | null {
  const clamp = (i: number) => Math.min(Math.max(i, 0), count - 1);
  switch (key) {
    case "ArrowRight":
      return clamp(index + 1);
    case "ArrowLeft":
      return clamp(index - 1);
    case "ArrowDown":
      return index + columns < count ? index + columns : index;
    case "ArrowUp":
      return index - columns >= 0 ? index - columns : index;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
