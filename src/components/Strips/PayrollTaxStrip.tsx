// ============================================
// PayrollTaxStrip — Composite (Depth 2, zero CSS)
// Composes SpacedStack, SpreadRow, TextSublabel, TextValue and NoteText.
// READ-ONLY: employer payroll tax is not optional and not ours to edit, so the
// strip has no inputs. It shows the rate, the payroll base, and the tax per
// pay period and per year of a `PayrollTaxValue` (derive it with
// `derivePayrollTax`; the rules live in `payroll.ts`).
// Factory: createPayrollTaxStrip({}).
// ============================================
import { type Component, mergeProps } from "solid-js";
import { SpacedStack, SpreadRow } from "../Layout/variants";
import { NoteText, TextSublabel, TextValue } from "../Text/variants";
import { type PayrollTaxValue, rateText } from "./payroll";

export interface PayrollTaxStripProps {
  value: PayrollTaxValue;
}

export type PayrollTaxStripOverrides = Pick<PayrollTaxStripProps, never>;
export type PayrollTaxStripDataProps = Omit<PayrollTaxStripProps, never>;

const dollars = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Row: Component<{ title: string; text: string }> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.title}</TextSublabel>
    <TextValue>{props.text}</TextValue>
  </SpreadRow>
);

const PayrollTaxStripBase: Component<PayrollTaxStripProps> = (props) => (
  <SpacedStack>
    <Row title="Employer payroll tax rate" text={rateText(props.value.rateBps)} />
    <Row title="Payroll base (per year)" text={dollars(props.value.baseCents)} />
    <Row title={`Tax per paycheck (÷${props.value.periodsPerYear})`} text={dollars(props.value.perPeriodCents)} />
    <Row title="Tax per year" text={dollars(props.value.perYearCents)} />
    <NoteText>Required and not editable.</NoteText>
  </SpacedStack>
);

export function createPayrollTaxStrip(
  defaults: PayrollTaxStripOverrides,
): Component<PayrollTaxStripDataProps> {
  return (props) => <PayrollTaxStripBase {...mergeProps(defaults, props)} />;
}
