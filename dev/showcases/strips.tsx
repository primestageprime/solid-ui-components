import { type Component, createSignal } from "solid-js";
import {
  AmountStrip,
  CadenceStrip,
  EndWindowStrip,
  HoursAmountStrip,
  LabelStrip,
  LargeAmountStrip,
  MonthlyOrAnnualCadenceStrip,
  PayCadenceStrip,
  RecurringCadenceStrip,
  SeatsAmountStrip,
  SmallAmountStrip,
  StartWindowStrip,
  WindowStrip,
  type AmountValue,
  type CadenceValue,
  type WindowValue,
} from "../../src/components/Strips";
import { CodeBlock } from "../../src/components/CodeBlock";
import { SpacedStack } from "../../src/components/Layout/variants";

const show = (value: unknown): string => JSON.stringify(value, null, 2);

export const StripsShowcase: Component = () => {
  const [label, setLabel] = createSignal("Pro licenses");
  const [single, setSingle] = createSignal<AmountValue>({ kind: "single", cents: 10_289_110, per: "year" });
  const [range, setRange] = createSignal<AmountValue>({ kind: "range", min: 800_000, typical: 1_000_000, max: 1_200_000 });
  const [huge, setHuge] = createSignal<AmountValue>({ kind: "range", min: 80_000_000_000, typical: 90_000_000_000, max: 100_000_000_000 });
  const [seats, setSeats] = createSignal<AmountValue>({ kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 });
  const [hours, setHours] = createSignal<AmountValue>({ kind: "units", units: 20, unitPrice: 9_000, perPeriod: 0 });
  const [cadence, setCadence] = createSignal<CadenceValue>({ shape: "annual", anchor: { month: 3, day: 15 } });
  const [pay, setPay] = createSignal<CadenceValue>({ shape: "semimonthly" });
  const [plan, setPlan] = createSignal<CadenceValue>({ shape: "monthly", anchor: 1 });
  const [window, setWindow] = createSignal<WindowValue>({ until: "2027-06-30" });
  const [start, setStart] = createSignal<WindowValue>({});
  const [end, setEnd] = createSignal<WindowValue>({ until: "2027-06-30" });
  const [recurring, setRecurring] = createSignal<CadenceValue>({ shape: "weekly", anchor: 1 });

  return (
    <div class="component-section">
      <h2>Strips — Composites (Depth 2)</h2>
      <p class="text-meta">
        Four strips build a simple form: <b>LabelStrip</b>, <b>AmountStrip</b>,{" "}
        <b>CadenceStrip</b> and <b>WindowStrip</b>. Each edits an engine-neutral
        value (integer cents, ISO dates) and enforces its own rules: a range stays
        ordered, a window's start never passes its end, a cadence offers only
        valid anchors. The value is printed under each strip; a consumer maps it
        to its own wire shape.
      </p>

      <div class="example-group">
        <h3>LabelStrip</h3>
        <SpacedStack>
          <LabelStrip value={label()} onChange={setLabel} />
          <CodeBlock>{show(label())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>AmountStrip: single, per year (shows the derived payment)</h3>
        <SpacedStack>
          <AmountStrip value={single()} onChange={setSingle} periodsPerYear={26} />
          <CodeBlock>{show(single())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>AmountStrip: range (min ≤ typical ≤ max)</h3>
        <SpacedStack>
          <SmallAmountStrip value={range()} onChange={setRange} />
          <CodeBlock>{show(range())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>LargeAmountStrip: range at $1,000,000,000</h3>
        <SpacedStack>
          <LargeAmountStrip value={huge()} onChange={setHuge} />
          <CodeBlock>{show(huge())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>SeatsAmountStrip and HoursAmountStrip: units × price</h3>
        <SpacedStack>
          <SeatsAmountStrip value={seats()} onChange={setSeats} />
          <CodeBlock>{show(seats())}</CodeBlock>
          <HoursAmountStrip value={hours()} onChange={setHours} />
          <CodeBlock>{show(hours())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>CadenceStrip: all eight shapes, compact anchor + popover</h3>
        <SpacedStack>
          <CadenceStrip value={cadence()} onChange={setCadence} />
          <CodeBlock>{show(cadence())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>PayCadenceStrip and MonthlyOrAnnualCadenceStrip: a kind narrows the shapes</h3>
        <SpacedStack>
          <PayCadenceStrip value={pay()} onChange={setPay} />
          <CodeBlock>{show(pay())}</CodeBlock>
          <MonthlyOrAnnualCadenceStrip value={plan()} onChange={setPlan} />
          <CodeBlock>{show(plan())}</CodeBlock>
          <RecurringCadenceStrip value={recurring()} onChange={setRecurring} />
          <CodeBlock>{show(recurring())}</CodeBlock>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>WindowStrip: an open side reads beginning / end of time</h3>
        <SpacedStack>
          <WindowStrip value={window()} onChange={setWindow} />
          <CodeBlock>{show(window())}</CodeBlock>
          <StartWindowStrip value={start()} onChange={setStart} />
          <CodeBlock>{show(start())}</CodeBlock>
          <EndWindowStrip value={end()} onChange={setEnd} />
          <CodeBlock>{show(end())}</CodeBlock>
        </SpacedStack>
      </div>
    </div>
  );
};
