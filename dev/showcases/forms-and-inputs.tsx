// Forms and inputs — one real form over one domain object.
//
// Every input here is a field of the SAME record: a recurring cost line on a
// terminal operator's budget. That matters, because these components are only
// distinguishable in context. NameInput looks exactly like ThemedInput until
// you know the value is an entity label rather than the user's own details;
// BigNumberInput is only "big" next to the ordinary inputs it sits beside;
// FormComposite has no appearance at all — it is the arrangement of the other
// three. A page of isolated field demos would show none of that.
//
// The cadence choice drives which schedule picker the form shows, which is
// exactly the variation FormComposite's `schedule` slot exists for.
import { type Component, Show, createMemo, createSignal } from "solid-js";
import { NameInput } from "../../src/components/Inputs";
import { BigNumberInput } from "../../src/components/BigNumberInput";
import { SegmentedInput } from "../../src/components/SegmentedInput";
import { DatePicker } from "../../src/components/DatePicker";
import { FormComposite } from "../../src/components/FormComposite";
import { RangeAmountGroup } from "../../src/components/RangeAmountGroup";
import { ResponsiveMoney } from "../../src/components/ResponsiveMoney";
import { DayOfMonthPicker } from "../../src/components/DayOfMonthPicker";
import { DayOfWeekPicker } from "../../src/components/DayOfWeekPicker";
import { ResizableContainer } from "../../src/components/ResizableContainer";
import { CardSurface } from "../../src/components/Surface";
import {
  ContentStack,
  NarrowStack,
  ClusterRow,
  SpreadRow,
  WrappedClusterRow,
} from "../../src/components/Layout";
import {
  SubsectionTitle,
  TextSublabel,
  TextBody,
  MutedBody,
} from "../../src/components/Text";
import "./forms-and-inputs.css";

// ── The record being edited ──────────────────────────────────────────────────
type Cadence = "monthly" | "weekly" | "once";

