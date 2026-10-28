// Shared example data for the ActualForecastChart showcase and the
// `workshop:cash-hindcast-chart` bench: 90 days of actuals in the $5k–$10k
// band with payroll dips, today at $7,239, then a forecast that steps up
// on the 1st of each month and bleeds $500 a day, with a widening range.
// Same shape as the thorcasting briefing screenshot of 2026-10-27.
import type { JSX } from "solid-js";
import type { ActualForecastRange } from "../../src/components/ActualForecastChart";
import type { CashflowCell } from "../../src/components/CashflowScrubChart";
import { dailyCells } from "../../src/components/DateAxis";

export const TODAY = new Date("2026-10-27T00:00:00Z");
export const BACK_DAYS = 90;
export const TODAY_CENTS = 723_900;
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

export interface Point {
  balanceCents: number;
  range: ActualForecastRange | null;
}

/** One point per day from `-BACK_DAYS` to `+forwardDays`. The forecast steps
 *  up on the 1st of each month and bleeds $500 a day, net about +$60k/mo. */
export const buildPoints = (forwardDays: number): Point[] => {
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

export const buildCells = (
  points: Point[],
  forwardDays: number,
): CashflowCell[] =>
  dailyCells(addDays(TODAY, -BACK_DAYS), addDays(TODAY, forwardDays)).map(
    (cell, i) => ({
      ...cell,
      cashflowCents:
        points[i].balanceCents -
        (points[i - 1]?.balanceCents ?? points[i].balanceCents),
      balanceCents: points[i].balanceCents,
    }),
  );

/** The chart's `range` prop over a point list. */
export const rangeOf =
  (points: () => Point[]) =>
  (_c: CashflowCell, i: number): ActualForecastRange | null =>
    points()[i].range;

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

/** The hover tooltip body: the day, then "Actual" at and before the anchor
 *  and "Baseline" after it. Classes live in `dev/main.css`. */
export const renderBriefingTip = (c: CashflowCell, i: number): JSX.Element => (
  <div class="actual-forecast-chart-demo__tip">
    <div class="actual-forecast-chart-demo__tip-title">{fmtDate(c.start)}</div>
    <div>
      {i <= BACK_DAYS ? "Actual" : "Baseline"}: {fmtDollars(c.balanceCents)}
    </div>
  </div>
);
