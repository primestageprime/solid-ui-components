// Bench-local: the catalog entries for the two payroll strips.
import { type Component, createSignal } from "solid-js";
import { CardSurface, CodeBlock, SpacedStack, TextLabel, TextSublabel } from "../../../../src";
import {
  type HourlyWageValue,
  HourlyWageAmountStrip,
  PayrollTaxStrip,
  derivePayrollTax,
} from "../../../../src/components/Strips";
import { prettyJson } from "../projection-forms.adapter";
import { HOURLY_START, PAYROLL_TAX_BPS, hourlyWageJson, HOURLY_VALUES } from "../projection-forms.payroll";

const HourlyCatalogCard: Component = () => {
  const [wage, setWage] = createSignal<HourlyWageValue>(HOURLY_START);
  return (
    <CardSurface>
      <SpacedStack>
        <TextLabel>Hourly wage: rate x hours (shows the estimated annual and each paycheck)</TextLabel>
        <HourlyWageAmountStrip value={wage()} onChange={setWage} periodsPerYear={26} />
        <TextSublabel>Strip value (engine-neutral)</TextSublabel>
        <CodeBlock>{prettyJson(wage())}</CodeBlock>
        <TextSublabel>Thorcasting adapter writes (proposed kind)</TextSublabel>
        <CodeBlock>{prettyJson(hourlyWageJson({ ...HOURLY_VALUES, wage: wage() }))}</CodeBlock>
      </SpacedStack>
    </CardSurface>
  );
};

const TAX_VALUE = derivePayrollTax([10_289_110, 9_360_000], PAYROLL_TAX_BPS, 26);

const TaxCatalogCard: Component = () => (
  <CardSurface>
    <SpacedStack>
      <TextLabel>Payroll tax: read-only, derived from two payroll lines (a salary and an hourly wage)</TextLabel>
      <PayrollTaxStrip value={TAX_VALUE} />
      <TextSublabel>Strip value (engine-neutral, derived)</TextSublabel>
      <CodeBlock>{prettyJson(TAX_VALUE)}</CodeBlock>
    </SpacedStack>
  </CardSurface>
);

export const CatalogPayrollCards: Component = () => (
  <SpacedStack>
    <TextLabel>5. Payroll strips</TextLabel>
    <HourlyCatalogCard />
    <TaxCatalogCard />
  </SpacedStack>
);
