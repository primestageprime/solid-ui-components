// ============================================
// Combobox — Multi-mode render (internal sibling of Combobox.tsx)
// Atomic (Depth 1) — internal render half of the Combobox Kobalte-wrapping Primitive.
// ============================================
// Extracted from Combobox.tsx to keep each module under the ~500-line
// guideline. This is NOT a public export — the folder barrel (index.ts)
// re-exports only the `Combobox` component and its public types from
// Combobox.tsx. This module is an internal implementation detail.
//
// `renderMulti` is a plain function (not a component) invoked directly by
// the `Combobox` dispatcher inside Solid's reactive tree. Its signature is
// intentionally identical to the original: it receives the already-split
// `local` props bag, the kobalte `rest` passthrough, and reactive
// `placeholder` / `chipsEnabled` accessors. Keeping these as live accessors
// (rather than snapshotting values) is load-bearing — the render runs inside
// the parent component's reactive scope, so any signal/prop read here stays
// tracked and re-renders correctly. Do NOT capture stale values or convert
// accessors to eager reads.
//
// Backspace semantics (two-step chip deletion) are owned entirely by this
// module because Kobalte's built-in `removeOnBackspace` is disabled on the
// root. The pure decision logic lives in the sibling `backspace.ts`
// (`computeBackspaceAction`, unit-tested) — reused here, never duplicated.
//
// Owns no CSS of its own — the shared `Combobox.css` (imported by
// Combobox.tsx) covers all `sui-combobox__*` classes used here.
// ============================================
import { Combobox as KobalteCombobox } from "@kobalte/core/combobox";
import { type Accessor, createEffect, createSignal, For, Show } from "solid-js";
import {
  NarrowStack,
  SpreadRow,
  TagRow,
  TightClusterRow,
} from "../Layout/variants";
import { ICON_PATHS } from "../Icon/Icon";
import { computeBackspaceAction } from "./backspace";
import type { ComboboxOption, MultiComboboxProps } from "./Combobox";

/** Narrowed local props for multi-mode rendering. */
export type MultiLocal = Pick<
  MultiComboboxProps,
  | "options"
  | "value"
  | "onChange"
  | "placeholder"
  | "disabled"
  | "id"
  | "onInputChange"
  | "onCreate"
  | "multiple"
  | "showChips"
  | "onRemove"
>;

