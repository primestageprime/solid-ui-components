// ============================================
// BigNumberInput — Atomic (Depth 1)
// Owns CSS (BigNumberInput.css), no component imports.
// An editable numeric input rendered at a LARGE font (the
// size of a `Text variant="value"` headline). Used to edit
// a money amount in place.
//
// CURRENCY MASKING (default): the displayed text is masked as
// localized currency via Intl.NumberFormat while the VALUE stays
// a raw `number`. Symbol, grouping separators, decimal mark and
// symbol position are all locale-driven presentation — they are
// NEVER part of the value and `onChange` always emits the parsed
// raw `number`.
//   <BigNumberInput value={800} onChange={(n) => ...} />   // → "$800.00"
//   <BigNumberInput value={-800} ... />                    // → "-$800.00"
//   <BigNumberInput value={1234.5} locale="de-DE"          // → "1.234,50 €"
//                   currency="EUR" ... />
//
// Format-on-blur: while FOCUSED the input shows the bare editable
// number (no grouping) so the caret doesn't jump as you type; on
// BLUR it reformats to the masked currency string.
//
// Controlled + loop-free: a local string buffer mirrors the input
// text and only re-syncs from `value` when the parsed number
// actually differs, so typing never fights the prop.
// Factory: createBigNumberInput() for curried variants.
//
// The pre-Intl `prefix`/`sign` static-glyph props were pruned
// 2026-07-15 — unused by every production consumer; currency masking
// supersedes them.
// ============================================
import {
  type Component,
  type JSX,
  createSignal,
  createEffect,
  mergeProps,
  splitProps,
} from "solid-js";
import "./BigNumberInput.css";

export interface BigNumberInputProps
  extends Omit<
    JSX.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  /** Current numeric value (controlled). */
  value: number;
  /** Called with the parsed raw `number` whenever the input changes. */
  onChange: (n: number) => void;
  /**
   * BCP-47 locale used to mask the displayed value as currency.
   * Default `"en-US"`. Drives the symbol position, grouping
   * separator and decimal mark.
   */
  locale?: string;
  /**
   * ISO-4217 currency code used for the masked display.
   * Default `"USD"`.
   */
  currency?: string;
  /** Text alignment of the number. Default "left". */
  align?: "left" | "right";
  /**
   * Select the entire contents when the input receives focus, so the
   * user can immediately type a replacement value. Default `true`.
   * The select is DEFERRED to the next frame because browsers move the
   * caret to the end after a synchronous focus-time `select()`. Set
   * `false` to opt out of select-on-focus.
   */
  selectOnFocus?: boolean;
}

/**
 * Parse the editable buffer to a number leniently: keep only digits, a
 * single decimal point and a leading minus, then `Number()` it. Empty /
 * partial (`""`, `"-"`, `"."`) → 0.
 */
function parse(raw: string): number {
  // Strip everything except digits, dot and minus.
  let cleaned = raw.replace(/[^0-9.-]/g, "");
  // Keep only a leading minus.
  const negative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "");
  // Keep only the first decimal point.
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  if (negative) cleaned = `-${cleaned}`;
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** The bare, editable representation of a number (no grouping). */
function bare(value: number): string {
  return String(value);
}

/** Mask a number as localized currency text. */
function mask(value: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    // Invalid locale/currency → fall back to the bare number.
    return bare(value);
  }
}

export const BigNumberInput: Component<BigNumberInputProps> = (props) => {
  const merged = mergeProps(
    { selectOnFocus: true, locale: "en-US", currency: "USD" },
    props,
  );
  const [local, others] = splitProps(merged, [
    "value",
    "onChange",
    "locale",
    "currency",
    "align",
    "class",
    "selectOnFocus",
    "onFocus",
    "onBlur",
  ]);

  let inputEl: HTMLInputElement | undefined;
  const [focused, setFocused] = createSignal(false);

  // Local editable buffer (always the BARE number while editing).
  const [text, setText] = createSignal(bare(local.value));

  // Re-sync the buffer from `value` ONLY when the prop's numeric value
  // diverges from what the buffer currently represents. This keeps the
  // component controlled without clobbering in-progress edits (e.g. a
  // trailing "." or "-0") and avoids a typing<->prop feedback loop.
  createEffect(() => {
    const incoming = local.value;
    if (parse(text()) !== incoming) {
      setText(bare(incoming));
    }
  });

  // What the input displays: bare number while focused (so the caret
  // never jumps mid-edit), masked currency once blurred.
  const display = () =>
    focused() ? text() : mask(local.value, local.locale, local.currency);

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const raw = e.currentTarget.value;
    setText(raw);
    local.onChange(parse(raw));
  };

  // On focus: switch to the bare editable number and (default) select it
  // all so the user can type a replacement immediately. The select is
  // DEFERRED to the next frame — a synchronous focus-time `select()` is
  // overridden by the browser, which drops the caret at the end.
  const handleFocus: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = (
    e,
  ) => {
    setFocused(true);
    // Ensure the editable buffer reflects the current value.
    setText(bare(local.value));
    if (local.selectOnFocus) {
      const el = e.currentTarget;
      requestAnimationFrame(() => el.select());
    }
    const consumerOnFocus = local.onFocus;
    if (typeof consumerOnFocus === "function") {
      consumerOnFocus(e);
    } else if (Array.isArray(consumerOnFocus)) {
      consumerOnFocus[0](consumerOnFocus[1], e);
    }
  };

  // On blur: drop back to the masked currency representation.
  const handleBlur: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = (
    e,
  ) => {
    setFocused(false);
    const consumerOnBlur = local.onBlur;
    if (typeof consumerOnBlur === "function") {
      consumerOnBlur(e);
    } else if (Array.isArray(consumerOnBlur)) {
      consumerOnBlur[0](consumerOnBlur[1], e);
    }
  };

  const rootClass = () =>
    local.class ? `sui-big-number ${local.class}` : "sui-big-number";

  return (
    <div class={rootClass()}>
      <input
        ref={inputEl}
        type="text"
        inputmode="decimal"
        class="sui-big-number__input"
        classList={{
          "sui-big-number__input--right": local.align === "right",
        }}
        value={display()}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...others}
      />
    </div>
  );
};

export function createBigNumberInput(
  defaults: Partial<BigNumberInputProps>,
): Component<BigNumberInputProps> {
  return (props) => <BigNumberInput {...mergeProps(defaults, props)} />;
}
