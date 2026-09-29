// ============================================
// WhenEditor — one endpoint of a period: "Fixed date | Weekday of month" and
// that mode's fields. COMPOSED from SUI: SegmentedControl for the toggle,
// WrapRow of ChoiceDropdown / NumField for the fields. No CSS of its own.
//
// Switching mode keeps the month and lands on the same week of it
// (`switchWhen` in the model), so the date the reader is looking at holds still.
// ============================================
import { type Component, Show } from "solid-js";
import {
  BaselineWrapRow,
  SegmentedControl,
  TextBody,
  TightStack,
  fn,
} from "../../../../src";
import {
  MONTHS_FULL,
  NTHS,
  type DateWhen,
  type Nth,
  type NthWhen,
  WEEKDAYS_FULL,
  YEAR,
  type When,
  daysInMonth,
  ordinalCap,
  setWhenField,
  switchWhen,
} from "../seasonal-builder-model";
import { ChoiceDropdown, NumField } from "./fields";

const { map } = fn;

const MODES = [
  { value: "date", label: "Fixed date" },
  { value: "nth", label: "Weekday of month" },
];
const MONTH_CHOICES = map(
  (m: string, i: number) => ({ value: i + 1, label: m }),
  MONTHS_FULL,
);
const NTH_CHOICES = map((n: Nth) => ({ value: n, label: ordinalCap(n) }), NTHS);
const WEEKDAY_CHOICES = map(
  (d: string, i: number) => ({ value: i, label: d }),
  WEEKDAYS_FULL,
);

export const WhenEditor: Component<{
  /** Unique per endpoint on the page: the fields' names build on it. */
  readonly id: string;
  readonly label: string;
  readonly when: When;
  readonly onChange: (when: When) => void;
}> = (props) => {
  const set = (field: string) => (value: number) =>
    props.onChange(setWhenField(props.when, field, value));
  const date = (): DateWhen | undefined =>
    props.when.kind === "date" ? props.when : undefined;
  const nth = (): NthWhen | undefined =>
    props.when.kind === "nth" ? props.when : undefined;
  return (
    <TightStack>
      <SegmentedControl
        aria-label={`How the ${props.label} is set`}
        options={MODES}
        value={props.when.kind}
        onValueChange={(v) =>
          props.onChange(switchWhen(props.when, v as When["kind"]))
        }
      />
      <BaselineWrapRow>
        <Show when={date()}>
          {(d) => (
            <>
              <ChoiceDropdown
                label="Month"
                items={MONTH_CHOICES}
                value={d().month}
                onChange={set("month")}
              />
              <NumField
                label="Day"
                name={`${props.id}-day`}
                value={d().day}
                min={1}
                max={daysInMonth(YEAR, d().month)}
                onChange={set("day")}
              />
            </>
          )}
        </Show>
        <Show when={nth()}>
          {(w) => (
            <>
              <ChoiceDropdown
                label="Which"
                items={NTH_CHOICES}
                value={w().n}
                onChange={set("n")}
              />
              <ChoiceDropdown
                label="Weekday"
                items={WEEKDAY_CHOICES}
                value={w().weekday}
                onChange={set("weekday")}
              />
              <TextBody>of</TextBody>
              <ChoiceDropdown
                label="Month"
                items={MONTH_CHOICES}
                value={w().month}
                onChange={set("month")}
              />
            </>
          )}
        </Show>
      </BaselineWrapRow>
    </TightStack>
  );
};
