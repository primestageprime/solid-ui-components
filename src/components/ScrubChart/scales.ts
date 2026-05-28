// src/components/ScrubChart/scales.ts
//
// Pure fisheye geometry for the ScrubChart composite. No Solid, no DOM —
// just numbers in, numbers out. Used by ScrubChart.tsx to morph cell widths
// around the focused cell as `selectedAnim` slides between integer indices.

export interface LayoutCellsInput {
  /** Total cell count (matches the consumer's `cells.length`). */
  cellCount: number;
  /** Chart drawing-area width in px. */
  chartWidth: number;
  /** Fraction of chart width the focused cell occupies. 0 < f < 1. */
  selectedFraction: number;
  /** Focused cell is this many times wider than each side cell. > 0. */
  sideCompression: number;
  /** Current fractional focus position. Can be non-integer (during gesture/tween). */
  selectedAnim: number;
}

export interface CellLayout {
  /**
   * [leftX, rightX] in chart pixels for every cell index in [0, cellCount).
   * Cells outside the active window have extrapolated bounds that may fall
   * outside [0, chartWidth].
   */
  bounds: [number, number][];
  /** Cell indices included in the active window (contiguous). */
  activeWindow: number[];
  /** Derived from knobs; 0 when knobs leave no room for side cells. */
  sideWindow: number;
}

/**
 * Compute the per-cell horizontal bounds of the fisheye chart for a given
 * fractional `selectedAnim`. Pure function.
 *
 *   focusWeight(i) = max(0, 1 − |i − selectedAnim|)
 *   rawWidth(i)    = sideWidth + (focusedWidth − sideWidth) × focusWeight(i)
 *
 * After raw widths are computed for cells in the active window, they're
 * normalised so their sum equals `chartWidth` exactly. Cells outside the
 * active window get bounds extrapolated linearly at side-width pitch.
 *
 * Anchoring: the window's leftmost cell starts at `x = 0`. When the window
 * is symmetric (the common case at rest), this naturally places the focused
 * cell's centre at `chartWidth / 2`. Near the edges of `cells`, the window
 * is clamped asymmetrically and the focused cell shifts toward whichever
 * boundary it's nearest — exactly the desired behaviour.
 */
export function layoutCells(input: LayoutCellsInput): CellLayout {
  const { cellCount, chartWidth, selectedFraction, sideCompression, selectedAnim } = input;

  const focusedWidth = chartWidth * selectedFraction;
  const sideWidthRaw = focusedWidth / sideCompression;

  // Derive sideWindow (per-side cell count). Clamp to 0 when knobs leave no room.
  const rawSideWindow = ((1 - selectedFraction) * sideCompression) / (2 * selectedFraction);
  const sideWindow = Math.floor(Math.max(0, rawSideWindow));

  // Active window: [floor(selectedAnim) − sideWindow, ceil(selectedAnim) + sideWindow],
  // clamped to [0, cellCount − 1].
  const lo = Math.max(0, Math.floor(selectedAnim) - sideWindow);
  const hi = Math.min(cellCount - 1, Math.ceil(selectedAnim) + sideWindow);

  const activeWindow: number[] = Array.from(
    { length: hi - lo + 1 },
    (_, k) => lo + k,
  );

  // Compute raw widths inside the window via the focus-weight rule.
  const rawWidths = activeWindow.map((i) => {
    const w = Math.max(0, 1 - Math.abs(i - selectedAnim));
    return sideWidthRaw + (focusedWidth - sideWidthRaw) * w;
  });
  const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
  const scale = totalRaw > 0 ? chartWidth / totalRaw : 1;
  const normalisedWidths = rawWidths.map((w) => w * scale);

  // Cumulate left edges starting from x = 0.
  const bounds: [number, number][] = new Array(cellCount);
  let cursor = 0;
  for (let k = 0; k < activeWindow.length; k++) {
    const i = activeWindow[k];
    const w = normalisedWidths[k];
    bounds[i] = [cursor, cursor + w];
    cursor += w;
  }

  // Extrapolate cells before/after the active window at sideWidth pitch.
  const extrapolatedSide = sideWidthRaw * scale;
  for (let i = lo - 1; i >= 0; i--) {
    const right = bounds[i + 1][0];
    bounds[i] = [right - extrapolatedSide, right];
  }
  for (let i = hi + 1; i < cellCount; i++) {
    const left = bounds[i - 1][1];
    bounds[i] = [left, left + extrapolatedSide];
  }

  return { bounds, activeWindow, sideWindow };
}
