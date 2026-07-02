// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
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
import { type Accessor, type Component, splitProps } from "solid-js";
import { type MultiLocal, renderMulti } from "./ComboboxMulti";
import { renderSingle, type SingleLocal } from "./ComboboxSingle";
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
