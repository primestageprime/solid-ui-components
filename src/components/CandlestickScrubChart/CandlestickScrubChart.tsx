// ============================================
// CandlestickScrubChart — Domain Composite (Depth 3).
// Composes `ScrubChart` (Depth 2) with a baked-in candlestick `renderChart`
// and a compact per-period `renderCell` ribbon. Zero-config at the call site:
// the consumer passes RAW samples and a granularity, and the component does
// the bucketing, the OHLC reduction and the plotting.
//
// Where CashflowScrubChart plots ONE value per period as a running-balance
// LINE, this plots the DISTRIBUTION of each period's finer-grained values as a
// candle. The two are siblings over the same ScrubChart primitive, not
// variants of each other.
//
// ⚠ THIS IS A DISPERSION CHART, NOT A PRICE CHART. `open`/`close` are the
// period's first/last sub-bucket; the wicks are its best/worst. Consecutive
// candles do NOT connect (January's close is not February's open), so nothing
// is drawn between them — the empty space between candles is the honest
// rendering, not a missing feature. See helpers.ts for the full construction
// and the gap-fill trap it avoids.
//
// ⚠ DAY GRANULARITY NEEDS SUB-DAY SAMPLES. A day candle's distribution is the
// individual samples inside that day. Data carrying one sample per day (a
// date-only fact table, say) has no intra-day distribution to show, so every
// day candle renders FLAT — open = close = high = low, a wickless bar. That is
// the honest result and the component will not fake a wick; use `"month"`
// granularity, whose sub-buckets are day totals, when the data is date-only.
// ============================================

import { type Component, For, Show, createMemo, createUniqueId } from "solid-js";
import { ScrubChart, type ScrubChartContext } from "../ScrubChart";
import type { DateAxisCellContext } from "../DateAxis";
import { filter, map, pipe } from "../../fn";
import {
  GRAIN_PLAN,
  buildCandleCells,
  candleDomain,
  defaultCadence,
  fmtCompact,
  fmtPeriodLabel,
} from "./helpers";
import type {
  CandlestickCell,
  CandlestickGranularity,
  CandlestickSample,
  CandlestickScrubChartProps,
} from "./types";
import "./CandlestickScrubChart.css";

// Re-export the public type surface so the folder barrel (and consumers
// importing from this module) keep resolving the same names.
export type {
  CandlestickCell,
  CandlestickGranularity,
  CandlestickSample,
  CandlestickScrubChartProps,
};

const DEFAULT_CHART_HEIGHT = 220;
const DEFAULT_BODY_FRACTION = 0.6;
/** Minimum drawn body height, so a flat candle stays a visible rule. */
const MIN_BODY_PX = 1.5;

