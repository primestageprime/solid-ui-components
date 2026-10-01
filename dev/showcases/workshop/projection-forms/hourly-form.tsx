import { type Accessor, type Component } from "solid-js";
import {
  CurrencyInput,
  DatePicker,
  DayOfWeekPicker,
  FormComposite,
  NameInput,
  SpacedStack,
  ThemedNumberInput,
} from "../../../../src";
import {
  type HourlyValues,
} from "../projection-forms.lines";
import { LabeledField } from "./kit";

export interface HourlyFields {
  values: Accessor<HourlyValues>;
  patch: (next: Partial<HourlyValues>) => void;
}

// Revenue > Variable > Hourly. Fields are the kindTypes.generated.ts
// HourlyServiceLine: service, customer, the account paid into, the weekday it
// fires, the rate, the hours each fire, and the window.
export const HourlyFullFields: Component<HourlyFields> = (props) => {
  const values = () => props.values();
  const patch = props.patch;

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
    </SpacedStack>
  );
};
