// ChartFrame — Peter's chart visual language: title top left, the y-axis
// title bottom-to-top on the left, fullscreen + the Y-axis strategy split
// button top right. The frame owns no axis state; this page owns the mode
// and prints what each press asked for.
import { type Component, createMemo, createSignal } from "solid-js";
import {
  type CashflowCell,
  FramedCashflowScrubChart,
  StillCashflowScrubChart,
} from "../../src/components/CashflowScrubChart";
import { map } from "../../src/fn";
import { GhostButton } from "../../src/components/Button";
import {
  ChartFrame,
  FillChartFrame,
  YAxisLockDialog,
  type ChartYAxisMode,
  chartYAxisModeInfo,
} from "../../src/components/ChartFrame";
import {
  type FitDomain,
  type YAxisDomain,
  createAxisWaterMarks,
  createYAxisStrategy,
} from "../../src/hooks";
import { FixedHeightBox, TightClusterRow } from "../../src/components/Layout";
import { ThemedNumberInput } from "../../src/components/ThemedNumberInput";
import { MutedBody } from "../../src/components/Text";
import { shellCells } from "./chart-shell";

/** How much the page scales the balances by — "Next data" steps through
 *  them, so the strategy has a peak to hold and a fall to ignore. */
const SCALES = [1, 1.4, 0.8, 0.6];

const scaled = (factor: number): CashflowCell[] =>
  map((c: CashflowCell) => ({ ...c, balanceCents: Math.round(c.balanceCents * factor) }), shellCells);

/** The fit in DOLLARS — the unit the lock dialog's CurrencyInputs edit. The
 *  chart takes cents, so the domain is scaled once, at the chart. */
const balanceFit = (cells: readonly CashflowCell[]): FitDomain => {
  const values = map((c: CashflowCell) => Math.round(c.balanceCents / 100), [...cells]);
  return { min: Math.min(...values), max: Math.max(...values) };
};

const toCents = (dollars: number | undefined): number | undefined =>
  dollars === undefined ? undefined : dollars * 100;

/** G1 — a ScrubChart driven by its FRAME: `FramedCashflowScrubChart` draws no
 *  controls of its own; ChartFrame's split button + `createYAxisStrategy`
 *  decide the domain, which arrives as `yMin` / `yMax`, and the lock dialog
 *  edits the Locked range. */
const StrategyExample: Component = () => {
  const [scaleIndex, setScaleIndex] = createSignal(0);
  const cells = createMemo(() => scaled(SCALES[scaleIndex()]));
  const fit = createMemo(() => balanceFit(cells()));
  const axis = createYAxisStrategy(fit, createAxisWaterMarks(fit));
  const dollars = (value: number) => `$${Math.round(value).toLocaleString()}`;
  const cell = (d: YAxisDomain | null) =>
    d === null ? "—" : `${dollars(d[0])}..${dollars(d[1])}`;
  return (
    <>
      <ChartFrame
        title="Cash balance"
        yTitle="Cash balance ($)"
        yAxisMode={axis.mode()}
        onYAxisModeChange={axis.setMode}
        onYAxisPress={axis.press}
      >
        <FramedCashflowScrubChart
          cells={cells()}
          chartHeight="fill"
          scrub={false}
          showGridlines
          yAxisMode={axis.mode()}
          yMin={toCents(axis.domain()?.[0])}
          yMax={toCents(axis.domain()?.[1])}
        />
      </ChartFrame>
      <TightClusterRow>
        <GhostButton onClick={() => setScaleIndex((scaleIndex() + 1) % SCALES.length)}>
          Next data
        </GhostButton>
        <MutedBody>{`mode ${axis.mode()} · fit ${cell([fit().min, fit().max])} · shown ${cell(axis.domain())} · lock ${cell(axis.lock())}`}</MutedBody>
      </TightClusterRow>
      <YAxisLockDialog
        open={axis.dialogOpen()}
        lock={axis.lock()}
        onLock={axis.setLock}
        onClose={axis.closeDialog}
      />
    </>
  );
};

/** A chart's own control in the header: the Work Mix "Cap" — a toolbar-size
 *  (29px) field, so the header keeps the buttons' height. */
const CapExample: Component = () => {
  const [cap, setCap] = createSignal<number | undefined>(40);
  return (
    <ChartFrame
      title="Work mix"
      yTitle="Hours"
      actions={
        <TightClusterRow>
          <MutedBody>Cap</MutedBody>
          <ThemedNumberInput name="cap" size="sm" value={cap} onChange={setCap} aria-label="Cap" />
        </TightClusterRow>
      }
    >
      <StillCashflowScrubChart cells={shellCells} chartHeight="fill" scrub={false} />
    </ChartFrame>
  );
};

export const ChartFrameShowcase: Component = () => {
  const [mode, setMode] = createSignal<ChartYAxisMode>("auto");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [lastPress, setLastPress] = createSignal("—");
  return (
    <div class="component-section component-section--full">
      <h2>ChartFrame — Composite (Depth 2)</h2>
      <p class="text-meta">
        Every chart's frame: a title, a y-axis title naming the units, a
        fullscreen button, and the Y-axis strategy split button — the main
        face does the current mode's job (shrink to fit, nothing in Full
        auto, edit the lock), the ▾ picks the mode. Stated in-flow height
        (320px); full screen fills the viewport without remounting the chart.
      </p>
      <div class="example-group">
        <h3>A chart in a ChartFrame</h3>
        <ChartFrame
          title="Cash balance"
          yTitle="Cash balance ($)"
          yAxisMode={mode()}
          onYAxisModeChange={setMode}
          onYAxisPress={() => setLastPress(chartYAxisModeInfo(mode()).action)}
          fullscreen={fullscreen()}
          onFullscreenChange={setFullscreen}
        >
          <StillCashflowScrubChart
            cells={shellCells}
            chartHeight="fill"
            scrub={false}
            showGridlines
          />
        </ChartFrame>
        <MutedBody>{`yAxisMode = "${mode()}" · fullscreen = ${fullscreen()} · last press: ${lastPress()}`}</MutedBody>
      </div>
      <div class="example-group">
        <h3>A ScrubChart driven by its frame — createYAxisStrategy + YAxisLockDialog</h3>
        <MutedBody>
          Auto grows with the data and shrinks only on the face; Full auto
          follows the fit; Locked opens the lock dialog, seeded with the range
          on screen. The chart is `FramedCashflowScrubChart` (`chrome: "frame"`):
          no corner switch, range editor or chevron of its own. "Next data"
          rescales the balances.
        </MutedBody>
        <StrategyExample />
      </div>
      <div class="example-group">
        <h3>FillChartFrame — takes a parent of definite height (here FixedHeightBox, 200px)</h3>
        <FixedHeightBox>
          <FillChartFrame title="Payroll" yTitle="Salary ($)">
            <StillCashflowScrubChart cells={shellCells} chartHeight="fill" scrub={false} />
          </FillChartFrame>
        </FixedHeightBox>
      </div>
      <div class="example-group">
        <h3>actions — a Cap field before the frame's buttons</h3>
        <CapExample />
      </div>
      <div class="example-group">
        <h3>No y-axis to manage</h3>
        <ChartFrame title="Hours this week" yTitle="Hours">
          <StillCashflowScrubChart cells={shellCells} chartHeight="fill" scrub={false} />
        </ChartFrame>
      </div>
    </div>
  );
};
