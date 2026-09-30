import { type Component, Show, createSignal } from "solid-js";
import {
  CurrencyInput,
  DatePicker,
  DayOfMonthPicker,
  FormComposite,
  MonthOfYearPicker,
  NameInput,
  SegmentedInput,
  SpacedStack,
  ThemedNumberInput,
} from "../../../../src";
import { LICENSE_DEFAULTS } from "../projection-forms.fixtures";
import {
  type Billing,
  type LicenseValues,
  licenseEmission,
  lineText,
  loweredText,
} from "../projection-forms.lines";
import { KindOutput, LabeledField } from "./kit";

const BILLING_OPTIONS = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

// Revenue > Fixed > License. Fields are the kindTypes.generated.ts LicenseLine,
// in display units: product, customer, the account paid into, billing (which
// sets the schedule), start/until, seats, net new seats per period, price per
// seat, the annual discount, and the optional cost to serve.
export const LicenseForm: Component = () => {
  const [values, setValues] = createSignal<LicenseValues>(LICENSE_DEFAULTS);
  const patch = (next: Partial<LicenseValues>) => setValues({ ...values(), ...next });
  const emission = () => licenseEmission(values());
  const annual = () => values().billing === "annual";

  return (
    <SpacedStack>
      <FormComposite
        identity={
          <SpacedStack>
            <NameInput
              label="Product"
              value={values().product}
              onInput={(e) => patch({ product: e.currentTarget.value })}
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
          </SpacedStack>
        }
        schedule={
          <SpacedStack>
            <LabeledField label="Billing" help="A license bills monthly or annually.">
              <SegmentedInput
                options={BILLING_OPTIONS}
                value={values().billing}
                onChange={(id) => patch({ billing: id as Billing })}
              />
            </LabeledField>
            <Show when={annual()}>
              <LabeledField label="Month of year">
                <MonthOfYearPicker value={values().month} onChange={(month) => patch({ month })} />
              </LabeledField>
            </Show>
            <LabeledField label="Day of month">
              <DayOfMonthPicker
                max={28}
                value={values().day}
                onChange={(day) => patch({ day })}
              />
            </LabeledField>
            <LabeledField label="Start (required)">
              <DatePicker value={values().start} onChange={(start) => patch({ start })} />
            </LabeledField>
            <LabeledField label="Until (optional, exclusive)">
              <DatePicker value={values().until} onChange={(until) => patch({ until })} />
            </LabeledField>
          </SpacedStack>
        }
      />
      <FormComposite
        identity={
          <SpacedStack>
            <ThemedNumberInput
              name="seats"
              label="Seats at start"
              min={0}
              value={() => values().seats}
              onChange={(seats) => patch({ seats: seats ?? 0 })}
            />
            <ThemedNumberInput
              name="net"
              label="Net new seats per period"
              description="Negative drives seats down."
              value={() => values().netPerPeriod}
              onChange={(netPerPeriod) => patch({ netPerPeriod: netPerPeriod ?? 0 })}
            />
            <CurrencyInput
              name="price"
              label="Price per seat ($ per period)"
              step={0.01}
              value={() => values().priceDollars}
              onChange={(priceDollars) => patch({ priceDollars: priceDollars ?? 0 })}
            />
            <Show when={annual()}>
              <ThemedNumberInput
                name="discount"
                label="Annual discount (%)"
                min={0}
                max={100}
                step={0.5}
                description="Off an annual period's total."
                value={() => values().annualDiscountPct}
                onChange={(annualDiscountPct) => patch({ annualDiscountPct: annualDiscountPct ?? 0 })}
              />
            </Show>
          </SpacedStack>
        }
        schedule={
          <SpacedStack>
            <CurrencyInput
              name="cost"
              label="Cost to serve per seat ($)"
              step={0.01}
              value={() => values().costPerSeatDollars}
              onChange={(costPerSeatDollars) => patch({ costPerSeatDollars: costPerSeatDollars ?? 0 })}
            />
            <NameInput
              label="Host paid for it"
              value={values().costHost}
              onInput={(e) => patch({ costHost: e.currentTarget.value })}
            />
          </SpacedStack>
        }
      />
      <KindOutput
        lineTitle="Stored line: kind license (ADR 0029 LicenseLine)"
        lineJson={lineText(emission().line)}
        loweredJson={loweredText(emission().lowered)}
        builder={emission().landing.builder}
        rule={emission().landing.rule}
      />
    </SpacedStack>
  );
};
