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

const cells: CashflowCell[] = (() => {
  let running = 0;
  return dailyCells(RANGE_START, RANGE_END).map((cell, i) => {
    const cashflowCents = cashflowAt(i) * 100;
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
})();

const todayIndex = cells.findIndex(
  (c) =>
    PINNED_TODAY.getTime() >= c.start.getTime() &&
    PINNED_TODAY.getTime() < c.end.getTime(),
);

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
