// ============================================
// TreeDiffChart — placement helpers for the column layouts. Each helper is
// pure: a frame and a ranked band in, positioned nodes and edges out.
// ============================================
import { filter, flatMap, map } from "../../fn";
import { BOX_HEIGHT, type ColumnFrame } from "./frame";
import type {
  LayoutEdge,
  LayoutNode,
  LayoutNodeKind,
  RankedBand,
} from "./layout-types";
import {
  COMMIT_BASELINE_ID,
  COMMIT_COMPARE_ID,
  HEAD_BASELINE_ID,
  HEAD_COMPARE_ID,
  ROOT_BASELINE_ID,
  ROOT_COMPARE_ID,
  SAME_ID,
  type TreeDiffChild,
  type TreeDiffEntry,
  type TreeDiffRoot,
  type TreeDiffSide,
} from "./types";

const CHIP_Y = 44;
const SPINE_HEAD_RISE = 176;
const SPINE_COMMIT_RISE = 88;
const W_SAME = 300;
export { SPINE_HEAD_RISE };

// ─── Placement helpers ───────────────────────────────────────────────────

export type Placed = { nodes: LayoutNode[]; edges: LayoutEdge[] };

export const merge = (parts: Placed[]): Placed => ({
  nodes: flatMap((p: Placed) => p.nodes, parts),
  edges: flatMap((p: Placed) => p.edges, parts),
});

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

/** Per-side trunk x for root edges; undefined when the mode routes them as runs. */
export type Trunks = { baseline?: number; compare?: number };

