import { type Component, For, Index, type JSX, Show, createSignal } from "solid-js";
import {
  CardSurface,
  CardGrid,
  CodeBlock,
  NoteText,
  SectionTitle,
  SegmentedInput,
  SpacedStack,
  TextLabel,
  TextSublabel,
  TightStack,
  createGrid,
} from "../../../../src";
import {
  AmountStrip,
  CADENCE_SHAPES,
  type AmountStripDataProps,
  type AmountValue,
  type CadenceShape,
  type CadenceStripDataProps,
  type CadenceValue,
  EndWindowStrip,
  GrowthStrip,
  HoursAmountStrip,
  SeatsPriceAmountStrip,
  SimpleGrowthStrip,
  UnitsAmountStrip,
  UnitsGrowthStrip,
  type GrowthValue,
  growthOfKind,
  projectUnits,
  LabelStrip,
  LargeAmountStrip,
  MonthlyOrAnnualCadenceStrip,
  PERIODS_PER_YEAR,
  PayCadenceStrip,
  SeatsAmountStrip,
  SmallAmountStrip,
  StartWindowStrip,
  WindowStrip,
  type WindowValue,
  cadenceOfShape,
  createCadenceStrip,
} from "../../../../src/components/Strips";
import {
  LABEL_KEYS,
  type Side,
  type StripValues,
  amountKeys,
  assemble,
  labelFragment,
  prettyJson,
  scheduleOf,
  unitsKeys,
  windowKeys,
} from "../projection-forms.adapter";
import {
  EXCEPTIONS,
  FORMS,
  type AmountVariant,
  ALL_CADENCE_COUNT,
  type FormDef,
  cadenceLabels,
} from "../projection-forms.strips";
import { AmountDials, ReadOnly, ScenarioFrame } from "./strips-ui";
import { LabeledField as Labeled } from "./kit";
import { HourlyEmployeeCard, PayrollTaxPanel } from "./payroll-cards";
import { CatalogPayrollCards } from "./payroll-catalog";

// ── curries, once ───────────────────────────────────────────────────────────
const AMOUNT_STRIPS: Record<AmountVariant, Component<AmountStripDataProps>> = {
  amount: AmountStrip,
  small: SmallAmountStrip,
  large: LargeAmountStrip,
  seats: SeatsAmountStrip,
  hours: HoursAmountStrip,
  seatsPrice: SeatsPriceAmountStrip,
  units: UnitsAmountStrip,
};

const GROWTH_STRIPS = {
  units: UnitsGrowthStrip,
  simple: SimpleGrowthStrip,
  population: GrowthStrip,
};

const HourlyCadenceStrip = createCadenceStrip({
  allowed: ["weekly", "biweekly", "semimonthly", "monthly", "daily"],
});

/** One strip per single cadence shape: a recipe that fixes the cadence. */
const OnlyCadence: Record<CadenceShape, Component<CadenceStripDataProps>> = {
  annual: createCadenceStrip({ allowed: ["annual"] }),
  quarterly: createCadenceStrip({ allowed: ["quarterly"] }),
  monthly: createCadenceStrip({ allowed: ["monthly"] }),
  semimonthly: createCadenceStrip({ allowed: ["semimonthly"] }),
  biweekly: createCadenceStrip({ allowed: ["biweekly"] }),
  weekly: createCadenceStrip({ allowed: ["weekly"] }),
  daily: createCadenceStrip({ allowed: ["daily"] }),
  once: createCadenceStrip({ allowed: ["once"] }),
};

const SaleCadenceStrip = createCadenceStrip({ allowed: ["daily", "weekly", "monthly"] });
const SubscriptionCadenceStrip = createCadenceStrip({ allowed: ["weekly", "monthly"] });

const cadenceStripFor = (def: FormDef): Component<CadenceStripDataProps> =>
  def.kind === "product"
    ? SaleCadenceStrip
    : def.kind === "subscription"
      ? SubscriptionCadenceStrip
      : def.kind === "license"
    ? MonthlyOrAnnualCadenceStrip
    : def.kind === "hourly_service"
      ? HourlyCadenceStrip
      : def.kind === "salary"
        ? PayCadenceStrip
        : OnlyCadence[def.cadences[0]];

const windowStripFor = (mode: FormDef["window"]) =>
  mode === "start" ? StartWindowStrip : mode === "end" ? EndWindowStrip : WindowStrip;

