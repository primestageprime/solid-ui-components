// ============================================
// HourlyWageAmountStrip — Composite (Depth 2, zero CSS)
// Composes CurrencyInput10K, CountInput10K, ChipCluster and NoteText. An
// hourly wage: rate per hour and hours a week, with the derived ESTIMATED
// annual (rate x hours x 52) and the paycheck for the chosen pay cadence
// (`periodsPerYear`, half-even). It edits an engine-neutral `HourlyWageValue`
// in integer cents; the rules live in `payroll.ts`. Overtime is not modelled.
// Factory: createHourlyWageAmountStrip({}).
// ============================================
import { type Component, mergeProps } from "solid-js";
import { CountInput10K } from "../CurrencyInput";
import { ChipCluster } from "../Layout/variants";
import { NoteText } from "../Text/variants";
import { Money } from "./parts";
import {
  type HourlyWageValue,
  HOURS_STEP,
  MAX_HOURS_PER_WEEK,
  hourlyAnnualCents,
  hourlyPaycheckCents,
} from "./payroll";

export interface HourlyWageAmountStripProps {
  value: HourlyWageValue;
  onChange: (value: HourlyWageValue) => void;
  /** Paychecks a year, for the derived paycheck (default 26). */
  periodsPerYear?: number;
}

export type HourlyWageAmountStripOverrides = Pick<HourlyWageAmountStripProps, never>;
export type HourlyWageAmountStripDataProps = Omit<HourlyWageAmountStripProps, never>;

const dollars = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const HourlyWageAmountStripBase: Component<HourlyWageAmountStripProps> = (props) => {
  const periods = () => props.periodsPerYear ?? 26;
  return (
    <ChipCluster>
      <Money
        name="rate"
        label="Rate per hour ($)"
        cents={props.value.rateCents}
        magnitude="10K"
        precision="cents"
        onCents={(rateCents) => props.onChange({ ...props.value, rateCents })}
      />
      <CountInput10K
        name="hours-per-week"
        label="Hours per week"
        min={0}
        step={HOURS_STEP}
        value={() => props.value.hoursPerWeek}
        onChange={(n) => props.onChange({ ...props.value, hoursPerWeek: Math.min(MAX_HOURS_PER_WEEK, Math.max(0, n ?? 0)) })}
      />
      <NoteText>
        {`≈ ${dollars(hourlyAnnualCents(props.value))} a year (rate × hours × 52) = ${dollars(hourlyPaycheckCents(props.value, periods()))} per paycheck (annual ÷ ${periods()})`}
      </NoteText>
    </ChipCluster>
  );
};

export function createHourlyWageAmountStrip(
  defaults: HourlyWageAmountStripOverrides,
): Component<HourlyWageAmountStripDataProps> {
  return (props) => <HourlyWageAmountStripBase {...mergeProps(defaults, props)} />;
}
