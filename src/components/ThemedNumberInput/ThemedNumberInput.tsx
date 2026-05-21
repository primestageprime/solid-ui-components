// ============================================
// ThemedNumberInput — Atomic (Depth 1)
// Owns CSS (ThemedNumberInput.css), no library component imports (wraps Kobalte primitive).
// Imports ICON_PATHS data from Icon Primitive's sibling dir — data import, not a component import.
// Kobalte-backed (@kobalte/core/number-field).
//
// Zero-config default render: <ThemedNumberInput name="qty" /> produces an
// unbounded field with step=1. All other `NumberFieldRootProps` (e.g.
// `disabled`, `required`, `format`, `formatOptions`, `changeOnWheel`) are
// forwarded via spread.
// ============================================
import {
  NumberField as KobalteNumberField,
  type NumberFieldRootProps as KobalteNumberFieldRootProps,
} from "@kobalte/core/number-field";
import {
  type Accessor,
  type Component,
  Show,
  splitProps,
} from "solid-js";
import { ICON_PATHS } from "../Icon/Icon";
import "./ThemedNumberInput.css";

/** Props owned by `ThemedNumberInput`; everything else is kobalte passthrough. */
interface ThemedNumberInputOwnProps {
  /** Reactive accessor for the numeric value. `undefined` clears the field. */
  value?: Accessor<number | undefined>;
  /**
   * Called whenever the raw numeric value changes. `undefined` when cleared.
   *
   * Note: Kobalte's NumberField emits `NaN` when the input is cleared; this
   * component normalizes that to `undefined` before invoking your handler,
   * so you never receive `NaN`.
   */
  onChange?: (value: number | undefined) => void;
  /** Form field name — forwarded to kobalte's hidden input. */
  name: string;
  /** Optional label rendered above the input. */
  label?: string;
  /** Error message — when present, the field renders in invalid state. */
  errorMessage?: string;
  /** Helper text rendered below the input (hidden while an error is shown). */
  description?: string;
  /** Smallest allowed value — forwarded as kobalte's `minValue`. */
  min?: number;
  /** Largest allowed value — forwarded as kobalte's `maxValue`. */
  max?: number;
  /** Increment/decrement step (default `1`) — forwarded as kobalte's `step`. */
  step?: number;
}

/** `ThemedNumberInput` combines the owned props with kobalte's forwarded root props. */
export type ThemedNumberInputProps = ThemedNumberInputOwnProps &
  Omit<
    KobalteNumberFieldRootProps,
    | "value"
    | "onChange"
    | "rawValue"
    | "onRawValueChange"
    | "minValue"
    | "maxValue"
    | "step"
    | "name"
  >;

const DEFAULT_STEP = 1;

/**
 * Themed number input — styled to match `ThemedInput` / `ThemedTextarea`,
 * backed by `@kobalte/core/number-field` for stepper + keyboard semantics.
 *
 * @example
 *   // Minimal — zero config
 *   <ThemedNumberInput name="quantity" />
 *
 *   // With label + validation
 *   <ThemedNumberInput
 *     name="rpm"
 *     label="Engine RPM"
 *     value={rpm}
 *     onChange={setRpm}
 *     min={0}
 *     max={10000}
 *     step={50}
 *     errorMessage={rpmError()}
 *   />
 */
export const ThemedNumberInput: Component<ThemedNumberInputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "name",
    "label",
    "errorMessage",
    "description",
    "min",
    "max",
    "step",
  ]);

  const rawValue = (): number | undefined => local.value?.();
  const handleRawValueChange = (next: number): void => {
    // Kobalte emits `NaN` when the input is cleared; normalize to `undefined`
    // so callers never have to guard on NaN at the form layer.
    local.onChange?.(Number.isNaN(next) ? undefined : next);
  };

  const isInvalid = () => Boolean(local.errorMessage);
  const step = () => local.step ?? DEFAULT_STEP;

  return (
    <KobalteNumberField
      {...(rest as KobalteNumberFieldRootProps)}
      class="sui-number-input"
      name={local.name}
      rawValue={rawValue()}
      onRawValueChange={handleRawValueChange}
      minValue={local.min}
      maxValue={local.max}
      step={step()}
      validationState={isInvalid() ? "invalid" : "valid"}
    >
      <Show when={local.label}>
        <KobalteNumberField.Label class="sui-number-input__label">
          {local.label}
        </KobalteNumberField.Label>
      </Show>
      <KobalteNumberField.HiddenInput />
      <div class="sui-number-input__group">
        <KobalteNumberField.Input class="sui-number-input__input" />
        <div class="sui-number-input__triggers">
          <KobalteNumberField.IncrementTrigger
            aria-label="Increment"
            class="sui-number-input__trigger sui-number-input__trigger--increment"
          >
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["chevron-up"].outline} />
          </KobalteNumberField.IncrementTrigger>
          <KobalteNumberField.DecrementTrigger
            aria-label="Decrement"
            class="sui-number-input__trigger sui-number-input__trigger--decrement"
          >
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none" innerHTML={ICON_PATHS["chevron-down"].outline} />
          </KobalteNumberField.DecrementTrigger>
        </div>
      </div>
      <Show when={local.errorMessage}>
        <KobalteNumberField.ErrorMessage class="sui-number-input__error">
          {local.errorMessage}
        </KobalteNumberField.ErrorMessage>
      </Show>
      <Show when={local.description && !local.errorMessage}>
        <KobalteNumberField.Description class="sui-number-input__description">
          {local.description}
        </KobalteNumberField.Description>
      </Show>
    </KobalteNumberField>
  );
};
