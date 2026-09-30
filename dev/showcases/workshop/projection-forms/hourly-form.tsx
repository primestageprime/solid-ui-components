import { type Component, createSignal } from "solid-js";
import {
  CurrencyInput,
  DatePicker,
  DayOfWeekPicker,
  FormComposite,
  NameInput,
  SpacedStack,
  ThemedNumberInput,
} from "../../../../src";
import { HOURLY_DEFAULTS } from "../projection-forms.fixtures";
import {
  type HourlyValues,
  hourlyEmission,
  lineText,
  loweredText,
} from "../projection-forms.lines";
import { KindOutput, LabeledField } from "./kit";

// Revenue > Variable > Hourly. Fields are the kindTypes.generated.ts
// HourlyServiceLine: service, customer, the account paid into, the weekday it
// fires, the rate, the hours each fire, and the window.
export const HourlyForm: Component = () => {
  const [values, setValues] = createSignal<HourlyValues>(HOURLY_DEFAULTS);
  const patch = (next: Partial<HourlyValues>) => setValues({ ...values(), ...next });
  const emission = () => hourlyEmission(values());

  return (
    <SpacedStack>
      <FormComposite
        identity={
          <SpacedStack>
            <NameInput
              label="Service"
              value={values().service}
              onInput={(e) => patch({ service: e.currentTarget.value })}
            />
            <NameInput
              label="Customer"
              value={values().customer}
              onInput={(e) => patch({ customer: e.currentTarget.value })}
            />
            <NameInput
              label="Paid into account"
              value={values().paidTo}
              onInput={(e) => patch({ paidTo: e.currentTarget.value })}
            />
            <CurrencyInput
              name="rate"
              label="Rate ($ per hour)"
              step={0.01}
              value={() => values().rateDollars}
              onChange={(rateDollars) => patch({ rateDollars: rateDollars ?? 0 })}
            />
            <ThemedNumberInput
              name="hours"
              label="Hours each week"
              min={0}
              step={0.25}
              value={() => values().hours}
              onChange={(hours) => patch({ hours: hours ?? 0 })}
            />
          </SpacedStack>
        }
        schedule={
          <SpacedStack>
            <LabeledField label="Bills on (weekday)">
              <DayOfWeekPicker value={values().dow} onChange={(dow) => patch({ dow })} />
            </LabeledField>
            <LabeledField label="Start">
              <DatePicker value={values().start} onChange={(start) => patch({ start })} />
            </LabeledField>
            <LabeledField label="Until (optional, exclusive)">
              <DatePicker value={values().until} onChange={(until) => patch({ until })} />
            </LabeledField>
          </SpacedStack>
        }
      />
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
