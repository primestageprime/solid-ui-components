// ============================================
// The bench's one adapter onto SUI's TargetBarChart: Contract Builder's
// consumption fold (`cellsOfType`) becomes the chart's finished series. This
// is the seam a server fills in the app — the chart takes series, not a plan.
// ============================================
import { type TargetBarSeries, fn } from "../../../../src";
import {
  type Cell,
  type Config,
  type JobType,
  cellsOfType,
  missingOf,
} from "../contract-builder-model";

const { filter, map } = fn;

/** The type colours, in config order (what TargetBarChart paints series with). */
export const TYPE_COLORS: readonly string[] = [
  "var(--sui-series-1)",
  "var(--sui-series-2)",
  "var(--sui-series-3)",
];

/** One type's bars, month by month up to `lastMonth`. */
const seriesOfType = (
  config: Config,
  t: JobType,
  today: string,
  lastMonth: number,
): TargetBarSeries => ({
  id: t.id,
  label: t.name,
  step: t.typical,
  bars: map(
    (c: Cell) => ({
      period: c.month,
      projected: c.projected,
      invoiced: c.invoicedWithin,
      confirmed: c.plannedWithin - c.estimateWithin,
      planned: c.estimateWithin,
      missing: missingOf(c, today),
      above: c.unplanned,
    }),
    filter((c: Cell) => c.month <= lastMonth, cellsOfType(config, t.id)),
  ),
});

export const targetSeries = (
  config: Config,
  today: string,
  lastMonth: number,
): readonly TargetBarSeries[] =>
  map((t: JobType) => seriesOfType(config, t, today, lastMonth), config.types);
