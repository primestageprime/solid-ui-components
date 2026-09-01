import { type Component, createMemo, createSignal } from "solid-js";
import {
  CashflowScrubChart,
  type CashflowCell,
} from "../../src/components/CashflowScrubChart";
import { dailyCells } from "../../src/components/DateAxis";
import { ClusterRow } from "../../src/components/Layout";
import { MutedBody } from "../../src/components/Text";
import { Toggle } from "../../src/components/Toggle";

// Deterministic stub for the demo. Real consumers wire this from their own
// data source — CashflowScrubChart cares only about the per-day `cashflowCents`
// + `balanceCents` it gets in `cells`.
const cashflowAt = (i: number): number =>
  Math.round(
    Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260,
  );

const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-09-30");
const PINNED_TODAY = new Date("2026-05-28");

const buildCells = (start: Date, end: Date): CashflowCell[] => {
  let running = 0;
  return dailyCells(start, end).map((cell, i) => {
    const cashflowCents = cashflowAt(i) * 100;
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
};

const cells = buildCells(RANGE_START, RANGE_END);

// Long range to exercise the auto-cadence ladder — 2.5 years forces quarter
// ticks under the default 12-tick cap.
const LONG_RANGE_START = new Date("2025-01-01");
const LONG_RANGE_END = new Date("2027-06-30");
const longCells = buildCells(LONG_RANGE_START, LONG_RANGE_END);
const longTodayIndex = longCells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

const todayIndex = cells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

// Forecast accessor: a straight-line projection that branches off today's
// actual balance and drifts by a fixed amount per day. Returns null before
// the anchor so the line only renders over the forecast (future) region —
// which also exercises CashflowScrubChart's null-gap line breaking.
const forecast =
  (anchorIdx: number, dailyDriftCents: number) =>
  (_cell: CashflowCell, i: number): number | null => {
    if (i < anchorIdx) return null;
    const base = cells[anchorIdx]?.balanceCents ?? 0;
    return base + (i - anchorIdx) * dailyDriftCents;
  };

// A flat "target" balance set to the mean of the actual running balance, so
// the wiggly actual crosses it repeatedly — green where the actual runs above
// target (surplus), red where it dips below (shortfall).
const meanBalanceCents =
  cells.reduce((sum, c) => sum + c.balanceCents, 0) / Math.max(1, cells.length);
const targetBalance = (_cell: CashflowCell, _i: number): number =>
  meanBalanceCents;

// A scenario that tracks the actual balance EXACTLY — the case `layer` exists
// for. Drawn underneath, the solid primary line covers it completely and the
// chart looks like it only has one line.
const coincidentScenario = (cell: CashflowCell): number => cell.balanceCents;

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const fmtDollars = (cents: number): string => {
  const sign = cents < 0 ? "−" : "+";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

export const CashflowScrubChartShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const cell = createMemo(() => cells[selectedIdx()]);
  const [longSelectedIdx, setLongSelectedIdx] = createSignal(
    Math.max(0, longTodayIndex),
  );
  const [multiSelectedIdx, setMultiSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [labelSelectedIdx, setLabelSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [bandSelectedIdx, setBandSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [coincidentSelectedIdx, setCoincidentSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [draftSelectedIdx, setDraftSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [scenarioOver, setScenarioOver] = createSignal(true);

  return (
    <div class="component-section component-section--full">
      <h2>CashflowScrubChart — Domain Composite (Depth 2)</h2>
      <p class="text-meta">
        Bundles <code>ScrubChart</code> with a baked-in cashflow day-cell
        renderer (date corner + diverging green/red bar + dollar amount) and a
        baked-in running-balance line drawing. Drop in with{" "}
        <code>cells: CashflowCell[]</code> + <code>selected</code> +{" "}
        <code>onScrub</code> — no <code>renderChart</code> /{" "}
        <code>renderCell</code> boilerplate. For a different visualisation on
        the same shape of data, drop down to bare <code>ScrubChart</code>.
      </p>

      <div class="example-group">
        <h3>Zero-config call site</h3>
        <p class="text-meta">
          The entire example below is just the JSX above — no render slots.
          Click an axis cell or drag on the chart to scrub; the translucent
          window band tracks the slice of cells currently visible in the axis
          viewport (inherited from ScrubChart).
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
        />

        <MutedBody>
          Selected:{" "}
          <strong class="cashflow-scrub-chart-demo__strong">
            {fmtDate(cell().start)}
          </strong>
          {" — "}
          Balance:{" "}
          <strong class="cashflow-scrub-chart-demo__strong">
            {fmtDollars(cell().balanceCents)}
          </strong>
          {" · Day cashflow: "}
          <span>{fmtDollars(cell().cashflowCents)}</span>
        </MutedBody>
      </div>

      <div class="example-group">
        <h3>Gridlines at the y-axis ticks</h3>
        <p class="text-meta">
          <code>showGridlines</code> draws a dim horizontal rule across the plot
          at every y-axis tick — the same rules the low-level <code>Chart</code>{" "}
          kit draws through its <code>Grid</code> slot. They read the SAME tick
          set as the y labels, so a rule never sits where no label is, and they
          paint BENEATH the balance line, the overlay series and the deviation
          bands. Solid <code>--sui-border</code>, never dashed: every short dash
          pattern on this chart already means another line type. OPT-IN — every
          other example on this page leaves the prop off and is unchanged.
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          showGridlines
        />
      </div>

      <div class="example-group">
        <h3>Hover crosshair readout</h3>
        <p class="text-meta">
          Enable <code>hover</code> for a transient vertical crosshair that
          follows the pointer, a hollow dot on every line at that day, and a
          tooltip card whose body you supply via <code>renderHoverTooltip</code>
          . Coexists with the persistent scrub selection (click still selects).
          Move the mouse across the chart.
        </p>
        <style>{`
          .demo-hover--optimistic {
            stroke: var(--sui-cashflow-positive, rgba(0, 200, 120, 0.85));
            stroke-width: 1.6;
            stroke-dasharray: 5 4;
          }
        `}</style>
        <CashflowScrubChart
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          hover
          balanceSeries={[
            {
              id: "optimistic",
              label: "Optimistic",
              class: "demo-hover--optimistic",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000),
            },
          ]}
          renderHoverTooltip={(c, i) => {
            const opt = forecast(Math.max(0, todayIndex), 40_000)(c, i);
            return (
              <div class="cashflow-scrub-chart-demo__tip">
                <div class="cashflow-scrub-chart-demo__tip-title">
                  {fmtDate(c.start)}
                </div>
                <div>Baseline: {fmtDollars(c.balanceCents)}</div>
                {opt != null && <div>Optimistic: {fmtDollars(opt)}</div>}
              </div>
            );
          }}
        />
      </div>

      <div class="example-group">
        <h3>Auto x-tick cadence on a long range</h3>
        <p class="text-meta">
          The same component with {longCells.length} daily cells (
          {LONG_RANGE_START.getUTCFullYear()}–{LONG_RANGE_END.getUTCFullYear()}
          ). Per-week ticks would render ~130 labels;{" "}
          <code>xTickCadence="auto"</code>
          walks the week→month→quarter→year ladder and picks the finest unit
          whose tick count fits under the default <code>xMaxTicks=12</code>.
          Here that lands on <strong>quarter</strong>.
        </p>

        <CashflowScrubChart
          cells={longCells}
          selected={longSelectedIdx()}
          onScrub={(i) => setLongSelectedIdx(i)}
          today={PINNED_TODAY}
        />
      </div>

      <div class="example-group">
        <h3>Multiple balance lines (forecast scenarios)</h3>
        <p class="text-meta">
          The same actual running-balance line, plus two projection lines passed
          via <code>balanceSeries</code>. Each is a{" "}
          <code>(cell, index) =&gt; number | null</code> accessor; both return{" "}
          <code>null</code> before <strong>today</strong> so the forecasts only
          render over the future region (the <code>null</code> gap breaks the
          line). Styling is consumer-owned — each series carries a CSS{" "}
          <code>class</code> defined below in a scoped{" "}
          <code>&lt;style&gt;</code>. The y-domain auto-widens to keep the
          optimistic line in frame.
        </p>

        {/* Consumer-owned series styling — exactly how a real caller would
            colour its forecast lines. */}
        <style>{`
          .demo-forecast--optimistic {
            stroke: var(--sui-cashflow-positive, rgba(0, 200, 120, 0.85));
            stroke-width: 1.6;
            stroke-dasharray: 5 4;
          }
          .demo-forecast--pessimistic {
            stroke: var(--sui-cashflow-negative, rgba(230, 70, 70, 0.85));
            stroke-width: 1.6;
            stroke-dasharray: 5 4;
          }
        `}</style>

        <CashflowScrubChart
          cells={cells}
          selected={multiSelectedIdx()}
          onScrub={(i) => setMultiSelectedIdx(i)}
          today={PINNED_TODAY}
          balanceSeries={[
            {
              id: "optimistic",
              label: "Optimistic",
              class: "demo-forecast--optimistic",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000),
            },
            {
              id: "pessimistic",
              label: "Pessimistic",
              class: "demo-forecast--pessimistic",
              balanceCents: forecast(Math.max(0, todayIndex), -20_000),
            },
          ]}
        />

        <ClusterRow>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--actual" />
            Actual
          </span>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--positive" />
            Optimistic (+$400/day)
          </span>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--negative" />
            Pessimistic (−$200/day)
          </span>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Labelled lines</h3>
        <p class="text-meta">
          A series with a <code>label</code> now draws that label on the chart.{" "}
          <code>labelPlacement</code> states a PREFERENCE, not a lock: the chart
          walks <code>body</code> &rarr; <code>right</code> &rarr;{" "}
          <code>below</code> and takes the first zone the text fits. Only an
          explicit zone buys frame space &mdash; <code>"right"</code> widens the
          gutter past the plot, <code>"below"</code> adds a row under the x-axis
          ticks. An <code>"auto"</code> label uses whatever another label bought
          and never creates space itself, so a chart of <code>"auto"</code>
          labels is pixel-identical to one with none. A label that fits nowhere
          is dropped in silence.
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={labelSelectedIdx()}
          onScrub={(i) => setLabelSelectedIdx(i)}
          today={PINNED_TODAY}
          balanceSeries={[
            {
              id: "optimistic",
              label: "Optimistic",
              labelPlacement: "right",
              class: "demo-forecast--optimistic",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000),
            },
            {
              id: "pessimistic",
              label: "Pessimistic",
              labelPlacement: "below",
              class: "demo-forecast--pessimistic",
              balanceCents: forecast(Math.max(0, todayIndex), -20_000),
            },
          ]}
          markers={[
            {
              index: Math.max(0, todayIndex),
              variant: "rule",
              label: "Today",
            },
          ]}
        />
      </div>

      <div class="example-group">
        <h3>Deviation band (target vs actual)</h3>
        <p class="text-meta">
          A <code>Target</code> series with a <code>fill</code> set shades the
          deviation between the target (the comparison line) and the actual —{" "}
          <strong>green</strong> where the target sits above the actual,{" "}
          <strong>red</strong> where it dips below. The band is split at every
          crossing, so each region is one solid colour. The reference defaults
          to the primary line; both band colours are themeable via{" "}
          <code>--sui-cashflow-band-positive</code> /{" "}
          <code>--sui-cashflow-band-negative</code>.
        </p>

        <style>{`
          .demo-target-line {
            stroke: var(--sui-text-secondary, rgba(255, 255, 255, 0.7));
            stroke-width: 1.4;
            stroke-dasharray: 2 3;
          }
        `}</style>

        <CashflowScrubChart
          cells={cells}
          selected={bandSelectedIdx()}
          onScrub={(i) => setBandSelectedIdx(i)}
          today={PINNED_TODAY}
          balanceSeries={[
            {
              id: "target",
              label: "Target",
              class: "demo-target-line",
              balanceCents: targetBalance,
              fill: {
                // baseline defaults to the primary (actual) running balance
              },
            },
          ]}
        />

        <ClusterRow>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-band cashflow-scrub-chart-demo__legend-band--positive" />
            Target above actual
          </span>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-band cashflow-scrub-chart-demo__legend-band--negative" />
            Target below actual
          </span>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--muted" />
            Target line
          </span>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Paint order (coincident lines)</h3>
        <p class="text-meta">
          Overlay series paint in array order <em>beneath</em> the primary
          running-balance line, so a scenario that tracks the actual balance
          exactly is hidden by it — the chart looks like it has one line. Set{" "}
          <code>layer: "over"</code> on a series to lift it above the primary
          instead: the dashes sit on the solid line and <strong>both</strong>{" "}
          read at once. Toggle it below on a scenario whose values are identical
          to the actual.
        </p>

        <style>{`
          /* Deliberately narrower than the primary line (1.6) and a contrasting
             hue, so laid on top the solid line still shows on both sides of
             the dashes — the "both lines read at once" the prop is for. */
          .demo-coincident-line {
            stroke: var(--sui-warning, rgba(245, 158, 11, 0.95));
            stroke-width: 1.2;
            stroke-dasharray: 5 5;
          }
        `}</style>

        <Toggle
          label={'Scenario layer: "over"'}
          checked={scenarioOver()}
          onChange={() => setScenarioOver(!scenarioOver())}
        />

        <CashflowScrubChart
          cells={cells}
          selected={coincidentSelectedIdx()}
          onScrub={(i) => setCoincidentSelectedIdx(i)}
          today={PINNED_TODAY}
          balanceSeries={[
            {
              id: "scenario",
              label: "Scenario (identical to actual)",
              class: "demo-coincident-line",
              balanceCents: coincidentScenario,
              layer: scenarioOver() ? "over" : "under",
            },
          ]}
        />

        <MutedBody>
          {scenarioOver()
            ? 'layer: "over" — the dashed scenario paints over the solid actual, so both lines read.'
            : 'layer: "under" (default) — the solid actual buries the dashed scenario.'}
        </MutedBody>
      </div>

      <div class="example-group">
        <h3>Restyled primary line (draft projection)</h3>
        <p class="text-meta">
          <code>lineClass</code> is the primary line's counterpart of a series{" "}
          <code>class</code>: the class lands on the polyline the chart draws
          itself, next to the base <code>sui-cashflow-scrub-chart__line</code>.
          Here it makes the running balance read as an uncommitted{" "}
          <strong>draft</strong> — dotted and amber — while the ribbon, the dots
          and the axes stay exactly as they are. The class is defined below in a
          scoped <code>&lt;style&gt;</code>; the component keeps no opinion on
          colour or dash.
        </p>

        <style>{`
          /* Consumer-owned styling for the PRIMARY line, via lineClass — a
             dotted "draft" treatment for a projection that is not committed
             yet. */
          .cashflow-scrub-chart-demo__draft-line {
            stroke: var(--sui-warning, rgba(245, 158, 11, 0.95));
            stroke-width: 1.6;
            stroke-dasharray: 2 4;
          }
          .cashflow-scrub-chart-demo__legend-line--draft {
            border-top: 2px dotted var(--sui-warning, rgba(245, 158, 11, 0.95));
          }
        `}</style>

        <CashflowScrubChart
          cells={cells}
          selected={draftSelectedIdx()}
          onScrub={(i) => setDraftSelectedIdx(i)}
          today={PINNED_TODAY}
          lineClass="cashflow-scrub-chart-demo__draft-line"
        />

        <ClusterRow>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--draft" />
            Draft balance (lineClass)
          </span>
          <span>
            <span class="cashflow-scrub-chart-demo__legend-line cashflow-scrub-chart-demo__legend-line--actual" />
            Default primary line
          </span>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Theming hooks</h3>
        <p class="text-meta">
          Visual customisation hangs off CSS variables — no prop knobs on the
          component itself. Set on a parent element to re-skin:
        </p>
        <ul class="text-meta cashflow-scrub-chart-demo__token-list">
          <li>
            <code>--sui-cashflow-positive</code> /{" "}
            <code>--sui-cashflow-negative</code> — bar + amount colour
          </li>
          <li>
            <code>--sui-cashflow-cell-positive-bg</code> /{" "}
            <code>--sui-cashflow-cell-negative-bg</code> — cell background tint
          </li>
          <li>
            <code>--sui-scrub-chart-window-fill</code> /{" "}
            <code>--sui-scrub-chart-window-stroke</code> — inherited from
            ScrubChart, control the window-band overlay
          </li>
        </ul>
      </div>
    </div>
  );
};
