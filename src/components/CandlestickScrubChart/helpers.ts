// ============================================
// CandlestickScrubChart — pure reduction + formatting helpers.
//
// No Solid, no DOM: everything here is a pure function over plain data, so the
// semantics that actually matter (the OHLC reduction) are tested directly
// rather than through a mounted component.
//
// ── The construction, and why it is NOT a market candle ──────────────────
//
// A candle over a CUMULATIVE running total is degenerate: a period has exactly
// two sample points (its start and its end), so high = max(open, close) and
// low = min(open, close) — zero wicks, a waterfall bar wearing a candle's
// clothes. This module never does that. A candle for period P is reduced from
// the DISTRIBUTION of values at the NEXT FINER grain inside P:
//
//   granularity "month" → sub-bucket = each populated DAY's aggregate
//   granularity "day"   → sub-bucket = each individual SAMPLE
//
// open = first sub-value in time order, close = last, high = max, low = min,
// mean = average. That is a DISPERSION candle: open/close are the period's
// first/last sub-bucket, the wicks are its best/worst. Consecutive candles do
// NOT connect — January's close is not February's open — and the component
// deliberately draws no line between them. Do not read stock-chart continuity
// into it.
//
// ⚠ THE GAP-FILL TRAP. OHLC is computed ONLY over sub-buckets that actually
// hold samples. A calendar-complete, zero-filled day series would pin EVERY
// month's low to 0 the moment the month contains one quiet weekend, which is
// useless. Buckets here are built by grouping the samples themselves, so an
// empty sub-bucket is never constructed and cannot reach the statistics. Empty
// PERIODS still get a cell (the axis keeps its calendar shape and the gap is
// visible) — with `candle: null`, contributing nothing.
// ============================================

import type { Candlestick } from "../CandlestickRenderer";
import { type Cell, dailyCells, monthlyCells } from "../DateAxis";
import { groupBy, map, mean, pipe, sortBy, sum } from "../../fn";
import type {
  CandlestickCell,
  CandlestickGranularity,
  CandlestickSample,
} from "./types";

/** UTC-midnight epoch millis for `d` — the day bucket key. */
const dayKey = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** UTC first-of-month epoch millis for `d` — the month bucket key. */
const monthKey = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);

/**
 * Per-granularity reduction plan. Adding a grain ("week", "quarter") is one
 * entry here plus its member in `CandlestickGranularity` — the reduction,
 * the renderer and the axis all read this table.
 *
 * `subKey` is the NEXT FINER grain the OHLC distribution is drawn from;
 * `null` means "each sample is its own sub-bucket" (the finest grain there is).
 */
export const GRAIN_PLAN: Record<
  CandlestickGranularity,
  {
    periodKey: (d: Date) => number;
    subKey: ((d: Date) => number) | null;
    cells: (start: Date, end: Date) => Cell[];
    defaultCellWidth: number;
  }
> = {
  day: {
    periodKey: dayKey,
    subKey: null,
    cells: dailyCells,
    defaultCellWidth: 60,
  },
  month: {
    periodKey: monthKey,
    subKey: dayKey,
    cells: monthlyCells,
    defaultCellWidth: 74,
  },
};

/**
 * Reduce one period's samples (already known non-empty, already in time order)
 * into a candle over its populated sub-buckets.
 *
 * Returns the candle plus how many sub-buckets fed it: `1` means the caller's
 * data has no finer grain inside this period, so open = close = high = low and
 * the candle is honestly FLAT. A wick is never synthesized to hide that.
 */
