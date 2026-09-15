// ============================================
// TreeDiffChart — band layout. Pure: props and a container width in,
// positioned nodes, edges, bands, guides and captions out. Nothing here
// touches the document.
//
// The frame (`frame.ts`) picks the mode from the width. The narrow mode is
// its own module (`narrow.ts`). This module ranks the bands and places the
// compact and wide layouts: the baseline root sits top-left (compact) or on
// a left spine (wide), the comparison root mirrors it on the right. Each
// root entry becomes one band. A band whose two sides resolve different
// groups fans out: one group node per side, then one row per child. A child
// both sides share draws once, in the center column, with an arrow from
// each group. In `differences` mode every identical root entry collapses
// into one [SAME] node in a final band.
// ============================================
import { filter, map, sortBy } from "../../fn";
import { DEFAULT_WIDTH, computeFrame, type ColumnFrame } from "./frame";
import type {
  LayoutBand,
  LayoutCaption,
  LayoutEdge,
  LayoutGuide,
  RankedBand,
  TreeDiffLayout,
} from "./layout-types";
import { layoutNarrow } from "./narrow";
import {
  SPINE_HEAD_RISE,
  dedupe,
  merge,
  placeChip,
  placeDivergedBand,
  placeSameBand,
  placeSharedBand,
  placeSpine,
  type Placed,
  type Trunks,
} from "./place";
import type {
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffMode,
  TreeDiffRoot,
} from "./types";

export type TreeDiffLayoutInput = {
  baseline: TreeDiffRoot;
  compare: TreeDiffRoot;
  bands: TreeDiffBand[];
  mode: TreeDiffMode;
  /** Container width in px. Unmeasured (0 or omitted) falls back to `DEFAULT_WIDTH`. */
  width?: number;
};

const CHIP_RULE_Y = 72;
const CHIP_CAPTION_Y = 16;
const SPINE_CAPTION_RISE = 40;
const LABEL_BASELINE = 13;
const BOTTOM_PAD = 24;

// ─── Ranking ─────────────────────────────────────────────────────────────

/** added → changed → removed → identical, at every level. */
function childRank(k: TreeDiffChild): number {
  if (!k.baseline) return 0;
  if (!k.compare) return 2;
  if (k.baseline.id !== k.compare.id) return 1;
  return 3;
}

const isDiverged = (b: TreeDiffBand): boolean =>
  b.baseline?.id !== b.compare?.id;
const isMoved = (k: TreeDiffChild): boolean => k.baseline?.id !== k.compare?.id;

function rankBand(band: TreeDiffBand): RankedBand {
  const children = sortBy(
    (k: TreeDiffChild) => `${childRank(k)}:${k.name}`,
    band.children,
  );
  const diverged = isDiverged(band);
  const moved = filter(isMoved, children).length;
  return {
    band,
    children,
    diverged,
    moved,
    movedNote: moved === 1 ? "1 line moved" : `${moved} lines moved`,
    score: diverged ? 1000 + moved * 10 : children.length ? 10 : 0,
    slots: Math.max(children.length, 1),
  };
}

/** Diverged bands first, most moved lines first, then by name. */
export function rankBands(bands: TreeDiffBand[]): RankedBand[] {
  return sortBy(
    // The score is bounded, so subtracting from a constant sorts descending
    // on one ascending string key.
    (r: RankedBand) =>
      `${String(100000 - r.score).padStart(6, "0")}:${r.band.name}`,
    map(rankBand, bands),
  );
}

// ─── Column layouts (compact and wide) ───────────────────────────────────

