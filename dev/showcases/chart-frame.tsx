// ChartFrame — Peter's chart visual language: title top left, the y-axis
// title bottom-to-top on the left, fullscreen + the Y-axis strategy split
// button top right. The frame owns no axis state; this page owns the mode
// and prints what each press asked for.
import { type Component, createSignal } from "solid-js";
import { StillCashflowScrubChart } from "../../src/components/CashflowScrubChart";
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
import { FixedHeightBox } from "../../src/components/Layout";
import { MutedBody } from "../../src/components/Text";
import { shellCells } from "./chart-shell";

/** A fit the page can move, so the strategy has something to hold. */
const PEAKS = [110_000, 130_000, 100_000, 90_000];

/** The y-axis strategy + its lock dialog, driven by ChartFrame's split button. */
const StrategyExample: Component = () => {
  const [peakIndex, setPeakIndex] = createSignal(0);
  const fit = (): FitDomain => ({ min: 60_000, max: PEAKS[peakIndex()] });
  const axis = createYAxisStrategy(fit, createAxisWaterMarks(fit));
  const cell = (d: YAxisDomain | null) => (d === null ? "—" : `${d[0]}..${d[1]}`);
  return (
    <>
      <ChartFrame
        title="Payroll"
        yTitle="Salary ($)"
        yAxisMode={axis.mode()}
        onYAxisModeChange={axis.setMode}
        onYAxisPress={axis.press}
      >
        <MutedBody>{`mode ${axis.mode()} · fit ${cell([fit().min, fit().max])} · shown ${cell(axis.domain())} · lock ${cell(axis.lock())}`}</MutedBody>
      </ChartFrame>
      <GhostButton onClick={() => setPeakIndex((peakIndex() + 1) % PEAKS.length)}>
        Next data peak
      </GhostButton>
      <YAxisLockDialog
        open={axis.dialogOpen()}
        lock={axis.lock()}
        onLock={axis.setLock}
        onClose={axis.closeDialog}
      />
    </>
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
        <h3>createYAxisStrategy + YAxisLockDialog</h3>
        <MutedBody>
          Auto grows with the data and shrinks only on the face; Full auto
          follows the fit; Locked opens the lock dialog, seeded with the range
          on screen. "Next data peak" moves the fit.
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
        <h3>No y-axis to manage</h3>
        <ChartFrame title="Hours this week" yTitle="Hours">
          <StillCashflowScrubChart cells={shellCells} chartHeight="fill" scrub={false} />
        </ChartFrame>
      </div>
    </div>
  );
};
