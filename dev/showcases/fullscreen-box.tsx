// FullscreenBox — the same element toggles in flow ↔ fixed to the viewport,
// so the chart inside never remounts: its fit mode, held axis marks and
// scroll survive the round trip.
import { type Component, createSignal } from "solid-js";
import { FullscreenBox } from "../../src/components/FullscreenBox";
import { StillCashflowScrubChart } from "../../src/components/CashflowScrubChart";
import type { ScrubChartYAxisMode } from "../../src/components/ScrubChart";
import { MutedBody } from "../../src/components/Text";
import { shellCells } from "./chart-shell";

export const FullscreenBoxShowcase: Component = () => {
  const [on, setOn] = createSignal(false);
  const [mode, setMode] = createSignal<ScrubChartYAxisMode>("autoscale");
  return (
    <div class="component-section component-section--full">
      <h2>FullscreenBox — Atomic (Depth 1)</h2>
      <p class="text-meta">
        One element that toggles between in-flow and{" "}
        <code>position: fixed; inset: 0</code>. No portal, so nothing inside
        remounts — pick a y-axis mode, go full screen, come back: the mode
        and the chart instance are the same. Escape closes it; the corner
        holds the toggle (or the caller's own via <code>renderCorner</code>).
      </p>
      <div class="example-group" data-fullscreen-example="chart">
        <h3>A fill-mode chart in a FullscreenBox</h3>
        <div class="fullscreen-box-demo">
          <FullscreenBox fullscreen={on()} onFullscreenChange={setOn}>
            <StillCashflowScrubChart
              cells={shellCells}
              chartHeight="fill"
              scrub={false}
              showGridlines
              yAxisMode={mode()}
              onYAxisModeChange={setMode}
            />
          </FullscreenBox>
        </div>
        <MutedBody>{`fullscreen = ${on()} · yAxisMode = "${mode()}"`}</MutedBody>
      </div>
    </div>
  );
};
