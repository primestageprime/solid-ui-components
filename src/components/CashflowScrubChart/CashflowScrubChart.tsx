// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CashflowScrubChart — Domain Composite (Depth 3).
// Composes `ScrubChart` (Depth 2) with a baked-in cashflow day-cell renderer
// (date corner + diverging green/red bar + dollar amount) and a baked-in
// running-balance line drawing. Zero-config at the call site: consumer just
// passes `cells: CashflowCell[]` + `selected` + `onScrub`.
//
// Compared to `ConversationTree` (the other domain composite that bundles a
// fixed visual experience), CashflowScrubChart is narrower in scope —
// it ships exactly one chart shape (running-balance line) tied to one cell
// payload shape (cashflow + balance in cents). If you need a different
// visualisation on the same date range, drop down to bare `ScrubChart` and
// supply your own `renderChart` / `renderCell`.
// ============================================

import { type Component } from "solid-js";
import { ScrubChart } from "../ScrubChart";
import { type Cell } from "../DateAxis";
import "./CashflowScrubChart.css";

/**
 * Payload shape for each day-cell. `cashflowCents` is the day's net flow
 * (negative for an expense day); `balanceCents` is the cumulative running
 * balance through that day.
 */
export type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

export interface CashflowScrubChartProps {
  cells: CashflowCell[];
  selected: number;
  onScrub: (index: number, cell: CashflowCell) => void;
  /** Date used by the inner DateAxis for the today highlight. */
  today?: Date;
  /** Chart drawing-area height in px. Default 200. */
  chartHeight?: number;
  /** Width of one axis cell in px. Default 60 — matches the cashflow cell content. */
  cellWidth?: number;
}

// ── Pure helpers (private — keep the public surface narrow) ─────────────

const fmtDollars = (cents: number): string => {
  const sign = cents < 0 ? "−" : "+";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

const formatCornerLabel = (cell: CashflowCell): string => {
  const day = cell.start.getUTCDate();
  // First / last day of month gets a "Jun 30" / "Jul 1" style label so the
  // ribbon stays scannable across month boundaries.
  const isFirstOfMonth = day === 1;
  const next = new Date(cell.start.getTime() + 24 * 60 * 60 * 1000);
  const isLastOfMonth = next.getUTCMonth() !== cell.start.getUTCMonth();
  if (isFirstOfMonth || isLastOfMonth) {
    return `${cell.start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    })} ${day}`;
  }
  return String(day);
};

// Magnitude → bar fill fraction (0..1). Hand-tuned to keep typical cashflow
// magnitudes visually informative without saturating on outliers.
const BAR_SCALE_CENTS = 220_000;
const barFraction = (cents: number): number =>
  Math.min(1, Math.abs(cents) / BAR_SCALE_CENTS);

export const CashflowScrubChart: Component<CashflowScrubChartProps> = (
  props,
) => {
  const chartHeight = () => props.chartHeight ?? 200;
  const cellWidth = () => props.cellWidth ?? 60;

  // ── Per-day cell renderer ────────────────────────────────────────────
  const renderCashflowCell = (cell: CashflowCell) => {
    const v = cell.cashflowCents;
    const up = v >= 0;
    const frac = barFraction(v);
    return (
      <div
        class={`sui-cashflow-cell sui-cashflow-cell--${
          up ? "positive" : "negative"
        }`}
      >
        <div class="sui-cashflow-cell__date">{formatCornerLabel(cell)}</div>
        <div class="sui-cashflow-cell__bar-track">
          <div class="sui-cashflow-cell__zero" />
          <div
            class={`sui-cashflow-cell__bar sui-cashflow-cell__bar--${
              up ? "up" : "down"
            }`}
            style={{ height: `${(frac * 50).toFixed(1)}%` }}
          />
        </div>
        <div class="sui-cashflow-cell__amount">{fmtDollars(v)}</div>
      </div>
    );
  };

  // ── Running-balance line chart ───────────────────────────────────────
  const renderBalanceChart = (
    ctx: import("../ScrubChart").ScrubChartContext<CashflowCell>,
  ) => {
    if (ctx.cells.length === 0) return null;
    // Pre-compute y-domain across all cells.
    const balances = ctx.cells.map((c) => c.balanceCents);
    const yMin = Math.min(0, ...balances);
    const yMax = Math.max(0, ...balances);
    const yRange = yMax - yMin || 1;
    const topPad = 12;
    const bottomPad = 16;
    const plotH = ctx.height - topPad - bottomPad;
    const balanceToY = (cents: number): number =>
      ctx.height - bottomPad - ((cents - yMin) / yRange) * plotH;
    const zeroY = balanceToY(0);

    const points = ctx.cells
      .map(
        (c, i) =>
          `${ctx.cellToX(i).toFixed(1)},${balanceToY(c.balanceCents).toFixed(
            1,
          )}`,
      )
      .join(" ");

    const selectedCell = ctx.cells[ctx.selected];
    const selectedX = ctx.cellToX(ctx.selected);
    const selectedY = balanceToY(selectedCell.balanceCents);

    return (
      <svg
        class="sui-cashflow-scrub-chart__chart"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <line
          class="sui-cashflow-scrub-chart__zero-line"
          x1={0}
          x2={ctx.width}
          y1={zeroY}
          y2={zeroY}
        />
        <polyline class="sui-cashflow-scrub-chart__line" points={points} />
        {/* Per-cell dots are deliberately omitted from the line — the line
            alone reads as a smooth running balance, and the selected dot
            below provides the precise anchor. Tradeoff explained in the
            component header. */}
        <line
          class="sui-cashflow-scrub-chart__selected-rule"
          x1={selectedX}
          x2={selectedX}
          y1={topPad}
          y2={ctx.height - bottomPad}
        />
        <circle
          class="sui-cashflow-scrub-chart__selected-dot"
          cx={selectedX}
          cy={selectedY}
          r={4}
        />
      </svg>
    );
  };

  return (
    <ScrubChart<CashflowCell>
      cells={props.cells}
      selected={props.selected}
      onScrub={props.onScrub}
      today={props.today}
      chartHeight={chartHeight()}
      cellWidth={cellWidth()}
      renderCell={renderCashflowCell}
      renderChart={renderBalanceChart}
    />
  );
};
