// ============================================
// ActualForecastChart — the pure series model.
//
// Turns one run of cells and an anchor into the overlay series and the
// marker that `CashflowScrubChart` draws. No Solid, no DOM: the component
// calls these once per render and a test reads them directly.
//
// The split is made with the chart's existing vocabulary. The chart's own
// primary line is hidden, and two overlay series draw its halves: the actual
// half returns `null` after the anchor, the forecast half returns `null`
// before it. Both include the anchor cell, so the lines meet at the dot.
// The cone also starts at the anchor cell, so it narrows to the dot.
// ============================================

import type {
  CashflowBalanceSeries,
  CashflowCell,
  CashflowChartMarker,
} from "../CashflowScrubChart";
import type {
  ActualForecastChartLabels,
  ActualForecastChartProps,
  ActualForecastRange,
} from "./types";

/** The classes the chart's stylesheet defines for each mark. */
export const ACTUAL_FORECAST_CLASS = {
  hiddenPrimary: "sui-cashflow-scrub-chart__line--hidden",
  actual: "sui-cashflow-scrub-chart__line--actual",
  forecast: "sui-cashflow-scrub-chart__line--projected",
  rangeEdge: "sui-cashflow-scrub-chart__line--range-edge",
  rangeBand: "sui-cashflow-scrub-chart__band--range",
  openingBalance: "sui-cashflow-scrub-chart__line--opening",
  floor: "sui-cashflow-scrub-chart__line--floor",
} as const;

export const DEFAULT_ACTUAL_FORECAST_LABELS: ActualForecastChartLabels = {
  actual: "Actual",
  forecast: "Forecast",
  rangeMin: "Range (min)",
  rangeMax: "Range (max)",
  anchor: "Today",
  openingBalance: "Opening balance",
  floor: "Cash floor",
};

export type ActualForecastSeriesInput = Pick<
  ActualForecastChartProps,
  "anchorIndex" | "range" | "openingBalanceCents" | "floorCents"
> & { labels: ActualForecastChartLabels };

/**
 * The overlay series, in paint order: the two flat rules, the range cone,
 * then the two balance halves on top.
 */
export const actualForecastSeries = (
  input: ActualForecastSeriesInput,
): CashflowBalanceSeries[] => {
  const { anchorIndex, range, labels } = input;
  // The cone starts AT the anchor. A `null` range there is the balance
  // itself, a zero-width point, so the cone narrows to the dot.
  const rangeAt = (
    cell: CashflowCell,
    i: number,
  ): ActualForecastRange | null => {
    if (!range || i < anchorIndex) return null;
    const r = range(cell, i);
    if (r || i !== anchorIndex) return r;
    return { minCents: cell.balanceCents, maxCents: cell.balanceCents };
  };
  const lo = (cell: CashflowCell, i: number): number | null =>
    rangeAt(cell, i)?.minCents ?? null;
  const hi = (cell: CashflowCell, i: number): number | null =>
    rangeAt(cell, i)?.maxCents ?? null;

  const rules: CashflowBalanceSeries[] = [];
  if (input.openingBalanceCents !== undefined) {
    const cents = input.openingBalanceCents;
    rules.push({
      id: "opening-balance",
      label: labels.openingBalance,
      labelPlacement: "right",
      class: ACTUAL_FORECAST_CLASS.openingBalance,
      balanceCents: () => cents,
    });
  }
  if (input.floorCents !== undefined) {
    const cents = input.floorCents;
    rules.push({
      id: "floor",
      label: labels.floor,
      labelPlacement: "right",
      class: ACTUAL_FORECAST_CLASS.floor,
      balanceCents: () => cents,
    });
  }

  const cone: CashflowBalanceSeries[] = range
    ? [
        {
          id: "range-min",
          label: labels.rangeMin,
          labelPlacement: "right",
          class: ACTUAL_FORECAST_CLASS.rangeEdge,
          balanceCents: lo,
        },
        {
          id: "range-max",
          label: labels.rangeMax,
          labelPlacement: "right",
          class: ACTUAL_FORECAST_CLASS.rangeEdge,
          balanceCents: hi,
          fill: {
            baseline: lo,
            positiveClass: ACTUAL_FORECAST_CLASS.rangeBand,
            negativeClass: ACTUAL_FORECAST_CLASS.rangeBand,
          },
        },
      ]
    : [];

  const halves: CashflowBalanceSeries[] = [
    {
      id: "actual",
      label: labels.actual,
      labelPlacement: "body",
      class: ACTUAL_FORECAST_CLASS.actual,
      layer: "over",
      balanceCents: (cell, i) => (i <= anchorIndex ? cell.balanceCents : null),
    },
    {
      id: "forecast",
      label: labels.forecast,
      labelPlacement: "right",
      class: ACTUAL_FORECAST_CLASS.forecast,
      layer: "over",
      balanceCents: (cell, i) => (i >= anchorIndex ? cell.balanceCents : null),
    },
  ];

  return [...rules, ...cone, ...halves];
};

/** The anchor rule: a labelled rule on the anchor cell with a dot on the
 *  balance there. */
export const anchorMarker = (
  cells: readonly CashflowCell[],
  anchorIndex: number,
  label: string,
): CashflowChartMarker => ({
  index: anchorIndex,
  variant: "rule",
  label,
  valueCents: cells[anchorIndex]?.balanceCents ?? 0,
});
