// ============================================
// Multi-mode backspace state machine (pure)
// ============================================
//
// Two-step "highlight-then-delete" backspace handling for the multi-mode
// Combobox. Lives in its own module (no SolidJS / JSX imports) so it can
// be unit-tested without a DOM and without going through Kobalte's
// portal machinery.
//
// Behavior contract — matches Gmail's "to:" field, GitHub's label
// picker, and most chip-based multi-selects:
//
//   1. Backspace, input non-empty            → "passthrough" (browser deletes a char)
//   2. Backspace, input empty, no chips      → "passthrough" (nothing to do)
//   3. Backspace, input empty, no armed chip → "arm" the LAST chip (visual cue only)
//   4. Backspace, input empty, chip armed    → "delete" the armed chip
//
// Reading the result kinds:
//   - `passthrough` : caller does NOT preventDefault — browser handles it
//   - `arm`         : caller preventDefaults, sets armed = `value`
//   - `delete`      : caller preventDefaults, clears armed, calls onChange(next)

import type { ComboboxOption } from "./Combobox";
import { filter } from "../../fn";

export type BackspaceState = {
  inputValue: string;
  selected: readonly ComboboxOption[];
  armedValue: string | null;
};

export type BackspaceAction =
  | { kind: "passthrough" }
  | { kind: "arm"; value: string }
  | { kind: "delete"; value: string; next: ComboboxOption[] };

export const computeBackspaceAction = (
  state: BackspaceState,
): BackspaceAction => {
  // Non-empty input → standard text deletion path. No chip side-effects.
  if (state.inputValue !== "") return { kind: "passthrough" };
  // Empty input, no chips → nothing to do.
  if (state.selected.length === 0) return { kind: "passthrough" };
  // Empty input, a chip is already armed → second press deletes it.
  if (state.armedValue !== null) {
    const next = filter((opt) => opt.value !== state.armedValue, state.selected);
    return { kind: "delete", value: state.armedValue, next };
  }
  // Empty input, no chip armed → first press arms the last chip.
  return {
    kind: "arm",
    value: state.selected[state.selected.length - 1].value,
  };
};
