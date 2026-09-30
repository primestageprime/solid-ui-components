// Payroll board — the SLOPE RAIL (Element 5, Peter 2026-09-24).
//
// Thorcasting's panel D, three panels top to bottom: a SAVINGS GOAL stat card,
// the Gain/Loss Slope gauge filling whatever height is left, and the RUNWAY
// stat card — the top and bottom cards the same MetricCard shape. Composed from
// existing SUI only: FillCardSurface (BuilderBoard's own card), TextTitle,
// GrowCenterColumn around RateGauge (as thorcasting has it), and a MetricCard
// in a non-shrinking box on each side.
//
// Drawn at three rail heights at the width BuilderBoard states today, so the
// height-bound → width-bound switch is visible side by side; the table under
// them is the same arithmetic, headless (`observeProportions`).
//
// Lives in a SUBFOLDER on purpose: the bench discovery glob is
// `workshop/*.tsx`, so a file here is a section, never a bench of its own.
import { type Component, For, type JSX, Show, createSignal } from "solid-js";
import { MetricCard } from "../../../../src/components/DataDisplay";
import {
  ActionSlot,
  GrowCenterColumn,
  TightStack,
  TopClusterRow,
  createBox,
} from "../../../../src/components/Layout";
import { createRateGauge } from "../../../../src/components/RateGauge";
import {
  type CalloutMode,
  calloutModeFor,
  NATURAL_GAUGE_WIDTH,
} from "../../../../src/components/RateGauge/geometry";
import { createSlider } from "../../../../src/components/Slider";
import { FillCardSurface } from "../../../../src/components/Surface";
import { MonoDump, NoteText, TextTitle } from "../../../../src/components/Text";
import {
  formatSavingsGoal,
  runwayReading,
  savingsGoalColor,
  timeToSavingsGoal,
} from "./savings-model";
import {
  BASELINE_LABEL,
  SCENARIO_LABEL,
  HORIZON,
  RUNWAY_GALLERY,
  SAVINGS_GALLERY,
  SLOPE_FIXTURE,
  columnTextsFor,
  gaugeBoxHeight,
  gaugeBoxWidth,
  observeGaugeBoxes,
  observeProportions,
  amountPerMonth,
  perMonth,
  signedPerMonth,
} from "./slope-model";
import { CORNER_BOX, LEADER_BOX, SWEEP_MAX, SWEEP_MIN, observeSweep } from "./sweep-model";

/** The payroll screen's wording, as thorcasting's `toCashflowRateGauge`
 *  words it. */
const SLOPE_WORDING = {
  baselineLabel: BASELINE_LABEL,
  formatAgainst: amountPerMonth,
  formatDelta: signedPerMonth,
};
/** The two gauges a product ships (Peter, 2026-09-24): the gauge never picks
 *  its own callout layout — the LAYOUT picks one of these two. */
const LeaderSlopeGauge = createRateGauge(SLOPE_WORDING);
const CornerSlopeGauge = createRateGauge({ ...SLOPE_WORDING, callouts: "corners" });

/** Bench-only: a rail card of one stated size — standing in for panel D at
 *  one window size. */
const railBox = (width: number, height: number) => ({
  width,
  height,
  Box: createBox({ style: { width: `${width}px`, height: `${height}px` } }),
  // The breakpoint, applied to the gauge box this card leaves — statically,
  // because the bench states its sizes (Peter, 2026-09-24: no SizeSwitch).
  callouts: calloutModeFor(
    { width: gaugeBoxWidth(width), height: gaugeBoxHeight(height) },
    columnTextsFor(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario),
  ),
});
/** Three window heights at the rail BuilderBoard states today. */
const BY_HEIGHT = [
  railBox(NATURAL_GAUGE_WIDTH, 420),
  railBox(NATURAL_GAUGE_WIDTH, 540),
  railBox(NATURAL_GAUGE_WIDTH, 660),
] as const;
/** One tall window, narrow (corners) and wide (leaders). */
const BY_WIDTH = [railBox(240, 600), railBox(340, 600)] as const;

