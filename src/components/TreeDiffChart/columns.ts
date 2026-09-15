// ============================================
// TreeDiffChart — column geometry. Pure constants and the row-spreading math
// that fixes each column's center x. Ported from the prototype's DAG table.
// ============================================
import { sum } from "../../fn";

export const BOX_HEIGHT = 44;
export const CHART_WIDTH = 980;
export const ROOT_Y = 52;
export const SPINE_RULE_Y = 84;
export const BAND_TOP = 104;
export const SLOT = 62;
export const LABEL_H = 24;
export const PAD = 30;
export const BOTTOM_PAD = 26;
export const W_GROUP = 150;
export const W_LEAF = 158;
export const W_ROOT = 216;
export const W_SAME = 300;
const GAP_MAX = 132;
const SIDE_MARGIN = 20;
const ROOT_INSET = 14;

/**
 * Lay a row of fixed-width boxes across `W` with equal gaps, capped so a
 * wide canvas does not fling the columns apart. Returns the center x of each.
 */
function spreadRow(
  widths: number[],
  W: number,
  gapMax: number,
): { xs: number[]; gap: number } {
  const fixed = sum(widths);
  let margin = SIDE_MARGIN;
  let gap = (W - 2 * margin - fixed) / (widths.length - 1);
  if (gap > gapMax) {
    gap = gapMax;
    margin = (W - fixed - (widths.length - 1) * gap) / 2;
  }
  const xs: number[] = [];
  let x = margin;
  for (const w of widths) {
    xs.push(x + w / 2);
    x += w + gap;
  }
  return { xs, gap };
}

type Columns = {
  groupL: number;
  leafL: number;
  center: number;
  leafR: number;
  groupR: number;
  /** Group and leaf columns of a shared (non-diverged) subtree in full mode. */
  sharedGroup: number;
  sharedLeaf: number;
  rootL: number;
  rootR: number;
  cx: number;
};

function computeColumns(): Columns {
  const r = spreadRow(
    [W_GROUP, W_LEAF, W_LEAF, W_LEAF, W_GROUP],
    CHART_WIDTH,
    GAP_MAX,
  );
  const x = r.xs;
  const span = W_GROUP + r.gap + W_LEAF;
  const rootL = Math.max(ROOT_INSET + W_ROOT / 2, x[0]);
  const cx = CHART_WIDTH / 2;
  return {
    groupL: x[0],
    leafL: x[1],
    center: x[2],
    leafR: x[3],
    groupR: x[4],
    sharedGroup: cx - span / 2 + W_GROUP / 2,
    sharedLeaf: cx + span / 2 - W_LEAF / 2,
    rootL,
    rootR: CHART_WIDTH - rootL,
    cx,
  };
}

export const COLUMNS = computeColumns();
