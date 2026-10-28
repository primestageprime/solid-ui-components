// lastReviewedAt: 2026-10-27
// lastReviewedBy: adlai.arnold
// ============================================
// ActualForecastChart — Composite (Depth 4)
// Tags: shows:chart, does:hover, does:view, data:time-series, data:multi-series, role:panel
// Composes `FramedCashflowScrubChart` (Depth 3). Draws no SVG and owns no
// CSS: the classes it hands the chart live in `CashflowScrubChart.css`.
//
// THE PAST AND THE FUTURE OF ONE BALANCE IN ONE PLOT. The anchor is the last
// day that happened. A labelled rule stands on it with a dot on the balance.
// To its left the balance runs SOLID, as it happened. To its right the
// forecast runs DASHED with its range cone, and the cone exists only there,
// because actuals have no range. Two flat rules, the opening balance and the
// cash floor, cross the whole plot with their captions in the right gutter.
//
// Dashed means forecast, as on `BalanceReviewChart`. This chart draws one
// balance and no scenario comparison, so the dash carries no second meaning
// here (Peter, 2026-10-27: treatment C of the briefing mockup).
//
// Not `CashflowScrubChart` alone, which draws forward from its first cell
// with no notion of an anchor. Not `BalanceReviewChart`, which draws one
// month against the forecast made when it began; this draws the window
// around today.
//
// Sits inside a `ChartFrame`, as `FramedCashflowScrubChart` does: the frame
// holds the title, the y-axis title and the axis controls.
// ============================================

import type { Component } from "solid-js";
import { createMemo, mergeProps } from "solid-js";
import { FramedCashflowScrubChart } from "../CashflowScrubChart";
import {
  ACTUAL_FORECAST_CLASS,
  DEFAULT_ACTUAL_FORECAST_LABELS,
  actualForecastSeries,
  anchorMarker,
} from "./series";
import type {
  ActualForecastChartLabels,
  ActualForecastChartOverrides,
  ActualForecastChartProps,
} from "./types";

/**
 * Fix the words once, then pass data at every call site.
 *
 *   const BriefingCashChart = createActualForecastChart({
 *     labels: { forecast: "Baseline", openingBalance: "Starting balance" },
 *   });
 */
export const createActualForecastChart = (
  overrides: ActualForecastChartOverrides = {},
): Component<ActualForecastChartProps> => {
  const labels: ActualForecastChartLabels = {
    ...DEFAULT_ACTUAL_FORECAST_LABELS,
    ...overrides.labels,
  };

  const ActualForecastChartView: Component<ActualForecastChartProps> = (
    raw,
  ) => {
    const props = mergeProps({ chartHeight: "fill" as const }, raw);
    const series = createMemo(() =>
      actualForecastSeries({
        anchorIndex: props.anchorIndex,
        range: props.range,
        openingBalanceCents: props.openingBalanceCents,
        floorCents: props.floorCents,
        labels,
      }),
    );
    const markers = createMemo(() => [
      anchorMarker(props.cells, props.anchorIndex, labels.anchor),
    ]);

    return (
      <FramedCashflowScrubChart
        cells={props.cells}
        scrub={false}
        today={props.today ?? props.cells[props.anchorIndex]?.start}
        chartHeight={props.chartHeight}
        lineClass={ACTUAL_FORECAST_CLASS.hiddenPrimary}
        balanceSeries={series()}
        markers={markers()}
        yMin={props.yMin}
        yMax={props.yMax}
        yAxisMode={props.yAxisMode}
        onYAxisModeChange={props.onYAxisModeChange}
        onYRangeChange={props.onYRangeChange}
        yAxisWidth={props.yAxisWidth}
        showGridlines
        hover
        renderHoverTooltip={props.renderHoverTooltip}
      />
    );
  };

  return ActualForecastChartView;
};

/** The chart with its English words. */
export const ActualForecastChart: Component<ActualForecastChartProps> =
  createActualForecastChart();