/** Gallery cards: 27rem wide at least (min/typical/max at $9,999 need ~410px
 *  on one line), one column on a phone. */
const GalleryGrid = createGrid({
  columns: "repeat(auto-fit, minmax(min(100%, 27rem), 1fr))",
  gap: "sm",
});

const SIDE_OPTIONS = [
  { id: "revenue", label: "Revenue" },
  { id: "expense", label: "Expense" },
];
const MODE_OPTIONS = [
  { id: "minimal", label: "Minimal" },
  { id: "scenario", label: "Scenario" },
];

const Fragment: Component<{ json: string }> = (props) => <CodeBlock>{props.json}</CodeBlock>;

// ── A. STRIP CATALOG ────────────────────────────────────────────────────────

const Variant: Component<{
  title: string;
  children: JSX.Element;
  value: unknown;
  writes: unknown;
}> = (props) => (
  <CardSurface>
    <SpacedStack>
      <TextLabel>{props.title}</TextLabel>
      {props.children}
      <TextSublabel>Strip value (engine-neutral)</TextSublabel>
      <Fragment json={prettyJson(props.value)} />
      <TextSublabel>Thorcasting adapter writes</TextSublabel>
      <Fragment json={prettyJson(props.writes)} />
    </SpacedStack>
  </CardSurface>
);

const AMOUNT_SAMPLES: { title: string; strip: AmountVariant; value: AmountValue; kind: "license" | "hourly_service" | "plain" }[] = [
  { title: "Single: per payment", strip: "amount", kind: "plain", value: { kind: "single", cents: 1_000_000, per: "payment" } },
  { title: "Single: per year (shows each payment)", strip: "amount", kind: "plain", value: { kind: "single", cents: 10_289_110, per: "year" } },
  { title: "Single with cents (up to $9,999)", strip: "small", kind: "plain", value: { kind: "single", cents: 1_000_050, per: "payment" } },
  { title: "Range: min / typical / max", strip: "small", kind: "plain", value: { kind: "range", min: 800_000, typical: 1_000_000, max: 1_200_000 } },
  { title: "Range at the maximum ($1,000,000,000, to the thousand)", strip: "large", kind: "plain", value: { kind: "range", min: 80_000_000_000, typical: 90_000_000_000, max: 100_000_000_000 } },
  { title: "Units x price: seats", strip: "seats", kind: "license", value: { kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 } },
  { title: "Units x price: hours", strip: "hours", kind: "hourly_service", value: { kind: "units", units: 20, unitPrice: 9_000, perPeriod: 0 } },
];

const AmountVariantCard: Component<(typeof AMOUNT_SAMPLES)[number]> = (props) => {
  const [value, setValue] = createSignal<AmountValue>(props.value);
  const Strip = AMOUNT_STRIPS[props.strip];
  return (
    <Variant
      title={props.title}
      value={value()}
      writes={props.kind === "plain" ? amountKeys(value()) : unitsKeys(value(), props.kind)}
    >
      <Strip value={value()} onChange={setValue} periodsPerYear={26} />
    </Variant>
  );
};

const CadenceVariantCard: Component<{ shape: CadenceShape; label: string; anchor: string }> = (props) => {
  const [value, setValue] = createSignal<CadenceValue>(cadenceOfShape(props.shape));
  const Strip = OnlyCadence[props.shape];
  return (
    <Variant
      title={`${props.label} (anchor: ${props.anchor})`}
      value={value()}
      writes={{ schedule: scheduleOf(value()) }}
    >
      <Strip value={value()} onChange={setValue} />
    </Variant>
  );
};

const WINDOW_SAMPLES: { title: string; value: WindowValue }[] = [
  { title: "None (the whole line)", value: {} },
  { title: "Start only (a ray)", value: { start: "2026-10-01" } },
  { title: "End only (a ray)", value: { until: "2027-06-30" } },
  { title: "Start and end", value: { start: "2026-10-01", until: "2027-06-30" } },
];

const WindowVariantCard: Component<(typeof WINDOW_SAMPLES)[number]> = (props) => {
  const [value, setValue] = createSignal<WindowValue>(props.value);
  return (
    <Variant title={`Window: ${props.title}`} value={value()} writes={windowKeys(value())}>
      <WindowStrip value={value()} onChange={setValue} />
    </Variant>
  );
};

