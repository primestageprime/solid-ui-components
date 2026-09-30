import { type Component, Show, createSignal } from "solid-js";
import {
  CurrencyInput,
  DayOfMonthPicker,
  FormComposite,
  NoteText,
  SegmentedInput,
  SpacedStack,
} from "../../../../src";
import {
  buildMonthlyFixed,
  landsIn,
  legacyText,
  wireFromLegacy,
  wireText,
} from "../projection-forms.config";
import {
  CONFIG_TYPES,
  EXPENSE_CATEGORIES,
  MONTHLY_FIXED,
  REVENUE_CATEGORIES,
  SIDE_OPTIONS,
  bucketIdFor,
} from "../projection-forms.fixtures";
import {
  ChipChoice,
  ConfigFrame,
  ConfigHeader,
  ConfigOutput,
  LabeledField,
  ScenarioRail,
} from "./kit";

// Reference form 1 — Revenue "RTH Contracts", Monthly fixed.
// Shape: header · Direction · Category · Type · [amount][day of month] · rail.
export const MonthlyFixedSection: Component = () => {
  const [name, setName] = createSignal(MONTHLY_FIXED.name);
  const [side, setSide] = createSignal(MONTHLY_FIXED.side);
  const [category, setCategory] = createSignal(MONTHLY_FIXED.category);
  const [type, setType] = createSignal(MONTHLY_FIXED.type);
  const [amount, setAmount] = createSignal<number | undefined>(MONTHLY_FIXED.amount);
  const [day, setDay] = createSignal<number | "last">(MONTHLY_FIXED.day);

  const categories = () => (side() === "revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES);
  // The row this form emits, live. Context mirrors FormContext: bucket from the
  // Category chip, accounts from the side (payee RTH, cash Columbia Bank).
  const row = () =>
    buildMonthlyFixed(
      { name: name(), amount: amount(), day: day() },
      {
        side: side() === "revenue" ? "revenue" : "expense",
        bucketId: bucketIdFor(side(), category()),
        mineAccount: "Columbia Bank Checking",
        counterparty: "RTH",
      },
    );
  const show = (action: string) => () =>
    console.table({ action, name: name(), side: side(), category: category(), type: type(), amount: amount(), day: day() });

  return (
    <ConfigFrame
      header={
        <ConfigHeader
          side={side()}
          name={name()}
          type={type()}
          onRename={setName}
          onDelete={show("delete")}
          onSave={show("save")}
        />
      }
      pane={
        <SpacedStack>
          <LabeledField label="Direction">
            <SegmentedInput options={SIDE_OPTIONS} value={side()} onChange={setSide} />
          </LabeledField>
          <ChipChoice label="Category" options={categories()} value={category()} onChange={setCategory} />
          <ChipChoice label="Type" options={CONFIG_TYPES} value={type()} onChange={setType} />
          <FormComposite
            stacked
            identity={
              <CurrencyInput
                name="amount"
                label="Amount ($)"
                value={amount}
                onChange={setAmount}
                step={0.01}
              />
            }
            schedule={
              <LabeledField label="Day of month">
                <DayOfMonthPicker
                  lastOfMonth
                  value={day()}
                  onChange={setDay}
                  onSelectLast={() => setDay("last")}
                />
              </LabeledField>
            }
          />
        </SpacedStack>
      }
      rail={<ScenarioRail scenarios={MONTHLY_FIXED.scenarios} />}
      output={
        <Show
          when={type() === MONTHLY_FIXED.type}
          fallback={<NoteText>{`The ${type()} form is not built on this bench yet.`}</NoteText>}
        >
          <ConfigOutput
            legacyJson={legacyText(row())}
            wireJson={wireText(wireFromLegacy(row()))}
            landing={landsIn(row())}
          />
        </Show>
      }
    />
  );
};