/** One reading every gauge on the section draws — the two sliders' state. */
interface Reading {
  readonly domain: readonly [number, number];
  readonly baseline: number;
  readonly value: number;
  readonly label: string;
}

const RailRow: Component<{ rails: readonly ReturnType<typeof railBox>[]; reading: Reading }> = (
  props,
) => (
  <TopClusterRow>
    <For each={props.rails}>
      {(rail) => (
        <rail.Box data-slope-rail-size={`${rail.width}x${rail.height}`}>
          <SlopeRail callouts={rail.callouts} reading={props.reading} />
        </rail.Box>
      )}
    </For>
  </TopClusterRow>
);

const SAVINGS_LABEL = "Savings goal";
const RUNWAY_LABEL = "Runway";

/** The three panels, exactly as panel D would hold them, with the gauge the
 *  layout picked. The savings card reads the same scenario rate as the gauge. */
export const SlopeRail: Component<{ callouts: CalloutMode; reading: Reading }> = (props) => {
  const savings = () =>
    timeToSavingsGoal({ ...SLOPE_FIXTURE.savings, monthlyGain: props.reading.value });
  return (
    <FillCardSurface data-slope-rail="">
      {/* MetricCard is `height:100%`; in the card's flex column that would
          take the whole rail. A non-shrinking box holds it to its content. */}
      <ActionSlot>
        <MetricCard
          data-slope-savings=""
          label={SAVINGS_LABEL}
          value={formatSavingsGoal(savings())}
          color={savingsGoalColor(savings(), HORIZON.days)}
        />
      </ActionSlot>
      <TextTitle>Gain/Loss Slope</TextTitle>
      <GrowCenterColumn>
        <Show
          when={props.callouts === "corners"}
          fallback={<LeaderSlopeGauge {...props.reading} />}
        >
          <CornerSlopeGauge {...props.reading} />
        </Show>
      </GrowCenterColumn>
      <ActionSlot>
        <MetricCard
          data-slope-runway=""
          label={RUNWAY_LABEL}
          value={SLOPE_FIXTURE.runway.value}
          color={SLOPE_FIXTURE.runway.color}
        />
      </ActionSlot>
    </FillCardSurface>
  );
};

// ── the sliders (Peter, 2026-09-24) ─────────────────────────────────────────
// Scenario and baseline, each over the gauge's whole scale, drive EVERY gauge
// on the section at once — the rails and the side-by-side pair — so the
// labels can be watched as the needles travel and as the scenario crosses
// the baseline (the inversion). Each rail keeps the gauge its box was
// assigned statically by `calloutModeFor` (Peter: no SizeSwitch).

/** A monthly rate, signed. One curry, two sliders. */
const MonthlyRateSlider = createSlider({ format: signedPerMonth });
const sizedBox = (box: { width: number; height: number }) =>
  createBox({ style: { width: `${box.width}px`, height: `${box.height}px` } });
const LeaderBox = sizedBox(LEADER_BOX);
const CornerBox = sizedBox(CORNER_BOX);
const SliderBox = sizedBox({ width: LEADER_BOX.width + CORNER_BOX.width + 8, height: 56 });

// ── the status galleries (Peter, 2026-09-24) ────────────────────────────────
// Every state each stat card can show, side by side, from FIXED example
// inputs — not driven by the sliders. The live cards in the rails above are.

/** A gallery card's own width, so a row of them reads as one strip. */
const GalleryCardBox = createBox({ style: { width: "170px" } });

const SavingsGallery: Component = () => (
  <TopClusterRow data-status-gallery="savings">
    <For each={SAVINGS_GALLERY}>
      {(example) => {
        const reading = timeToSavingsGoal(example.input);
        return (
          <GalleryCardBox data-status={example.name}>
            <MetricCard
              label={SAVINGS_LABEL}
              value={formatSavingsGoal(reading)}
              color={savingsGoalColor(reading, HORIZON.days)}
            />
          </GalleryCardBox>
        );
      }}
    </For>
  </TopClusterRow>
);

