// ============================================
// WORKSHOP BENCH — Cash Hindcast Chart (treatment C, 2026-10-27).
//
// THE REFERENCE COMPOSITION for thorcasting's briefing: one Cash Flow panel
// that holds the hindcast AND the forecast, with "now" in the middle. Peter
// approved treatment C on 2026-10-27: the forecast is dashed, the range cone
// exists only after today.
//
// Built from the package barrel, as a consumer would: `ChartFrame` around
// `ActualForecastChart`, curried once with thorcasting's words. The chart
// was extracted from this bench by `/sui-build`; the synthetic data below is
// the bench's own and stays here.
// ============================================
import { type Component, createMemo, createSignal } from "solid-js";
import {
  ChartFrame,
  ClusterRow,
  MutedBody,
  SectionTitle,
  Toggle,
  createActualForecastChart,
  dailyCells,
  type ActualForecastRange,
  type CashflowCell,
} from "../../../src";

export const meta = { label: "Cash Hindcast Chart" };

// ── Synthetic data, same shape as the briefing screenshot ─────────────────
const TODAY = new Date("2026-10-27T00:00:00Z");
const BACK_DAYS = 90;
const TODAY_CENTS = 723_900;
const MONTH_AGO_CENTS = 840_000;

const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
};

/** Actual balance `i` days before today (i ≤ 0): $5k–$10k with payroll dips. */
const actualCents = (i: number): number => {
  if (i === 0) return TODAY_CENTS;
  if (i === -30) return MONTH_AGO_CENTS;
  const cycle = ((i % 14) + 14) % 14;
  const dip = cycle >= 10 && cycle <= 11 ? 2600 : 0;
  return (
    Math.round(8200 + 1400 * Math.sin(i / 9) + 700 * Math.sin(i / 3.7) - dip) *
    100
  );
};

interface Point {
  balanceCents: number;
  range: ActualForecastRange | null;
}

/** One point per day from `-BACK_DAYS` to `+forwardDays`. The forecast steps
 *  up on the 1st of each month and bleeds $500 a day, net about +$60k/mo. */
const buildPoints = (forwardDays: number): Point[] => {
  const past = Array.from({ length: BACK_DAYS + 1 }, (_, k) => ({
    balanceCents: actualCents(k - BACK_DAYS),
    range: null,
  }));
  let v = TODAY_CENTS;
  const future = Array.from({ length: forwardDays }, (_, k) => {
    const i = k + 1;
    if (addDays(TODAY, i).getUTCDate() === 1) v += 7_500_000;
    v -= 50_000;
    const spread = 150_000 + 9_000 * i;
    return {
      balanceCents: v,
      range: { minCents: Math.max(0, v - spread), maxCents: v + spread },
    };
  });
  return [...past, ...future];
};

const buildCells = (points: Point[], forwardDays: number): CashflowCell[] =>
  dailyCells(addDays(TODAY, -BACK_DAYS), addDays(TODAY, forwardDays)).map(
    (cell, i) => ({
      ...cell,
      cashflowCents:
        points[i].balanceCents -
        (points[i - 1]?.balanceCents ?? points[i].balanceCents),
      balanceCents: points[i].balanceCents,
    }),
  );

const fmtDollars = (cents: number): string =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Thorcasting's words, fixed once. The consumer does the same in its chart
// module, not at every call site.
const BriefingCashChart = createActualForecastChart({
  labels: { forecast: "Baseline", openingBalance: "Starting balance" },
});

// ── Bench ─────────────────────────────────────────────────────────────────
const CashHindcastChartBench: Component = () => {
  const [yearAhead, setYearAhead] = createSignal(false);
  const forwardDays = () => (yearAhead() ? 365 : BACK_DAYS);
  const points = createMemo(() => buildPoints(forwardDays()));
  const cells = createMemo(() => buildCells(points(), forwardDays()));
  const range = (_c: CashflowCell, i: number) => points()[i].range;

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Cash Hindcast Chart</SectionTitle>
      <MutedBody>
        One Cash Flow panel: 90 days of actuals to the left of Today, the
        forecast baseline and its range to the right. Treatment C: the forecast
        is dashed, and the range cone exists only after Today.
      </MutedBody>
      <ClusterRow>
        <Toggle
          label="12-month horizon (the briefing's)"
          checked={yearAhead()}
          onChange={() => setYearAhead(!yearAhead())}
        />
      </ClusterRow>
      <ChartFrame title="Cash Flow" yTitle="Balance ($)">
        <BriefingCashChart
          cells={cells()}
          anchorIndex={BACK_DAYS}
          range={range}
          openingBalanceCents={TODAY_CENTS}
          floorCents={0}
          today={TODAY}
          renderHoverTooltip={(c, i) => (
            <div class="actual-forecast-chart-demo__tip">
              <div class="actual-forecast-chart-demo__tip-title">
                {fmtDate(c.start)}
              </div>
              <div>
                {i <= BACK_DAYS ? "Actual" : "Baseline"}:{" "}
                {fmtDollars(c.balanceCents)}
              </div>
            </div>
          )}
        />
      </ChartFrame>
    </div>
  );
};

export default CashHindcastChartBench;
