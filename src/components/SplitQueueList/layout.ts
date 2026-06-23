/* Pure sizing math for SplitQueueList. Extracted from the component so the
 * bottom-priority / top-min-rows / slack-absorption rules can be unit-tested
 * without a DOM. The animation (FLIP + seam repaint) is DOM-only and lives in
 * the component; this module is everything that can be proven by arithmetic. */

export interface SplitLayoutInput {
  /** Total inner height available to both lists + seam, in px. */
  totalHeight: number;
  /** Per-row height in px (uniform). */
  rowHeight: number;
  /** Minimum rows the top (resolved) list keeps visible. Default 3. */
  topMinRows: number;
  /** Number of resolved items. */
  resolvedCount: number;
  /** Number of unresolved items. */
  unresolvedCount: number;
  /** Height of the seam divider, in px. Default 0. */
  seamHeight?: number;
  /** Collapsed "all clear" strip height when unresolved is empty. Default rowHeight. */
  clearStripHeight?: number;
}

export interface SplitLayout {
  /** Height (px) allotted to the top (resolved) list region. */
  topHeight: number;
  /** Height (px) allotted to the bottom (unresolved) list region. */
  bottomHeight: number;
  /** True when the bottom region is collapsed to the "all clear" strip. */
  bottomCollapsed: boolean;
  /** Number of resolved rows that fit in topHeight without scrolling. */
  topVisibleRows: number;
  /** True when the top list has more rows than fit (older ones scroll up). */
  topScrolls: boolean;
}

/**
 * Resolve the two-list split.
 *
 * Rules (mirrors the flex behavior the CSS implements):
 *  1. The bottom (unresolved) list has priority — it gets all the height it
 *     needs to show its rows, but never more than `total - topMinRows*rowH`
 *     (the top keeps a floor of `topMinRows`).
 *  2. When the bottom needs less than its cap, the top absorbs the slack and
 *     grows past `topMinRows`.
 *  3. When the bottom is empty, it collapses to `clearStripHeight` and the top
 *     fills everything else.
 *
 * All heights are clamped to be non-negative; degenerate inputs (zero/negative
 * total) yield zeroed regions rather than throwing.
 */
export function computeSplitLayout(input: SplitLayoutInput): SplitLayout {
  const {
    totalHeight,
    rowHeight,
    topMinRows,
    resolvedCount,
    unresolvedCount,
  } = input;
  const seam = Math.max(0, input.seamHeight ?? 0);
  const clearStrip = Math.max(0, input.clearStripHeight ?? rowHeight);

  const usable = Math.max(0, totalHeight - seam);
  const rowH = Math.max(1, rowHeight);
  const topFloor = Math.max(0, topMinRows) * rowH;

  // Bottom collapsed: nothing to process — thin strip, top takes the rest.
  if (unresolvedCount <= 0) {
    const bottomHeight = Math.min(clearStrip, usable);
    return {
      topHeight: Math.max(0, usable - bottomHeight),
      bottomHeight,
      bottomCollapsed: true,
      ...topRowInfo(Math.max(0, usable - bottomHeight), rowH, resolvedCount),
    };
  }

  // What the bottom wants to show all its rows.
  const bottomDesired = unresolvedCount * rowH;
  // Cap so the top keeps its floor (but the cap can't go below zero).
  const bottomCap = Math.max(0, usable - topFloor);
  const bottomHeight = Math.min(bottomDesired, bottomCap, usable);
  const topHeight = Math.max(0, usable - bottomHeight);

  return {
    topHeight,
    bottomHeight,
    bottomCollapsed: false,
    ...topRowInfo(topHeight, rowH, resolvedCount),
  };
}

function topRowInfo(
  topHeight: number,
  rowH: number,
  resolvedCount: number,
): Pick<SplitLayout, "topVisibleRows" | "topScrolls"> {
  const fit = Math.max(0, Math.floor(topHeight / rowH));
  return {
    topVisibleRows: Math.min(fit, resolvedCount),
    topScrolls: resolvedCount > fit,
  };
}