export const CandlestickScrubChart: Component<CandlestickScrubChartProps> = (
  props,
) => {
  const granularity = (): CandlestickGranularity => props.granularity ?? "day";
  const chartHeight = () => props.chartHeight ?? DEFAULT_CHART_HEIGHT;
  const cellWidth = () =>
    props.cellWidth ?? GRAIN_PLAN[granularity()].defaultCellWidth;
  const formatValue = () => props.formatValue ?? fmtCompact;
  const bodyFraction = () => props.bodyFraction ?? DEFAULT_BODY_FRACTION;

  // Unique clipPath id per instance — two charts on one page must not share a
  // clip rect. createUniqueId stays deterministic across server/client render.
  const clipId = `sui-candle-clip-${createUniqueId()}`;

  // The whole reduction. Re-runs when the samples OR the granularity change,
  // which is exactly what makes granularity a runtime switch rather than a
  // mount-time decision.
  const cells = createMemo<CandlestickCell[]>(() =>
    buildCandleCells(props.samples, granularity(), props.aggregate),
  );

  const yDomain = createMemo<[number, number]>(() => candleDomain(cells()));

  // A day index is not a month index: flipping granularity leaves a stale
  // `selected` pointing past the end of the shorter strip. Clamp rather than
  // let ScrubChart index out of range.
  const selected = createMemo(() => {
    const count = cells().length;
    if (count === 0) return 0;
    return Math.min(Math.max(props.selected ?? 0, 0), count - 1);
  });

  // ── Per-period ribbon cell ───────────────────────────────────────────
  const renderCandleCell = (cell: CandlestickCell, ctx: DateAxisCellContext) => {
    const candle = cell.candle;
    const polarity = !candle
      ? "empty"
      : candle.close > candle.open
        ? "up"
        : candle.close < candle.open
          ? "down"
          : "flat";
    return (
      <div
        class={`sui-candle-cell sui-candle-cell--${polarity}${
          ctx.isSelected ? " sui-candle-cell--selected" : ""
        }`}
      >
        <div class="sui-candle-cell__date">
          {fmtPeriodLabel(cell, granularity())}
        </div>
        {candle ? (
          <>
            <div class="sui-candle-cell__value">
              {formatValue()(candle.close)}
            </div>
            <div class="sui-candle-cell__meta">
              {candle.high === candle.low
                ? "flat"
                : `${formatValue()(candle.low)}–${formatValue()(candle.high)}`}
            </div>
          </>
        ) : (
          <div class="sui-candle-cell__empty">—</div>
        )}
      </div>
    );
  };

  // ── Candle series ────────────────────────────────────────────────────
  const renderCandles = (ctx: ScrubChartContext<CandlestickCell>) => {
    if (ctx.cells.length === 0 || !ctx.yToPlot) return null;
    const yToPlot = ctx.yToPlot;
    const bodyWidth = Math.max(2, ctx.dayPitch * bodyFraction());

    // Geometry per POPULATED cell. Empty periods are skipped outright — no
    // glyph, and (per helpers.ts) they never touched the statistics either.
    const glyphs = pipe(
      ctx.cells,
      map((cell: CandlestickCell, i: number) => {
        if (!cell.candle) return null;
        const c = cell.candle;
        const x = ctx.cellToX(i);
        const yOpen = yToPlot(c.open);
        const yClose = yToPlot(c.close);
        const top = Math.min(yOpen, yClose);
        const height = Math.max(MIN_BODY_PX, Math.abs(yClose - yOpen));
        return {
          index: i,
          // A candle with no dispersion (one sub-bucket, or a genuinely
          // constant period) is drawn flat and marked, never wicked.
          flat: c.high === c.low,
          up: c.close >= c.open,
          x,
          bodyX: x - bodyWidth / 2,
          bodyY: top,
          bodyH: height,
          wickTop: yToPlot(c.high),
          wickBottom: yToPlot(c.low),
          meanY: yToPlot(c.mean),
        };
      }),
      filter((g): g is NonNullable<typeof g> => g !== null),
    );

    const selectedIndex = props.scrub !== false ? ctx.selected : -1;

    return (
      <svg
        class="sui-candlestick-scrub-chart__chart"
        role="img"
        aria-label="Candlestick chart"
        viewBox={`0 0 ${ctx.width} ${ctx.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={ctx.plotLeft}
              y={ctx.plotTop}
              width={Math.max(0, ctx.plotRight - ctx.plotLeft)}
              height={Math.max(0, ctx.plotBottom - ctx.plotTop)}
            />
          </clipPath>
        </defs>
        <g clip-path={`url(#${clipId})`}>
          {/* Deliberately NO connecting line between candles — see the
              dispersion warning in the module header. */}
          <For each={glyphs}>
            {(g) => (
              <g
                class={`sui-candlestick-scrub-chart__candle sui-candlestick-scrub-chart__candle--${
                  g.up ? "up" : "down"
                }${g.flat ? " sui-candlestick-scrub-chart__candle--flat" : ""}${
                  g.index === selectedIndex
                    ? " sui-candlestick-scrub-chart__candle--selected"
                    : ""
                }`}
              >
                <line
                  class="sui-candlestick-scrub-chart__wick"
                  x1={g.x}
                  x2={g.x}
                  y1={g.wickTop}
                  y2={g.wickBottom}
                />
                <rect
                  class="sui-candlestick-scrub-chart__body"
                  x={g.bodyX}
                  y={g.bodyY}
                  width={bodyWidth}
                  height={g.bodyH}
                  rx={1}
                />
                <Show when={props.showMean !== false}>
                  <line
                    class="sui-candlestick-scrub-chart__mean"
                    x1={g.bodyX}
                    x2={g.bodyX + bodyWidth}
                    y1={g.meanY}
                    y2={g.meanY}
                  />
                </Show>
              </g>
            )}
          </For>
        </g>
        <Show when={selectedIndex >= 0 && ctx.cells[selectedIndex]}>
          <line
            class="sui-candlestick-scrub-chart__selected-rule"
            x1={ctx.cellToX(selectedIndex)}
            x2={ctx.cellToX(selectedIndex)}
            y1={ctx.plotTop}
            y2={ctx.plotBottom}
          />
        </Show>
      </svg>
    );
  };

  // ── Hover readout ────────────────────────────────────────────────────
  const renderHover = (ctx: ScrubChartContext<CandlestickCell>) => {
    const idx = ctx.hoverIndex;
    if (idx == null || ctx.cells.length === 0) return null;
    const cell = ctx.cells[idx];
    const x = ctx.cellToX(idx);
    // Flip the card left in the right half so it never clips off the edge.
    const flipLeft = x > (ctx.plotLeft + ctx.plotRight) / 2;
    const cardStyle: import("solid-js").JSX.CSSProperties = flipLeft
      ? { right: `${ctx.width - x + 12}px`, top: `${ctx.plotTop}px` }
      : { left: `${x + 12}px`, top: `${ctx.plotTop}px` };
    return (
      <>
        <svg
          class="sui-candlestick-scrub-chart__chart sui-candlestick-scrub-chart__hover"
          role="presentation"
          viewBox={`0 0 ${ctx.width} ${ctx.height}`}
          preserveAspectRatio="none"
        >
          <line
            class="sui-candlestick-scrub-chart__hover-rule"
            x1={x}
            x2={x}
            y1={ctx.plotTop}
            y2={ctx.plotBottom}
          />
        </svg>
        <Show when={props.renderHoverTooltip}>
          <div
            class="sui-candlestick-scrub-chart__hover-tooltip"
            style={cardStyle}
          >
            {props.renderHoverTooltip!(cell, idx)}
          </div>
        </Show>
      </>
    );
  };

  return (
    <ScrubChart<CandlestickCell>
      cells={cells()}
      selected={selected()}
      onScrub={props.onScrub}
      scrub={props.scrub}
      centerOn={props.centerOn}
      hover={props.hover}
      renderHoverOverlay={props.hover ? renderHover : undefined}
      today={props.today}
      chartHeight={chartHeight()}
      cellWidth={cellWidth()}
      yDomain={yDomain()}
      formatYLabel={formatValue()}
      xTickCadence={props.xTickCadence ?? defaultCadence(granularity())}
      renderCell={renderCandleCell}
      renderChart={renderCandles}
    />
  );
};
