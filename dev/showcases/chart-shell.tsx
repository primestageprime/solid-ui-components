// Chart-shell primitives — the pieces an app shell needs to keep ONE chart
// alive across every page: props toggled on a live instance, the three-mode
// y-axis switch, fixed-mode out-of-range markers, the inline range editor,
// the fullscreen box, and the builder board that sits below a shell chart.
import { type Component, createSignal } from "solid-js";
import {
  StillCashflowScrubChart,
  type CashflowCell,
} from "../../src/components/CashflowScrubChart";
import { dailyCells } from "../../src/components/DateAxis";
import type { ScrubChartYAxisMode } from "../../src/components/ScrubChart";
import { MutedBody } from "../../src/components/Text";
import { Toggle } from "../../src/components/Toggle";

const cashflowAt = (i: number): number =>
  Math.round(
    Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260,
  );

const buildCells = (): CashflowCell[] => {
  let running = 0;
  return dailyCells(new Date("2026-05-01"), new Date("2026-09-30")).map(
    (cell, i) => {
      const cashflowCents = cashflowAt(i) * 100;
      running += cashflowCents;
      return { ...cell, cashflowCents, balanceCents: running };
    },
  );
};

export const shellCells = buildCells();

/** Item 1 — one instance, the Timeline config and the plain one toggled. */
const LiveToggleExample: Component = () => {
  const [timeline, setTimeline] = createSignal(false);
  const [selected, setSelected] = createSignal(20);
  return (
    <div class="example-group">
      <h3>One instance, scrub layer toggled live</h3>
      <p class="text-meta">
        <code>scrub</code>, <code>cellWidth</code>, <code>selected</code> and{" "}
        <code>onScrub</code> change under the SAME chart. The frame never
        remounts, so held axis state, the fit mode and the tweens survive a
        page switch.
      </p>
      <Toggle
        label="Timeline config (scrub + ribbon + selection)"
        checked={timeline()}
        onChange={() => setTimeline(!timeline())}
      />
      <StillCashflowScrubChart
        cells={shellCells}
        scrub={timeline()}
        cellWidth={timeline() ? 72 : undefined}
        selected={timeline() ? selected() : undefined}
        onScrub={timeline() ? (i) => setSelected(i) : undefined}
        chartHeight={220}
        showGridlines
      />
      <MutedBody>
        {timeline() ? `Timeline — day ${selected()} selected` : "Plain series"}
      </MutedBody>
    </div>
  );
};

/** Item 2 — the three-mode y-axis switch in the origin corner. The chart only
 *  SHOWS the mode; this showcase states a toy policy for the domain: Auto and
 *  Fit use the chart's own fitted domain, Fixed holds a stated range. */
const YAxisModeExample: Component = () => {
  const [mode, setMode] = createSignal<ScrubChartYAxisMode>("auto");
  return (
    <div class="example-group">
      <h3>Y-axis mode switch (Auto | Fixed | Fit)</h3>
      <p class="text-meta">
        <code>yAxisMode</code> + <code>onYAxisModeChange</code> put a
        three-segment switch in the axis origin corner, in place of the y-fit
        button. Controlled: the app owns the mode and the domain each mode
        implies. Hover a segment for what it does.
      </p>
      <StillCashflowScrubChart
        cells={shellCells}
        chartHeight={220}
        showGridlines
        scrub={false}
        yAxisMode={mode()}
        onYAxisModeChange={setMode}
        yMin={mode() === "fixed" ? -500_000 : undefined}
        yMax={mode() === "fixed" ? 2_000_000 : undefined}
      />
      <MutedBody>{`yAxisMode = "${mode()}"`}</MutedBody>
    </div>
  );
};

export const ChartShellShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>Chart shell primitives</h2>
    <p class="text-meta">
      What an app shell needs to keep one persistent chart across pages.
    </p>
    <LiveToggleExample />
    <YAxisModeExample />
  </div>
);
