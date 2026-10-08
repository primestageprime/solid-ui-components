import { type Component, createSignal } from "solid-js";
import {
  type HourlyWageValue,
  HourlyWageAmountStrip,
  PayrollTaxStrip,
  derivePayrollTax,
} from "../../src/components/Strips";
import { CodeBlock } from "../../src/components/CodeBlock";
import { SpacedStack } from "../../src/components/Layout/variants";

const show = (value: unknown): string => JSON.stringify(value, null, 2);

const PAYROLL_TAX_BPS = 765;
const TAX_VALUE = derivePayrollTax([10_289_110, 9_360_000], PAYROLL_TAX_BPS, 26);

export const PayrollStripsShowcase: Component = () => {
  const [wage, setWage] = createSignal<HourlyWageValue>({ rateCents: 4_500, hoursPerWeek: 40 });
  return (
    <SpacedStack>
      <HourlyWageAmountStrip value={wage()} onChange={setWage} periodsPerYear={26} />
      <CodeBlock>{show(wage())}</CodeBlock>
      <PayrollTaxStrip value={TAX_VALUE} />
      <CodeBlock>{show(TAX_VALUE)}</CodeBlock>
    </SpacedStack>
  );
};
