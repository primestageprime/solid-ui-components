// The row's selection: which names are pinned or linked. Controlled when the
// caller supplies `selected`; otherwise the row holds it.
import { createSignal } from "solid-js";
import { filter } from "../../fn";
import type { Emitters } from "./emit";
import { pinTo } from "./rows";
import type { MutationSlidersProps } from "./props";

export interface RowSelection {
  readonly selection: () => readonly string[];
  readonly isSelected: (id: string) => boolean;
  readonly toggleSelection: (id: string) => void;
  /** Replace the selection: held here when uncontrolled, then announced. */
  readonly setSelection: (next: readonly string[]) => void;
}

export const createSelection = (
  props: MutationSlidersProps,
  { emitAll }: Pick<Emitters, "emitAll">,
): RowSelection => {
  /**
   * The selection, when the caller does not hold it. CONTROLLED wins: if
   * `selected` is supplied it is the truth and this is never read, so the two
   * can never drift apart.
   */
  const [ownSelection, setOwnSelection] = createSignal<readonly string[]>([]);
  const selection = (): readonly string[] => props.selected ?? ownSelection();
  const isSelected = (id: string): boolean => selection().includes(id);

  const setSelection = (next: readonly string[]): void => {
    if (props.selected === undefined) setOwnSelection(next);
    props.onSelectionChange?.(next);
  };

  /**
   * Toggle a name. When the toggle FORMS a group of two or more, every member
   * snaps to the highest amount among them straight away — that is the moment
   * the pin means something, and waiting for a drag would leave the reader
   * looking at a group that says it is pinned and is not.
   */
  const toggleSelection = (id: string): void => {
    const next = isSelected(id)
      ? filter((other: string) => other !== id, selection())
      : [...selection(), id];
    setSelection(next);
    if (next.length > 1 && next.includes(id)) {
      emitAll(pinTo(props.entities, next), "both");
    }
  };

  return { selection, isSelected, toggleSelection, setSelection };
};
