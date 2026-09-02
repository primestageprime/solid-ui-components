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
//
// `horizonDays` stops the line early. A line that stops inside the plot has
// clear space beside its last point, which is what lets an "auto" label stay
// on the ladder's first rung — see the label examples below.
const forecast =
  (anchorIdx: number, dailyDriftCents: number, horizonDays?: number) =>
  (_cell: CashflowCell, i: number): number | null => {
    if (i < anchorIdx) return null;
    if (horizonDays !== undefined && i > anchorIdx + horizonDays) return null;
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
  const [autoLabelSelectedIdx, setAutoLabelSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [ladderSelectedIdx, setLadderSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [commandedSelectedIdx, setCommandedSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );
  const [hoverEmphasisSelectedIdx, setHoverEmphasisSelectedIdx] = createSignal(
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
  const [hideDomainPins, setHideDomainPins] = createSignal(true);

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
        <h3>A series class reaches every mark it draws</h3>
        <p class="text-meta">
          A series <code>class</code> lands on the polyline AND on that series'
          own dot on the hover crosshair, and <code>lineClass</code> does the
          same for the primary line. Hover the chart to see it. The scenario
          line is green and so is ITS dot — one class, both marks.
        </p>
        <p class="text-meta">
          The two <strong>domain pins</strong> below prove why that matters.
          They are real series whose only job is to hold the y-domain open to a
          fixed extent, and a consumer hides them with{" "}
          <code>stroke: none; fill: none</code> on their own class. Turn the
          toggle off and hover: the lines stay invisible, and two circles appear
          on the crosshair that match nothing in the chart and nothing in the
          tooltip. That was the reported defect — the class stopped at the
          polyline, so an invisible series was still visible on hover. Turn it
          back on and the pins disappear completely.
        </p>
        <style>{`
          .demo-classreach--scenario {
            stroke: var(--sui-cashflow-positive, rgba(0, 200, 120, 0.85));
            stroke-width: 1.6;
          }
          .demo-classreach--pin {
            stroke: none;
            fill: none;
          }
        `}</style>

        <Toggle
          label="Hide the domain pins (their class on every mark)"
          checked={hideDomainPins()}
          onChange={() => setHideDomainPins(!hideDomainPins())}
        />

        <CashflowScrubChart
          cells={cells}
          scrub={false}
          hover
          balanceSeries={[
            {
              id: "scenario",
              class: "demo-classreach--scenario",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000),
            },
            {
              id: "pin-high",
              class: hideDomainPins() ? "demo-classreach--pin" : undefined,
              balanceCents: (c: CashflowCell) => c.balanceCents + 900_000,
            },
            {
              id: "pin-low",
              class: hideDomainPins() ? "demo-classreach--pin" : undefined,
              balanceCents: (c: CashflowCell) => c.balanceCents - 900_000,
            },
          ]}
          renderHoverTooltip={(c) => (
            <div class="cashflow-scrub-chart-demo__tip">
              <div class="cashflow-scrub-chart-demo__tip-title">
                {fmtDate(c.start)}
              </div>
              <div>Baseline: {fmtDollars(c.balanceCents)}</div>
            </div>
          )}
        />

        <MutedBody>
          {hideDomainPins()
            ? "Class on every mark — two lines drawn, two dots on the crosshair, and the pins are gone from both."
            : "Pins unstyled — four lines and four dots. The two outer dots are the marks a hidden series used to leave behind."}
        </MutedBody>
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
        <h3>Labelled lines &mdash; "auto" settles in the body</h3>
        <p class="text-meta">
          A series with a <code>label</code> now draws that label on the chart.{" "}
          <code>labelPlacement</code> states a PREFERENCE, not a lock: the chart
          walks <code>body</code> &rarr; <code>right</code> &rarr;{" "}
          <code>below</code> and takes the first zone the text fits. Every
          series below LEAVES THE PROP OFF, so every label is{" "}
          <code>"auto"</code> &mdash; what a caller gets by default. Each
          scenario also stops at its own horizon (30, 60 and 90 days), so the
          last point of each line has clear space beside it and all three
          captions stay on the first rung, in the plot body, next to the line
          they name. This chart reserves NO frame space: an <code>"auto"</code>{" "}
          label buys none. Its plot is exactly as wide as the first example on
          this page, which carries no labels at all.
        </p>
        <p class="text-meta">
          Point at a label in any chart below. The label names one line, and the
          chart ships no legend, so the hover answers which line. That line
          keeps its full strength and every other line steps back. Move the
          pointer off the label to restore all of them.
        </p>
        <p class="text-meta">
          At rest, a label already takes the colour of the line it names.
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={autoLabelSelectedIdx()}
          onScrub={(i) => setAutoLabelSelectedIdx(i)}
          today={PINNED_TODAY}
          balanceSeries={[
            {
              id: "upside",
              label: "Upside",
              class: "demo-forecast--optimistic",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000, 90),
            },
            {
              id: "downside",
              label: "Downside",
              class: "demo-forecast--pessimistic",
              balanceCents: forecast(Math.max(0, todayIndex), -20_000, 60),
            },
            {
              id: "base",
              label: "Base",
              class: "demo-target-line",
              balanceCents: forecast(Math.max(0, todayIndex), 12_000, 30),
            },
          ]}
        />
      </div>

      <div class="example-group">
        <h3>Labelled lines &mdash; "auto" falls down the ladder</h3>
        <p class="text-meta">
          Only an EXPLICIT zone buys frame space. Here <code>Optimistic</code>{" "}
          asks for <code>"right"</code>, which widens the gutter past the plot
          by that one label's width. The other two labels stay{" "}
          <code>"auto"</code>. <code>Pessimistic</code> stops at its 60-day
          horizon and keeps the body rung, as in the chart above.{" "}
          <code>Target</code> runs to the right edge, where its own flat line
          fills the body box on both sides, so it falls one rung and parks in
          the gutter <code>Optimistic</code> paid for. That is the ladder doing
          its work: the <code>"auto"</code> label reached the gutter only
          because another label bought the gutter. Take the <code>"right"</code>{" "}
          off <code>Optimistic</code> and BOTH gutter labels vanish &mdash; a
          chart of <code>"auto"</code> labels alone never reaches a rung under
          the body.
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={ladderSelectedIdx()}
          onScrub={(i) => setLadderSelectedIdx(i)}
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
              id: "target",
              label: "Target",
              class: "demo-target-line",
              balanceCents: targetBalance,
            },
            {
              id: "pessimistic",
              label: "Pessimistic",
              class: "demo-forecast--pessimistic",
              balanceCents: forecast(Math.max(0, todayIndex), -20_000, 60),
            },
          ]}
        />
      </div>

      <div class="example-group">
        <h3>Labelled lines &mdash; a zone commanded</h3>
        <p class="text-meta">
          Both series name their zone, so neither label chooses.{" "}
          <code>"right"</code> widens the gutter past the plot,{" "}
          <code>"below"</code> adds a row under the x-axis tick labels, and each
          caption goes where it was told. A marker joins the ladder the same
          way, but only with an explicit zone: the <code>Today</code> rule below
          names none, so it keeps the caption at the top of its own rule. A
          label that fits nowhere is dropped in silence.
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={commandedSelectedIdx()}
          onScrub={(i) => setCommandedSelectedIdx(i)}
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
        <h3>Label hover &mdash; which line is this?</h3>
        <p class="text-meta">
          Point at a label. The chart ships no legend, so the hover answers
          which line the label names: that line keeps its FULL strength, and
          every other line, band and marker steps back. Move the pointer off the
          label to restore all of them. At rest, each label already carries the
          colour of the line it names &mdash; the chart reads the resolved
          stroke back from the drawn line, so the four colours below come from
          the consumer&apos;s own classes and nothing else.
        </p>
        <p class="text-meta">
          The primary running-balance line takes its caption from the{" "}
          <code>lineLabel</code> prop &mdash; the counterpart of a series&apos;{" "}
          <code>label</code> for the line the chart draws itself. Without it
          that line carries no label, and no hover can bring it back to full
          strength. <code>Payroll</code> also sets a <code>fill</code>, so its
          deviation band follows its own line&apos;s emphasis.
        </p>

        {/* Four distinct colours: the highlight is easier to read, and each
            label demonstrably takes its own line's colour. */}
        <style>{`
          .demo-hover--payroll {
            stroke: #c084fc;
            stroke-width: 1.6;
          }
          .demo-hover--hiring {
            stroke: #38bdf8;
            stroke-width: 1.6;
            stroke-dasharray: 5 4;
          }
          .demo-hover--runway {
            stroke: #fbbf24;
            stroke-width: 1.6;
          }
        `}</style>

        <CashflowScrubChart
          cells={cells}
          selected={hoverEmphasisSelectedIdx()}
          onScrub={(i) => setHoverEmphasisSelectedIdx(i)}
          today={PINNED_TODAY}
          lineLabel="Actual"
          lineLabelPlacement="right"
          balanceSeries={[
            {
              id: "payroll",
              label: "Payroll",
              class: "demo-hover--payroll",
              balanceCents: forecast(Math.max(0, todayIndex), 40_000, 90),
              fill: {
                // baseline defaults to the primary (actual) running balance
              },
            },
            {
              id: "hiring",
              label: "Hiring",
              class: "demo-hover--hiring",
              balanceCents: forecast(Math.max(0, todayIndex), 12_000, 60),
            },
            {
              id: "runway",
              label: "Runway",
              class: "demo-hover--runway",
              balanceCents: forecast(Math.max(0, todayIndex), -20_000, 30),
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
