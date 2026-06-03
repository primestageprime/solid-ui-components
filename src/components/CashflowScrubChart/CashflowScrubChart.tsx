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

import { type Component, createMemo } from "solid-js";
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
  /**
   * Optional fixed upper y-bound, in **cents** (same semantics as
   * `WeeklyCashflowChart.yMax`). When provided (non-null), the chart's upper
   * y-domain is pinned to this value instead of auto-deriving from the running
   * balance — "fixed-range" mode. When `null`/`undefined` (the default), the
   * upper bound is auto-derived as before (no behavior change for current
   * callers). The lower bound is left auto-derived either way, but is always
   * pulled to `≤ 0` so the zero-line stays visible; an explicit `yMax` smaller
   * than the actual peak balance simply clips the top of the line.
   */
  yMax?: number | null;
}

// ── Pure helpers (private — keep the public surface narrow) ─────────────

const fmtDollars = (cents: number): string => {
  const sign = cents < 0 ? "−" : "+";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
};

// Y-axis labels — unsigned dollars with `$` prefix and a `−` for negatives.
const fmtAxisDollars = (cents: number): string => {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const compact =
    abs >= 1_000_000
      ? `${(dollars / 1_000_000).toLocaleString("en-US", {
          maximumFractionDigits: 1,
        })}M`
      : abs >= 1_000
        ? `${(dollars / 1_000).toLocaleString("en-US", {
            maximumFractionDigits: 1,
          })}k`
        : dollars.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return dollars < 0 ? `−$${compact.replace(/^-/, "")}` : `$${compact}`;
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

  // Y-domain is forced to include zero so the zero-line + diverging axis
  // labels read consistently regardless of whether the running balance
  // dips negative. When `yMax` is provided (non-null), the upper bound is
  // pinned to it (fixed-range mode); otherwise it auto-derives from the data.
  const yDomain = createMemo<[number, number]>(() => {
    const manualMax = props.yMax;
    const hasManualMax = manualMax != null;
    if (props.cells.length === 0) return [0, hasManualMax ? manualMax : 1];
    const balances = props.cells.map((c) => c.balanceCents);
    const lower = Math.min(0, ...balances);
    const upper = hasManualMax ? manualMax : Math.max(0, ...balances);
    return [lower, upper];
  });

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
    if (ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const zeroY = yToPlot(0);

    const points = ctx.cells
      .map(
        (c, i) =>
          `${ctx.cellToX(i).toFixed(1)},${yToPlot(c.balanceCents).toFixed(1)}`,
      )
      .join(" ");

    const selectedCell = ctx.cells[ctx.selected];
    const selectedX = ctx.cellToX(ctx.selected);
    const selectedY = yToPlot(selectedCell.balanceCents);

    return (
      <svg
        class="sui-cashflow-scrub-chart__chart"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <line
          class="sui-cashflow-scrub-chart__zero-line"
          x1={ctx.plotLeft}
          x2={ctx.plotRight}
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
          y1={ctx.plotTop}
          y2={ctx.plotBottom}
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
      yDomain={yDomain()}
      formatYLabel={fmtAxisDollars}
      xTickCadence="auto"
      renderCell={renderCashflowCell}
      renderChart={renderBalanceChart}
    />
  );
};
