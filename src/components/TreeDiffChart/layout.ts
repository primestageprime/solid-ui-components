// ============================================
// TreeDiffChart — band layout. Pure: props in, positioned nodes, edges and
// band rows out. Nothing here touches the document.
//
// The baseline root sits top-left, the comparison root top-right. Each root
// entry becomes one band. A band whose two sides resolve different groups
// fans out: one group node per side, then one row per child. A child both
// sides share draws once, in the center column, with an arrow from each
// group. In `differences` mode every identical root entry collapses into
// one [SAME] node in a final band.
// ============================================
import { filter, flatMap, map, sortBy } from "../../fn";
import {
  ROOT_BASELINE_ID,
  ROOT_COMPARE_ID,
  SAME_ID,
  type TreeDiffBand,
  type TreeDiffChild,
  type TreeDiffEntry,
  type TreeDiffMode,
  type TreeDiffRoot,
  type TreeDiffSide,
} from "./types";

export type LayoutNodeKind = "root" | "group" | "leaf" | "same";

export type LayoutNode = {
  id: string;
  label: string;
  hash: string;
  kind: LayoutNodeKind;
  side: TreeDiffSide;
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  width: number;
  height: number;
};

export type LayoutEdge = {
  from: string;
  to: string;
  /** Paint side, taken from the target node. */
  side: TreeDiffSide;
};

export type LayoutBand = {
  name: string;
  /** Right-aligned caption: "2 lines moved", "identical", "7 root entries · pruned". */
  note: string;
  /** Top y of the band. */
  y: number;
  height: number;
  /** True for the pruned [SAME] band. */
  same: boolean;
};

export type TreeDiffLayout = {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bands: LayoutBand[];
  /** x of each root box and y of the rule under the roots, for the column captions. */
  spine: { baselineX: number; compareX: number; ruleY: number };
};

export type TreeDiffLayoutInput = {
  baseline: TreeDiffRoot;
  compare: TreeDiffRoot;
  bands: TreeDiffBand[];
  mode: TreeDiffMode;
};

import {
  BAND_TOP,
  BOTTOM_PAD,
  BOX_HEIGHT,
  CHART_WIDTH,
  COLUMNS,
  LABEL_H,
  PAD,
  ROOT_Y,
  SLOT,
  SPINE_RULE_Y,
  W_GROUP,
  W_LEAF,
  W_ROOT,
  W_SAME,
} from "./columns";
export { BOX_HEIGHT, CHART_WIDTH } from "./columns";

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

type RankedBand = {
  band: TreeDiffBand;
  children: TreeDiffChild[];
  diverged: boolean;
  moved: number;
  score: number;
  slots: number;
};

function rankBand(band: TreeDiffBand): RankedBand {
  const children = sortBy(
    (k: TreeDiffChild) => `${childRank(k)}:${k.name}`,
    band.children,
  );
  const diverged = isDiverged(band);
  const moved = filter(isMoved, children).length;
  const score = diverged ? 1000 + moved * 10 : children.length ? 10 : 0;
  return {
    band,
    children,
    diverged,
    moved,
    score,
    slots: Math.max(children.length, 1),
  };
}

function movedNote(moved: number): string {
  return moved === 1 ? "1 line moved" : `${moved} lines moved`;
}

const childSide = (k: TreeDiffChild, present: TreeDiffSide): TreeDiffSide =>
  k.baseline && k.compare && k.baseline.id === k.compare.id
    ? "shared"
    : present;

function node(
  entry: TreeDiffEntry,
  kind: LayoutNodeKind,
  side: TreeDiffSide,
  x: number,
  y: number,
  width: number,
): LayoutNode {
  return {
    id: entry.id,
    label: entry.label,
    hash: entry.hash,
    kind,
    side,
    x,
    y,
    width,
    height: BOX_HEIGHT,
  };
}

type Placed = { nodes: LayoutNode[]; edges: LayoutEdge[] };

const merge = (parts: Placed[]): Placed => ({
  nodes: flatMap((p: Placed) => p.nodes, parts),
  edges: flatMap((p: Placed) => p.edges, parts),
});

