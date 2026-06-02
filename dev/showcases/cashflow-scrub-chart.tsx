import { type Component, createMemo, createSignal } from "solid-js";
import {
  CashflowScrubChart,
  type CashflowCell,
} from "../../src/components/CashflowScrubChart";
import { dailyCells } from "../../src/components/DateAxis";

// Deterministic stub for the demo. Real consumers wire this from their own
// data source — CashflowScrubChart cares only about the per-day `cashflowCents`
// + `balanceCents` it gets in `cells`.
const cashflowAt = (i: number): number =>
  Math.round(
    Math.sin(i / 3.5) * 1100 +
      Math.sin(i / 1.6) * 480 +
      Math.sin(i / 13) * 260,
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
  const [bandSelectedIdx, setBandSelectedIdx] = createSignal(
    Math.max(0, todayIndex),
  );

  return (
    <div class="component-section component-section--full">
      <h2>CashflowScrubChart — Domain Composite (Depth 3)</h2>
      <p class="text-meta">
        Bundles <code>ScrubChart</code> with a baked-in cashflow day-cell
        renderer (date corner + diverging green/red bar + dollar amount) and
        a baked-in running-balance line drawing. Drop in with{" "}
        <code>cells: CashflowCell[]</code> +{" "}
        <code>selected</code> + <code>onScrub</code> — no{" "}
        <code>renderChart</code> / <code>renderCell</code> boilerplate. For a
        different visualisation on the same shape of data, drop down to bare{" "}
        <code>ScrubChart</code>.
      </p>

      <div class="example-group">
        <h3>Zero-config call site</h3>
        <p class="text-meta">
          The entire example below is just the JSX above — no render slots.
          Click an axis cell or drag on the chart to scrub; the translucent
          window band tracks the slice of cells currently visible in the
          axis viewport (inherited from ScrubChart).
        </p>

        <CashflowScrubChart
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
        />

        <div
          style={{
            "margin-top": "16px",
            "font-size": "13px",
            color: "var(--sui-text-secondary)",
          }}
        >
          Selected:{" "}
          <strong style={{ color: "var(--sui-text-primary)" }}>
            {fmtDate(cell().start)}
          </strong>
          {" — "}
          Balance:{" "}
          <strong style={{ color: "var(--sui-text-primary)" }}>
            {fmtDollars(cell().balanceCents)}
          </strong>
          {" · Day cashflow: "}
          <span>{fmtDollars(cell().cashflowCents)}</span>
        </div>
      </div>

      <div class="example-group">
        <h3>Auto x-tick cadence on a long range</h3>
        <p class="text-meta">
          The same component with {longCells.length} daily cells (
          {LONG_RANGE_START.getUTCFullYear()}–{LONG_RANGE_END.getUTCFullYear()}).
          Per-week ticks would render ~130 labels; <code>xTickCadence="auto"</code>
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
          The same actual running-balance line, plus two projection lines
          passed via <code>balanceSeries</code>. Each is a{" "}
          <code>(cell, index) =&gt; number | null</code> accessor; both return{" "}
          <code>null</code> before <strong>today</strong> so the forecasts
          only render over the future region (the <code>null</code> gap breaks
          the line). Styling is consumer-owned — each series carries a CSS{" "}
          <code>class</code> defined below in a scoped <code>&lt;style&gt;</code>.
          The y-domain auto-widens to keep the optimistic line in frame.
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

        <div
          style={{
            "margin-top": "12px",
            display: "flex",
            gap: "18px",
            "font-size": "12px",
            color: "var(--sui-text-secondary)",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: "18px",
                "border-top": "2px solid var(--sui-accent, #00a8cc)",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Actual
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: "18px",
                "border-top":
                  "2px dashed var(--sui-cashflow-positive, rgba(0,200,120,0.85))",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Optimistic (+$400/day)
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: "18px",
                "border-top":
                  "2px dashed var(--sui-cashflow-negative, rgba(230,70,70,0.85))",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Pessimistic (−$200/day)
          </span>
        </div>
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

        <div
          style={{
            "margin-top": "12px",
            display: "flex",
            gap: "18px",
            "font-size": "12px",
            color: "var(--sui-text-secondary)",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "10px",
                background: "var(--sui-cashflow-band-positive, rgba(0,200,120,0.18))",
                border: "1px solid var(--sui-cashflow-positive, rgba(0,200,120,0.85))",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Target above actual
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "10px",
                background: "var(--sui-cashflow-band-negative, rgba(230,70,70,0.18))",
                border: "1px solid var(--sui-cashflow-negative, rgba(230,70,70,0.85))",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Target below actual
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: "18px",
                "border-top": "2px dashed var(--sui-text-secondary, rgba(255,255,255,0.7))",
                "vertical-align": "middle",
                "margin-right": "6px",
              }}
            />
            Target line
          </span>
        </div>
      </div>

      <div class="example-group">
        <h3>Theming hooks</h3>
        <p class="text-meta">
          Visual customisation hangs off CSS variables — no prop knobs on the
          component itself. Set on a parent element to re-skin:
        </p>
        <ul class="text-meta" style={{ "padding-left": "20px" }}>
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
