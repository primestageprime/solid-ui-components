import { type Component, type JSX, Match, Show, Switch } from "solid-js";
import {
  AccentPanel,
  CompactCurrencyMutationSliders,
  CurrencyInput,
  DatePicker,
  DayOfMonthPicker,
  DayOfWeekPicker,
  MonthOfYearPicker,
  NameInput,
  NoteText,
  RangeAmountGroup,
  SegmentedInput,
  SpacedStack,
  SpreadRow,
  TextSublabel,
  TextTitle,
  TextValue,
  ThemedNumberInput,
  createGroupedMutationSliders,
  createPairedMutationSliders,
} from "../../../../src";
import {
  type AmountValue,
  CADENCES,
  type CadenceId,
  type CadenceValue,
  type WindowMode,
  type WindowValue,
  derivedPerPayment,
} from "../projection-forms.strips";
import { LabeledField } from "./kit";

const PER_OPTIONS = [
  { id: "payment", label: "Per payment" },
  { id: "year", label: "Per year" },
];

// ── LABEL ───────────────────────────────────────────────────────────────────
export const LabelStrip: Component<{ value: string; onChange: (v: string) => void }> = (props) => (
  <NameInput
    label="Label"
    value={props.value}
    onInput={(e) => props.onChange(e.currentTarget.value)}
  />
);

// ── AMOUNT ──────────────────────────────────────────────────────────────────
export const AmountStrip: Component<{
  value: AmountValue;
  cadence: CadenceId;
  onChange: (next: Partial<AmountValue>) => void;
}> = (props) => (
  <Switch>
    <Match when={props.value.id === "single"}>
      <SpacedStack>
        <CurrencyInput
          name="amount"
          label={props.value.per === "year" ? "Amount per year ($)" : "Amount per payment ($)"}
          step={0.01}
          value={() => props.value.dollars}
          onChange={(dollars) => props.onChange({ dollars: dollars ?? 0 })}
        />
        <SegmentedInput
          options={PER_OPTIONS}
          value={props.value.per}
          onChange={(per) => props.onChange({ per: per as "payment" | "year" })}
        />
        <Show when={props.value.per === "year"}>
          <NoteText>{derivedPerPayment(props.value, props.cadence)}</NoteText>
        </Show>
      </SpacedStack>
    </Match>
    <Match when={props.value.id === "range"}>
      <RangeAmountGroup
        name="range"
        slots={[
          { label: "Min ($)", value: props.value.min, onChange: (min) => props.onChange({ min: min ?? 0 }) },
          { label: "Typical ($)", value: props.value.typical, onChange: (typical) => props.onChange({ typical: typical ?? 0 }) },
          { label: "Max ($)", value: props.value.max, onChange: (max) => props.onChange({ max: max ?? 0 }) },
        ]}
      />
    </Match>
    <Match when={props.value.id === "units"}>
      <SpacedStack>
        <ThemedNumberInput
          name="count"
          label={props.value.unit === "seats" ? "Seats at start" : "Hours per period"}
          min={0}
          step={props.value.unit === "seats" ? 1 : 0.25}
          value={() => props.value.count}
          onChange={(count) => props.onChange({ count: count ?? 0 })}
        />
        <Show when={props.value.unit === "seats"}>
          <ThemedNumberInput
            name="net"
            label="Net new per period"
            value={() => props.value.net}
            onChange={(net) => props.onChange({ net: net ?? 0 })}
          />
        </Show>
        <CurrencyInput
          name="price"
          label={props.value.unit === "seats" ? "Price per seat ($)" : "Rate ($ per hour)"}
          step={0.01}
          value={() => props.value.price}
          onChange={(price) => props.onChange({ price: price ?? 0 })}
        />
      </SpacedStack>
    </Match>
  </Switch>
);

// ── CADENCE ─────────────────────────────────────────────────────────────────
export const CadenceStrip: Component<{
  value: CadenceValue;
  allowed: CadenceId[];
  onChange: (next: Partial<CadenceValue>) => void;
}> = (props) => (
  <SpacedStack>
    <Show when={props.allowed.length > 1}>
      <SegmentedInput
        options={CADENCES.filter((c) => props.allowed.includes(c.id))}
        value={props.value.id}
        onChange={(id) => props.onChange({ id: id as CadenceId })}
      />
    </Show>
    <Switch>
      <Match when={props.value.id === "annual"}>
        <LabeledField label="Month of year">
          <MonthOfYearPicker value={props.value.month} onChange={(month) => props.onChange({ month })} />
        </LabeledField>
        <LabeledField label="Day of month">
          <DayOfMonthPicker max={28} value={props.value.day} onChange={(day) => props.onChange({ day })} />
        </LabeledField>
      </Match>
      <Match when={props.value.id === "quarterly" || props.value.id === "biweekly"}>
        <LabeledField label={props.value.id === "quarterly" ? "Reference date" : "Reference payday"}>
          <DatePicker value={props.value.ref} onChange={(ref) => props.onChange({ ref })} />
        </LabeledField>
      </Match>
      <Match when={props.value.id === "monthly"}>
        <LabeledField label="Day of month">
          <DayOfMonthPicker
            lastOfMonth
            value={props.value.last ? "last" : props.value.day}
            onChange={(day) => props.onChange({ day, last: false })}
            onSelectLast={() => props.onChange({ last: true })}
          />
        </LabeledField>
      </Match>
      <Match when={props.value.id === "weekly"}>
        <LabeledField label="Weekday">
          <DayOfWeekPicker value={props.value.dow} onChange={(dow) => props.onChange({ dow })} />
        </LabeledField>
      </Match>
      <Match when={props.value.id === "once"}>
        <LabeledField label="Date">
          <DatePicker value={props.value.date} onChange={(date) => props.onChange({ date })} />
        </LabeledField>
      </Match>
      <Match when={props.value.id === "semimonthly"}>
        <NoteText>No anchor: pays on the 1st and the 15th.</NoteText>
      </Match>
      <Match when={props.value.id === "daily"}>
        <NoteText>No anchor: every day.</NoteText>
      </Match>
    </Switch>
  </SpacedStack>
);

