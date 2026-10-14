// Tree Table flatten — turns a tree of rows into the flat, visible row list a
// BaseTable renders. Pure: the caller owns `expanded` (controlled only), and
// the table never learns the hierarchy — it sees `depth` and `hasChildren`.
import { flatMap } from "../../../../src/fn";

export interface FlatTreeRow<T> {
  readonly row: T;
  readonly id: string;
  /** 0 for a root. The indent cell draws one step per level. */
  readonly depth: number;
  /** False for `undefined` and for an empty child list: no chevron either way. */
  readonly hasChildren: boolean;
  /** True only on a parent whose id is in `expanded`. */
  readonly expanded: boolean;
}

export interface FlattenTreeOptions<T> {
  readonly childrenOf: (row: T) => readonly T[] | undefined;
  readonly getRowId: (row: T) => string;
  readonly expanded: ReadonlySet<string>;
}

/**
 * Depth-first, pre-order. A collapsed parent hides its whole subtree; keys
 * for rows inside it stay in `expanded`, so re-opening the parent restores
 * the inner state.
 */
export const flattenTree = <T>(
  roots: readonly T[],
  opts: FlattenTreeOptions<T>,
  depth = 0,
): FlatTreeRow<T>[] =>
  flatMap((row: T): FlatTreeRow<T>[] => {
    const id = opts.getRowId(row);
    const kids = opts.childrenOf(row) ?? [];
    const hasChildren = kids.length > 0;
    const expanded = hasChildren && opts.expanded.has(id);
    const self: FlatTreeRow<T> = { row, id, depth, hasChildren, expanded };
    return expanded ? [self, ...flattenTree(kids, opts, depth + 1)] : [self];
  }, roots);