const reducePeriod = (
  ordered: readonly CandlestickSample[],
  subKey: ((d: Date) => number) | null,
  aggregate: (values: readonly number[]) => number,
): { candle: Candlestick; subBucketCount: number } => {
  // Sub-bucket values in time order. A Map preserves insertion order and the
  // samples arrive ordered, so the bucket sequence is chronological. When
  // `subKey` is null each sample IS a bucket — the finest grain available.
  const subValues: number[] = subKey
    ? pipe(
        ordered,
        groupBy((s: CandlestickSample) => subKey(s.at)),
        (buckets) => [...buckets.values()],
        map((bucket: CandlestickSample[]) =>
          aggregate(pipe(bucket, map((s: CandlestickSample) => s.value))),
        ),
      )
    : pipe(
        ordered,
        map((s: CandlestickSample) => s.value),
      );

  // Extent in ONE pass — not Math.min(...values), which blows the argument
  // limit on a long range.
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const v of subValues) {
    if (v < low) low = v;
    if (v > high) high = v;
  }

  return {
    candle: {
      open: subValues[0],
      close: subValues[subValues.length - 1],
      high,
      low,
      mean: mean(subValues),
      openAt: ordered[0].at.getTime(),
      closeAt: ordered[ordered.length - 1].at.getTime(),
    },
    subBucketCount: subValues.length,
  };
};

/**
 * Build the calendar-complete cell strip for `granularity`, each cell carrying
 * the candle reduced from the samples inside it (or `null` where the period
 * holds none).
 *
 * Returns `[]` for no samples. The strip spans the first populated period
 * through the last — the caller does not pass a range.
 */
export const buildCandleCells = (
  samples: readonly CandlestickSample[],
  granularity: CandlestickGranularity,
  aggregate: (values: readonly number[]) => number = sum,
): CandlestickCell[] => {
  if (samples.length === 0) return [];
  const plan = GRAIN_PLAN[granularity];

  const ordered = sortBy((s: CandlestickSample) => s.at.getTime(), samples);
  const byPeriod = groupBy((s: CandlestickSample) => plan.periodKey(s.at))(
    ordered,
  );

  // The axis spans the populated range end to end, gaps included — so an empty
  // month inside the range reads as an empty slot rather than silently closing
  // up. Only POPULATED periods ever reach `reducePeriod`.
  const cells = plan.cells(
    ordered[0].at,
    ordered[ordered.length - 1].at,
  ) as CandlestickCell[];

  return pipe(
    cells,
    map((cell: CandlestickCell) => {
      const periodSamples = byPeriod.get(plan.periodKey(cell.start));
      if (!periodSamples) {
        return { ...cell, candle: null, subBucketCount: 0, sampleCount: 0 };
      }
      const reduced = reducePeriod(periodSamples, plan.subKey, aggregate);
      return {
        ...cell,
        candle: reduced.candle,
        subBucketCount: reduced.subBucketCount,
        sampleCount: periodSamples.length,
      };
    }),
  );
};

/**
 * Y-domain spanning every candle's low..high with symmetric padding.
 *
 * Deliberately NOT zero-floored (unlike CashflowScrubChart): a dispersion
 * chart's interest lives in the band the values occupy, and dragging the axis
 * to zero flattens every candle into a smear at the top.
 */
export const candleDomain = (
  cells: readonly CandlestickCell[],
  padFraction = 0.08,
): [number, number] => {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const cell of cells) {
    if (!cell.candle) continue;
    if (cell.candle.low < low) low = cell.candle.low;
    if (cell.candle.high > high) high = cell.candle.high;
  }
  if (low > high) return [0, 1];
  // A wholly flat series still needs a non-zero span or every y maps to one row.
  const spread = high - low || Math.abs(high) || 1;
  const pad = spread * padFraction;
  return [low - pad, high + pad];
};

/** Compact value label for the y-axis and ribbon (1.2K, 3.4M). */
export const fmtCompact = (value: number): string =>
  Math.abs(value) >= 1000
    ? value.toLocaleString(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
      })
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

/** Ribbon corner label — "Mar 4" for a day cell, "Mar 2026" for a month cell. */
export const fmtPeriodLabel = (
  cell: Cell,
  granularity: CandlestickGranularity,
): string =>
  cell.label ??
  cell.start.toLocaleDateString(
    undefined,
    granularity === "month"
      ? { month: "short", year: "numeric", timeZone: "UTC" }
      : { month: "short", day: "numeric", timeZone: "UTC" },
  );

/** Default x-tick cadence for a grain — month cells can only anchor
 *  month/quarter/year, so `"auto"` is only sensible on day cells. */
export const defaultCadence = (granularity: CandlestickGranularity) =>
  granularity === "month" ? ("year" as const) : ("auto" as const);
