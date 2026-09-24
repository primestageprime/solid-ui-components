// lastReviewedAt: 2026-06-22
// ============================================
// CurrencyInput — Curried variant of ThemedNumberInput (Depth 1)
// Owns CSS (CurrencyInput.css); composes the ThemedNumberInput Primitive plus
// the shared fieldWidth util (a data/util import, not a component import).
//
// A money-amount field: ThemedNumberInput's stepper + keyboard semantics with
// USD currency masking and a FIXED width capped to the widest expected value
// so it never stretches to fill its column. The cap is DERIVED, not magic:
// the widest formatted string for `maxValue` (width default $1B) sets the character
// count, and `fieldWidthForChars` turns that into a rem width that also
// reserves room for the stepper column. Tabular figures keep the digits from
// reflowing as you type.
//
//   <CurrencyInput name="amount" value={amt} onChange={setAmt} />   // ≤ $1B wide
//   <CurrencyInput name="fee" maxValue={1_000_000} … />             // narrower cap
//
// All of ThemedNumberInput's API (value accessor, onChange, step, name, label,
// min/max, errorMessage, description) works unchanged — CurrencyInput only
// bakes the currency format + width discipline. Locale is the app's i18n
// default (en-US); the currency CODE is configurable via `currency`.
// ============================================
import { type Component, splitProps } from "solid-js";
import {
  ThemedNumberInput,
  type ThemedNumberInputProps,
} from "../ThemedNumberInput/ThemedNumberInput";
import {
  CURRENCY_DEFAULT_MAX,
  INPUT_DEFAULT_WIDTH_MAX,
  currencyMaxChars,
  fieldWidthForChars,
} from "../../internal/fieldWidth/fieldWidth";
import "./CurrencyInput.css";

/** rem of non-text chrome inside the field: stepper column (~2.5rem) + the
 *  input's left/right padding (12px * 2 = 1.5rem). */
const CURRENCY_CHROME_REM = 4;

export interface CurrencyInputProps
  extends Omit<ThemedNumberInputProps, "formatOptions" | "format"> {
  /**
   * Largest value the field is expected to hold. Drives BOTH the width cap
   * (the widest formatted string for this magnitude) and kobalte's `maxValue`
   * unless `max` is set explicitly. Unset, the field is SIZED for
   * `$1,000,000,000.00` (one billion) but still ACCEPTS up to
   * `$10,000,000,000` — a larger value is rare and allowed to fit tightly.
   */
  maxValue?: number;
  /** ISO-4217 currency code for the masked display. Default `"USD"`. */
  currency?: string;
}

/**
 * Width cap (rem) for a currency field holding up to `maxValue`. Exported so
 * tests and adjacent components (CurrencyCell) share the exact derivation.
 *
 * @example
 *   currencyWidthRem()               // "$1,000,000,000.00" = 17 chars → 14.54rem
 *   currencyWidthRem(10_000_000_000) // "$10,000,000,000.00" = 18 chars → 15.16rem
 */
export function currencyWidthRem(maxValue = INPUT_DEFAULT_WIDTH_MAX): number {
  return fieldWidthForChars(currencyMaxChars(maxValue), CURRENCY_CHROME_REM);
}

export const CurrencyInput: Component<CurrencyInputProps> = (props) => {
  const [local, rest] = splitProps(props, ["maxValue", "currency", "max"]);

  // Sized for one billion unless the caller states a ceiling; the numeric
  // ceiling itself stays ten billion, so a larger amount is tight, not refused.
  const widthRem = () =>
    currencyWidthRem(local.maxValue ?? INPUT_DEFAULT_WIDTH_MAX);
  const maxValue = () => local.maxValue ?? CURRENCY_DEFAULT_MAX;

  // A wrapper owns the width cap: ThemedNumberInput is `flex: 1` and fills the
  // wrapper, so capping the wrapper's width caps the field. Keeping the cap on
  // the wrapper (not threaded through the Primitive's hardcoded class) leaves
  // ThemedNumberInput untouched.
  return (
    <div class="sui-currency-input" style={{ "max-width": `${widthRem()}rem` }}>
      <ThemedNumberInput
        {...(rest as ThemedNumberInputProps)}
        // USD currency masking via kobalte's native Intl formatting.
        formatOptions={{
          style: "currency",
          currency: local.currency ?? "USD",
        }}
        // Default the numeric ceiling to the width ceiling unless overridden.
        max={local.max ?? maxValue()}
      />
    </div>
  );
};
