import { type Component, Show, createSignal } from "solid-js";
import {
  AccentPanel,
  CurrencyInput,
  DayOfMonthPicker,
  MonthOfYearPicker,
  NameInput,
  NoteText,
  Slider,
  SpacedStack,
  SpreadRow,
  TextLabel,
  TextSublabel,
  TextTitle,
  TextValue,
  ThemedNumberInput,
} from "../../../../src";
import {
  LICENSE_DEFAULTS,
  LICENSE_HISTORY,
  defaultsFromHistory,
  formatCents,
} from "../projection-forms.fixtures";
import {
  type LicenseValues,
  landsIn,
  licenseEmission,
  lineText,
  loweredText,
} from "../projection-forms.lines";
import { FullFields, type Fields } from "./license-form";
import { KindOutput, LabeledField } from "./kit";

export const VIEW_OPTIONS = [
  { id: "minimal", label: "Minimal" },
  { id: "scenario", label: "Scenario" },
  { id: "full", label: "Full" },
];

const HISTORY = defaultsFromHistory(LICENSE_HISTORY);

/** The start state: every default the historicals give, the rest assumed. */
const START: LicenseValues = {
  ...LICENSE_DEFAULTS,
  product: HISTORY.product.value,
  seats: HISTORY.seats.value,
  priceDollars: HISTORY.priceDollars.value,
  day: HISTORY.day.value,
};

// MINIMAL: the importer-style abbreviated form. Only the fields a person must
// check; each default says where it came from. Everything else is assumed and
// visible in the JSON below.
const MinimalFields: Component<Fields> = (props) => {
  const v = () => props.values();
  return (
    <SpacedStack>
      <NoteText>Defaults come from this license's past payments; every other field is assumed.</NoteText>
      <NameInput
        label="Product"
        value={v().product}
        onInput={(e) => props.patch({ product: e.currentTarget.value })}
      />
      <NoteText>{HISTORY.product.caption}</NoteText>
      <ThemedNumberInput
        name="seats"
        label="Seats at start"
        min={0}
        value={() => v().seats}
        onChange={(seats) => props.patch({ seats: seats ?? 0 })}
      />
      <NoteText>{HISTORY.seats.caption}</NoteText>
      <CurrencyInput
        name="price"
        label="Price per seat ($ per period)"
        step={0.01}
        value={() => v().priceDollars}
        onChange={(priceDollars) => props.patch({ priceDollars: priceDollars ?? 0 })}
      />
      <NoteText>{HISTORY.priceDollars.caption}</NoteText>
      <Show when={v().billing === "annual"}>
        <LabeledField label="Month of year">
          <MonthOfYearPicker value={v().month} onChange={(month) => props.patch({ month })} />
        </LabeledField>
      </Show>
      <LabeledField label="Day of month">
        <DayOfMonthPicker max={28} value={v().day} onChange={(day) => props.patch({ day })} />
      </LabeledField>
      <NoteText>{HISTORY.day.caption}</NoteText>
    </SpacedStack>
  );
};

// SCENARIO: the Licenses builder's card for this line (thorcasting-ui
// components/screens/licenseBuilderScreen.tsx, lib/seatSubscription): a titled
// panel, the figure it bills, and a slider for each dial.
const ScenarioCard: Component<Fields> = (props) => {
  const v = () => props.values();
  return (
    <AccentPanel>
      <SpacedStack>
        <SpreadRow>
          <SpacedStack>
            <TextTitle>{v().product}</TextTitle>
            <TextSublabel>{`${v().customer} · ${v().billing}`}</TextSublabel>
          </SpacedStack>
          <SpacedStack>
            <TextLabel>First period</TextLabel>
            <TextValue>{formatCents(Math.round(v().seats * v().priceDollars * 100))}</TextValue>
          </SpacedStack>
        </SpreadRow>
        <Slider
          label="Seats at start"
          editable
          min={0}
          max={200}
          step={1}
          value={v().seats}
          onChange={(seats) => props.patch({ seats })}
        />
        <Slider
          label="Net new per period"
          editable
          min={-20}
          max={40}
          step={1}
          value={v().netPerPeriod}
          onChange={(netPerPeriod) => props.patch({ netPerPeriod })}
        />
        <Slider
          label="Price per seat"
          editable
          min={5}
          max={500}
          step={1}
          format={(n) => `$${n}`}
          value={v().priceDollars}
          onChange={(priceDollars) => props.patch({ priceDollars })}
        />
      </SpacedStack>
    </AccentPanel>
  );
};

/** Three views of ONE license state; the JSON below follows whichever edits it. */
export const LicenseLeaf: Component<{ view: string }> = (props) => {
  const view = () => props.view;
  const [values, setValues] = createSignal<LicenseValues>(START);
  const patch = (next: Partial<LicenseValues>) => setValues({ ...values(), ...next });
  const fields: Fields = { values, patch };
  const emission = () => licenseEmission(values());
  const landing = () => landsIn(emission().line);
  return (
    <SpacedStack>
      <Show when={view() === "minimal"}>
        <MinimalFields {...fields} />
      </Show>
      <Show when={view() === "scenario"}>
        <ScenarioCard {...fields} />
      </Show>
      <Show when={view() === "full"}>
        <FullFields {...fields} />
      </Show>
      <KindOutput
        lineTitle="Stored line: kind license (ADR 0029 LicenseLine)"
        lineJson={lineText(emission().line)}
        loweredJson={loweredText(emission().lowered)}
        builder={landing().builder}
        rule={landing().rule}
      />
    </SpacedStack>
  );
};
