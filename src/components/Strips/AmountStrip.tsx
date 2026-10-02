// ============================================
// AmountStrip — Composite (Depth 2, zero CSS)
// Composes CurrencyInput10K/1M/100M/1B, CountInput100/10K, SegmentedInput and
// ChipCluster. How much: one component, three value shapes.
//   single  an amount, per payment or per year (shows the derived payment)
//   range   min / typical / max, kept ordered by `setAmountRangeField`
//   units   units x unit price, with units added each period
// It edits an engine-neutral `AmountValue` in integer cents and lays out
// horizontally, wrapping when the row is full. The rules (`values.ts`) are pure.
// Factory: createAmountStrip({ magnitude, precision, unit }).
// ============================================
import { type Component, Match, Show, Switch, mergeProps } from "solid-js";
import { CountInput100, CountInput10K } from "../CurrencyInput";
import { ChipCluster } from "../Layout/variants";
import { SegmentedInput } from "../SegmentedInput";
import { NoteText } from "../Text/variants";
import { Labeled, type Magnitude, Money, type Precision } from "./parts";
import {
  type AmountValue,
  paymentCents,
  setAmountRangeField,
} from "./values";

export interface AmountStripProps {
  value: AmountValue;
  onChange: (value: AmountValue) => void;
  /** Payments a year, for a per-year single amount's derived payment. */
  periodsPerYear?: number;
  /** The largest figure expected: sizes each money field (default "1M"). */
  magnitude?: Magnitude;
  /** The step of each money field (default "dollars"). */
  precision?: Precision;
  /** What a units amount counts (default "seats"). */
  unit?: "seats" | "hours" | "units";
  /** Show the "+ per period" field of a seats / units amount (default true).
   *  Turn it off when a GrowthStrip owns growth; `perPeriod` stays in the value. */
  perPeriod?: boolean;
}

export type AmountStripOverrides = Pick<AmountStripProps, "magnitude" | "precision" | "unit" | "perPeriod">;
export type AmountStripDataProps = Omit<AmountStripProps, keyof AmountStripOverrides>;

const PER_OPTIONS = [
  { id: "payment", label: "Per payment" },
  { id: "year", label: "Per year" },
];

const dollars = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AmountStripBase: Component<AmountStripProps> = (props) => {
  const magnitude = (): Magnitude => props.magnitude ?? "1M";
  const precision = (): Precision => props.precision ?? "dollars";
  const periods = () => props.periodsPerYear ?? 1;
  const single = () => props.value.kind === "single" ? props.value : undefined;
  const range = () => props.value.kind === "range" ? props.value : undefined;
  const units = () => props.value.kind === "units" ? props.value : undefined;
  return (
    <Switch>
      <Match when={single()}>
        {(v) => (
          <ChipCluster>
            <Money
              name="amount"
              label={v().per === "year" ? "Per year ($)" : "Per payment ($)"}
              cents={v().cents}
              magnitude={magnitude()}
              precision={precision()}
              onCents={(cents) => props.onChange({ ...v(), cents })}
            />
            <Labeled label="Per">
              <SegmentedInput
                options={PER_OPTIONS}
                value={v().per}
                onChange={(per) => props.onChange({ ...v(), per: per as "payment" | "year" })}
              />
            </Labeled>
            <Show when={v().per === "year"}>
              <NoteText>
                {`= ${dollars(paymentCents(v(), periods()))} per payment (annual ÷ ${periods()})`}
              </NoteText>
            </Show>
          </ChipCluster>
        )}
      </Match>
      <Match when={range()}>
        {(v) => (
          <ChipCluster>
            <Money name="min" label="Min ($)" cents={v().min} magnitude={magnitude()} precision={precision()}
              onCents={(c) => props.onChange(setAmountRangeField(v(), "min", c))} />
            <Money name="typical" label="Typical ($)" cents={v().typical} magnitude={magnitude()} precision={precision()}
              onCents={(c) => props.onChange(setAmountRangeField(v(), "typical", c))} />
            <Money name="max" label="Max ($)" cents={v().max} magnitude={magnitude()} precision={precision()}
              onCents={(c) => props.onChange(setAmountRangeField(v(), "max", c))} />
          </ChipCluster>
        )}
      </Match>
      <Match when={units()}>
        {(v) => (
          <ChipCluster>
            <CountInput10K
              name="units"
              label={props.unit === "hours" ? "Hours" : props.unit === "units" ? "Units" : "Seats"}
              min={0}
              step={props.unit === "hours" ? 0.25 : 1}
              value={() => v().units}
              onChange={(n) => props.onChange({ ...v(), units: n ?? 0 })}
            />
            <Show when={props.unit !== "hours" && props.perPeriod !== false}>
              <CountInput100
                name="per-period"
                label="+ per period"
                value={() => v().perPeriod}
                onChange={(n) => props.onChange({ ...v(), perPeriod: n ?? 0 })}
              />
            </Show>
            <Money
              name="unit-price"
              label={
                props.unit === "hours"
                  ? "Rate per hour ($)"
                  : props.unit === "units"
                    ? "Price per unit ($)"
                    : "Price per seat ($)"
              }
              cents={v().unitPrice}
              magnitude="10K"
              precision={precision()}
              onCents={(unitPrice) => props.onChange({ ...v(), unitPrice })}
            />
          </ChipCluster>
        )}
      </Match>
    </Switch>
  );
};

export function createAmountStrip(
  defaults: AmountStripOverrides,
): Component<AmountStripDataProps> {
  return (props) => <AmountStripBase {...mergeProps(defaults, props)} />;
}