const LabelCard: Component = () => {
  const [name, setName] = createSignal("Pro licenses");
  return (
    <CardSurface>
      <SpacedStack>
        <TextSublabel>One input; the same value is the label in every JSON shape below.</TextSublabel>
        <LabelStrip value={name()} onChange={setName} />
        <CardGrid>
          <For each={LABEL_KEYS}>
            {(k) => (
              <TightStack>
                <TextSublabel>{k.kind}</TextSublabel>
                <Fragment json={prettyJson(labelFragment(k.key, name()))} />
              </TightStack>
            )}
          </For>
        </CardGrid>
      </SpacedStack>
    </CardSurface>
  );
};

const GROWTH_SAMPLES: { title: string; value: GrowthValue }[] = [
  { title: "None", value: { kind: "none" } },
  { title: "+ units per period", value: { kind: "units", perPeriod: 12 } },
  { title: "% per period", value: { kind: "percent", pctPerPeriod: 5 } },
  { title: "Units with churn and a ceiling", value: { kind: "units", perPeriod: 12, churnPct: 3, ceiling: 130 } },
];

const GrowthVariantCard: Component<(typeof GROWTH_SAMPLES)[number]> = (props) => {
  const [value, setValue] = createSignal<GrowthValue>(props.value);
  const projection = () => {
    const rows = projectUnits(100, value(), 6);
    return `${rows.join(" > ")} (from 100 units, 6 periods)`;
  };
  return (
    <Variant title={`Growth: ${props.title}`} value={value()} writes={{ projection: projection() }}>
      <GrowthStrip value={value()} onChange={setValue} startUnits={100} />
    </Variant>
  );
};

export const CatalogSection: Component = () => (
  <SpacedStack>
    <SectionTitle>A. Strip catalog</SectionTitle>
    <NoteText>
      The four published strips (SUI Strips). Each variant is live; under it, the
      engine-neutral value the strip emits and the keys thorcasting's adapter writes from it.
    </NoteText>
    <TextLabel>1. LabelStrip</TextLabel>
    <LabelCard />
    <TextLabel>2. AmountStrip</TextLabel>
    <SpacedStack>
      <For each={AMOUNT_SAMPLES}>{(a) => <AmountVariantCard {...a} />}</For>
    </SpacedStack>
    <TextLabel>3. CadenceStrip</TextLabel>
    <SpacedStack>
      <For each={CADENCE_SHAPES}>{(c) => <CadenceVariantCard shape={c.shape} label={c.label} anchor={c.anchor} />}</For>
    </SpacedStack>
    <TextLabel>3b. GrowthStrip (units, price and growth: product sale, subscription, license)</TextLabel>
    <SpacedStack>
      <For each={GROWTH_SAMPLES}>{(g) => <GrowthVariantCard {...g} />}</For>
    </SpacedStack>
    <TextLabel>4. WindowStrip</TextLabel>
    <SpacedStack>
      <For each={WINDOW_SAMPLES}>{(w) => <WindowVariantCard {...w} />}</For>
    </SpacedStack>
    <CatalogPayrollCards />
  </SpacedStack>
);

// ── B. FORM GALLERY ─────────────────────────────────────────────────────────

const annualOf = (a: AmountValue): number => (a.kind === "single" ? a.cents : 0);

