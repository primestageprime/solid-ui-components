// ChartFrame — Peter's chart visual language: title top left, the y-axis
// title bottom-to-top on the left, fullscreen + the Y-axis strategy split
// button top right. The frame owns no axis state; this page owns the mode
// and prints what each press asked for.
import { type Component, createSignal } from "solid-js";
import { StillCashflowScrubChart } from "../../src/components/CashflowScrubChart";
import {
  ChartFrame,
  FillChartFrame,
  type ChartYAxisMode,
  chartYAxisModeInfo,
} from "../../src/components/ChartFrame";
import { FixedHeightBox } from "../../src/components/Layout";
import { MutedBody } from "../../src/components/Text";
import { shellCells } from "./chart-shell";

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