const CADENCES = [
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" },
  { id: "once", label: "One-off" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Occurrences per year for each cadence — the form's headline amount is a
// per-occurrence figure, so the annualised total is derived, never entered.
const PER_YEAR: Record<Cadence, number> = { monthly: 12, weekly: 52, once: 1 };

export const FormsAndInputsShowcase: Component = () => {
  const [name, setName] = createSignal("Berth 4 crane lease");
  const [amount, setAmount] = createSignal(18400);
  const [cadence, setCadence] = createSignal<Cadence>("monthly");
  const [dayOfMonth, setDayOfMonth] = createSignal<number | "last" | null>(1);
  const [dayOfWeek, setDayOfWeek] = createSignal<number | null>(1);
  const [onceOn, setOnceOn] = createSignal("2026-09-30");
  const [low, setLow] = createSignal<number | undefined>(16200);
  const [typical, setTypical] = createSignal<number | undefined>(18400);
  const [high, setHigh] = createSignal<number | undefined>(24900);

  // Standalone-section signals, kept apart from the form so poking at a
  // demonstration doesn't silently edit the record above it.
  const [bare, setBare] = createSignal(330285);
  const [euro, setEuro] = createSignal(1234.5);
  const [stepper, setStepper] = createSignal("monthly");
  const [when, setWhen] = createSignal("");

  const annualCents = createMemo(() =>
    Math.round(amount() * 100 * PER_YEAR[cadence()]),
  );

  const scheduleSummary = createMemo(() => {
    if (cadence() === "weekly") {
      const d = dayOfWeek();
      return d === null ? "no weekday chosen" : `every ${WEEKDAYS[d]}`;
    }
    if (cadence() === "once") return onceOn() ? `on ${onceOn()}` : "no date yet";
    const d = dayOfMonth();
    if (d === null) return "no day chosen";
    return d === "last" ? "on the last day of each month" : `on day ${d}`;
  });

  return (
    <div class="component-section component-section--full">
      <h2>Forms and inputs</h2>
      <p class="text-meta">
        One record — a recurring cost line on a terminal operator's budget —
        edited by every input on this page. These components only tell
        themselves apart in a form: NameInput is a text field whose value is an
        entity label, BigNumberInput is the one figure the row is about, and
        FormComposite is not a thing you can see at all, only the arrangement
        of the other two around a schedule picker.
      </p>

      <ContentStack>
        <SubsectionTitle>FormComposite — the whole form</SubsectionTitle>
        <TextSublabel>
          Three slots: <code>identity</code> (the fields that read the same
          whatever the cadence), <code>amounts</code> (an atomic min/typical/max
          trio that must never interleave with the name), and{" "}
          <code>schedule</code> (whichever picker the cadence needs). The blocks
          sit side by side when there's room and stack otherwise — narrow the
          browser and watch the order stay name → amounts → cadence. Switch the
          cadence to swap the schedule slot.
        </TextSublabel>
        <div class="form-demo-frame">
          <CardSurface>
            <NarrowStack>
              <SegmentedInput
                options={CADENCES}
                value={cadence()}
                onChange={(id) => setCadence(id as Cadence)}
              />
              <FormComposite
                identity={
                  <NarrowStack>
                    <NameInput
                      label="Line item"
                      value={name()}
                      onInput={(e) => setName(e.currentTarget.value)}
                    />
                    <TextSublabel>Amount per occurrence</TextSublabel>
                    <BigNumberInput value={amount()} onChange={setAmount} />
                  </NarrowStack>
                }
                amounts={
                  <RangeAmountGroup
                    name="crane-lease"
                    step={100}
                    slots={[
                      { label: "Low", value: low(), onChange: setLow },
                      {
                        label: "Typical",
                        value: typical(),
                        onChange: setTypical,
                      },
                      { label: "High", value: high(), onChange: setHigh },
                    ]}
                  />
                }
                schedule={
                  <NarrowStack>
                    <TextSublabel>Schedule</TextSublabel>
                    <Show when={cadence() === "monthly"}>
                      <DayOfMonthPicker
                        value={dayOfMonth()}
                        onChange={setDayOfMonth}
                        lastOfMonth
                      />
                    </Show>
                    <Show when={cadence() === "weekly"}>
                      <DayOfWeekPicker
                        value={dayOfWeek()}
                        onChange={setDayOfWeek}
                      />
                    </Show>
                    <Show when={cadence() === "once"}>
                      <DatePicker value={onceOn()} onChange={setOnceOn} />
                    </Show>
                  </NarrowStack>
                }
              />
              <SpreadRow>
                <MutedBody>
                  {name()} — {scheduleSummary()}
                </MutedBody>
                <ClusterRow>
                  <TextSublabel>per year</TextSublabel>
                  <div class="form-demo-total">
                    <ResponsiveMoney cents={annualCents()} />
                  </div>
                </ClusterRow>
              </SpreadRow>
            </NarrowStack>
          </CardSurface>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>NameInput</SubsectionTitle>
        <TextSublabel>
          A text field for names that are NOT the user's own details — a line
          item, a scenario, a berth. It layers every anti-autofill defence there
          is (randomised field name, the password-manager opt-out attributes,
          readonly-until-focus) so Chrome's contact popup never covers the form.
          Reach for ThemedInput instead when the value really is the user's own
          name or email and autofill is helping.
        </TextSublabel>
        <div class="form-demo-frame form-demo-frame--narrow">
          <NarrowStack>
            <NameInput label="Scenario name" placeholder="Q3 dredging delay" />
            <NameInput label="Berth label" placeholder="Berth 4 — north wall" />
          </NarrowStack>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>BigNumberInput</SubsectionTitle>
        <TextSublabel>
          The one figure a row is about, edited at headline size. It masks as
          localized currency on blur and hands back a raw{" "}
          <code>number</code> — the symbol, the grouping separators and the
          decimal mark are presentation and never enter the value. Focus a field
          and it drops to the bare editable number so the caret doesn't jump;
          blur it and the mask comes back.
        </TextSublabel>
        <div class="form-demo-frame form-demo-frame--narrow">
          <NarrowStack>
            <TextSublabel>default en-US / USD</TextSublabel>
            <BigNumberInput value={bare()} onChange={setBare} />
            <TextSublabel>locale="de-DE" currency="EUR"</TextSublabel>
            <BigNumberInput
              value={euro()}
              onChange={setEuro}
              locale="de-DE"
              currency="EUR"
            />
            <TextSublabel>align="right", for a column of figures</TextSublabel>
            <BigNumberInput value={amount()} onChange={setAmount} align="right" />
            <MutedBody>
              raw values: {bare()} · {euro()} · {amount()}
            </MutedBody>
          </NarrowStack>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>SegmentedInput</SubsectionTitle>
        <TextSublabel>
          One choice from a short, fixed set — the strip when there is room to
          show every option, the compact stepper when there isn't. The stepper
          is the same control and the same value: chevrons, arrow keys and
          horizontal swipe all step it, clamped at both ends rather than
          wrapping.
        </TextSublabel>
        <div class="form-demo-frame form-demo-frame--narrow">
          <NarrowStack>
            <TextSublabel>strip</TextSublabel>
            <SegmentedInput
              options={CADENCES}
              value={stepper()}
              onChange={setStepper}
            />
            <TextSublabel>compact stepper — same options, same value</TextSublabel>
            <WrappedClusterRow>
              <SegmentedInput
                options={CADENCES}
                value={stepper()}
                onChange={setStepper}
                compact
              />
              <MutedBody>{stepper()}</MutedBody>
            </WrappedClusterRow>
          </NarrowStack>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>DatePicker</SubsectionTitle>
        <TextSublabel>
          A date that always READS as ISO YYYY-MM-DD at a fixed width, whatever
          the browser's locale would have shown. The native input is still
          there, stretched invisibly over the control, so clicking anywhere
          opens the OS calendar and keyboard entry works — only the display is
          ours. Empty renders the placeholder rather than collapsing.
        </TextSublabel>
        <div class="form-demo-frame form-demo-frame--narrow">
          <NarrowStack>
            <ClusterRow>
              <DatePicker value={when()} onChange={setWhen} />
              <MutedBody>{when() || "unset"}</MutedBody>
            </ClusterRow>
            <ClusterRow>
              <DatePicker value={onceOn()} onChange={setOnceOn} />
              <MutedBody>the form's one-off date, shared</MutedBody>
            </ClusterRow>
          </NarrowStack>
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>ResponsiveMoney</SubsectionTitle>
        <TextSublabel>
          A figure that abbreviates rather than truncating when its box is
          squeezed: $12,345,678 → $12,346k → $12.3m. The abbreviation is
          view-only — callers keep passing exact integer cents and nothing is
          ever rounded but the display, which is why the annualised total in
          the form above can sit in a 7rem summary slot without being reduced
          to an ellipsis. KNOWN DEFECT (2026-07-27): the control measures its
          OWN box, which is <code>inline-flex</code> and therefore shrinks to
          whatever it just rendered, so each step down narrows the budget again
          and it settles on the LAST rung regardless of the room available —
          the two frames below both show the narrowest form. It needs to
          measure the space its parent offers instead. Left visible here rather
          than staged around, because the gallery is where that gets caught.
        </TextSublabel>
        <NarrowStack>
          <ResizableContainer
            directions={["right"]}
            initialWidth={260}
            initialHeight={48}
            minWidth={48}
            maxWidth={420}
          >
            <ResponsiveMoney cents={1234567800} />
          </ResizableContainer>
          <TextBody>
            A negative value keeps its sign ahead of the symbol at every rung,
            so the minus never collides with the grouped digits:
          </TextBody>
          <ResizableContainer
            directions={["right"]}
            initialWidth={260}
            initialHeight={48}
            minWidth={48}
            maxWidth={420}
          >
            <ResponsiveMoney cents={-874200} />
          </ResizableContainer>
        </NarrowStack>
      </ContentStack>
    </div>
  );
};
