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
    <div class="example-group" data-shell-example="live-toggle">
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
    <div class="example-group" data-shell-example="y-axis-mode">
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

/** A range cone around the balance: ±(4% of the day index) of spread, so it
 *  widens into the future — its upper edge a series, its lower edge the fill
 *  baseline, the way thorcasting draws its projection band. */
const coneLo = (c: CashflowCell, i: number): number => c.balanceCents - i * 12_000;
const coneHi = (c: CashflowCell, i: number): number => c.balanceCents + i * 12_000;

/** Item 3 — Fixed mode holding a range narrower than the data: the line runs
 *  off the top, the cone's lower edge off the bottom, and each clipped edge
 *  gets ONE marker naming the value the reader cannot see. */
const OutOfRangeExample: Component = () => (
  <div class="example-group" data-shell-example="out-of-range">
    <h3>Fixed range: out-of-range markers at both edges</h3>
    <p class="text-meta">
      A fixed <code>yMin</code>/<code>yMax</code> narrower than the data. The
      peak past the top and the trough past the bottom each get a chevron and
      their value — fed by the balance line, every series, and the cone's
      lower edge (its fill baseline).
    </p>
    <StillCashflowScrubChart
      cells={shellCells}
      chartHeight={220}
      scrub={false}
      showGridlines
      yAxisMode="fixed"
      yMin={-200_000}
      yMax={1_000_000}
      balanceSeries={[
        {
          id: "cone",
          balanceCents: coneHi,
          fill: { baseline: coneLo },
        },
      ]}
    />
  </div>
);

export const ChartShellShowcase: Component = () => (
  <div class="component-section component-section--full">
    <h2>Chart shell primitives</h2>
    <p class="text-meta">
      What an app shell needs to keep one persistent chart across pages.
    </p>
    <LiveToggleExample />
    <YAxisModeExample />
    <OutOfRangeExample />
  </div>
);
