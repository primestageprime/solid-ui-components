/* Pure sizing math for SplitQueueList. Extracted from the component so the
 * content-driven top / remaining-space bottom / slack-absorption rules can be
 * unit-tested without a DOM. The animation (FLIP + seam repaint) is DOM-only
 * and lives in the component; this module is everything provable by arithmetic.
 *
 * Sizing model (the revised spec):
 *  - The TOP pane (resolved / "categorized") is CONTENT-DRIVEN between a 0-row
 *    floor and a 3-row soft cap. 0 categorized COLLAPSES the pane to its header
 *    only (no empty row band); 1/2/3 grow to fit; 4+ stays capped at 3 rows and
 *    the pane scrolls so the NEWEST (most-recently-categorized) row sits flush at
 *    the bottom (the seam).
 *  - The BOTTOM pane (unresolved / "to categorize") gets the REMAINING space and
 *    scrolls when its content overflows.
 *  - The 3-row cap holds only WHILE the bottom has enough content to fill its
 *    remaining area. When the bottom is short, it shrinks to its content height
 *    and the freed slack flows UP — the top may then grow past 3 rows.
 *
 * Each pane renders its own sticky header above its rows, so all heights here
 * are PANE heights that already include one `headerHeight`. A non-scrolling
 * pane is always sized to whole rows + its header, so the last row never clips.
 */

import { clamp } from "../../internal/math/clamp";

export interface SplitLayoutInput {
  /** Total inner height available to both panes + seam, in px. */
  totalHeight: number;
  /** Per-row height in px (uniform). Measure the real rendered row to be safe. */
  rowHeight: number;
  /** Number of resolved ("categorized") items — drives the top pane. */
  resolvedCount: number;
  /** Number of unresolved ("to categorize") items — fills the bottom pane. */
  unresolvedCount: number;
  /** Height of the seam divider between the panes, in px. Default 0. */
  seamHeight?: number;
  /** Height of each pane's sticky header, in px. Default 0 (header-less). */
  headerHeight?: number;
  /** Soft cap on the top pane, in rows. Default 3. */
  topCapRows?: number;
  /** Floor on the top pane, in rows. Default 0 — at 0 categorized the top
   * collapses to header only (no empty row band); it grows as cards resolve. */
  topFloorRows?: number;
}

export interface SplitLayout {
  /** Height (px) of the top (resolved) pane, INCLUDING its header. */
  topHeight: number;
  /** Height (px) of the bottom (unresolved) pane, INCLUDING its header. */
  bottomHeight: number;
  /** Number of resolved rows visible in the top pane without scrolling. */
  topVisibleRows: number;
  /** True when the top pane has more rows than fit (older ones scroll up). */
  topScrolls: boolean;
  /** True when the top pane should be scrolled to its bottom so the newest
   * categorized row sits flush at the seam (set once the top is capped). */
  topScrollToBottom: boolean;
  /** True when the bottom pane content overflows its height (it scrolls). */
  bottomScrolls: boolean;
  /** True when the bottom shrank to its content and the top absorbed the slack
   * (top grew past the cap). */
  topAbsorbedSlack: boolean;
}

/**
 * Resolve the two-pane split under the content-driven-top model.
 *
 * All heights are clamped non-negative; degenerate inputs (zero/negative total)
 * yield zeroed regions rather than throwing.
 */