/** One child row of a diverged band: a shared leaf in the center, or one leaf per side. */
function placeDivergedChild(
  f: ColumnFrame,
  k: TreeDiffChild,
  y: number,
  gb: TreeDiffEntry | undefined,
  gc: TreeDiffEntry | undefined,
): Placed {
  if (childSide(k, "baseline") === "shared" && k.baseline) {
    const leaf = node(k.baseline, "leaf", "shared", f.x.center, y, f.wLeaf);
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
  const left: Placed[] =
    k.baseline && gb
      ? [
          {
            nodes: [
              node(k.baseline, "leaf", "baseline", f.x.leafL, y, f.wLeaf),
            ],
            edges: [{ from: gb.id, to: k.baseline.id, side: "baseline" }],
          },
        ]
      : [];
  const right: Placed[] =
    k.compare && gc
      ? [
          {
            nodes: [node(k.compare, "leaf", "compare", f.x.leafR, y, f.wLeaf)],
            edges: [{ from: gc.id, to: k.compare.id, side: "compare" }],
          },
        ]
      : [];
  return merge([...left, ...right]);
}

/** A diverged band: one group per present side, then the child rows. */
export function placeDivergedBand(
  f: ColumnFrame,
  trunks: Trunks,
  r: RankedBand,
  midY: number,
  rowY: (i: number) => number,
): Placed {
  const { baseline: gb, compare: gc } = r.band;
  const groups: Placed[] = [
    ...(gb
      ? [
          {
            nodes: [node(gb, "group", "baseline", f.x.groupL, midY, f.wGroup)],
            edges: [
              {
                from: ROOT_BASELINE_ID,
                to: gb.id,
                side: "baseline" as const,
                trunkX: trunks.baseline,
              },
            ],
          },
        ]
      : []),
    ...(gc
      ? [
          {
            nodes: [node(gc, "group", "compare", f.x.groupR, midY, f.wGroup)],
            edges: [
              {
                from: ROOT_COMPARE_ID,
                to: gc.id,
                side: "compare" as const,
                trunkX: trunks.compare,
              },
            ],
          },
        ]
      : []),
  ];
  const rows = map(
    (k: TreeDiffChild, i: number) => placeDivergedChild(f, k, rowY(i), gb, gc),
    r.children,
  );
  return merge([...groups, ...rows]);
}

/** An identical band in full mode: one shared group fed from both roots, then its leaves. */
export function placeSharedBand(
  f: ColumnFrame,
  trunks: Trunks,
  r: RankedBand,
  gb: TreeDiffEntry,
  midY: number,
  rowY: (i: number) => number,
): Placed {
  const gx = r.children.length ? f.x.sharedGroup : f.cx;
  const group: Placed = {
    nodes: [node(gb, "group", "shared", gx, midY, f.wGroup)],
    edges: [
      {
        from: ROOT_BASELINE_ID,
        to: gb.id,
        side: "shared",
        trunkX: trunks.baseline,
      },
      {
        from: ROOT_COMPARE_ID,
        to: gb.id,
        side: "shared",
        trunkX: trunks.compare,
      },
    ],
  };
  const rows = map((k: TreeDiffChild, i: number): Placed => {
    const leaf = k.baseline ?? k.compare;
    if (!leaf) return { nodes: [], edges: [] };
    return {
      nodes: [node(leaf, "leaf", "shared", f.x.sharedLeaf, rowY(i), f.wLeaf)],
      edges: [{ from: gb.id, to: leaf.id, side: "shared" }],
    };
  }, r.children);
  return merge([group, ...rows]);
}

export function placeSameBand(
  f: ColumnFrame,
  trunks: Trunks,
  count: number,
  y0: number,
): Placed {
  const same: LayoutNode = {
    id: SAME_ID,
    label: "[SAME]",
    hash: `${count} ${count === 1 ? "subtree" : "subtrees"} · pruned`,
    kind: "same",
    side: "shared",
    x: f.cx,
    y: y0 + f.labelH + f.slot / 2,
    width: W_SAME,
    height: BOX_HEIGHT,
  };
  return {
    nodes: [same],
    edges: [
      {
        from: ROOT_BASELINE_ID,
        to: SAME_ID,
        side: "shared",
        trunkX: trunks.baseline,
      },
      {
        from: ROOT_COMPARE_ID,
        to: SAME_ID,
        side: "shared",
        trunkX: trunks.compare,
      },
    ],
  };
}

/** Compact: one chip per side, titled with the scenario, subtitled root and commit. */
export function placeChip(
  f: ColumnFrame,
  root: TreeDiffRoot,
  side: "baseline" | "compare",
): LayoutNode {
  return {
    id: side === "baseline" ? ROOT_BASELINE_ID : ROOT_COMPARE_ID,
    label: root.label,
    hash: root.commit
      ? `root ${root.hash} · ${root.commit}`
      : `root ${root.hash}`,
    kind: "root",
    side,
    x: side === "baseline" ? f.x.headL : f.x.headR,
    y: CHIP_Y,
    width: f.chip,
    height: BOX_HEIGHT,
  };
}

/** Wide: head, commit (when given) and root tree stacked on the side's spine. */
export function placeSpine(
  f: ColumnFrame,
  root: TreeDiffRoot,
  side: "baseline" | "compare",
  rootY: number,
): Placed {
  const x = side === "baseline" ? f.x.headL : f.x.headR;
  const ids =
    side === "baseline"
      ? {
          head: HEAD_BASELINE_ID,
          commit: COMMIT_BASELINE_ID,
          root: ROOT_BASELINE_ID,
        }
      : {
          head: HEAD_COMPARE_ID,
          commit: COMMIT_COMPARE_ID,
          root: ROOT_COMPARE_ID,
        };
  const box = (
    id: string,
    kind: LayoutNodeKind,
    label: string,
    hash: string,
    y: number,
    width: number,
  ): LayoutNode => ({
    id,
    label,
    hash,
    kind,
    side,
    x,
    y,
    width,
    height: BOX_HEIGHT,
  });
  const head = box(
    ids.head,
    "head",
    root.label,
    root.ref ?? "",
    rootY - SPINE_HEAD_RISE,
    f.wHead,
  );
  const tree = box(
    ids.root,
    "root",
    "root tree",
    root.hash,
    rootY,
    f.wHead + 8,
  );
  if (root.commit === undefined) {
    return {
      nodes: [head, tree],
      edges: [{ from: ids.head, to: ids.root, side }],
    };
  }
  const commit = box(
    ids.commit,
    "commit",
    "commit",
    root.commit,
    rootY - SPINE_COMMIT_RISE,
    f.wHead - 10,
  );
  return {
    nodes: [head, commit, tree],
    edges: [
      { from: ids.head, to: ids.commit, side },
      { from: ids.commit, to: ids.root, side },
    ],
  };
}

/** Keep the first node per id and the first edge per (from, to) whose ends both exist. */
export function dedupe(placed: Placed): Placed {
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
