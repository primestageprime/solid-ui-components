// Payroll board — element 7, the CHART VISUAL LANGUAGE (Peter, 2026-09-24):
// every chart has a title top-left, a y-axis title naming its units, and a
// top-right button set — fullscreen, then a Y-axis STRATEGY split button
// (main face = the mode's action, ▾ = choose the mode).
//
// The frame is SUI's `ChartFrame`; this section owns the axis state
// (`createYAxisStrategy` over the water marks) and the lock dialog
// (PrimaryConfirmationModal + two CurrencyInputs).
//
// The demo wraps the Pay levels chart. The "Top raise" control changes the
// data, so the three modes are visibly different: raise it and every mode
// grows; lower it and only Full auto follows it down.
import { type Component, createMemo, createSignal } from "solid-js";
import { map } from "../../../../src/fn";
import { ChartFrame } from "../../../../src/components/ChartFrame";
import { CurrencyInput } from "../../../../src/components/CurrencyInput";
import { SpreadRow, TightStack } from "../../../../src/components/Layout";
import { createLevelsTimeline } from "../../../../src/components/LevelsTimeline";
import { PrimaryConfirmationModal } from "../../../../src/components/Modal";
import { createSegmentedControl } from "../../../../src/components/SegmentedControl";
import { MonoDump, NoteText } from "../../../../src/components/Text";
import {
  DEFAULT_SPAN,
  PAY_EVENTS,
  type PayEvent,
  asThousands,
  spanDomain,
  toTimeline,
} from "./events-model";
import { type YAxisMode, type YDomain, checkLock } from "./chart-strategy";
import { type FitDomain, createAxisWaterMarks } from "./chart-watermarks";
import { createYAxisStrategy } from "./chart-y-axis";

const PayLevelsChart = createLevelsTimeline({ formatValue: asThousands });

/** Bench-only: what the two top raises (raise-p1, raise-p3) pay. */
const TOP_RAISES = [100_000, 110_000, 130_000, 150_000] as const;
const TopRaisePicker = createSegmentedControl({
  options: map(
    (pay: number) => ({ value: String(pay), label: asThousands(pay) }),
    [...TOP_RAISES],
  ),
});

/** The sketch's events with the top raises paying `pay`. */
const withTopRaise = (pay: number): readonly PayEvent[] =>
  map(
    (event: PayEvent): PayEvent => ({
      ...event,
      changes: map(
        (change) => (change.pay === 110_000 ? { ...change, pay } : change),
        [...event.changes],
      ),
    }),
    [...PAY_EVENTS],
  );

/** The data's own y extent, a $10k margin either side. */
const PAY_MARGIN = 10_000;
const fitOf = (values: readonly number[]): FitDomain | null =>
  values.length === 0
    ? null
    : { min: Math.min(...values) - PAY_MARGIN, max: Math.max(...values) + PAY_MARGIN };

const asDomain = (fit: FitDomain | null): YDomain | null =>
  fit === null ? null : [fit.min, fit.max];

const cell = (domain: YDomain | null): string =>
  domain === null ? "—" : `${asThousands(domain[0])}..${asThousands(domain[1])}`;

export const ChartSection: Component = () => {
  const [topRaise, setTopRaise] = createSignal(110_000);
  const domain = spanDomain(DEFAULT_SPAN);
  const timeline = createMemo(() => toTimeline(withTopRaise(topRaise()), domain));
  const fit = createMemo(() =>
    fitOf(map((level) => level.value, [...timeline().levels])),
  );
  const axis = createYAxisStrategy(fit, createAxisWaterMarks(fit));

  // The lock dialog's draft, seeded from the lock each time it opens.
  const [draftMin, setDraftMin] = createSignal<number | undefined>();
  const [draftMax, setDraftMax] = createSignal<number | undefined>();
  const [tried, setTried] = createSignal(false);
  const check = () => checkLock(draftMin(), draftMax());
  const errorOf = (field: "minError" | "maxError"): string | undefined => {
    const result = check();
    return tried() && !result.ok ? result[field] : undefined;
  };
  // The draft is seeded BEFORE the dialog opens: a CurrencyInput that mounts
  // empty did not pick up a value written just after it mounted.
  const seedDraft = (lock: YDomain | null): void => {
    setDraftMin(lock?.[0]);
    setDraftMax(lock?.[1]);
    setTried(false);
  };
  const confirmLock = (): void => {
    setTried(true);
    const result = check();
    if (result.ok) axis.setLock(result.lock);
  };
  const press = (): void => {
    if (axis.mode() === "fixed") seedDraft(axis.lock());
    axis.press();
  };
  const chooseMode = (mode: YAxisMode): void => {
    // Entering fixed seeds the lock with the domain on screen; so does this.
    if (mode === "fixed" && axis.mode() !== "fixed") seedDraft(axis.domain());
    axis.setMode(mode);
  };

  return (
    <TightStack>
      <SpreadRow>
        <NoteText>Element 7 — chart frame. Top raise (bench data):</NoteText>
        <TopRaisePicker
          value={String(topRaise())}
          onValueChange={(value) => setTopRaise(Number(value))}
          aria-label="Top raise"
        />
      </SpreadRow>
      <ChartFrame
        title="Pay levels through the year"
        yTitle="Salary ($)"
        yAxisMode={axis.mode()}
        onYAxisModeChange={chooseMode}
        onYAxisPress={press}
      >
        <PayLevelsChart
          levels={timeline().levels}
          transfers={timeline().transfers}
          mutations={timeline().mutations}
          domain={domain}
          valueDomain={axis.domain() ?? undefined}
        />
      </ChartFrame>
      <MonoDump>
        {`mode ${axis.mode()} | fit ${cell(asDomain(fit()))} | shown ${cell(axis.domain())} | lock ${cell(axis.lock())}`}
      </MonoDump>
      <PrimaryConfirmationModal
        open={axis.dialogOpen()}
        onClose={axis.closeDialog}
        onConfirm={confirmLock}
        title="Lock the y-axis"
        description="The axis stays at this range until you change it or pick another mode."
        confirmLabel="Lock"
      >
        <TightStack>
          <CurrencyInput
            name="y-max"
            label="Y max"
            value={draftMax}
            onChange={setDraftMax}
            errorMessage={errorOf("maxError")}
          />
          <CurrencyInput
            name="y-min"
            label="Y min"
            value={draftMin}
            onChange={setDraftMin}
            errorMessage={errorOf("minError")}
          />
        </TightStack>
      </PrimaryConfirmationModal>
    </TightStack>
  );
};
