import { createSignal, Accessor, Setter } from "solid-js";
import { SelectionStore } from "./types";

/**
 * Creates an ephemeral selection store using a regular signal.
 * Selection state resets on page reload.
 */
export function createSelectionStore<Id = string>(
  initialSelection?: Set<Id>
): SelectionStore<Id> {
  const [selected, setSelected] = createSignal<Set<Id>>(
    initialSelection ?? new Set()
  );
  return { selected, setSelected };
}

/**
 * Helper to create a selection store from existing signal accessors.
 * Use this to integrate with your own state management (e.g., persistent storage).
 *
 * @example
 * // With a persistent signal from your app's storage layer
 * const [stored, setStored] = createStoredSignal<Set<string>>("table-selection", new Set());
 * const selectionStore = fromSignal(stored, setStored);
 */
export function fromSignal<Id = string>(
  accessor: Accessor<Set<Id>>,
  setter: Setter<Set<Id>>
): SelectionStore<Id> {
  return { selected: accessor, setSelected: setter };
}
