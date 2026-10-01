// ============================================
// Strips — shared parts (Composite, Depth 2, zero CSS)
// Internal to the Strips folder; not exported from the barrel.
// ============================================
import type { Component, JSX } from "solid-js";
import { CurrencyInput10K, CurrencyInput100M, CurrencyInput1B, CurrencyInput1M } from "../CurrencyInput";
import { SpacedStack, TightStack } from "../Layout/variants";
import { TextSublabel } from "../Text/variants";
import { PopoverTooltip } from "../Tooltip";

/** A label over a control. */
export const Labeled: Component<{ label: string; children: JSX.Element }> = (props) => (
  <TightStack>
    <TextSublabel>{props.label}</TextSublabel>
    {props.children}
  </TightStack>
);

/** A compact value that opens its selector in a popover when clicked. */
export const Anchor: Component<{ value: string; children: JSX.Element }> = (props) => (
  <PopoverTooltip content={<SpacedStack>{props.children}</SpacedStack>}>
    {props.value}
  </PopoverTooltip>
);

/** The largest figure a money input is sized for; each is a curried
 *  `CurrencyInput` variant. */
export type Magnitude = "10K" | "1M" | "100M" | "1B";

/** How precise a money figure is: the step of its input. */
export type Precision = "cents" | "dollars" | "thousands";

export const PRECISION_STEP: Record<Precision, number> = {
  cents: 0.01,
  dollars: 1,
  thousands: 1000,
};

const MONEY = {
  "10K": CurrencyInput10K,
  "1M": CurrencyInput1M,
  "100M": CurrencyInput100M,
  "1B": CurrencyInput1B,
} as const;

/** A money field in dollars over a value in cents, sized to `magnitude`. */
export const Money: Component<{
  name: string;
  label: string;
  cents: number;
  magnitude: Magnitude;
  precision: Precision;
  onCents: (cents: number) => void;
}> = (props) => {
  const Field = MONEY[props.magnitude];
  return (
    <Field
      name={props.name}
      label={props.label}
      step={PRECISION_STEP[props.precision]}
      value={() => props.cents / 100}
      onChange={(dollars) => props.onCents(Math.round((dollars ?? 0) * 100))}
    />
  );
};
