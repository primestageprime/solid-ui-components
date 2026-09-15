// ============================================
// TreeDiffChart — the frame: which layout mode a container width gets, and
// every column x and box width that mode needs. Pure. Ported from the
// Scenario Tree Explorer artifact's computeLayout.
//
//   narrow   (< 880px)  two columns, one row per line, no edges
//   compact  (< 1330px) one chip per root, five columns, a trunk per side
//   wide     (≥ 1330px) a spine per side — head, commit, root tree — and
//                       seven columns; box widths grow until 1720px
// ============================================
import { sum } from "../../fn";

export type TreeDiffLayoutMode = "narrow" | "compact" | "wide";

export const NARROW_AT = 880;
export const SPINE_AT = 1330;
export const WIDE_AT = 1720;
export const BOX_HEIGHT = 44;
/** Width the chart assumes before its container is measured. */
export const DEFAULT_WIDTH = 1080;

/** Space left of the group column for the root trunk in compact mode. */
const TRUNK_GUTTER = 28;
/** The trunk drops this far inside the root chip's outer edge. */
const TRUNK_INSET = 12;
const CHIP_EDGE = 12;
const OUTER_MARGIN = 20;
const GAP_MAX_COMPACT = 132;
const GAP_MAX_WIDE = 120;

/** Vertical rhythm of a band: label strip, one slot per row, bottom pad. */
export type BandMetrics = {
  top: number;
  slot: number;
  labelH: number;
  pad: number;
};

export type NarrowFrame = BandMetrics & {
  mode: "narrow";
  width: number;
  cx: number;
  /** Width of every box; the [SAME] node may be wider. */
  box: number;
};

export type ColumnFrame = BandMetrics & {
  mode: "compact" | "wide";
  width: number;
  cx: number;
  wHead: number;
  wGroup: number;
  wLeaf: number;
  /** Root chip width in compact mode. */
  chip: number;
  x: {
    headL: number;
    groupL: number;
    leafL: number;
    center: number;
    leafR: number;
    groupR: number;
    headR: number;
    /** Group and leaf columns of a shared subtree in full mode. */
    sharedGroup: number;
    sharedLeaf: number;
  };
  /** x of the vertical trunk each root's edges share. Compact mode only. */
  trunkL: number;
  trunkR: number;
};

export type Frame = NarrowFrame | ColumnFrame;

/**
 * Lay a row of fixed-width boxes across `width` with equal gaps, capped so a
 * wide canvas does not fling the columns apart. Symmetric widths in,
 * symmetric centers out, which keeps the middle lane on the center line.
 */
export function spreadRow(
  widths: number[],
  width: number,
  margin: number,
  gapMax: number,
): { xs: number[]; gap: number } {
  const fixed = sum(widths);
  const n = widths.length;
  let gap = (width - 2 * margin - fixed) / (n - 1);
  let start = margin;
  if (gap > gapMax) {
    gap = gapMax;
    start = (width - fixed - (n - 1) * gap) / 2;
  }
  const xs: number[] = [];
  let x = start;
  for (const w of widths) {
    xs.push(x + w / 2);
    x += w + gap;
  }
  return { xs, gap };
}

export function computeFrame(avail: number): Frame {
  if (avail < NARROW_AT) {
    const width = Math.max(320, avail);
    return {
      mode: "narrow",
      width,
      cx: width / 2,
      box: Math.max(148, Math.min(268, width * 0.455)),
      top: 62,
      slot: 56,
      labelH: 30,
      pad: 20,
    };
  }
  const width = Math.min(avail, WIDE_AT);
  const spine = width >= SPINE_AT;
  const t = Math.max(
    0,
    Math.min(1, (width - NARROW_AT) / (WIDE_AT - NARROW_AT)),
  );
  const wHead = 130 + 20 * t;
  const wGroup = 122 + 24 * t;
  const wLeaf = 124 + 28 * t;
  const chip = Math.min(210, wGroup + 64);
  const cx = width / 2;

  const r = spine
    ? spreadRow(
        [wHead, wGroup, wLeaf, wLeaf, wLeaf, wGroup, wHead],
        width,
        OUTER_MARGIN,
        GAP_MAX_WIDE,
      )
    : spreadRow(
        [wGroup, wLeaf, wLeaf, wLeaf, wGroup],
        width,
        CHIP_EDGE + TRUNK_GUTTER,
        GAP_MAX_COMPACT,
      );
  const x = r.xs;
  const span = wGroup + r.gap + wLeaf;
  const shared = {
    sharedGroup: cx - span / 2 + wGroup / 2,
    sharedLeaf: cx + span / 2 - wLeaf / 2,
  };
  const headL = spine ? x[0] : CHIP_EDGE + chip / 2;
  const columns = spine
    ? {
        headL,
        groupL: x[1],
        leafL: x[2],
        center: x[3],
        leafR: x[4],
        groupR: x[5],
        headR: x[6],
        ...shared,
      }
    : {
        headL,
        groupL: x[0],
        leafL: x[1],
        center: x[2],
        leafR: x[3],
        groupR: x[4],
        headR: width - headL,
        ...shared,
      };
  const trunkL = CHIP_EDGE + TRUNK_INSET;
  return {
    mode: spine ? "wide" : "compact",
    width,
    cx,
    wHead,
    wGroup,
    wLeaf,
    chip,
    x: columns,
    trunkL,
    trunkR: width - trunkL,
    top: spine ? 56 : 96,
    slot: 62,
    labelH: 22,
    pad: 30,
  };
}
