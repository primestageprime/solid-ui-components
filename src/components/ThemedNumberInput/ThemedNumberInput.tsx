// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
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
  createSignal,
  onCleanup,
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
  /**
   * Field size (default `"md"`). `"sm"` is the toolbar size — a 29px-tall
   * field that lines up with `Button size="sm"` and `Dropdown size="sm"` in a
   * dense row. The default 43px field is the tallest control in the family, so
   * without this a number input sets the height of any row it sits in
   * (dside `sui`#12583).
   */
  size?: "sm" | "md";
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
const DEFAULT_SIZE = "md";

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
 *
 *   // Toolbar size — 29px tall, lines up with <Button size="sm" />
 *   <ThemedNumberInput name="y-max" size="sm" value={yMax} onChange={setYMax} />
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
    "size",
  ]);

  const rawValue = (): number => local.value?.() ?? NaN;
  const handleRawValueChange = (next: number): void => {
    // Kobalte emits `NaN` when the input is cleared; normalize to `undefined`
    // so callers never have to guard on NaN at the form layer.
    local.onChange?.(Number.isNaN(next) ? undefined : next);
  };

  // Mirror of the display string kobalte last emitted. Kobalte owns the
  // formatting, so this component never re-implements Intl — it only keeps a
  // copy of the result and hands it straight back as the controlled `value`.
  const [kobalteText, setKobalteText] = createSignal<string | undefined>(
    undefined,
  );

  // The clear is the one transition kobalte cannot make on its own: its
  // `rawValue` effect returns early on `NaN`, so the visible input keeps the
  // old text while the hidden form input empties (dside `sui`#36924). An empty
  // string here reaches the DOM through the controllable signal, which has no
  // such guard. `undefined` keeps kobalte uncontrolled until it emits, so the
  // first paint and the default value stay exactly as before.
  const displayText = (): string | undefined =>
    local.value !== undefined && local.value() === undefined
      ? ""
      : kobalteText();

  // Kobalte merges a default `maxValue` of `Number.MAX_SAFE_INTEGER`, and its
  // spin-button sends `End` straight to that bound, `Home` to the negative
  // twin. Passing `maxValue={undefined}` does not remove the merged default,
  // so an unbounded field answered `End` with 9007199254740991 where the user
  // asked only for the caret (dside `sui`#36926).
  const isUnboundedCaretKey = (key: string): boolean =>
    (key === "End" && local.max === undefined) ||
    (key === "Home" && local.min === undefined);

  // The guard cannot be an `onKeyDown` prop: kobalte reads that prop *instead
  // of* its own spin-button handler, which would also kill the jump on a field
  // that does declare bounds. Solid delegates `keydown` to the document, so a
  // capture listener on the input runs first and can keep the key from ever
  // reaching kobalte. `preventDefault` is never called — the browser still has
  // to move the caret.
  const suppressUnboundedJump = (event: KeyboardEvent): void => {
    if (isUnboundedCaretKey(event.key)) event.stopPropagation();
  };

  /** Ref callback — attaches the caret guard for the life of the input. */
  const guardCaretKeys = (input: HTMLInputElement): void => {
    input.addEventListener("keydown", suppressUnboundedJump, true);
    onCleanup(() =>
      input.removeEventListener("keydown", suppressUnboundedJump, true),
    );
  };

  const isInvalid = () => Boolean(local.errorMessage);
  const step = () => local.step ?? DEFAULT_STEP;
  // The size modifier is always emitted (including `--md`), matching Button and
  // Dropdown, so a theme can hook either size without depending on the absence
  // of a class.
  const rootClass = () =>
    `sui-number-input sui-number-input--${local.size ?? DEFAULT_SIZE}`;

  return (
    <KobalteNumberField
      {...(rest as KobalteNumberFieldRootProps)}
      class={rootClass()}
      name={local.name}
      value={displayText()}
      onChange={(next: string) => setKobalteText(next)}
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
        <KobalteNumberField.Input
          class="sui-number-input__input"
          ref={guardCaretKeys}
        />
        <div class="sui-number-input__triggers">
          <KobalteNumberField.IncrementTrigger
            aria-label="Increment"
            class="sui-number-input__trigger sui-number-input__trigger--increment"
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="none"
              innerHTML={ICON_PATHS["chevron-up"].outline}
            />
          </KobalteNumberField.IncrementTrigger>
          <KobalteNumberField.DecrementTrigger
            aria-label="Decrement"
            class="sui-number-input__trigger sui-number-input__trigger--decrement"
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 16 16"
              fill="none"
              innerHTML={ICON_PATHS["chevron-down"].outline}
            />
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
