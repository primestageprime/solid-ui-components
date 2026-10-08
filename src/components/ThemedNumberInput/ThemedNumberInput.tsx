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
  createEffect,
  batch,
  createSignal,
  onCleanup,
  splitProps,
  untrack,
} from "solid-js";
import { ICON_PATHS } from "../Icon/Icon";
import {
  INPUT_DEFAULT_WIDTH_MAX,
  fieldWidthForChars,
  numberFieldChars,
  tightNumberWidth,
} from "../../internal/fieldWidth/fieldWidth";
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
  /**
   * The largest value this field is EXPECTED to hold. It sizes the field to
   * that value in the field's own font (the widest formatted text, one digit
   * = 1ch, plus the stepper) and is the default `max` unless `max` is set.
   * Omitted, the field is sized exactly as before. Callers use the curried
   * `CountInput…` / `CurrencyInput…` variants rather than passing this.
   */
  maxValue?: number;
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

/** rem of non-text chrome inside the field: stepper column (~2.5rem) + the
 *  input's left/right padding (12px * 2 = 1.5rem). Same as CurrencyInput's. */
const NUMBER_CHROME_REM = 4;
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
    "maxValue",
    "step",
    "size",
  ]);

  // While the input has focus, the field keeps the text the user types.
  //
  // A caller that feeds its own state back through `value` (onChange → store
  // → value) gave kobalte a new `rawValue` after each key. Kobalte then wrote
  // the FORMATTED amount into the input, with the caret after the cents. From
  // a blank field, "8" became "$8.00" and the next digits went into the cents
  // (thorcasting-ui Import Coverage, 2026-10-08).
  //
  // So while focused, `rawValue` is the caller's value AT FOCUS, and the
  // visible text is `focusText`, a signal this component owns that kobalte's
  // own `onChange` writes. Kobalte stays controlled for the whole focus. An
  // uncontrolled kobalte keeps a private text that is stale after a clear,
  // and a controlled "" without a writer refuses every key.
  //
  // At blur both go back to the caller. A caller value that changed while
  // focused (another control set it) shows then, formatted by kobalte's
  // `rawValue` effect. A blur after a clear shows the caller's value, or a
  // blank when the caller holds nothing.
  const [focused, setFocused] = createSignal(false);
  const [focusValue, setFocusValue] = createSignal<number | undefined>();
  const [focusText, setFocusText] = createSignal("");

  const rawValue = (): number =>
    (focused() ? focusValue() : local.value?.()) ?? NaN;
  const handleRawValueChange = (next: number): void => {
    // Kobalte emits `NaN` when the input is cleared; normalize to `undefined`
    // so callers never have to guard on NaN at the form layer.
    local.onChange?.(Number.isNaN(next) ? undefined : next);
  };

  // The clear is the one transition kobalte cannot make on its own: its
  // `rawValue` effect returns early on `NaN`, so the visible input keeps the
  // old text while the hidden form input empties (dside `sui`#36924). An empty
  // string here reaches the DOM through the controllable signal, which has no
  // such guard.
  //
  // `isCleared` is a signal this component owns, and an effect is the only
  // writer. That indirection is the fix for dside `sui`#36961. Kobalte reads
  // its `value` prop from `createControllableSignal`'s `isControlled` and
  // `value` memos, and its hidden input reads those memos again inside a
  // render effect. 0.156.0 answered `value` by calling `local.value()`
  // directly, so kobalte re-entered the CALLER's accessor from inside its own
  // render effects. A caller that builds its fields in lazy JSX getters — the
  // curried form-field shape — rebuilt the field on that re-entry, and each
  // rebuild emitted again, until the stack was exhausted with
  // `RangeError: Maximum call stack size exceeded`.
  //
  // Reading a plain signal pulls on nothing, so kobalte can read `value` as
  // often as it likes and never reach the caller. The effect, not kobalte,
  // decides when the field is clear.
  const [isCleared, setIsCleared] = createSignal(false);
  createEffect(() => {
    setIsCleared(local.value !== undefined && local.value() === undefined);
  });

  // `undefined` keeps kobalte uncontrolled, which is what 0.155.0 did: it then
  // owns its own formatted text and this component never re-implements Intl.
  //
  // While focused, `focusText` is the text. Every reader that kobalte reaches
  // is still a signal this component owns, so #36961 cannot come back.
  const displayText = (): string | undefined => {
    if (focused()) return focusText();
    return isCleared() ? "" : undefined;
  };

  /** Focus — hold the caller's value and the shown text until blur. */
  const holdOnFocus = (event: FocusEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    batch(() => {
      setFocusValue(untrack(() => local.value?.()));
      setFocusText(input.value);
      setFocused(true);
    });
  };
  /** Blur — give the field back to the caller's value. */
  const releaseOnBlur = (): void => {
    setFocused(false);
  };

  // Kobalte merges a default `maxValue` of `Number.MAX_SAFE_INTEGER`, and its
  // spin-button sends `End` straight to that bound, `Home` to the negative
  // twin. Passing `maxValue={undefined}` does not remove the merged default,
  // so an unbounded field answered `End` with 9007199254740991 where the user
  // asked only for the caret (dside `sui`#36926).
  const max = (): number | undefined => local.max ?? local.maxValue;
  const isUnboundedCaretKey = (key: string): boolean =>
    (key === "End" && max() === undefined) ||
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

  // Focus selects the whole text, so the first keystroke REPLACES the shown
  // value. Left at the caret, typing "550" into a "$0.00" field produced
  // "$0.00550", which rounds to one cent (thorcasting Import Coverage saved
  // -$0.01). This is the default, not a prop: no caller wants to append to a
  // formatted amount.
  //
  // A click needs one more step. The browser finishes a click-to-focus by
  // collapsing the selection to the click point on MOUSEUP, after the focus
  // handler already selected. So a mousedown on an unfocused input arms a
  // one-shot: the mouseup that ends that click is default-prevented and
  // re-selects if the selection was collapsed anyway. A drag-select keeps its
  // own range, and every later click on the focused field places the caret
  // as usual.
  let clickFocusPending = false;
  const armClickFocus = (event: MouseEvent): void => {
    clickFocusPending = document.activeElement !== event.currentTarget;
  };
  const selectAllOnFocus = (event: FocusEvent): void => {
    (event.currentTarget as HTMLInputElement).select();
  };
  const keepFocusSelection = (event: MouseEvent): void => {
    if (!clickFocusPending) return;
    clickFocusPending = false;
    event.preventDefault();
    const input = event.currentTarget as HTMLInputElement;
    if (input.selectionStart === input.selectionEnd) input.select();
  };

  /** Ref callback — attaches the caret guard, the focus hold and
   *  select-on-focus for the life of the input. */
  const wireInput = (input: HTMLInputElement): void => {
    input.addEventListener("keydown", suppressUnboundedJump, true);
    input.addEventListener("mousedown", armClickFocus);
    input.addEventListener("focus", holdOnFocus);
    input.addEventListener("blur", releaseOnBlur);
    input.addEventListener("focus", selectAllOnFocus);
    input.addEventListener("mouseup", keepFocusSelection);
    onCleanup(() => {
      input.removeEventListener("keydown", suppressUnboundedJump, true);
      input.removeEventListener("mousedown", armClickFocus);
      input.removeEventListener("focus", holdOnFocus);
      input.removeEventListener("blur", releaseOnBlur);
      input.removeEventListener("focus", selectAllOnFocus);
      input.removeEventListener("mouseup", keepFocusSelection);
    });
  };

  const isInvalid = () => Boolean(local.errorMessage);
  const step = () => local.step ?? DEFAULT_STEP;
  // The size modifier is always emitted (including `--md`), matching Button and
  // Dropdown, so a theme can hook either size without depending on the absence
  // of a class.
  // A number field NEVER stretches the whole screen (Peter, 2026-09-24). Its
  // width is capped to the widest value it can show — `max`/`min` as the
  // field's own `formatOptions` render them — or, with no `max`, to about one
  // billion. It still shrinks in a narrow column; it only stops growing.
  const widthRem = () =>
    fieldWidthForChars(
      numberFieldChars({
        max: local.max ?? INPUT_DEFAULT_WIDTH_MAX,
        min: local.min,
        step: step(),
        formatOptions: (rest as KobalteNumberFieldRootProps).formatOptions,
      }),
      NUMBER_CHROME_REM,
    );

  // `maxValue` sizes in ch, so the root carries the input's font size.
  const fitted = () => local.maxValue !== undefined;
  const rootClass = () =>
    `sui-number-input sui-number-input--${local.size ?? DEFAULT_SIZE}${fitted() ? " sui-number-input--fit" : ""}`;
  const maxWidth = (): string =>
    fitted()
      ? tightNumberWidth({
          max: local.maxValue as number,
          min: local.min,
          step: step(),
          formatOptions: (rest as KobalteNumberFieldRootProps).formatOptions,
        })
      : `${widthRem()}rem`;

  return (
    <KobalteNumberField
      {...(rest as KobalteNumberFieldRootProps)}
      class={rootClass()}
      style={{ "max-width": maxWidth() }}
      name={local.name}
      value={displayText()}
      onChange={setFocusText}
      rawValue={rawValue()}
      onRawValueChange={handleRawValueChange}
      minValue={local.min}
      maxValue={max()}
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
          ref={wireInput}
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
