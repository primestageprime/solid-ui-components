// ActualForecastChart — the past and the future of one balance in one plot.
//
// The showcase plays the CONSUMER: it owns the window, the data, the words
// and the frame. `BriefingCashChart` is `createActualForecastChart` called
// ONCE with thorcasting's words ("Baseline", "Starting balance"), and every
// chart below passes data only. The second card is the variant SUI ships,
// with its own English words, so the default is visible rather than
// described.
import { createMemo, createSignal, type Component } from "solid-js";
import {
  ActualForecastChart,
  createActualForecastChart,
  type ActualForecastRange,
} from "../../src/components/ActualForecastChart";
import type { CashflowCell } from "../../src/components/CashflowScrubChart";
import { ChartFrame } from "../../src/components/ChartFrame";
import { dailyCells } from "../../src/components/DateAxis";
import { ClusterRow } from "../../src/components/Layout";
import {
  MutedBody,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";
import { Toggle } from "../../src/components/Toggle";

// ── Synthetic data: $5k–$10k of actuals, then a stepped forecast ──────────
const TODAY = new Date("2026-10-27T00:00:00Z");
const BACK_DAYS = 90;
const TODAY_CENTS = 723_900;

const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
};

const actualCents = (i: number): number => {
  if (i === 0) return TODAY_CENTS;
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

// The consumer's words, fixed once.
const BriefingCashChart = createActualForecastChart({
  labels: { forecast: "Baseline", openingBalance: "Starting balance" },
});

export const ActualForecastChartShowcase: Component = () => {
  const [yearAhead, setYearAhead] = createSignal(false);
  const forwardDays = () => (yearAhead() ? 365 : BACK_DAYS);
  const points = createMemo(() => buildPoints(forwardDays()));
  const cells = createMemo(() => buildCells(points(), forwardDays()));
  const range = (_c: CashflowCell, i: number) => points()[i].range;

  const tooltip = (c: CashflowCell, i: number) => (
    <div class="actual-forecast-chart-demo__tip">
      <div class="actual-forecast-chart-demo__tip-title">
        {fmtDate(c.start)}
      </div>
      <div>
        {i <= BACK_DAYS ? "Actual" : "Baseline"}: {fmtDollars(c.balanceCents)}
      </div>
    </div>
  );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>ActualForecastChart</SectionTitle>
      <MutedBody>
        One balance, past and future. Solid actuals run to the anchor rule; the
        forecast runs dashed after it with its range cone. The opening balance
        and the cash floor cross the plot as flat rules.
      </MutedBody>

      <div class="example-group">
        <SubsectionTitle>Curried with a consumer's words</SubsectionTitle>
        <MutedBody>
          `createActualForecastChart` called once with "Baseline" and "Starting
          balance". Inside a `ChartFrame`, as on a screen.
        </MutedBody>
        <ClusterRow>
          <Toggle
            label="12-month horizon"
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
            renderHoverTooltip={tooltip}
          />
        </ChartFrame>
      </div>

      <div class="example-group">
        <SubsectionTitle>The variant SUI ships</SubsectionTitle>
        <MutedBody>
          English defaults: "Actual", "Forecast", "Today", "Opening balance",
          "Cash floor". No cone and no rules when none are stated.
        </MutedBody>
        <ChartFrame title="Balance" yTitle="Balance ($)">
          <ActualForecastChart
            cells={cells()}
            anchorIndex={BACK_DAYS}
            today={TODAY}
            renderHoverTooltip={tooltip}
          />
        </ChartFrame>
      </div>
    </div>
  );
};
