// ============================================
// SearchField — Atomic (Depth 1)
// Owns SearchInput.css; no component imports.
// The field chrome behind SearchInput: one 32px bordered row holding an
// optional leading slot, a bare text input and, while there is text and an
// `onClear`, a clear button. Both glyphs arrive as slots (`leading`,
// `clearIcon`) so this primitive imports no component; SearchInput fills them
// with Icons. The clear button hands focus back to the input.
// Slots and data only (nothing presentational to freeze), so it is exported
// directly, like StatusChip.
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import "./SearchInput.css";

export interface SearchFieldProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "children"> {
  /** Slot before the text: the search glyph. */
  leading?: JSX.Element;
  /** Slot inside the clear button: the clear glyph. */
  clearIcon?: JSX.Element;
  /** Called when the clear button is pressed. Without it there is no clear button. */
  onClear?: () => void;
}

/** Whether the clear button shows: there is an `onClear` and something to clear. */
export const showsClear = (hasOnClear: boolean, value: unknown): boolean =>
  hasOnClear && value != null && String(value) !== "";

export const SearchField: Component<SearchFieldProps> = (props) => {
  const [local, others] = splitProps(props, [
    "leading",
    "clearIcon",
    "onClear",
    "class",
  ]);
  let input: HTMLInputElement | undefined;
  const frameClass = () =>
    local.class ? `sui-search-field ${local.class}` : "sui-search-field";
  return (
    <div class={frameClass()}>
      <Show when={local.leading}>
        <span class="sui-search-field__leading">{local.leading}</span>
      </Show>
      <input
        ref={input}
        type="search"
        class="sui-search-field__input"
        {...others}
      />
      <Show when={showsClear(!!local.onClear, others.value)}>
        <button
          type="button"
          class="sui-search-field__clear"
          aria-label="Clear search"
          onClick={() => {
            local.onClear?.();
            input?.focus();
          }}
        >
          {local.clearIcon ?? "×"}
        </button>
      </Show>
    </div>
  );
};
