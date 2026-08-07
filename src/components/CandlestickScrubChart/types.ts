// ============================================
// CandlestickScrubChart — public type surface.
//
// The data vocabulary for the candlestick scrub composite, split out from the
// component module so the shapes can be read (and imported) without pulling in
// the Solid render tree. Everything here is re-exported by the folder barrel
// (`index.ts`) — these are the PUBLIC names consumers depend on.
//
// The vocabulary layers from the raw observation outward:
//
//   • CandlestickSample     — one observation at the caller's FINEST grain.
//   • CandlestickGranularity— the period one candle covers ("day" | "month").
//   • CandlestickCell       — one period's axis cell + its reduced candle.
//   • CandlestickScrubChartProps — the component's full call-site contract.
//
// Kept as a leaf module: it imports only `Cell` from DateAxis and the
// `Candlestick` SHAPE (type-only) from CandlestickRenderer, so it has no
// runtime side effects and drags no CSS into a consumer bundle.
// ============================================

import type { JSX } from "solid-js";
import type { Candlestick } from "../CandlestickRenderer";
import type { Cell } from "../DateAxis";
import type { ScrubChartXTickCadence } from "../ScrubChart";

/**
 * Period covered by ONE candle. The component reduces the caller's samples
 * into candles at this grain; see `SUB_GRAIN` in helpers.ts for which finer
 * grain supplies each candle's OHLC distribution.
 *
 * Only `"day"` and `"month"` ship today. The reduction is table-driven, so a
 * `"week"` / `"quarter"` grain is one entry in that table, not a rewrite.
 */
export type CandlestickGranularity = "day" | "month";

/**
 * One observation at the caller's FINEST available grain — a single order, a
 * single transaction, one meter read. The component does all bucketing; the
 * caller never pre-aggregates.
 *
 * `at` is read in UTC so period keying is stable regardless of host timezone.
 */
export interface CandlestickSample {
  /** When the observation occurred. Keyed in UTC. */
  at: Date;
  /** The observed value. Any unit — the caller formats it via `formatValue`. */
  value: number;
}

/**
 * One period's axis cell plus the candle reduced from the samples inside it.
 *
 * `candle` is `null` for a period with NO samples. Such a period still gets a
 * cell (so the axis keeps its calendar shape and the gap is visible) but it
 * contributes NOTHING to any candle's statistics — see the gap-fill warning in
 * `helpers.ts`.
 */
export type CandlestickCell = Cell & {
  /** Reduced OHLC+mean for this period, or `null` when the period is empty. */
  candle: Candlestick | null;
  /** Populated sub-buckets behind the candle. `1` ⇒ a flat (wickless) body. */
  subBucketCount: number;
  /** Raw samples that fell inside this period. */
  sampleCount: number;
};

export interface CandlestickScrubChartProps {
  /**
   * Raw observations at the caller's finest grain, in any order. Bucketing,
   * gap handling and the OHLC reduction all happen inside the component.
   */
  samples: CandlestickSample[];
  /** Period one candle covers. Default `"day"`. Switchable at runtime. */
  granularity?: CandlestickGranularity;
  /**
   * How several samples landing in the SAME sub-bucket combine into that
   * sub-bucket's single value. Default: sum (the revenue/volume reading).
   * Pass `fn.mean` for a rate-like metric.
   */
  aggregate?: (values: readonly number[]) => number;

  /** Selected cell index. Clamped internally — safe across a granularity flip. */
  selected?: number;
  /** Selection callback, fired with the cell index and its payload. */
  onScrub?: (index: number, cell: CandlestickCell) => void;
  /** See `ScrubChartProps.scrub` — `false` renders a plain, non-interactive series. */
  scrub?: boolean;
  /** See `ScrubChartProps.centerOn`. */
  centerOn?: { index: number } | null;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;

  /** Chart drawing-area height in px. Default 220. */
  chartHeight?: number;
  /** Width of one ribbon cell in px. Default 60 (day) / 74 (month). */
  cellWidth?: number;
  /** Cadence for labelled x-axis ticks. Defaults per granularity. */
  xTickCadence?: ScrubChartXTickCadence;

  /** Format a value for the y-axis and the ribbon. Default: compact locale number. */
  formatValue?: (value: number) => string;
  /**
   * Fraction of the cell pitch the candle BODY occupies. Default `0.6`.
   * The wick is always hairline-width and centred.
   */
  bodyFraction?: number;
  /** Draw the per-candle mean (μ) tick inside the body. Default `true`. */
  showMean?: boolean;

  /** Enable the passive hover readout (see `ScrubChartProps.hover`). */
  hover?: boolean;
  /** Tooltip body rendered beside the hovered candle. Requires `hover`. */
  renderHoverTooltip?: (cell: CandlestickCell, index: number) => JSX.Element;
}
