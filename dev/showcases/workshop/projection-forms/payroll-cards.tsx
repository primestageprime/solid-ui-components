// Bench-local: the Hourly employee card and the read-only payroll-tax panel.
import { type Component, createSignal } from "solid-js";
import {
  CardSurface,
  CodeBlock,
  CompactCurrencyMutationSliders,
  NoteText,
  SpacedStack,
  TextLabel,
  TextSublabel,
  TightStack,
} from "../../../../src";
import {
  LabelStrip,
  PERIODS_PER_YEAR,
  PayCadenceStrip,
  PayrollTaxStrip,
  StartWindowStrip,
  derivePayrollTax,
  hourlyAnnualCents,
  setHourlyAnnualCents,
  HourlyWageAmountStrip,
} from "../../../../src/components/Strips";
import { prettyJson } from "../projection-forms.adapter";
import { HOURLY_VALUES, type HourlyValues, PAYROLL_TAX_BPS, hourlyWageJson } from "../projection-forms.payroll";
import { LabeledField as Labeled } from "./kit";
import { ReadOnly, ScenarioFrame } from "./strips-ui";

/** The employer tax on the given payroll lines, read-only. */
export const PayrollTaxPanel: Component<{ lineAnnualCents: number[]; periodsPerYear: number }> = (props) => (
  <CardSurface>
    <SpacedStack>
      <TextSublabel>Payroll tax (derived from the payroll lines; not editable)</TextSublabel>
      <PayrollTaxStrip value={derivePayrollTax(props.lineAnnualCents, PAYROLL_TAX_BPS, props.periodsPerYear)} />
    </SpacedStack>
  </CardSurface>
);

export const HourlyEmployeeCard: Component<{ mode: string }> = (props) => {
  const [values, setValues] = createSignal<HourlyValues>(HOURLY_VALUES);
  const patch = (next: Partial<HourlyValues>) => setValues({ ...values(), ...next });
  const periods = () => PERIODS_PER_YEAR[values().cadence.shape];
  const annual = () => hourlyAnnualCents(values().wage);
  return (
    <CardSurface>
      <SpacedStack>
        <TightStack>
          <TextLabel>Hourly employee</TextLabel>
          <TextSublabel>Recipe: Rate x hours a week + Bi-weekly|Semi-monthly|Monthly + start</TextSublabel>
          <TextSublabel>Direction: expense (fixed by kind) · kind: hourly_wage (proposed)</TextSublabel>
        </TightStack>
        <NoteText>
          Lands in Payroll beside salary. The engine has no hourly-wage kind yet, so the JSON is a proposal.
          The scenario slider is the estimated annual; moving it scales hours and keeps the rate.
        </NoteText>
        {props.mode === "minimal" ? (
          <SpacedStack>
            <LabelStrip value={values().label} onChange={(label) => patch({ label })} />
            <Labeled label="2. Amount">
              <HourlyWageAmountStrip
                value={values().wage}
                periodsPerYear={periods()}
                onChange={(wage) => patch({ wage })}
              />
            </Labeled>
            <Labeled label="3. Cadence">
              <PayCadenceStrip value={values().cadence} onChange={(cadence) => patch({ cadence })} />
            </Labeled>
            <Labeled label="4. Window">
              <StartWindowStrip value={values().window} onChange={(window) => patch({ window })} />
            </Labeled>
          </SpacedStack>
        ) : (
          <ScenarioFrame title={values().label}>
            <CompactCurrencyMutationSliders
              entities={[
                {
                  id: "annual",
                  label: "Estimated annual",
                  old: hourlyAnnualCents(HOURLY_VALUES.wage) / 100,
                  value: annual() / 100,
                  range: [0, 300_000],
                },
              ]}
              onChange={(_id, dollars) =>
                patch({ wage: setHourlyAnnualCents(values().wage, Math.round(dollars * 100)) })
              }
            />
            <ReadOnly title="Rate per hour" text={`$${(values().wage.rateCents / 100).toFixed(2)}`} />
            <ReadOnly title="Hours per week" text={`${values().wage.hoursPerWeek}`} />
          </ScenarioFrame>
        )}
        <CodeBlock>{prettyJson(hourlyWageJson(values()))}</CodeBlock>
        <PayrollTaxPanel lineAnnualCents={[annual()]} periodsPerYear={periods()} />
      </SpacedStack>
    </CardSurface>
  );
};
