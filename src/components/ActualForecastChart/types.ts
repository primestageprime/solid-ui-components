// ============================================
// ActualForecastChart — public type surface.
//
// The call-site contract for the chart that holds the past and the future of
// one balance in a single plot. Kept as a leaf module: it imports only the
// cashflow chart's cell and prop types and has no runtime side effects.
// ============================================

import type {
  CashflowCell,
  CashflowScrubChartProps,
} from "../CashflowScrubChart";

/** The forecast's range at one cell, in cents. */
export interface ActualForecastRange {
  minCents: number;
  maxCents: number;
}

/**
 * Every word the chart draws. The chart ships English defaults; a consumer
 * curries its own once through `createActualForecastChart`.
 */
export interface ActualForecastChartLabels {
  /** Caption of the solid line up to the anchor. */
  actual: string;
  /** Caption of the dashed line after the anchor. */
  forecast: string;
  /** Captions of the range cone's two edges. */
  rangeMin: string;
  rangeMax: string;
  /** Caption at the top of the anchor rule. */
  anchor: string;
  /** Caption of the flat rule at `openingBalanceCents`. */
  openingBalance: string;
  /** Caption of the flat rule at `floorCents`. */
  floor: string;
}

/** Presentational decisions, fixed once by `createActualForecastChart`. */
export interface ActualForecastChartOverrides {
  labels?: Partial<ActualForecastChartLabels>;
}

/**
 * Data props: the call site states the window and where the past ends.
 *
 * `cells` is ONE run of days. The cells up to and including `anchorIndex`
 * hold the balance as it happened; the cells after it hold the forecast.
 * The chart draws the first part solid and the second part dashed, and the
 * range cone starts at the anchor.
 */
export interface ActualForecastChartProps {
  /** Every day of the window, actuals first, then the forecast. */
  cells: CashflowCell[];
  /** Index of the LAST actual cell. The anchor rule stands on it, and the
   *  two line halves meet there. */
  anchorIndex: number;
  /** The forecast's range at the anchor cell and after it, or `null` for
   *  none at that cell. At the anchor, `null` means the balance itself, so
   *  the cone narrows to the dot. Not read before the anchor. Omit for no
   *  cone. */
  range?: (cell: CashflowCell, index: number) => ActualForecastRange | null;
  /** A flat rule across the plot at the opening balance, in cents. Omit for
   *  none. */
  openingBalanceCents?: number;
  /** A flat rule across the plot at the cash floor, in cents. Omit for
   *  none. */
  floorCents?: number;
  /** Date the inner axis marks as today. Defaults to the anchor cell's
   *  start, so the axis mark and the anchor rule state one fact. */
  today?: Date;
  /** Forwarded to `CashflowScrubChart` unchanged. */
  chartHeight?: CashflowScrubChartProps["chartHeight"];
  yMin?: CashflowScrubChartProps["yMin"];
  yMax?: CashflowScrubChartProps["yMax"];
  yAxisMode?: CashflowScrubChartProps["yAxisMode"];
  onYAxisModeChange?: CashflowScrubChartProps["onYAxisModeChange"];
  onYRangeChange?: CashflowScrubChartProps["onYRangeChange"];
  yAxisWidth?: CashflowScrubChartProps["yAxisWidth"];
  /** Tooltip body for the hovered day. The hover layer is always on. */
  renderHoverTooltip?: CashflowScrubChartProps["renderHoverTooltip"];
}
