// ============================================
// Combobox — Atomic (Depth 1)
// Owns CSS (Combobox.css), no library component imports (wraps Kobalte primitive).
// Imports ICON_PATHS data from Icon Primitive's sibling dir — data import, not a component import.
// Unified single- and multi-combobox built on `@kobalte/core/combobox`.
//
// `multiple=false` (default) → single-combobox with clear button and
// optional freeform `onCreate` on Enter.
// `multiple=true` → multi-combobox with optional chip list, `onRemove`,
// and `onCreate` on Enter.
// ============================================
import { Combobox as KobalteCombobox } from "@kobalte/core/combobox";
import {
  type Accessor,
  type Component,
  createEffect,
  createSignal,
  For,
  Show,
  splitProps,
} from "solid-js";
import { ICON_PATHS } from "../Icon/Icon";
import { computeBackspaceAction } from "./backspace";
import "./Combobox.css";

/** Standard option shape. `value` is a string (common combobox convention). */
export interface ComboboxOption {
  value: string;
  label: string;
}

/** Props common to both single- and multi-mode. */
interface ComboboxBaseProps {
  /** Reactive accessor of options. */
  options: Accessor<ComboboxOption[]>;
  /** Placeholder when no input / no selection. */
  placeholder?: string;
  /** Disable input + trigger. */
  disabled?: boolean;
  /** Optional id for the underlying input — useful for <label for=…>. */
  id?: string;
  /** Fires on every input change (parent-side filtering, logging, etc.). */
  onInputChange?: (input: string) => void;
  /**
   * Fires on Enter when the input doesn't match an existing option —
   * the new value is passed through unchanged. Parent is responsible for
   * appending to `options` (and, in multi-mode, to `value`).
   */
  onCreate?: (input: string) => void;
}

/** Single-mode props. */
export interface SingleComboboxProps extends ComboboxBaseProps {
  multiple?: false;
  value?: Accessor<ComboboxOption | null>;
  onChange?: (value: ComboboxOption | null) => void;
  /** Not used in single-mode; kept here so the discriminated union narrows cleanly. */
  showChips?: never;
  onRemove?: never;
}

/** Multi-mode props. */
export interface MultiComboboxProps extends ComboboxBaseProps {
  multiple: true;
  value?: Accessor<ComboboxOption[]>;
  onChange?: (values: ComboboxOption[]) => void;
  /** Render selected items as chips above the input. Defaults to `true` in multi-mode. */
  showChips?: boolean;
  /** Fires when a chip is removed — parent may update backing stores. */
  onRemove?: (option: ComboboxOption) => void;
}

/**
 * Props forwarded to Kobalte's Combobox root — anything not handled here.
 *
 * Typed loosely (`Record<string, unknown>`) so callers can pass kobalte
 * passthrough props (e.g. `gutter`, `placement`, `defaultFilter`, `open`)
 * without the discriminated `value`/`onChange` union widening into kobalte's
 * internal `ComboboxSingleSelectionOptions | ComboboxMultipleSelectionOptions`
 * split. Kobalte validates the forwarded shape at its own boundary.
 */
type KobalteComboboxPassthrough = Record<string, unknown>;

/** Discriminated union — the `multiple` literal narrows the rest. */
export type ComboboxProps = (SingleComboboxProps | MultiComboboxProps) &
  KobalteComboboxPassthrough;

const DEFAULT_PLACEHOLDER = "Select or type…";

/**
 * Unified Combobox — single or multi via `multiple?` prop.
 *
 * @example
 *   // Single
 *   <Combobox options={opts} value={v} onChange={setV} onCreate={addOption} />
 *
 *   // Multi
 *   <Combobox multiple options={opts} value={vs} onChange={setVs}
 *             onCreate={addOption} onRemove={handleRemove} />
 */
export const Combobox: Component<ComboboxProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "options",
    "value",
    "onChange",
    "placeholder",
    "disabled",
    "id",
    "onInputChange",
    "onCreate",
    "multiple",
    "showChips",
    "onRemove",
  ]);

  const placeholder = () => local.placeholder ?? DEFAULT_PLACEHOLDER;
  const isMultiple = () => Boolean(local.multiple);
  const chipsEnabled = () => isMultiple() && (local.showChips ?? true);

  return isMultiple()
    ? renderMulti(local as MultiLocal, rest, placeholder, chipsEnabled)
    : renderSingle(local as SingleLocal, rest, placeholder);
};

// ============================================
// Single-mode rendering
// ============================================
type SingleLocal = Pick<
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

const renderSingle = (
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
    const exists = local.options().some(
      (opt) => opt.label.toLowerCase() === text.toLowerCase(),
    );
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
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["check"].outline} />
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
                <svg width={12} height={12} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["close"].outline} />
              </button>
            </Show>
            <KobalteCombobox.Trigger
              class="sui-combobox__trigger"
              disabled={local.disabled}
            >
              <KobalteCombobox.Icon class="sui-combobox__trigger-icon">
                <svg width={14} height={14} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["chevron-down"].outline} />
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

// ============================================
// Multi-mode rendering
// ============================================
type MultiLocal = Pick<
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

const renderMulti = (
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
    removed.forEach((opt) => local.onRemove?.(opt));
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
    const existsInOptions = local.options().some(
      (opt) => opt.label.toLowerCase() === text.toLowerCase(),
    );
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
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["check"].outline} />
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
              <div class="sui-combobox__chips">
                <div class="sui-combobox__chips-header">
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
                </div>
                <div class="sui-combobox__chip-list">
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
                          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["close"].outline} />
                        </button>
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </Show>
            <div class="sui-combobox__input-row">
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
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["chevron-down"].outline} />
                </KobalteCombobox.Icon>
              </KobalteCombobox.Trigger>
            </div>
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