export function computeSplitLayout(input: SplitLayoutInput): SplitLayout {
  const { totalHeight, resolvedCount, unresolvedCount } = input;
  const seam = Math.max(0, input.seamHeight ?? 0);
  const headerH = Math.max(0, input.headerHeight ?? 0);
  const rowH = Math.max(1, input.rowHeight);
  const capRows = Math.max(1, input.topCapRows ?? 3);
  const floorRows = Math.max(0, input.topFloorRows ?? 0);

  const usable = Math.max(0, totalHeight - seam);

  // Pane heights for a given whole-row count (rows + this pane's header).
  const paneFor = (rows: number) => headerH + Math.max(0, rows) * rowH;

  // The top pane's content-driven target: clamp the categorized count to
  // [floorRows, capRows] and size to that many rows + header. 0 categorized
  // still shows the floor (1 row of space), never a big empty block.
  // Top's content-driven height: clamp the categorized count to [floor, cap]
  // and size to that many rows + header. This is the top's natural height when
  // it has nothing hidden to reveal.
  const topContentRows = clamp(resolvedCount, floorRows, capRows);
  const topContentHeight = Math.min(paneFor(topContentRows), usable);

  // What the bottom pane needs to show ALL its rows + header without clipping.
  const bottomContentHeight = paneFor(unresolvedCount);

  // The space the bottom would have if the top stayed at its 3-row cap. Slack
  // only exists to flow up when the bottom needs LESS than this.
  const cappedTopHeight = Math.min(paneFor(capRows), usable);
  const bottomRemainingIfCapped = Math.max(0, usable - cappedTopHeight);

  let topHeight: number;
  let bottomHeight: number;
  let topAbsorbedSlack = false;

  // Absorb slack ONLY when the top genuinely has more rows than the cap (hidden
  // older items the extra room would reveal) AND the bottom is short enough that
  // freeing space is worthwhile. Otherwise the top stays at its content height
  // and the bottom takes the remainder — a top with <=cap items never balloons
  // into a big empty box.
  const topHasHiddenRows = resolvedCount > capRows;
  if (topHasHiddenRows && bottomContentHeight <= bottomRemainingIfCapped) {
    bottomHeight = bottomContentHeight;
    topHeight = Math.max(0, usable - bottomHeight);
    topAbsorbedSlack = topHeight > cappedTopHeight + 0.5;
  } else {
    topHeight = topContentHeight;
    bottomHeight = Math.max(0, usable - topHeight);
  }

  // How many whole resolved rows actually fit in the top pane (after header).
  const topRowsFit = Math.max(0, Math.floor((topHeight - headerH) / rowH));
  const topVisibleRows = Math.min(topRowsFit, resolvedCount);
  const topScrolls = resolvedCount > topRowsFit;
  // Once the top can't show every categorized row, keep it pinned to the bottom
  // so the newest sits at the seam. (Also true exactly at the cap boundary.)
  const topScrollToBottom = topScrolls;

  const bottomRowsFit = Math.max(
    0,
    Math.floor((bottomHeight - headerH) / rowH),
  );
  const bottomScrolls = unresolvedCount > bottomRowsFit;

  return {
    topHeight,
    bottomHeight,
    topVisibleRows,
    topScrolls,
    topScrollToBottom,
    bottomScrolls,
    topAbsorbedSlack,
  };
}

export interface EnterFrameInput {
  /** Top pane height (px) BEFORE the resolve (one row shorter). */
  oldTop: number;
  /** Top pane height (px) AFTER the resolve (its new layout height). */
  newTop: number;
  /** Total inner height shared by both panes + seam, in px. */
  totalHeight: number;
  /** Seam divider height in px. Default 0. */
  seamHeight?: number;
  /** Animation progress in [0,1] (already eased by the caller). */
  progress: number;
}

export interface EnterFrame {
  /** Top pane height (px) at this frame — lerp(oldTop, newTop, progress). */
  topHeight: number;
  /** Bottom pane height (px) — DRIVEN as the remainder so panes+seam sum to
   * total at every frame (the seam descends with no gap). */
  bottomHeight: number;
}

/**
 * One frame of the full-component enter. The TOP pane height lerps oldTop→newTop
 * and the BOTTOM is driven as `total - seam - top`, so the two panes plus the
 * seam ALWAYS sum to the total height — no one-row gap appears while the top
 * grows. A full-size card sits at the bottom of the top list (overflow:hidden),
 * so the growing top reveals it N-edge-first at the seam. When oldTop == newTop
 * (capped top) the height holds and the reveal happens via scroll in the DOM.
 */
export function computeEnterFrame(input: EnterFrameInput): EnterFrame {
  const seam = Math.max(0, input.seamHeight ?? 0);
  const usable = Math.max(0, input.totalHeight - seam);
  const p = clamp(input.progress, 0, 1);
  const topHeight = Math.max(
    0,
    Math.min(usable, input.oldTop + (input.newTop - input.oldTop) * p),
  );
  const bottomHeight = Math.max(0, usable - topHeight);
  return { topHeight, bottomHeight };
}