const RunwayGallery: Component = () => (
  <TopClusterRow data-status-gallery="runway">
    <For each={RUNWAY_GALLERY}>
      {(example) => {
        const reading = runwayReading(example.input, SLOPE_FIXTURE.minRunwayDays);
        return (
          <GalleryCardBox data-status={example.name}>
            <MetricCard label={RUNWAY_LABEL} value={reading.label} color={reading.color} />
          </GalleryCardBox>
        );
      }}
    </For>
  </TopClusterRow>
);

export const SlopeSection: Component = (): JSX.Element => {
  const [value, setValue] = createSignal(SLOPE_FIXTURE.scenario);
  const [baseline, setBaseline] = createSignal(SLOPE_FIXTURE.baseline);
  const reading: Reading = {
    domain: SLOPE_FIXTURE.domain,
    get baseline() {
      return baseline();
    },
    get value() {
      return value();
    },
    label: SCENARIO_LABEL,
  };
  return (
    <TightStack data-slope-sweep="">
      <TextTitle>Savings · Slope · Runway</TextTitle>
      <NoteText>
        {`Both sliders run ${signedPerMonth(SWEEP_MIN)} to ${signedPerMonth(SWEEP_MAX)} — the gauge's whole scale — and drive every gauge below. Put the scenario on either side of the baseline to see the inversion; equal is the collapsed row.`}
      </NoteText>
      <TopClusterRow>
        <SliderBox>
          <MonthlyRateSlider
            data-slider="scenario"
            label="Scenario"
            value={value()}
            onChange={setValue}
            min={SWEEP_MIN}
            max={SWEEP_MAX}
          />
        </SliderBox>
        <SliderBox>
          <MonthlyRateSlider
            data-slider="baseline"
            label="Baseline"
            value={baseline()}
            onChange={setBaseline}
            min={SWEEP_MIN}
            max={SWEEP_MAX}
          />
        </SliderBox>
      </TopClusterRow>
      <NoteText>
        Rail cards 420 / 540 / 660px tall at BuilderBoard's {NATURAL_GAUGE_WIDTH}px rail. The
        layout picks the leader gauge while its callouts fit beside an arc that fills the
        height, the corner gauge past that (the 660 card).
      </NoteText>
      <RailRow rails={BY_HEIGHT} reading={reading} />
      <NoteText>One 600px-tall card, 240px wide (corners) and 340px wide (leaders).</NoteText>
      <RailRow rails={BY_WIDTH} reading={reading} />
      <NoteText>Side by side, fixed boxes: leaders 320×300, corners 240×395.</NoteText>
      <TopClusterRow>
        <LeaderBox data-sweep-gauge="leaders">
          <LeaderSlopeGauge {...reading} />
        </LeaderBox>
        <CornerBox data-sweep-gauge="corners">
          <CornerSlopeGauge {...reading} />
        </CornerBox>
      </TopClusterRow>
      <MonoDump>{observeSweep([value()], baseline())}</MonoDump>
      <TextTitle>Savings goal — every status</TextTitle>
      <NoteText>
        {`Fixed examples, target $100,000. Orange once the goal date is past the chart's ${HORIZON.label} horizon (${HORIZON.days} days), and for Never.`}
      </NoteText>
      <SavingsGallery />
      <TextTitle>Runway — every status</TextTitle>
      <NoteText>
        {`Fixed examples, ${HORIZON.label} window. Red under the ${SLOPE_FIXTURE.minRunwayDays}-day minimum runway; a run-out at or past it is orange.`}
      </NoteText>
      <RunwayGallery />
      <MonoDump>{observeProportions()}</MonoDump>
      <MonoDump>{observeGaugeBoxes()}</MonoDump>
    </TightStack>
  );
};
