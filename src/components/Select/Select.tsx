// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Select — Atomic (Depth 1)
// Owns CSS (Select.css), no library component imports (wraps Kobalte primitive).
// Imports ICON_PATHS data from Icon Primitive's sibling dir — data import, not a component import.
// Unified single- and multi-select built on `@kobalte/core/select`.
//
// `multiple=false` (default) → single-select, `value: Option | null`.
// `multiple=true` → multi-select, `value: Option[]`.
// ============================================
import {
  Select as KobalteSelect,
  type SelectRootProps as KobalteSelectRootProps,
} from "@kobalte/core/select";
import {
  type Accessor,
  type Component,
  type JSX,
  Show,
  splitProps,
} from "solid-js";
import { ICON_PATHS } from "../Icon/Icon";
import "./Select.css";

/** Standard option shape. `value` is intentionally `unknown` — callers narrow. */
export interface SelectOption {
  value: unknown;
  label: string;
}

/** Props common to both single- and multi-mode. */
interface SelectBaseProps {
  /** Reactive accessor of options. */
  options: Accessor<SelectOption[]>;
  /** Field label rendered above the trigger. */
  label?: string;
  /** Helper text rendered under the trigger. */
  description?: string;
  /** Placeholder when no value is selected. */
  placeholder?: string;
  /** Optional id — forwarded to the Kobalte root. */
  id?: string;
}

/** Single-mode props. `value` is a `SelectOption | null` accessor. */
export interface SingleSelectProps extends SelectBaseProps {
  multiple?: false;
  value?: Accessor<SelectOption | null>;
  onChange?: (value: SelectOption | null) => void;
}

/** Multi-mode props. `value` is a `SelectOption[]` accessor. */
export interface MultiSelectProps extends SelectBaseProps {
  multiple: true;
  value?: Accessor<SelectOption[]>;
  onChange?: (values: SelectOption[]) => void;
}

/** Discriminated union — the `multiple` literal selects the `value`/`onChange` shape. */
export type SelectProps = (SingleSelectProps | MultiSelectProps) &
  Omit<
    KobalteSelectRootProps<SelectOption>,
    | "options"
    | "placeholder"
    | "value"
    | "onChange"
    | "multiple"
    | "optionValue"
    | "optionTextValue"
    | "itemComponent"
  >;

const DEFAULT_PLACEHOLDER = "Select an option…";

/**
 * Unified Select — single or multi via `multiple?` prop.
 *
 * @example
 *   // Single
 *   <Select options={opts} value={selected} onChange={setSelected} />
 *
 *   // Multi
 *   <Select multiple options={opts} value={selected} onChange={setSelected} />
 */
export const Select: Component<SelectProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "options",
    "value",
    "onChange",
    "placeholder",
    "description",
    "label",
    "multiple",
    "id",
  ]);

  const placeholder = () => local.placeholder ?? DEFAULT_PLACEHOLDER;

  return (
    <KobalteSelect<SelectOption>
      {...(rest as KobalteSelectRootProps<SelectOption>)}
      id={local.id}
      class="sui-select"
      multiple={local.multiple as never}
      optionValue="value"
      optionTextValue="label"
      options={local.options()}
      value={local.value?.() as never}
      onChange={local.onChange as never}
      placeholder={placeholder()}
      disallowEmptySelection={local.multiple ? undefined : false}
      itemComponent={(itemProps) => (
        <KobalteSelect.Item item={itemProps.item} class="sui-select__item">
          <KobalteSelect.ItemLabel>
            {itemProps.item.textValue}
          </KobalteSelect.ItemLabel>
          <KobalteSelect.ItemIndicator class="sui-select__item-indicator">
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              innerHTML={ICON_PATHS["check"].outline}
            />
          </KobalteSelect.ItemIndicator>
        </KobalteSelect.Item>
      )}
    >
      <Show when={local.label}>
        <KobalteSelect.Label class="sui-select__label">
          {local.label}
        </KobalteSelect.Label>
      </Show>
      <KobalteSelect.Trigger
        class="sui-select__trigger"
        aria-label={local.label}
      >
        <KobalteSelect.Value<SelectOption> class="sui-select__value">
          {(state) =>
            renderValue(state, placeholder(), local.multiple === true)
          }
        </KobalteSelect.Value>
        <KobalteSelect.Icon class="sui-select__icon">
          <svg
            width={14}
            height={14}
            viewBox="0 0 16 16"
            fill="none"
            innerHTML={ICON_PATHS["chevron-down"].outline}
          />
        </KobalteSelect.Icon>
      </KobalteSelect.Trigger>
      <Show when={local.description}>
        <KobalteSelect.Description class="sui-select__description">
          {local.description}
        </KobalteSelect.Description>
      </Show>
      <KobalteSelect.Portal>
        <KobalteSelect.Content class="sui-select__content">
          <KobalteSelect.Listbox class="sui-select__listbox" />
        </KobalteSelect.Content>
      </KobalteSelect.Portal>
    </KobalteSelect>
  );
};

/**
 * Render the trigger's value span — single shows the option's label,
 * multi shows a comma-joined preview plus an inline clear button.
 */
type SelectValueState = {
  selectedOption: () => SelectOption | undefined;
  selectedOptions: () => SelectOption[];
  clear: () => void;
};

const renderValue = (
  state: SelectValueState,
  placeholder: string,
  isMultiple: boolean,
): JSX.Element => {
  if (!isMultiple) {
    const selected = state.selectedOption();
    return selected ? selected.label : placeholder;
  }
  const selected = state.selectedOptions();
  if (selected.length === 0) return placeholder;
  return (
    <>
      <span class="sui-select__value-text">
        {selected.map((o) => o.label).join(", ")}
      </span>
      <button
        type="button"
        class="sui-select__clear"
        aria-label="Clear selection"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => state.clear()}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 16 16"
          fill="none"
          innerHTML={ICON_PATHS["close"].outline}
        />
      </button>
    </>
  );
};