// ── WINDOW ──────────────────────────────────────────────────────────────────
export const WindowStrip: Component<{
  value: WindowValue;
  mode: WindowMode;
  onChange: (next: Partial<WindowValue>) => void;
}> = (props) => (
  <SpacedStack>
    <Show when={props.mode !== "end"}>
      <LabeledField label="Start (optional, inclusive)">
        <DatePicker value={props.value.start} onChange={(start) => props.onChange({ start })} />
      </LabeledField>
    </Show>
    <Show when={props.mode !== "start"}>
      <LabeledField label="End (optional, exclusive)">
        <DatePicker value={props.value.end} onChange={(end) => props.onChange({ end })} />
      </LabeledField>
    </Show>
  </SpacedStack>
);

// ── SCENARIO: the builder's vertical dials for the amount ───────────────────
const SinglePerYearDials = CompactCurrencyMutationSliders;

const RangeDials = createGroupedMutationSliders({
  axes: [
    { label: "min", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
    { label: "typ", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
    { label: "max", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
  ],
});

const SeatDials = createGroupedMutationSliders({
  axes: [
    { label: "#", domain: [0, 200], snap: 1, format: (n) => `${n}` },
    { label: "Δ", domain: [-20, 40], snap: 1, format: (n) => (n > 0 ? `+${n}` : `${n}`) },
    { label: "$", domain: [5, 500], snap: 1, format: (n) => `$${n}` },
  ],
});

const HourDials = createPairedMutationSliders({
  axes: [
    { label: "Hrs", format: (n) => `${n}h`, snap: 1, domain: [0, 60] },
    { label: "$/hr", format: (n) => `$${n}`, snap: 5, domain: [25, 300] },
  ],
});

export const AmountDials: Component<{
  label: string;
  value: AmountValue;
  start: AmountValue;
  onChange: (next: Partial<AmountValue>) => void;
}> = (props) => (
  <Switch>
    <Match when={props.value.id === "single"}>
      <SinglePerYearDials
        entities={[
          {
            id: "amount",
            label: props.label,
            old: props.start.dollars,
            value: props.value.dollars,
            range: [0, Math.max(300_000, props.start.dollars * 2)],
          },
        ]}
        onChange={(_id, dollars) => props.onChange({ dollars })}
      />
    </Match>
    <Match when={props.value.id === "range"}>
      <RangeDials
        entities={[
          {
            id: "range",
            label: props.label,
            measures: [
              { prior: props.start.min, value: props.value.min, range: [0, 100_000] },
              { prior: props.start.typical, value: props.value.typical, range: [0, 100_000] },
              { prior: props.start.max, value: props.value.max, range: [0, 100_000] },
            ],
          },
        ]}
        onChange={(_id, m, v) =>
          props.onChange(m === 0 ? { min: v } : m === 1 ? { typical: v } : { max: v })
        }
      />
    </Match>
    <Match when={props.value.id === "units" && props.value.unit === "seats"}>
      <SeatDials
        entities={[
          {
            id: "seats",
            label: props.label,
            measures: [
              { prior: props.start.count, value: props.value.count, range: [0, 200] },
              { prior: props.start.net, value: props.value.net, range: [-20, 40] },
              { prior: props.start.price, value: props.value.price, range: [5, 500] },
            ],
          },
        ]}
        onChange={(_id, m, v) =>
          props.onChange(m === 0 ? { count: v } : m === 1 ? { net: v } : { price: v })
        }
      />
    </Match>
    <Match when={props.value.id === "units"}>
      <HourDials
        entities={[
          {
            id: "hours",
            label: props.label,
            measures: [
              { prior: props.start.count, value: props.value.count, range: [0, 60] },
              { prior: props.start.price, value: props.value.price, range: [25, 300] },
            ],
          },
        ]}
        onChange={(_id, m, v) => props.onChange(m === 0 ? { count: v } : { price: v })}
      />
    </Match>
  </Switch>
);

/** A read-only strip value: a label over its text. */
export const ReadOnly: Component<{ title: string; text: string }> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.title}</TextSublabel>
    <TextValue>{props.text}</TextValue>
  </SpreadRow>
);

export const ScenarioFrame: Component<{ title: string; children: JSX.Element }> = (props) => (
  <AccentPanel>
    <SpacedStack>
      <TextTitle>{props.title}</TextTitle>
      {props.children}
    </SpacedStack>
  </AccentPanel>
);

