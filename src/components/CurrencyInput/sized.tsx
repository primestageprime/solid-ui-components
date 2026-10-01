// lastReviewedAt: 2026-10-01
// ============================================
// Magnitude-sized number inputs — curried variants (Depth 1, zero CSS)
// Composes ThemedNumberInput and CurrencyInput; owns no CSS.
//
// A number field that states how big its value can get is sized to that value
// in its own font (the shared rule, `tightNumberWidth` in
// internal/fieldWidth): the widest formatted text, one digit a character,
// plus the stepper and about one character of slack. These six variants bake
// the ceiling, so a call site never passes `maxValue` and the field is never
// wider than its magnitude needs. Named by the ceiling:
//
//   CountInput100      counts up to 99        (hours, seats added a period)
//   CountInput10K      counts up to 9,999     (seats, units)
//   CurrencyInput10K   money up to $9,999
//   CurrencyInput1M    money up to $999,999
//   CurrencyInput100M  money up to $99,999,999
//   CurrencyInput1B    money up to $1,000,000,000
//
// Cents follow the `step` the caller gives (step 1 or 1000 reads as whole
// dollars or thousands; the mask still shows ".00").
// ============================================
import { type Component, type JSX, mergeProps } from "solid-js";
import {
  ThemedNumberInput,
  type ThemedNumberInputProps,
} from "../ThemedNumberInput/ThemedNumberInput";
import { CurrencyInput, type CurrencyInputProps } from "./CurrencyInput";

const curry = <P extends object>(
  Base: Component<P>,
  defaults: Partial<P>,
): Component<Omit<P, "maxValue">> =>
  ((props: P): JSX.Element =>
    Base(mergeProps(defaults, props) as P)) as Component<Omit<P, "maxValue">>;

/** Counts up to 99. */
export const CountInput100 = curry<ThemedNumberInputProps>(ThemedNumberInput, {
  maxValue: 99,
  size: "sm",
});

/** Counts up to 9,999. */
export const CountInput10K = curry<ThemedNumberInputProps>(ThemedNumberInput, {
  maxValue: 9_999,
  size: "sm",
});

/** Money up to $9,999. */
export const CurrencyInput10K = curry<CurrencyInputProps>(CurrencyInput, {
  maxValue: 9_999,
});

/** Money up to $999,999. */
export const CurrencyInput1M = curry<CurrencyInputProps>(CurrencyInput, {
  maxValue: 999_999,
});

/** Money up to $99,999,999. */
export const CurrencyInput100M = curry<CurrencyInputProps>(CurrencyInput, {
  maxValue: 99_999_999,
});

/** Money up to $1,000,000,000. */
export const CurrencyInput1B = curry<CurrencyInputProps>(CurrencyInput, {
  maxValue: 1_000_000_000,
});
