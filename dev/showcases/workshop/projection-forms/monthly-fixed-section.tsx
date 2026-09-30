import { type Component, createSignal } from "solid-js";
import {
  CurrencyInput,
  DayOfMonthPicker,
  FormComposite,
  SegmentedInput,
  SpacedStack,
} from "../../../../src";
import {
  CONFIG_TYPES,
  EXPENSE_CATEGORIES,
  MONTHLY_FIXED,
  REVENUE_CATEGORIES,
  SIDE_OPTIONS,
} from "../projection-forms.fixtures";
import {
  ChipChoice,
  ConfigFrame,
  ConfigHeader,
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
    />
  );
};
