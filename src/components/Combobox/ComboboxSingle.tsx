// ============================================
// Combobox — Single-mode render (internal sibling of Combobox.tsx)
// ============================================
// Extracted from Combobox.tsx to keep each module under the ~500-line
// guideline. This is NOT a public export — the folder barrel (index.ts)
// re-exports only the `Combobox` component and its public types from
// Combobox.tsx. This module is an internal implementation detail.
//
// `renderSingle` is a plain function (not a component) invoked directly by
// the `Combobox` dispatcher inside Solid's reactive tree. Its signature is
// intentionally identical to the original: it receives the already-split
// `local` props bag, the kobalte `rest` passthrough, and a reactive
// `placeholder` accessor. Keeping these as live accessors (rather than
// snapshotting values) is load-bearing — the render runs inside the parent
// component's reactive scope, so any signal/prop read here stays tracked and
// re-renders correctly. Do NOT capture stale values or convert accessors to
// eager reads.
//
// Owns no CSS of its own — the shared `Combobox.css` (imported by
// Combobox.tsx) covers all `sui-combobox__*` classes used here.
// ============================================
import { Combobox as KobalteCombobox } from "@kobalte/core/combobox";
import { type Accessor, createEffect, createSignal, Show } from "solid-js";
import { ICON_PATHS } from "../Icon/Icon";
import type { ComboboxOption, SingleComboboxProps } from "./Combobox";

/** Narrowed local props for single-mode rendering. */
export type SingleLocal = Pick<
  SingleComboboxProps,
  | "options"
  | "value"
  | "onChange"
  | "placeholder"
  | "disabled"
  | "id"
  | "onInputChange"
  | "onCreate"
  | "multiple"
>;

export const renderSingle = (
  local: SingleLocal,
  rest: Record<string, unknown>,
  placeholder: Accessor<string>,
) => {
  const [inputValue, setInputValue] = createSignal("");

  // Keep input in sync with externally-selected option — including external clears.
  createEffect(() => {
    const selected = local.value?.();
    setInputValue(selected ? selected.label : "");
  });

  const updateInput = (text: string) => {
    setInputValue(text);
    local.onInputChange?.(text);
  };

  const handleChange = (option: ComboboxOption | null) => {
    local.onChange?.(option);
    if (option) setInputValue(option.label);
    else setInputValue("");
  };

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) => {
    if (e.key !== "Enter" || !local.onCreate) return;
    const text = inputValue().trim();
    if (!text) return;
    const exists = local
      .options()
      .some((opt) => opt.label.toLowerCase() === text.toLowerCase());
    if (exists) return;
    e.preventDefault();
    local.onCreate(text);
    setInputValue("");
  };

  const handleClear = () => {
    local.onChange?.(null);
    setInputValue("");
  };

  return (
    <KobalteCombobox<ComboboxOption>
      {...(rest as Record<string, unknown>)}
      class="sui-combobox"
      options={local.options()}
      value={local.value?.() ?? undefined}
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
        class="sui-combobox__control"
        aria-label={placeholder()}
      >
        {(state) => (
          <>
            <KobalteCombobox.Input
              id={local.id}
              class="sui-combobox__input"
              value={inputValue()}
              onInput={(e) => updateInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              disabled={local.disabled}
            />
            <Show when={state.selectedOptions().length > 0}>
              <button
                type="button"
                class="sui-combobox__clear"
                aria-label="Clear selection"
                onClick={handleClear}
              >
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 16 16"
                  fill="none"
                  innerHTML={ICON_PATHS.close.outline}
                />
              </button>
            </Show>
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