/** One child row of a diverged band: a shared leaf in the center, or one leaf per side. */
function placeDivergedChild(
  k: TreeDiffChild,
  y: number,
  gb: TreeDiffEntry | undefined,
  gc: TreeDiffEntry | undefined,
): Placed {
  if (childSide(k, "baseline") === "shared" && k.baseline) {
    const leaf = node(k.baseline, "leaf", "shared", COLUMNS.center, y, W_LEAF);
    return {
      nodes: [leaf],
      edges: filter(
        (e: LayoutEdge | undefined): e is LayoutEdge => e !== undefined,
        [
          gb ? { from: gb.id, to: leaf.id, side: "shared" } : undefined,
          gc ? { from: gc.id, to: leaf.id, side: "shared" } : undefined,
        ],
      ),
    };
  }
  const left =
    k.baseline && gb
      ? [
          {
            nodes: [
              node(k.baseline, "leaf", "baseline", COLUMNS.leafL, y, W_LEAF),
            ],
            edges: [
              { from: gb.id, to: k.baseline.id, side: "baseline" as const },
            ],
          },
        ]
      : [];
  const right =
    k.compare && gc
      ? [
          {
            nodes: [
              node(k.compare, "leaf", "compare", COLUMNS.leafR, y, W_LEAF),
            ],
            edges: [
              { from: gc.id, to: k.compare.id, side: "compare" as const },
            ],
          },
        ]
      : [];
  return merge([...left, ...right]);
}

/** A diverged band: one group per present side, then the child rows. */
function placeDivergedBand(
  r: RankedBand,
  midY: number,
  rowY: (i: number) => number,
): Placed {
  const { baseline: gb, compare: gc } = r.band;
  const groups: Placed[] = [
    ...(gb
      ? [
          {
            nodes: [
              node(gb, "group", "baseline", COLUMNS.groupL, midY, W_GROUP),
            ],
            edges: [
              { from: ROOT_BASELINE_ID, to: gb.id, side: "baseline" as const },
            ],
          },
        ]
      : []),
    ...(gc
      ? [
          {
            nodes: [
              node(gc, "group", "compare", COLUMNS.groupR, midY, W_GROUP),
            ],
            edges: [
              { from: ROOT_COMPARE_ID, to: gc.id, side: "compare" as const },
            ],
          },
        ]
      : []),
  ];
  const rows = map(
    (k: TreeDiffChild, i: number) => placeDivergedChild(k, rowY(i), gb, gc),
    r.children,
  );
  return merge([...groups, ...rows]);
}

/** An identical band in full mode: one shared group fed from both roots, then its leaves. */
function placeSharedBand(
  r: RankedBand,
  gb: TreeDiffEntry,
  midY: number,
  rowY: (i: number) => number,
): Placed {
  const gx = r.children.length ? COLUMNS.sharedGroup : COLUMNS.cx;
  const group: Placed = {
    nodes: [node(gb, "group", "shared", gx, midY, W_GROUP)],
    edges: [
      { from: ROOT_BASELINE_ID, to: gb.id, side: "shared" },
      { from: ROOT_COMPARE_ID, to: gb.id, side: "shared" },
    ],
  };
  const rows = map((k: TreeDiffChild, i: number): Placed => {
    const leaf = k.baseline ?? k.compare;
    if (!leaf) return { nodes: [], edges: [] };
    return {
      nodes: [
        node(leaf, "leaf", "shared", COLUMNS.sharedLeaf, rowY(i), W_LEAF),
      ],
      edges: [{ from: gb.id, to: leaf.id, side: "shared" }],
    };
  }, r.children);
  return merge([group, ...rows]);
}