export const renderMulti = (
  local: MultiLocal,
  rest: Record<string, unknown>,
  placeholder: Accessor<string>,
  chipsEnabled: Accessor<boolean>,
) => {
  const [inputValue, setInputValue] = createSignal("");
  const [prevValue, setPrevValue] = createSignal<ComboboxOption[]>(
    local.value?.() ?? [],
  );
  // Two-step backspace deletion: stores the `value` of the chip currently
  // armed for deletion. `null` means no chip is highlighted.
  const [highlightedChipValue, setHighlightedChipValue] = createSignal<
    string | null
  >(null);

  createEffect(() => setPrevValue(local.value?.() ?? []));

  // Defensive: if the highlighted chip is no longer present in the value
  // array (removed via "X" button, "Clear all", or external mutation),
  // drop the highlight so a stale value can't haunt later keypresses.
  createEffect(() => {
    const current = highlightedChipValue();
    if (current === null) return;
    const stillPresent = (local.value?.() ?? []).some(
      (opt) => opt.value === current,
    );
    if (!stillPresent) setHighlightedChipValue(null);
  });

  const updateInput = (text: string) => {
    setInputValue(text);
    // Any keystroke into the input clears the deletion-armed state — a
    // user who's typing isn't trying to delete a chip.
    if (text !== "") setHighlightedChipValue(null);
    local.onInputChange?.(text);
  };

  const handleChange = (next: ComboboxOption[]) => {
    const removed = prevValue().filter(
      (prev) => !next.some((n) => n.value === prev.value),
    );
    removed.forEach((opt) => {
      local.onRemove?.(opt);
    });
    setPrevValue(next);
    local.onChange?.(next);
  };

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) => {
    // Handle two-step backspace deletion before falling through to the
    // create-on-Enter branch. Kobalte's built-in `removeOnBackspace` is
    // disabled on the root (see `removeOnBackspace={false}` below) so
    // we own the entire backspace contract here. Logic lives in
    // `computeBackspaceAction` (pure, unit-tested).
    if (e.key === "Backspace") {
      const action = computeBackspaceAction({
        inputValue: e.currentTarget.value,
        selected: local.value?.() ?? [],
        armedValue: highlightedChipValue(),
      });
      switch (action.kind) {
        case "passthrough":
          // Two passthrough sources: non-empty input (browser deletes a
          // char) and empty input with no chips (nothing to do). In both
          // cases, defensively clear any stale armed value so it can't
          // haunt later keypresses.
          if (highlightedChipValue() !== null) setHighlightedChipValue(null);
          return;
        case "arm":
          e.preventDefault();
          setHighlightedChipValue(action.value);
          return;
        case "delete":
          e.preventDefault();
          setHighlightedChipValue(null);
          handleChange(action.next);
          return;
      }
    }

    // Escape unhighlights any armed chip; let Kobalte still handle its
    // own Escape behavior (close dropdown / reset input) — don't
    // preventDefault here.
    if (e.key === "Escape") {
      setHighlightedChipValue(null);
      return;
    }

    // Any other printable key disarms the highlight — typing means the
    // user moved on from "about to delete a chip".
    if (e.key.length === 1 && highlightedChipValue() !== null) {
      setHighlightedChipValue(null);
    }

    if (e.key !== "Enter" || !local.onCreate) return;
    const text = inputValue().trim();
    if (!text) return;
    const existsInOptions = local
      .options()
      .some((opt) => opt.label.toLowerCase() === text.toLowerCase());
    const existsInValue = (local.value?.() ?? []).some(
      (opt) => opt.label.toLowerCase() === text.toLowerCase(),
    );
    if (existsInOptions || existsInValue) return;
    e.preventDefault();
    local.onCreate(text);
    setInputValue("");
  };

  const chipClass = (option: ComboboxOption): string =>
    highlightedChipValue() === option.value
      ? "sui-combobox__chip sui-combobox__chip--highlighted"
      : "sui-combobox__chip";

  return (
    <KobalteCombobox<ComboboxOption>
      {...(rest as Record<string, unknown>)}
      multiple
      removeOnBackspace={false}
      class="sui-combobox sui-combobox--multi"
      options={local.options()}
      value={local.value?.() ?? []}
      onChange={handleChange}
      placeholder={placeholder()}
      optionValue="value"
      optionTextValue="label"
      optionLabel="label"
      itemComponent={(itemProps) => (
        <KobalteCombobox.Item item={itemProps.item} class="sui-combobox__item">
          <span class="sui-combobox__item-label">
            <KobalteCombobox.ItemLabel>
              {itemProps.item.rawValue.label}
            </KobalteCombobox.ItemLabel>
          </span>
          <KobalteCombobox.ItemIndicator class="sui-combobox__item-indicator">
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              innerHTML={ICON_PATHS.check.outline}
            />
          </KobalteCombobox.ItemIndicator>
        </KobalteCombobox.Item>
      )}
    >
      <KobalteCombobox.Control<ComboboxOption>
        class="sui-combobox__control sui-combobox__control--multi"
        aria-label={placeholder()}
      >
        {(state) => (
          <>
            <Show when={chipsEnabled() && state.selectedOptions().length > 0}>
              <NarrowStack class="sui-combobox__chips">
                <SpreadRow class="sui-combobox__chips-header">
                  <span class="sui-combobox__chips-count">
                    Selected ({state.selectedOptions().length})
                  </span>
                  <button
                    type="button"
                    class="sui-combobox__chips-clear"
                    aria-label="Clear all selections"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => state.clear()}
                  >
                    Clear all
                  </button>
                </SpreadRow>
                <TagRow class="sui-combobox__chip-list">
                  <For each={state.selectedOptions()}>
                    {(option) => (
                      <span
                        class={chipClass(option)}
                        aria-current={
                          highlightedChipValue() === option.value
                            ? "true"
                            : undefined
                        }
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <span class="sui-combobox__chip-label">
                          {option.label}
                        </span>
                        <button
                          type="button"
                          class="sui-combobox__chip-remove"
                          aria-label={`Remove ${option.label}`}
                          onClick={() => state.remove(option)}
                        >
                          <svg
                            width={12}
                            height={12}
                            viewBox="0 0 16 16"
                            fill="none"
                            innerHTML={ICON_PATHS.close.outline}
                          />
                        </button>
                      </span>
                    )}
                  </For>
                </TagRow>
              </NarrowStack>
            </Show>
            <TightClusterRow class="sui-combobox__input-row">
              <KobalteCombobox.Input
                id={local.id}
                class="sui-combobox__input"
                value={inputValue()}
                onInput={(e) => updateInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={local.disabled}
              />
              <KobalteCombobox.Trigger
                class="sui-combobox__trigger"
                disabled={local.disabled}
              >
                <KobalteCombobox.Icon class="sui-combobox__trigger-icon">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 16 16"
                    fill="none"
                    innerHTML={ICON_PATHS["chevron-down"].outline}
                  />
                </KobalteCombobox.Icon>
              </KobalteCombobox.Trigger>
            </TightClusterRow>
          </>
        )}
      </KobalteCombobox.Control>
      <KobalteCombobox.Portal>
        <KobalteCombobox.Content class="sui-combobox__content">
          <KobalteCombobox.Listbox class="sui-combobox__listbox" />
        </KobalteCombobox.Content>
      </KobalteCombobox.Portal>
    </KobalteCombobox>
  );
};