const FormCard: Component<{ def: FormDef; mode: string; side: Side }> = (props) => {
  const [values, setValues] = createSignal<StripValues>(props.def.start);
  const patch = (next: Partial<StripValues>) => setValues({ ...values(), ...next });
  const side = (): Side => (props.def.side === "split" ? props.side : props.def.side);
  const json = () => prettyJson(assemble(props.def.kind, side(), values()));
  const AmountS = AMOUNT_STRIPS[props.def.amountVariant];
  const CadenceS = cadenceStripFor(props.def);
  const WindowS = windowStripFor(props.def.window);
  const GrowthS = props.def.growth ? GROWTH_STRIPS[props.def.growth] : undefined;
  const startUnits = () => {
    const a = values().amount;
    return a.kind === "units" ? a.units : 0;
  };
  const narrowed = () => props.def.cadences.length < ALL_CADENCE_COUNT;
  return (
    <CardSurface>
      <SpacedStack>
        <TightStack>
          <TextLabel>{props.def.name}</TextLabel>
          <TextSublabel>{`Recipe: ${props.def.recipe}`}</TextSublabel>
          <TextSublabel>
            {`Direction: ${props.def.side === "split" ? side() : `${props.def.side} (fixed by kind)`} · kind: ${props.def.kind}`}
          </TextSublabel>
        </TightStack>
        <NoteText>
          {`Cadence ${narrowed() ? `narrowed from 8 to ${props.def.cadences.length}` : "offered"}: ${cadenceLabels(props.def.cadences)}.${props.def.note ? ` ${props.def.note}` : ""}`}
        </NoteText>
        {props.mode === "minimal" ? (
          <SpacedStack>
            <LabelStrip value={values().label} onChange={(label) => patch({ label })} />
            <Labeled label="2. Amount">
              <AmountS
                value={values().amount}
                periodsPerYear={PERIODS_PER_YEAR[values().cadence.shape]}
                onChange={(amount) => patch({ amount })}
              />
            </Labeled>
            <Labeled label="3. Cadence">
              <CadenceS value={values().cadence} onChange={(cadence) => patch({ cadence })} />
            </Labeled>
            {GrowthS && values().growth ? (
              <Labeled label="Growth">
                <GrowthS
                  value={values().growth as GrowthValue}
                  startUnits={startUnits()}
                  onChange={(growth) => patch({ growth })}
                />
              </Labeled>
            ) : null}
            <Labeled label="4. Window">
              <WindowS value={values().window} onChange={(window) => patch({ window })} />
            </Labeled>
          </SpacedStack>
        ) : (
          <ScenarioFrame title={values().label}>
            <AmountDials
              label={values().label}
              value={values().amount}
              start={props.def.start.amount}
              unit={props.def.amountVariant === "hours" ? "hours" : "seats"}
              onChange={(amount) => patch({ amount })}
            />
            <ReadOnly
              title="Cadence"
              text={CADENCE_SHAPES.find((c) => c.shape === values().cadence.shape)?.label ?? ""}
            />
            <ReadOnly
              title="Window"
              text={
                values().window.start === undefined && values().window.until === undefined
                  ? "none"
                  : `${values().window.start ?? "beginning of time"} to ${values().window.until ?? "end of time"}`
              }
            />
          </ScenarioFrame>
        )}
        <Fragment json={json()} />
        <Show when={props.def.kind === "salary"}>
          <PayrollTaxPanel
            lineAnnualCents={[annualOf(values().amount)]}
            periodsPerYear={PERIODS_PER_YEAR[values().cadence.shape]}
          />
        </Show>
      </SpacedStack>
    </CardSurface>
  );
};

export const GallerySection: Component = () => {
  const [mode, setMode] = createSignal("minimal");
  const [side, setSide] = createSignal<Side>("revenue");
  return (
    <SpacedStack>
      <SectionTitle>B. Form gallery</SectionTitle>
      <NoteText>
        Each card stacks the four published strips. Direction (money in or out) is this split, not a
        strip; counterparties and accounts are placeholder labels in the JSON.
      </NoteText>
      <Labeled label="Direction (plain forms)">
        <SegmentedInput options={SIDE_OPTIONS} value={side()} onChange={(id) => setSide(id as Side)} />
      </Labeled>
      <Labeled label="View">
        <SegmentedInput options={MODE_OPTIONS} value={mode()} onChange={setMode} />
      </Labeled>
      <GalleryGrid>
        <Index each={FORMS}>
          {(def) => <FormCard def={def()} mode={mode()} side={side()} />}
        </Index>
        <HourlyEmployeeCard mode={mode()} />
      </GalleryGrid>
    </SpacedStack>
  );
};

// ── C. EXCEPTIONS ───────────────────────────────────────────────────────────

export const ExceptionsSection: Component = () => (
  <SpacedStack>
    <SectionTitle>C. Exceptions: forms the four strips do not cover</SectionTitle>
    <CardSurface>
      <SpacedStack>
        <For each={EXCEPTIONS}>
          {(e) => (
            <TightStack>
              <TextLabel>{e.form}</TextLabel>
              <NoteText>{e.why}</NoteText>
            </TightStack>
          )}
        </For>
      </SpacedStack>
    </CardSurface>
  </SpacedStack>
);
