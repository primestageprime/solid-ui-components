// ============================================
// TreeDiffChart — pair selection. Pure.
//
// A selection is a PAIR: pick one side of a line and its counterpart on the
// other side lights up with it, each keeping its own colour. From the pair
// the highlight climbs every parent chain to the spine, so a leaf lights
// its group, its root, its commit and its head on both sides, and steps one
// level down, so a selected group still shows what it holds. Everything
// else dims.
// ============================================
import { filter, find, flatMap } from "../../fn";
import type { LayoutEdge } from "./layout-types";
import type { TreeDiffBand, TreeDiffChild } from "./types";

export type Highlight = {
  /** The selected node and its counterpart on the other side. */
  selected: ReadonlySet<string>;
  /** Nodes that stay lit: the pair, its ancestors, and its direct children. */
  hot: ReadonlySet<string>;
  /** Edges that stay lit, keyed `${from}>${to}`. */
  live: ReadonlySet<string>;
};

export const edgeKey = (e: { from: string; to: string }): string =>
  `${e.from}>${e.to}`;

const EMPTY: Highlight = {
  selected: new Set(),
  hot: new Set(),
  live: new Set(),
};

const sides = (k: { baseline?: { id: string }; compare?: { id: string } }) =>
  filter(
    (id): id is string => id !== undefined,
    [k.baseline?.id, k.compare?.id],
  );

/** Both sides of the child named like the one that owns `id`, across every band. */
function childPair(id: string, bands: TreeDiffBand[]): string[] {
  const children = flatMap((b: TreeDiffBand) => b.children, bands);
  const owner = find((k: TreeDiffChild) => sides(k).includes(id), children);
  if (!owner) return [];
  return flatMap(
    (k: TreeDiffChild) => (k.name === owner.name ? sides(k) : []),
    children,
  );
}

/** Both sides of the band whose group is `id`. */
function groupPair(id: string, bands: TreeDiffBand[]): string[] {
  return flatMap(
    (b: TreeDiffBand) => (sides(b).includes(id) ? sides(b) : []),
    bands,
  );
}

export function computeHighlight(
  selectedId: string | undefined,
  bands: TreeDiffBand[],
  edges: LayoutEdge[],
): Highlight {
  if (!selectedId) return EMPTY;
  const selected = new Set<string>([
    selectedId,
    ...childPair(selectedId, bands),
    ...groupPair(selectedId, bands),
  ]);
  const hot = new Set(selected);
  const live = new Set<string>();

  // Climb every parent chain to the spine.
  const climb = (id: string): void => {
    for (const e of filter((e: LayoutEdge) => e.to === id, edges)) {
      live.add(edgeKey(e));
      if (!hot.has(e.from)) {
        hot.add(e.from);
        climb(e.from);
      }
    }
  };
  for (const id of selected) climb(id);

  // And one level down, so a group still shows what it holds.
  for (const e of filter((e: LayoutEdge) => selected.has(e.from), edges)) {
    live.add(edgeKey(e));
    hot.add(e.to);
  }

  return { selected, hot, live };
}
