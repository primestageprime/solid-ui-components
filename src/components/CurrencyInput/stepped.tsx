// lastReviewedAt: 2026-11-06
// ============================================
// Scale-stepped money inputs — curried variants (Depth 1, zero CSS)
// Tags: shows:field, shows:money, does:type, does:edit, data:scalar, role:control
// Composes CurrencyInput; owns no CSS.
//
// What ↑/↓ and ▲▼ do in a money field, at the scale of the money (Peter,
// 2026-11-06). Each variant bakes a `stepFor`, so the arrows move by whole
// dollars or more and never make a stray one-cent edit. Shift (key or click)
// moves 10×. Typing cents still works in every variant: the step governs only
// the arrows, and the field keeps its width.
//
//   CurrencyInputByOnes       ↑ $1      Shift $10
//   CurrencyInputByTens       ↑ $10     Shift $100
//   CurrencyInputByHundreds   ↑ $100    Shift $1,000
//   CurrencyInputByThousands  ↑ $1,000  Shift $10,000
//   CurrencyInputByScale      ↑ stepForAmount(the current value), or of
//                             `scaleOf` when given (e.g. the field's max)
//
//   <CurrencyInputByScale name="rent" value={rent} onChange={setRent} />
//   <CurrencyInputByScale name="cap" scaleOf={40_000} … />  // always $1,000
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import { CurrencyInput, type CurrencyInputProps } from "./CurrencyInput";
import { moneyStepFor, stepForAmount } from "./moneyStep";

const fixedStep =
  (dollars: number): CurrencyInputProps["stepFor"] =>
  () =>
    dollars;

const curryStep = (dollars: number): Component<CurrencyInputProps> =>
  (props: CurrencyInputProps): JSX.Element =>
    CurrencyInput(mergeProps({ stepFor: fixedStep(dollars) }, props));

/** Money whose arrows move $1 (Shift $10). */
export const CurrencyInputByOnes = curryStep(1);
/** Money whose arrows move $10 (Shift $100). */
export const CurrencyInputByTens = curryStep(10);
/** Money whose arrows move $100 (Shift $1,000). */
export const CurrencyInputByHundreds = curryStep(100);
/** Money whose arrows move $1,000 (Shift $10,000). */
export const CurrencyInputByThousands = curryStep(1_000);

export interface CurrencyInputByScaleProps extends CurrencyInputProps {
  /**
   * An amount, in dollars, whose scale fixes the step — typically the
   * field's max or a typical value. Unset, the step follows the CURRENT value
   * (`moneyStepFor`), symmetric at every boundary.
   */
  scaleOf?: number;
}

/** Money whose arrows move at the scale of the amount (see `stepForAmount`). */
export const CurrencyInputByScale: Component<CurrencyInputByScaleProps> = (
  props,
) => {
  const [local, rest] = splitProps(props, ["scaleOf"]);
  const stepFor: CurrencyInputProps["stepFor"] = (value, direction) =>
    local.scaleOf === undefined
      ? moneyStepFor(value, direction)
      : stepForAmount(Math.round(local.scaleOf * 100)) / 100;
  return CurrencyInput(mergeProps({ stepFor }, rest));
};
