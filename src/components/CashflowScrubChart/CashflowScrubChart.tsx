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
//
// The day-cell ribbon stays single-account (one diverging bar + amount per
// day, driven by `cell.cashflowCents`). When you need to overlay more than
// one balance line on the chart — scenario forecasts, a prior period, a
// second account's running balance — pass `balanceSeries`. Each entry is a
// `(cell, index) => number | null` accessor (null breaks the line into a
// gap) plus a CSS class for styling; the y-domain widens to span them all.
// ============================================

import { type Component, For, createMemo } from "solid-js";
import { ScrubChart } from "../ScrubChart";
import { type Cell } from "../DateAxis";
import { buildDeviationBand } from "./deviationBand";
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

/**
 * Draws a deviation band between this series and a reference line (the primary
 * running-balance line by default), coloured by the sign of the deviation:
 * `positiveClass` where this series runs ABOVE the reference, `negativeClass`
 * where it dips below. Defaults read as a surplus/shortfall chart — green
 * where the series exceeds the reference, red where it falls short. The band
 * is split at every crossing so the colour flips exactly where the lines meet.
 */
export interface CashflowSeriesFill {
  /** Reference line the deviation is measured against. Defaults to the primary
   *  running-balance line (`cell.balanceCents`). Return `null` to break the
   *  band over a cell. */
  baseline?: (cell: CashflowCell, index: number) => number | null;
  /** CSS class for the region where the series is above the reference
   *  (positive deviation). Falls back to the default green band style. */
  positiveClass?: string;
  /** CSS class for the region where the series is below the reference
   *  (negative deviation). Falls back to the default red band style. */
  negativeClass?: string;
}

/**
 * An extra balance line overlaid on the running-balance chart, in addition to
 * the primary line drawn from `cell.balanceCents`. Useful for scenario
 * forecasts, a prior period, or a second account's running balance.
 */
export interface CashflowBalanceSeries {
  /** Stable identity — used to key the rendered line. */
  id: string;
  /** Human-readable label (legend / a11y). Optional. */
  label?: string;
  /** CSS class added to the polyline alongside the base line class.
   *  Color / dash / opacity are the consumer's to define on this class. */
  class?: string;
  /** Balance in cents for the cell at `index`, or `null` to break the line
   *  (e.g. to draw a forecast only for cells after `today`). */
  balanceCents: (cell: CashflowCell, index: number) => number | null;
  /** When set, shade the variance between this series and a baseline line,
   *  green where this series is higher and red where lower. */
  fill?: CashflowSeriesFill;
}

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
  /** Extra balance lines overlaid on the chart. The y-domain widens to span
   *  their values. Drawn beneath the primary running-balance line. */
  balanceSeries?: CashflowBalanceSeries[];
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

// Magnitude → bar fill fraction (0..1), LINEAR against the largest |cashflow|
// across the strip so bar heights are proportionate to their amounts (a fixed
// clamp made a $1.7k bar read as 80% of an $8.4k bar). Tiny non-zero days keep
// a 4% floor so they stay distinguishable from true-zero (bar-less) days.
const BAR_MIN_FRACTION = 0.04;
const barFraction = (cents: number, maxAbsCents: number): number => {
  if (cents === 0 || maxAbsCents <= 0) return 0;
  return Math.max(BAR_MIN_FRACTION, Math.abs(cents) / maxAbsCents);
};

// Map a balance accessor over the cells into one or more polyline point
// strings, splitting on every `null` so a gap breaks the line rather than
// connecting across it. Pure: same cells + accessor → same segments.
const buildLineSegments = (
  cells: CashflowCell[],
  cellToX: (i: number) => number,
  yToPlot: (cents: number) => number,
  value: (cell: CashflowCell, index: number) => number | null,
): string[] => {
  const segments: string[] = [];
  let current: string[] = [];
  cells.forEach((cell, i) => {
    const v = value(cell, i);
    if (v == null) {
      if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
      return;
    }
    current.push(`${cellToX(i).toFixed(1)},${yToPlot(v).toFixed(1)}`);
  });
  if (current.length > 0) segments.push(current.join(" "));
  return segments;
};