function layoutColumns(
  f: ColumnFrame,
  input: TreeDiffLayoutInput,
  shown: RankedBand[],
  prunedCount: number,
): TreeDiffLayout {
  const compact = f.mode === "compact";
  const trunks: Trunks = compact
    ? { baseline: f.trunkL, compare: f.trunkR }
    : {};
  const ruleX1 = f.x.groupL - f.wGroup / 2;
  const ruleX2 = f.x.groupR + f.wGroup / 2;
  const rule = (y: number): LayoutGuide => ({
    kind: "rule",
    x1: ruleX1,
    y1: y,
    x2: ruleX2,
    y2: y,
  });
  const band = (
    y0: number,
    height: number,
    name: string,
    note: string,
    same: boolean,
  ): LayoutBand => ({
    name,
    note,
    y: y0,
    height,
    same,
    labelX: f.cx,
    labelY: y0 + LABEL_BASELINE,
    labelAnchor: "middle",
    noteX: ruleX2,
  });

  // The vertical cursor is the one piece of running state: each band starts
  // where the previous one ended.
  const parts: Placed[] = [];
  const bands: LayoutBand[] = [];
  const guides: LayoutGuide[] = [];
  let cursor = f.top;
  for (const r of shown) {
    const y0 = cursor;
    const height = f.labelH + r.slots * f.slot + f.pad;
    const midY = y0 + f.labelH + (r.slots * f.slot) / 2;
    const rowY = (row: number) => y0 + f.labelH + f.slot / 2 + row * f.slot;
    if (bands.length > 0) guides.push(rule(y0 - 4));
    if (r.diverged) {
      parts.push(placeDivergedBand(f, trunks, r, midY, rowY));
      bands.push(band(y0, height, r.band.name, r.movedNote, false));
    } else if (r.band.baseline) {
      parts.push(placeSharedBand(f, trunks, r, r.band.baseline, midY, rowY));
      bands.push(band(y0, height, r.band.name, "identical", false));
    }
    cursor += height;
  }
  if (prunedCount > 0) {
    const y0 = cursor;
    const height = f.labelH + f.slot + f.pad;
    if (shown.length > 0) guides.push(rule(y0 - 4));
    parts.push(placeSameBand(f, trunks, prunedCount, y0));
    bands.push(
      band(
        y0,
        height,
        "identical subtrees",
        `${prunedCount} root ${prunedCount === 1 ? "entry" : "entries"} · pruned`,
        true,
      ),
    );
    cursor += height;
  }
  let height = cursor + BOTTOM_PAD;

  let captionY: number;
  if (compact) {
    parts.push({
      nodes: [
        placeChip(f, input.baseline, "baseline"),
        placeChip(f, input.compare, "compare"),
      ],
      edges: [],
    });
    guides.push(rule(CHIP_RULE_Y));
    captionY = CHIP_CAPTION_Y;
  } else {
    // Spines, vertically centered against the band stack.
    const rootY = Math.max(f.top + SPINE_HEAD_RISE, (f.top + cursor) / 2);
    parts.push(placeSpine(f, input.baseline, "baseline", rootY));
    parts.push(placeSpine(f, input.compare, "compare", rootY));
    height = Math.max(height, rootY + 60);
    captionY = rootY - SPINE_HEAD_RISE - SPINE_CAPTION_RISE;
  }
  const captions: LayoutCaption[] = [
    {
      text: "Baseline",
      x: f.x.headL,
      y: captionY,
      anchor: "middle",
      side: "baseline",
    },
    {
      text: "Comparing",
      x: f.x.headR,
      y: captionY,
      anchor: "middle",
      side: "compare",
    },
  ];

  const { nodes, edges: unordered } = dedupe(merge(parts));
  // Shared (dim) edges draw first so a coloured trunk segment they overlap
  // stays in that side's ink.
  const edges = sortBy(
    (e: LayoutEdge) => (e.side === "shared" ? 0 : 1),
    unordered,
  );
  return {
    mode: f.mode,
    width: f.width,
    height,
    nodes,
    edges,
    bands,
    guides,
    captions,
  };
}

// ─── Entry point ─────────────────────────────────────────────────────────

export function computeTreeDiffLayout(
  input: TreeDiffLayoutInput,
): TreeDiffLayout {
  const frame = computeFrame(input.width || DEFAULT_WIDTH);
  const ranked = rankBands(input.bands);
  const differences = input.mode === "differences";
  const shown = differences ? filter((r) => r.diverged, ranked) : ranked;
  const prunedCount = differences ? ranked.length - shown.length : 0;

  if (frame.mode === "narrow") {
    const n = layoutNarrow({
      frame,
      baseline: input.baseline,
      compare: input.compare,
      shown,
      prunedCount,
    });
    return {
      mode: "narrow",
      width: frame.width,
      height: n.height,
      nodes: n.nodes,
      edges: [],
      bands: n.bands,
      guides: n.guides,
      captions: n.captions,
    };
  }
  return layoutColumns(frame, input, shown, prunedCount);
}
