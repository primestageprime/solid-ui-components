import { type Component, type JSX, Match, Show, Switch } from "solid-js";
import {
  AccentPanel,
  ChipCluster,
  CompactCurrencyMutationSliders,
  CurrencyInput,
  DatePicker,
  DayOfMonthPicker,
  DayOfWeekPicker,
  MonthOfYearPicker,
  NameInput,
  NoteText,
  PopoverTooltip,
  SegmentedInput,
  SmallButton,
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
  STEP,
  type WindowMode,
  type WindowValue,
  derivedPerPayment,
} from "../projection-forms.strips";
import { LabeledField } from "./kit";

const PER_OPTIONS = [
  { id: "payment", label: "Per payment" },
  { id: "year", label: "Per year" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A compact anchor: the value shows as one small button; clicking it opens
 *  the selector in a popover (SUI PopoverTooltip: tap or click toggles it). */
export const AnchorPopover: Component<{ value: string; children: JSX.Element }> = (props) => (
  // The popover portals to the body, so the picker-size class rides on its content.
  <PopoverTooltip content={<SpacedStack class="projection-forms-demo">{props.children}</SpacedStack>}>
    {props.value}
  </PopoverTooltip>
);

// ── LABEL ───────────────────────────────────────────────────────────────────
export const LabelStrip: Component<{ value: string; onChange: (v: string) => void }> = (props) => (
  <NameInput
    label="Label"
    value={props.value}
    onInput={(e) => props.onChange(e.currentTarget.value)}
  />
);

// ── AMOUNT ──────────────────────────────────────────────────────────────────
/** A money input sized to the value: `scale` is the largest figure expected. */
const Money: Component<{
  name: string;
  label: string;
  value: number;
  scale: number;
  step: number;
  onChange: (v: number) => void;
}> = (props) => (
  <CurrencyInput
    name={props.name}
    label={props.label}
    maxValue={props.scale}
    step={props.step}
    value={() => props.value}
    onChange={(v) => props.onChange(v ?? 0)}
  />
);

export const AmountStrip: Component<{
  value: AmountValue;
  cadence: CadenceId;
  onChange: (next: Partial<AmountValue>) => void;
}> = (props) => (
  <Switch>
    <Match when={props.value.id === "single"}>
      <ChipCluster>
        <Money
          name="amount"
          label={props.value.per === "year" ? "Per year ($)" : "Per payment ($)"}
          scale={props.value.scale}
          step={STEP[props.value.precision]}
          value={props.value.dollars}
          onChange={(dollars) => props.onChange({ dollars })}
        />
        <LabeledField label="Per">
          <SegmentedInput
            options={PER_OPTIONS}
            value={props.value.per}
            onChange={(per) => props.onChange({ per: per as "payment" | "year" })}
          />
        </LabeledField>
        <Show when={props.value.per === "year"}>
          <NoteText>{derivedPerPayment(props.value, props.cadence)}</NoteText>
        </Show>
      </ChipCluster>
    </Match>
    <Match when={props.value.id === "range"}>
      <ChipCluster>
        <Money name="min" label="Min ($)" scale={props.value.scale} step={STEP[props.value.precision]} value={props.value.min} onChange={(min) => props.onChange({ min })} />
        <Money name="typ" label="Typical ($)" scale={props.value.scale} step={STEP[props.value.precision]} value={props.value.typical} onChange={(typical) => props.onChange({ typical })} />
        <Money name="max" label="Max ($)" scale={props.value.scale} step={STEP[props.value.precision]} value={props.value.max} onChange={(max) => props.onChange({ max })} />
      </ChipCluster>
    </Match>
    <Match when={props.value.id === "units"}>
      <ChipCluster>
        <ThemedNumberInput
          name="count"
          size="sm"
          label={props.value.unit === "seats" ? "Seats" : "Hours"}
          min={0}
          step={props.value.unit === "seats" ? 1 : 0.25}
          value={() => props.value.count}
          onChange={(count) => props.onChange({ count: count ?? 0 })}
        />
        <Show when={props.value.unit === "seats"}>
          <ThemedNumberInput
            name="net"
            size="sm"
            label="+ per period"
            value={() => props.value.net}
            onChange={(net) => props.onChange({ net: net ?? 0 })}
          />
        </Show>
        <Money
          name="price"
          label={props.value.unit === "seats" ? "Price per seat ($)" : "Rate per hour ($)"}
          scale={10_000}
          step={1}
          value={props.value.price}
          onChange={(price) => props.onChange({ price })}
        />
      </ChipCluster>
    </Match>
  </Switch>
);

// ── CADENCE ─────────────────────────────────────────────────────────────────
const pad = (n: number): string => `${n}`;

/** The compact text each anchor displays. */
export const anchorText = (c: CadenceValue): string => {
  switch (c.id) {
    case "annual":
      return `${MONTHS[c.month - 1]} ${pad(c.day)}`;
    case "quarterly":
    case "biweekly":
      return c.ref;
    case "monthly":
      return c.last ? "Last day" : `Day ${pad(c.day)}`;
    case "weekly":
      return WEEKDAYS[c.dow];
    case "once":
      return c.date;
    case "semimonthly":
      return "1st and 15th";
    case "daily":
      return "Every day";
  }
};

const Anchor: Component<{ title: string; value: CadenceValue; children: JSX.Element }> = (props) => (
  <LabeledField label={props.title}>
    <AnchorPopover value={anchorText(props.value)}>{props.children}</AnchorPopover>
  </LabeledField>
);

export const CadenceStrip: Component<{
  value: CadenceValue;
  allowed: CadenceId[];
  onChange: (next: Partial<CadenceValue>) => void;
}> = (props) => (
  <ChipCluster>
    <Show when={props.allowed.length > 1}>
      <LabeledField label="Cadence">
        <SegmentedInput
          options={CADENCES.filter((c) => props.allowed.includes(c.id))}
          value={props.value.id}
          onChange={(id) => props.onChange({ id: id as CadenceId })}
        />
      </LabeledField>
    </Show>
    <Switch>
      <Match when={props.value.id === "annual"}>
        <Anchor title="Month and day" value={props.value}>
          <SpacedStack>
            <MonthOfYearPicker value={props.value.month} onChange={(month) => props.onChange({ month })} />
            <DayOfMonthPicker max={28} value={props.value.day} onChange={(day) => props.onChange({ day })} />
          </SpacedStack>
        </Anchor>
      </Match>
      <Match when={props.value.id === "quarterly" || props.value.id === "biweekly"}>
        <Anchor title={props.value.id === "quarterly" ? "Reference date" : "Reference payday"} value={props.value}>
          <DatePicker value={props.value.ref} onChange={(ref) => props.onChange({ ref })} />
        </Anchor>
      </Match>
      <Match when={props.value.id === "monthly"}>
        <Anchor title="Day of month" value={props.value}>
          <SpacedStack>
            <DayOfMonthPicker
              max={28}
              value={props.value.last ? null : props.value.day}
              onChange={(day) => props.onChange({ day, last: false })}
            />
            <SmallButton active={props.value.last} onClick={() => props.onChange({ last: true })}>
              Last day
            </SmallButton>
          </SpacedStack>
        </Anchor>
      </Match>
      <Match when={props.value.id === "weekly"}>
        <Anchor title="Weekday" value={props.value}>
          <DayOfWeekPicker value={props.value.dow} onChange={(dow) => props.onChange({ dow })} />
        </Anchor>
      </Match>
      <Match when={props.value.id === "once"}>
        <Anchor title="Date" value={props.value}>
          <DatePicker value={props.value.date} onChange={(date) => props.onChange({ date })} />
        </Anchor>
      </Match>
      <Match when={props.value.id === "semimonthly" || props.value.id === "daily"}>
        <NoteText>{anchorText(props.value)} (no anchor)</NoteText>
      </Match>
    </Switch>
  </ChipCluster>
);

// ── WINDOW ──────────────────────────────────────────────────────────────────
export const WindowStrip: Component<{
  value: WindowValue;
  mode: WindowMode;
  onChange: (next: Partial<WindowValue>) => void;
}> = (props) => (
  <ChipCluster>
    <Show when={props.mode !== "end"}>
      <DatePicker
        aria-label="Start"
        value={props.value.start}
        onChange={(start) => props.onChange({ start })}
      />
    </Show>
    <Show when={props.mode === "any"}>
      <TextSublabel>to</TextSublabel>
    </Show>
    <Show when={props.mode !== "start"}>
      <DatePicker
        aria-label="End"
        value={props.value.end}
        onChange={(end) => props.onChange({ end })}
      />
    </Show>
  </ChipCluster>
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

