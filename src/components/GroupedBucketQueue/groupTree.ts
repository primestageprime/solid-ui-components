// GroupedBucketQueue — the nested-group tree as PURE data. No SolidJS, no
// DOM: this module owns "what headers show, in what order, with what counts,
// given what's collapsed" and is unit-testable in isolation (per the
// "smallest tests prove shape" commandment). The component (GroupedBucketQueue.tsx)
// is the only place that touches items, DOM, or reactivity.
//
// A GroupNode is either a BRANCH (has `children`) or a LEAF (has `bucketKey`,
// naming the bucket its items are grouped under via the component's
// `bucketOf`). Depth is unbounded — thorcasting's Direction → Category → Type
// is 3 levels, but nothing here assumes exactly 3.
import type { JSX } from "solid-js";
import { map, sum } from "../../fn";
import type { Tone } from "../../types";

export interface GroupNode {
  /** Stable, unique across the WHOLE tree — used as the collapse-map key and
   *  the rendered header's own DOM key. Two nodes sharing a key is a bug the
   *  caller must avoid (mirrors BucketQueue's bucket `key`). */
  key: string;
  label: string;
  tone?: Tone;
  /** Let the user collapse this node to its header line and expand it again.
   *  Default true. Only meaningful while the node is POPULATED — an empty
   *  node (branch or leaf) already renders as just its header and has
   *  nothing to expand into, mirroring BucketQueue's own bucket rule. */
  collapsible?: boolean;
  /** Start collapsed rather than open. Ignored without a populated,
   *  collapsible node. Default false. */
  collapsedByDefault?: boolean;
  /** Branch: further nested groups, in render order. Leaf nodes omit this. */
  children?: readonly GroupNode[];
  /** Leaf only: the bucket key `bucketOf` returns for items belonging here.
   *  A node with `bucketKey` is a leaf regardless of whether `children` is
   *  also (mistakenly) present — `bucketKey` wins. */
  bucketKey?: string;
  /** Leaf only: when the queue is in select mode (`checkedKeys` present),
   *  rows in THIS leaf render the check affordance and a click toggles the
   *  check instead of selecting. Mirrors BucketQueue's `Bucket.selectable`.
   *  Default false. */
  selectable?: boolean;
  /** Leaf only: copy for when this leaf has no items. Omit for the bare
   *  summary line (label + count 0). Mirrors BucketQueue's `emptyLabel`. */
  emptyLabel?: JSX.Element;
}

/** The user's per-node collapse choice, keyed by `GroupNode.key`. Absent is
 *  "never touched", distinct from "toggled open" — same reasoning as
 *  BucketQueue's `CollapseOverrides`. */
export type GroupCollapseOverrides = ReadonlyMap<string, boolean>;

export const isLeaf = (node: GroupNode): boolean => node.bucketKey != null;

/** Every leaf's `bucketKey`, depth-first, render order — what the component
 *  bucket-sorts `items` by (mirrors BucketQueue's `bucketKeys`). */
export function collectLeafBucketKeys(tree: readonly GroupNode[]): string[] {
  const out: string[] = [];
  for (const node of tree) {
    if (isLeaf(node)) out.push(node.bucketKey as string);
    else out.push(...collectLeafBucketKeys(node.children ?? []));
  }
  return out;
}

/** A leaf's count is its bucket's item count; a branch's count is the sum of
 *  its children's — rolled up at every level, so a collapsed Direction header
 *  shows the total beneath it, not just its immediate children's count. */
export function countOf(
  node: GroupNode,
  countForBucket: (bucketKey: string) => number,
): number {
  if (isLeaf(node)) return countForBucket(node.bucketKey as string);
  return sum(
    map((c: GroupNode) => countOf(c, countForBucket), node.children ?? []),
  );
}

/** One rendered header line, flattened out of the tree in display order. */
export interface FlatGroupHeader {
  key: string;
  label: string;
  tone?: Tone;
  depth: number;
  count: number;
  isLeaf: boolean;
  bucketKey?: string;
  /** Collapsible RIGHT NOW — declared collapsible (default true) AND
   *  populated. Mirrors BucketQueue's `toggleable`. */
  toggleable: boolean;
  /** Rendering as a collapsed summary line. Always false when not toggleable. */
  collapsed: boolean;
}

/** Decide collapse state for every node depth-first, PRUNING descent into a
 *  collapsed branch's children — a collapsed Category never asks its Types
 *  for their own collapse state, mirroring how a collapsed BucketQueue bucket
 *  never renders its rows. Leaves are listed but never descended into
 *  further (they have no children to flatten). */
export function flattenGroupHeaders(
  tree: readonly GroupNode[],
  countForBucket: (bucketKey: string) => number,
  overrides: GroupCollapseOverrides,
  depth = 0,
): FlatGroupHeader[] {
  const out: FlatGroupHeader[] = [];
  for (const node of tree) {
    const count = countOf(node, countForBucket);
    const leaf = isLeaf(node);
    const toggleable = node.collapsible !== false && count > 0;
    const collapsed =
      toggleable &&
      (overrides.get(node.key) ?? node.collapsedByDefault === true);
    out.push({
      key: node.key,
      label: node.label,
      tone: node.tone,
      depth,
      count,
      isLeaf: leaf,
      bucketKey: node.bucketKey,
      toggleable,
      collapsed,
    });
    if (!leaf && !collapsed) {
      out.push(
        ...flattenGroupHeaders(
          node.children ?? [],
          countForBucket,
          overrides,
          depth + 1,
        ),
      );
    }
  }
  return out;
}

/** Every leaf node, keyed by its own `key` — the component's lookup for the
 *  leaf-only fields (`selectable`, `emptyLabel`) a `FlatGroupHeader` doesn't
 *  carry. */
export function leafNodesByKey(
  tree: readonly GroupNode[],
): Map<string, GroupNode> {
  const out = new Map<string, GroupNode>();
  for (const node of tree) {
    if (isLeaf(node)) out.set(node.key, node);
    else
      for (const [k, v] of leafNodesByKey(node.children ?? [])) out.set(k, v);
  }
  return out;
}

/** Record the user's toggle — sticks for the life of the component, exactly
 *  like BucketQueue's `toggleCollapse`. */
export function toggleGroupCollapse(
  overrides: GroupCollapseOverrides,
  key: string,
  currentlyCollapsed: boolean,
): GroupCollapseOverrides {
  return new Map(overrides).set(key, !currentlyCollapsed);
}
