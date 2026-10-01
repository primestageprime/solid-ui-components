import { type Component, Show, createSignal } from "solid-js";
import {
  AccentPanel,
  CurrencyInput,
  DayOfWeekPicker,
  NoteText,
  SpacedStack,
  SpreadRow,
  TextLabel,
  TextSublabel,
  TextTitle,
  TextValue,
  ThemedNumberInput,
  createPairedMutationSliders,
} from "../../../../src";
import {
  HOURLY_DEFAULTS,
  INVOICE_HISTORY,
  defaultsFromInvoices,
  formatCents,
} from "../projection-forms.fixtures";
import {
  type HourlyValues,
  hourlyEmission,
  lineText,
  loweredText,
} from "../projection-forms.lines";
import { HourlyFullFields, type HourlyFields } from "./hourly-form";
import { KindOutput, LabeledField } from "./kit";

const HISTORY = defaultsFromInvoices(INVOICE_HISTORY);

/** The start state: rate, hours and weekday from past invoices, the rest assumed. */
const START: HourlyValues = {
  ...HOURLY_DEFAULTS,
  rateDollars: HISTORY.rateDollars.value,
  hours: HISTORY.hours.value,
  dow: HISTORY.dow.value,
};

// MINIMAL: rate, hours per week and weekday, each defaulted from past invoices.
const MinimalFields: Component<HourlyFields> = (props) => {
  const v = () => props.values();
  return (
    <SpacedStack>
      <NoteText>Defaults come from this service's past invoices; every other field is assumed.</NoteText>
      <CurrencyInput
        name="rate"
        label="Rate ($ per hour)"
        step={0.01}
        value={() => v().rateDollars}
        onChange={(rateDollars) => props.patch({ rateDollars: rateDollars ?? 0 })}
      />
      <NoteText>{HISTORY.rateDollars.caption}</NoteText>
      <ThemedNumberInput
        name="hours"
        label="Hours each week"
        min={0}
        step={0.25}
        value={() => v().hours}
        onChange={(hours) => props.patch({ hours: hours ?? 0 })}
      />
      <NoteText>{HISTORY.hours.caption}</NoteText>
      <LabeledField label="Bills on (weekday)">
        <DayOfWeekPicker value={v().dow} onChange={(dow) => props.patch({ dow })} />
      </LabeledField>
      <NoteText>{HISTORY.dow.caption}</NoteText>
    </SpacedStack>
  );
};

// The Hourly builder's two dials, curried once at module level as thorcasting's
// Hourly board does it (hourlyBuilderScreen.tsx `ServiceDials`).
const ServiceDials = createPairedMutationSliders({
  axes: [
    { label: "Hrs/wk", format: (n) => `${n}h`, snap: 1, domain: [0, 60] },
    { label: "$/hr", format: (n) => `$${n}`, snap: 5, domain: [25, 300] },
  ],
  labels: { remove: "Drop", restore: "Reinstate", new: "new service" },
});

// SCENARIO: the Hourly builder's card for this service: the weekly bill and
// the paired hours and rate dials.
const ScenarioCard: Component<HourlyFields> = (props) => {
  const v = () => props.values();
  return (
    <AccentPanel>
      <SpacedStack>
        <SpreadRow>
          <SpacedStack>
            <TextTitle>{v().service}</TextTitle>
            <TextSublabel>{v().customer}</TextSublabel>
          </SpacedStack>
          <SpacedStack>
            <TextLabel>A week</TextLabel>
            <TextValue>{formatCents(Math.round(v().hours * v().rateDollars * 100))}</TextValue>
          </SpacedStack>
        </SpreadRow>
        <ServiceDials
          entities={[
            {
              id: "service",
              label: v().service,
              measures: [
                { prior: START.hours, value: v().hours, range: [0, 60] },
                { prior: START.rateDollars, value: v().rateDollars, range: [25, 300] },
              ],
            },
          ]}
          onChange={(_id, measure, value) =>
            props.patch(measure === 0 ? { hours: value } : { rateDollars: value })
          }
        />
      </SpacedStack>
    </AccentPanel>
  );
};

/** Three views of ONE hourly state; the JSON below follows whichever edits it. */
export const HourlyLeaf: Component<{ view: string }> = (props) => {
  const [values, setValues] = createSignal<HourlyValues>(START);
  const patch = (next: Partial<HourlyValues>) => setValues({ ...values(), ...next });
  const fields: HourlyFields = { values, patch };
  const emission = () => hourlyEmission(values());
  return (
    <SpacedStack>
      <Show when={props.view === "minimal"}>
        <MinimalFields {...fields} />
      </Show>
      <Show when={props.view === "scenario"}>
        <ScenarioCard {...fields} />
      </Show>
      <Show when={props.view === "full"}>
        <HourlyFullFields {...fields} />
      </Show>
      <KindOutput
        lineTitle="Stored line: kind hourly_service (ADR 0029 HourlyServiceLine)"
        lineJson={lineText(emission().line)}
        loweredJson={loweredText(emission().lowered)}
        builder={emission().landing.builder}
        rule={emission().landing.rule}
      />
    </SpacedStack>
  );
};
