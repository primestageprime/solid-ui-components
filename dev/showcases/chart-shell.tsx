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
import type {
  ScrubChartYAxisMode,
  ScrubChartYRange,
} from "../../src/components/ScrubChart";
import {
  BuilderBoardBelowChart,
  builderBoardBelowChart,
  observeBuilderBoardBelowChart,
} from "../../src/components/BuilderBoard";
import { CodeBlock } from "../../src/components/CodeBlock";
import { calloutModeFor } from "../../src/components/RateGauge";
import { MutedBody } from "../../src/components/Text";
import { Toggle } from "../../src/components/Toggle";

/** The words a gauge in D would say — what `calloutModeFor` sizes against. */
const GAUGE_LABELS = ["Current $1,240,000", "Baseline $1,100,000"];

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

/** Items 3 + 4 — Fixed mode holding a range narrower than the data: the
 *  line runs off the top, the cone's lower edge off the bottom, and each
 *  clipped edge gets ONE marker. Click the y-axis to edit the range inline. */
const FixedRangeExample: Component = () => {
  const [range, setRange] = createSignal<ScrubChartYRange>({
    min: -200_000,
    max: 1_000_000,
  });
  return (
    <div class="example-group" data-shell-example="out-of-range">
      <h3>Fixed range: out-of-range markers + inline range editor</h3>
      <p class="text-meta">
        A fixed range narrower than the data. The peak past the top and the
        trough past the bottom each get a chevron and their value — fed by the
        balance line, every series, and the cone's lower edge (its fill
        baseline). <strong>Click the y-axis</strong> to edit the range: Max
        and Min in dollars, Enter applies, Escape cancels;{" "}
        <code>onYRangeChange</code> emits cents.
      </p>
      <StillCashflowScrubChart
        cells={shellCells}
        chartHeight={220}
        scrub={false}
        showGridlines
        yAxisMode="fixed"
        yMin={range().min}
        yMax={range().max}
        onYRangeChange={setRange}
        balanceSeries={[
          { id: "cone", balanceCents: coneHi, fill: { baseline: coneLo } },
        ]}
      />
      <MutedBody>{`range = { min: ${range().min}, max: ${range().max} } (cents)`}</MutedBody>
    </div>
  );
};

/** Item 6 — a builder page under the shell chart. The frame stands in for
 *  the window below the tab bar (tabBarH 0 here); the chart height asked for
 *  is thorcasting's Q7 share (30% of the space). The pure core picks SPLIT
 *  when the top half holds the chart's floor (220) + B's floor (156) and the
 *  window is at least 900 wide; otherwise STACKED, and the page scrolls. */
const belowInputFor = (width: number, height: number) => ({
  viewport: { width, height },
  tabBarH: 0,
  chartH: 0.3 * height,
  legendH: 0,
});
const SPLIT_FRAME = belowInputFor(1100, 900);
const STACKED_FRAME = belowInputFor(1100, 640);

const BelowChartBoard: Component<{ input: ReturnType<typeof belowInputFor> }> = (
  props,
) => {
  const rects = () => builderBoardBelowChart(props.input);
  return (
    <>
      <CodeBlock size="sm">{observeBuilderBoardBelowChart(props.input)}</CodeBlock>
      <div
        class={
          rects().layout === "split"
            ? "chart-shell-demo__frame chart-shell-demo__frame--split"
            : "chart-shell-demo__frame"
        }
      >
        <StillCashflowScrubChart
          cells={shellCells}
          chartHeight={rects().chartH}
          scrub={false}
          showGridlines
          yAxisMode="auto"
        />
        <BuilderBoardBelowChart
          rects={rects()}
          panelB={<MutedBody>B — the series being changed</MutedBody>}
          panelC={<MutedBody>C — the changes</MutedBody>}
          panelD={(box) => (
            <MutedBody>{`D — rail · box ${box().width}×${box().height} · gauge: ${calloutModeFor(box(), GAUGE_LABELS)}`}</MutedBody>
          )}
        />
      </div>
    </>
  );
};

const BelowChartExample: Component = () => (
  <div class="example-group" data-shell-example="below-chart">
    <h3>BuilderBoardBelowChart — B and C|D under the shell chart</h3>
    <p class="text-meta">
      Panel A is the shell's chart, so the board draws B and C|D. Neither
      floor is sacrificed: when the top half cannot hold the chart's 220 and
      B's 156 (or the window is under 900 wide) the board STACKS and the page
      scrolls. The pure <code>builderBoardBelowChart</code> decides; its
      observation is printed above each board. A 1100×900 window (split):
    </p>
    <BelowChartBoard input={SPLIT_FRAME} />
    <p class="text-meta">The same board in a 1100×640 window (stacked):</p>
    <BelowChartBoard input={STACKED_FRAME} />
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
    <FixedRangeExample />
    <BelowChartExample />
  </div>
);