function placeSameBand(count: number, y0: number): Placed {
  const same: LayoutNode = {
    id: SAME_ID,
    label: "[SAME]",
    hash: `${count} ${count === 1 ? "subtree" : "subtrees"} · pruned`,
    kind: "same",
    side: "shared",
    x: COLUMNS.cx,
    y: y0 + LABEL_H + SLOT / 2,
    width: W_SAME,
    height: BOX_HEIGHT,
  };
  return {
    nodes: [same],
    edges: [
      { from: ROOT_BASELINE_ID, to: SAME_ID, side: "shared" },
      { from: ROOT_COMPARE_ID, to: SAME_ID, side: "shared" },
    ],
  };
}

/** Keep the first node per id and the first edge per (from, to). */
function dedupe(placed: Placed): Placed {
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();
  const nodes = filter((n: LayoutNode) => {
    if (seenNodes.has(n.id)) return false;
    seenNodes.add(n.id);
    return true;
  }, placed.nodes);
  const edges = filter((e: LayoutEdge) => {
    const key = `${e.from}>${e.to}`;
    if (seenEdges.has(key) || !seenNodes.has(e.from) || !seenNodes.has(e.to)) {
      return false;
    }
    seenEdges.add(key);
    return true;
  }, placed.edges);
  return { nodes, edges };
}

export function computeTreeDiffLayout(
  input: TreeDiffLayoutInput,
): TreeDiffLayout {
  const ranked = sortBy(
    // Descending score, then name. The score is bounded, so subtract from a
    // constant to sort ascending on one string key.
    (r: RankedBand) =>
      `${String(100000 - r.score).padStart(6, "0")}:${r.band.name}`,
    map(rankBand, input.bands),
  );
  const pruned =
    input.mode === "differences" ? filter((r) => !r.diverged, ranked) : [];
  const shown =
    input.mode === "differences" ? filter((r) => r.diverged, ranked) : ranked;

  const rootB: LayoutNode = {
    id: ROOT_BASELINE_ID,
    label: input.baseline.label,
    hash: `root ${input.baseline.hash}`,
    kind: "root",
    side: "baseline",
    x: COLUMNS.rootL,
    y: ROOT_Y,
    width: W_ROOT,
    height: BOX_HEIGHT,
  };
  const rootC: LayoutNode = {
    ...rootB,
    id: ROOT_COMPARE_ID,
    label: input.compare.label,
    hash: `root ${input.compare.hash}`,
    side: "compare",
    x: COLUMNS.rootR,
  };

  // The vertical cursor is the one piece of running state: each band starts
  // where the previous one ended.
  const parts: Placed[] = [{ nodes: [rootB, rootC], edges: [] }];
  const bands: LayoutBand[] = [];
  let cursor = BAND_TOP;
  for (const r of shown) {
    const y0 = cursor;
    const height = LABEL_H + r.slots * SLOT + PAD;
    const midY = y0 + LABEL_H + (r.slots * SLOT) / 2;
    const rowY = (i: number) => y0 + LABEL_H + SLOT / 2 + i * SLOT;
    if (r.diverged) {
      parts.push(placeDivergedBand(r, midY, rowY));
      bands.push({
        name: r.band.name,
        note: movedNote(r.moved),
        y: y0,
        height,
        same: false,
      });
    } else if (r.band.baseline) {
      parts.push(placeSharedBand(r, r.band.baseline, midY, rowY));
      bands.push({
        name: r.band.name,
        note: "identical",
        y: y0,
        height,
        same: false,
      });
    }
    cursor += height;
  }
  if (pruned.length) {
    const count = pruned.length;
    const height = LABEL_H + SLOT + PAD;
    parts.push(placeSameBand(count, cursor));
    bands.push({
      name: "identical subtrees",
      note: `${count} root ${count === 1 ? "entry" : "entries"} · pruned`,
      y: cursor,
      height,
      same: true,
    });
    cursor += height;
  }

  const { nodes, edges } = dedupe(merge(parts));
  return {
    width: CHART_WIDTH,
    height: cursor + BOTTOM_PAD,
    nodes,
    edges,
    bands,
    spine: {
      baselineX: COLUMNS.rootL,
      compareX: COLUMNS.rootR,
      ruleY: SPINE_RULE_Y,
    },
  };
}