export const CashflowScrubChart: Component<CashflowScrubChartProps> = (
  props,
) => {
  const chartHeight = () => props.chartHeight ?? 200;
  const cellWidth = () => props.cellWidth ?? 60;

  // Y-domain is forced to include zero so the zero-line + diverging axis
  // labels read consistently regardless of whether the running balance
  // dips negative. The domain spans the primary balance plus every extra
  // series so no overlaid line clips. When `yMax` is provided (non-null) the
  // upper bound is instead pinned to it (fixed-range mode); the lower bound is
  // always auto-derived and pulled to ≤ 0 so the zero-line stays visible.
  const yDomain = createMemo<[number, number]>(() => {
    const manualMax = props.yMax;
    const hasManualMax = manualMax != null;
    if (props.cells.length === 0) return [0, hasManualMax ? manualMax : 1];
    const series = props.balanceSeries ?? [];
    const values = props.cells.flatMap((c, i) => [
      c.balanceCents,
      ...series
        .map((s) => s.balanceCents(c, i))
        .filter((v): v is number => v != null),
    ]);
    // Reduce (not Math.min(...spread)) to stay safe on long ranges.
    const lo = values.reduce((m, v) => Math.min(m, v), 0);
    const hi = hasManualMax
      ? manualMax
      : values.reduce((m, v) => Math.max(m, v), 0);
    return [lo, hi];
  });

  // Largest |cashflow| across the strip — the 100%-height reference bar.
  const maxAbsCashflow = createMemo(() =>
    props.cells.reduce((m, c) => Math.max(m, Math.abs(c.cashflowCents)), 0),
  );

  // ── Per-day cell renderer ────────────────────────────────────────────
  const renderCashflowCell = (cell: CashflowCell) => {
    const v = cell.cashflowCents;
    // Exactly-zero days get a neutral/grey treatment: no colour tint, no bar,
    // no amount label. Non-zero positive = green, non-zero negative = red.
    const isZero = v === 0;
    const up = v > 0;
    const frac = barFraction(v, maxAbsCashflow());
    const polarity = isZero ? "neutral" : up ? "positive" : "negative";
    return (
      <div class={`sui-cashflow-cell sui-cashflow-cell--${polarity}`}>
        <div class="sui-cashflow-cell__date">{formatCornerLabel(cell)}</div>
        <div class="sui-cashflow-cell__bar-track">
          <div class="sui-cashflow-cell__zero" />
          {!isZero && (
            <div
              class={`sui-cashflow-cell__bar sui-cashflow-cell__bar--${
                up ? "up" : "down"
              }`}
              style={{ height: `${(frac * 50).toFixed(1)}%` }}
            />
          )}
        </div>
        {/* Zero cells keep an invisible spacer where the amount label would
            be: the midline sits at 50% of the flex-grown bar-track, so the
            amount row must occupy space in EVERY cell or the midline shifts
            and breaks continuity across the strip. */}
        {isZero ? (
          <div class="sui-cashflow-cell__amount-spacer" aria-hidden="true">
            {"\u00A0"}
          </div>
        ) : (
          <div class="sui-cashflow-cell__amount">{fmtDollars(v)}</div>
        )}
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

    // Extra balance lines (forecasts, prior periods, other accounts) drawn
    // beneath the primary line. Each may break into multiple segments where
    // its accessor returns null.
    const extraSeries = (props.balanceSeries ?? []).map((s) => ({
      id: s.id,
      class: s.class,
      segments: buildLineSegments(
        ctx.cells,
        ctx.cellToX,
        yToPlot,
        s.balanceCents,
      ),
    }));

    // Deviation bands — the coloured area between a `fill`-bearing series and
    // its reference line (primary line by default). Drawn at the very back so
    // the lines and decorations sit on top. Split at crossings by the geometry
    // helper, so each polygon is uniformly green (series above reference) or
    // red (series below reference).
    const bands = (props.balanceSeries ?? [])
      .filter((s) => s.fill)
      .flatMap((s) => {
        const fill = s.fill!;
        const reference =
          fill.baseline ?? ((c: CashflowCell) => c.balanceCents);
        const overrideClass = (sign: "positive" | "negative") =>
          sign === "positive" ? fill.positiveClass : fill.negativeClass;
        return buildDeviationBand(
          ctx.cells,
          ctx.cellToX,
          yToPlot,
          s.balanceCents,
          reference,
        ).map((run, i) => ({
          key: `${s.id}-${i}`,
          sign: run.sign,
          points: run.points,
          overrideClass: overrideClass(run.sign),
        }));
      });

    const selectedCell = ctx.cells[ctx.selected];
    const selectedX = ctx.cellToX(ctx.selected);
    const selectedY = yToPlot(selectedCell.balanceCents);

    return (
      <svg
        class="sui-cashflow-scrub-chart__chart"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <For each={bands}>
          {(band) => (
            <polygon
              class={`sui-cashflow-scrub-chart__band sui-cashflow-scrub-chart__band--${
                band.sign
              }${band.overrideClass ? ` ${band.overrideClass}` : ""}`}
              points={band.points}
            />
          )}
        </For>
        <line
          class="sui-cashflow-scrub-chart__zero-line"
          x1={ctx.plotLeft}
          x2={ctx.plotRight}
          y1={zeroY}
          y2={zeroY}
        />
        <For each={extraSeries}>
          {(series) => (
            <For each={series.segments}>
              {(seg) => (
                <polyline
                  class={`sui-cashflow-scrub-chart__line sui-cashflow-scrub-chart__line--series${
                    series.class ? ` ${series.class}` : ""
                  }`}
                  points={seg}
                />
              )}
            </For>
          )}
        </For>
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
