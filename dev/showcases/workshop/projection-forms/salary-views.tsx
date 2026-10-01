import { type Accessor, type Component, Show, createSignal } from "solid-js";
import {
  AccentPanel,
  CompactCurrencyMutationSliders,
  CurrencyInput,
  DatePicker,
  DayOfMonthPicker,
  FormComposite,
  NameInput,
  NoteText,
  SegmentedInput,
  SpacedStack,
  SpreadRow,
  TextLabel,
  TextSublabel,
  TextTitle,
  TextValue,
} from "../../../../src";
import {
  PAYCHECK_HISTORY,
  PEOPLE,
  SALARY_DEFAULTS,
  defaultsFromPaychecks,
  formatCents,
  perPaycheckCents,
} from "../projection-forms.fixtures";
import {
  type PayCadence,
  type SalaryValues,
  landsIn,
  lineText,
  loweredText,
  salaryEmission,
} from "../projection-forms.lines";
import { KindOutput, LabeledField } from "./kit";
import { VIEW_OPTIONS } from "./license-views";

export { VIEW_OPTIONS };

const HISTORY = defaultsFromPaychecks(PAYCHECK_HISTORY);

const START: SalaryValues = {
  ...SALARY_DEFAULTS,
  personId: HISTORY.person.value.id,
  annualDollars: HISTORY.annualDollars.value,
  cadence: HISTORY.cadence.value,
  referenceDate: HISTORY.referenceDate.value,
  start: HISTORY.referenceDate.value,
};

const CADENCE_OPTIONS = [
  { id: "biweekly", label: "Bi-weekly" },
  { id: "monthly", label: "Monthly" },
];
const PEOPLE_OPTIONS = PEOPLE.map((p) => ({ id: p.id, label: p.name }));

interface Fields {
  values: Accessor<SalaryValues>;
  patch: (next: Partial<SalaryValues>) => void;
}

const nameOf = (id: string): string => PEOPLE.find((p) => p.id === id)?.name ?? id;

/** The cadence's date control: a reference payday, or the day of the month. */
const ScheduleFields: Component<Fields> = (props) => (
  <Show
    when={props.values().cadence === "biweekly"}
    fallback={
      <LabeledField label="Day of month">
        <DayOfMonthPicker
          max={28}
          value={props.values().day}
          onChange={(day) => props.patch({ day })}
        />
      </LabeledField>
    }
  >
    <LabeledField label="Reference payday">
      <DatePicker
        value={props.values().referenceDate}
        onChange={(referenceDate) => props.patch({ referenceDate })}
      />
    </LabeledField>
  </Show>
);

// MINIMAL: person, annual salary, cadence and reference payday, each defaulted
// from past paychecks. Every other field is assumed and visible in the JSON.
const MinimalFields: Component<Fields> = (props) => {
  const v = () => props.values();
  return (
    <SpacedStack>
      <NoteText>Defaults come from this person's past paychecks; every other field is assumed.</NoteText>
      <LabeledField label="Person">
        <TextValue>{nameOf(v().personId)}</TextValue>
      </LabeledField>
      <NoteText>{HISTORY.person.caption}</NoteText>
      <CurrencyInput
        name="annual"
        label="Annual salary ($)"
        step={0.01}
        value={() => v().annualDollars}
        onChange={(annualDollars) => props.patch({ annualDollars: annualDollars ?? 0 })}
      />
      <NoteText>{HISTORY.annualDollars.caption}</NoteText>
      <LabeledField label="Cadence">
        <SegmentedInput
          options={CADENCE_OPTIONS}
          value={v().cadence}
          onChange={(id) => props.patch({ cadence: id as PayCadence })}
        />
      </LabeledField>
      <NoteText>{HISTORY.cadence.caption}</NoteText>
      <ScheduleFields {...props} />
      <NoteText>{HISTORY.referenceDate.caption}</NoteText>
    </SpacedStack>
  );
};

// FULL: every field of the SalaryLine this form states.
const FullFields: Component<Fields> = (props) => {
  const v = () => props.values();
  return (
    <FormComposite
      identity={
        <SpacedStack>
          <LabeledField label="Person" help="People live in the tree; the line names one by id.">
            <SegmentedInput
              options={PEOPLE_OPTIONS}
              value={v().personId}
              onChange={(personId) => props.patch({ personId })}
            />
          </LabeledField>
          <NameInput
            label="Paid from account"
            value={v().paidFrom}
            onInput={(e) => props.patch({ paidFrom: e.currentTarget.value })}
          />
          <CurrencyInput
            name="annual"
            label="Annual salary ($)"
            step={0.01}
            value={() => v().annualDollars}
            onChange={(annualDollars) => props.patch({ annualDollars: annualDollars ?? 0 })}
          />
        </SpacedStack>
      }
      schedule={
        <SpacedStack>
          <LabeledField label="Cadence">
            <SegmentedInput
              options={CADENCE_OPTIONS}
              value={v().cadence}
              onChange={(id) => props.patch({ cadence: id as PayCadence })}
            />
          </LabeledField>
          <ScheduleFields {...props} />
          <LabeledField label="Start">
            <DatePicker value={v().start} onChange={(start) => props.patch({ start })} />
          </LabeledField>
          <LabeledField label="Until (optional, exclusive)">
            <DatePicker value={v().until} onChange={(until) => props.patch({ until })} />
          </LabeledField>
        </SpacedStack>
      }
    />
  );
};

// SCENARIO: the Payroll builder's card for one person (thorcasting-ui
// payrollSimulatorScreen.tsx): the person, what a paycheck is, and the
// builder's compact-currency dial for the annual figure.
const ScenarioCard: Component<Fields> = (props) => {
  const v = () => props.values();
  return (
    <AccentPanel>
      <SpacedStack>
        <SpreadRow>
          <SpacedStack>
            <TextTitle>{nameOf(v().personId)}</TextTitle>
            <TextSublabel>{v().cadence === "biweekly" ? "bi-weekly" : "monthly"}</TextSublabel>
          </SpacedStack>
          <SpacedStack>
            <TextLabel>A paycheck</TextLabel>
            <TextValue>{formatCents(perPaycheckCents(v().annualDollars))}</TextValue>
          </SpacedStack>
        </SpreadRow>
        <CompactCurrencyMutationSliders
          entities={[
            {
              id: v().personId,
              label: nameOf(v().personId),
              old: START.annualDollars,
              value: v().annualDollars,
              range: [40_000, 250_000],
            },
          ]}
          onChange={(_id, annualDollars) => props.patch({ annualDollars })}
        />
      </SpacedStack>
    </AccentPanel>
  );
};

/** Three views of ONE salary state; the JSON below follows whichever edits it. */
export const SalaryLeaf: Component<{ view: string }> = (props) => {
  const [values, setValues] = createSignal<SalaryValues>(START);
  const patch = (next: Partial<SalaryValues>) => setValues({ ...values(), ...next });
  const fields: Fields = { values, patch };
  const emission = () => salaryEmission(values());
  const landing = () => landsIn(emission().line);
  return (
    <SpacedStack>
      <Show when={props.view === "minimal"}>
        <MinimalFields {...fields} />
      </Show>
      <Show when={props.view === "scenario"}>
        <ScenarioCard {...fields} />
      </Show>
      <Show when={props.view === "full"}>
        <FullFields {...fields} />
      </Show>
      <KindOutput
        lineTitle="Stored line: kind salary (ADR 0029 SalaryLine)"
        lineJson={lineText(emission().line)}
        loweredJson={loweredText(emission().lowered)}
        builder={landing().builder}
        rule={landing().rule}
      />
    </SpacedStack>
  );
};
