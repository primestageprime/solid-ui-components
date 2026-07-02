import { type Component, createMemo, createSignal, For } from "solid-js";
import { ScrubChart } from "../../src/components/ScrubChart";
import { dailyCells, type Cell } from "../../src/components/DateAxis";
import { cashflowAt, cashflowDayCell, fmtDollars } from "./cashflow-day-cell";

type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

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

const balances = cells.map((c) => c.balanceCents);
const yMin = Math.min(0, ...balances);
const yMax = Math.max(0, ...balances);
const yRange = yMax - yMin || 1;

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const renderCashflowChart = (
  ctx: import("../../src/components/ScrubChart").ScrubChartContext<CashflowCell>,
) => {
  const balanceToY = (cents: number): number =>
    ctx.height - 24 - ((cents - yMin) / yRange) * (ctx.height - 40);
  const points = ctx.cells
    .map(
      (c, i) =>
        `${ctx.cellToX(i).toFixed(1)},${balanceToY(c.balanceCents).toFixed(1)}`,
    )
    .join(" ");
  const zeroY = balanceToY(0);
  const selectedCell = ctx.cells[ctx.selected];
  return (
    <svg
      viewBox={`0 0 ${ctx.width} ${ctx.height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <line
        x1={0}
        x2={ctx.width}
        y1={zeroY}
        y2={zeroY}
        stroke="var(--sui-border)"
        stroke-dasharray="4 4"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--sui-accent)"
        stroke-width={1.6}
      />
      <circle
        cx={ctx.cellToX(ctx.selected)}
        cy={balanceToY(selectedCell.balanceCents)}
        r={4}
        fill="var(--sui-warning, #f5a623)"
      />
    </svg>
  );
};

export const ScrubChartShowcase: Component = () => {
  const [selectedIdx, setSelectedIdx] = createSignal(Math.max(0, todayIndex));
  const cell = createMemo(() => cells[selectedIdx()]);

  return (
    <div class="component-section component-section--full">
      <h2>ScrubChart — Composite (Depth 1)</h2>
      <p class="text-meta">
        Linear-scale overview chart paired with a <code>DateAxis</code>. The
        chart slot renders all {cells.length} cells at uniform pixel pitch (
        <code>ctx.cellToX(i)</code> = <code>(i + 0.5) × dayPitch</code>); the
        axis below scrolls horizontally at its own cell width. ScrubChart draws
        a translucent <strong>window</strong> overlay across the slice of cells
        currently visible in the axis viewport — classic overview + detail.
        Click an axis cell or drag on the chart to scrub; the axis auto-scrolls
        to keep the selected cell centred, so the window follows the selection
        too. Generic over <code>C extends Cell</code>; consumers attach payload
        directly.
      </p>

      <div class="example-group">
        <h3>Base ScrubChart — daily cashflow line</h3>
        <p class="text-meta">
          Chart shows the full {cells.length}-day running-balance curve; the
          axis below is horizontally scrollable, one content-sized day-cell per
          day. The amber dot anchors the selected day's exact balance value
          inside the window.
        </p>

        <ScrubChart<CashflowCell>
          cells={cells}
          selected={selectedIdx()}
          onScrub={(i) => setSelectedIdx(i)}
          today={PINNED_TODAY}
          renderCell={cashflowDayCell}
          renderChart={renderCashflowChart}
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
            {fmtDollars(cell().balanceCents / 100)}
          </strong>
          {" · Day cashflow: "}
          <span>{fmtDollars(cell().cashflowCents / 100)}</span>
        </div>
      </div>

      <div class="example-group">
        <h3>Window mechanics</h3>
        <p class="text-meta">
          The blue band on the chart spans the cells currently visible in the
          DateAxis below. Scrolling the axis horizontally slides the band;
          clicking a cell or dragging on the chart scrubs the selection and the
          axis auto-scrolls to centre it, so the band tracks the selection too.
          The band is rendered by ScrubChart from the inner DateAxis's scroll
          position; consumers don't need to wire it themselves.
        </p>
        <p class="text-meta">
          Per-day data inside the band is the consumer's responsibility — the
          <code>renderChart</code> ctx exposes <code>cellToX(i)</code>,{" "}
          <code>cellBounds(i)</code>, <code>windowCells</code>, and{" "}
          <code>windowBounds</code> so you can plot lines, bars, or any other
          SVG drawing at the correct linear positions.
        </p>
      </div>
    </div>
  );
};
