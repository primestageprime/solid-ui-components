// TreeTable checkbox selection — pure. The selection is a set of LEAF ids. A
// parent's box is derived from the leaves under it, so it cannot disagree
// with them: all in → checked, some → indeterminate, none → unchecked.
// Checking or unchecking a parent adds or removes every leaf under it.
import { every, filter, flatMap, some } from "../../fn";

export type CheckState = "checked" | "indeterminate" | "unchecked";

export interface TreeShape<T> {
  readonly childrenOf: (row: T) => readonly T[] | undefined;
  readonly getRowId: (row: T) => string;
}

/** Every leaf id under `row`, at any depth; a leaf's own id for a leaf. */
export const leafIds = <T>(row: T, shape: TreeShape<T>): string[] => {
  const kids = shape.childrenOf(row) ?? [];
  return kids.length === 0
    ? [shape.getRowId(row)]
    : flatMap((k: T) => leafIds(k, shape), kids);
};

/** Every leaf id under a list of roots. */
export const leafIdsOf = <T>(
  rows: readonly T[],
  shape: TreeShape<T>,
): string[] => flatMap((r: T) => leafIds(r, shape), rows);

export const checkState = (
  leaves: readonly string[],
  selected: ReadonlySet<string>,
): CheckState => {
  const isIn = (id: string): boolean => selected.has(id);
  if (leaves.length > 0 && every(isIn, leaves)) return "checked";
  return some(isIn, leaves) ? "indeterminate" : "unchecked";
};

/** A new selection with every id in `leaves` added (`checked`) or removed. */
export const setChecked = (
  leaves: readonly string[],
  checked: boolean,
  selected: ReadonlySet<string>,
): ReadonlySet<string> => {
  const leafSet = new Set(leaves);
  const others = filter((id: string) => !leafSet.has(id), [...selected]);
  return new Set(checked ? [...others, ...leaves] : others);
};
