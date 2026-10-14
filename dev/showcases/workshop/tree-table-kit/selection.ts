// Tree Table checkbox selection. The selection is a set of LEAF ids. A
// parent's box is derived from its leaves, so it cannot disagree with them:
// all leaves in → checked, some → indeterminate, none → unchecked. Checking
// or unchecking a parent adds or removes every leaf under it.
import { every, flatMap, some } from "../../../../src/fn";

export type CheckState = "checked" | "indeterminate" | "unchecked";

export interface TreeSelectionOptions<T> {
  readonly childrenOf: (row: T) => readonly T[] | undefined;
  readonly getRowId: (row: T) => string;
}

export const leafIds = <T>(row: T, opts: TreeSelectionOptions<T>): string[] => {
  const kids = opts.childrenOf(row) ?? [];
  return kids.length === 0
    ? [opts.getRowId(row)]
    : flatMap((k: T) => leafIds(k, opts), kids);
};

export const checkState = <T>(
  row: T,
  selected: ReadonlySet<string>,
  opts: TreeSelectionOptions<T>,
): CheckState => {
  const leaves = leafIds(row, opts);
  const isIn = (id: string): boolean => selected.has(id);
  return every(isIn, leaves)
    ? "checked"
    : some(isIn, leaves)
      ? "indeterminate"
      : "unchecked";
};

export const toggleChecked = <T>(
  row: T,
  checked: boolean,
  selected: ReadonlySet<string>,
  opts: TreeSelectionOptions<T>,
): Set<string> => {
  const next = new Set(selected);
  for (const id of leafIds(row, opts)) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
};
