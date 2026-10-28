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
// was extracted from this bench by `/sui-build`. The synthetic data is
// shared with the showcase in `dev/showcases/actual-forecast-data.tsx`.
// ============================================
import { type Component, createMemo, createSignal } from "solid-js";
import {
  ChartFrame,
  ClusterRow,
  MutedBody,
  SectionTitle,
  Toggle,
  createActualForecastChart,
} from "../../../src";
import {
  BACK_DAYS,
  TODAY_CENTS,
  buildCells,
  buildPoints,
  rangeOf,
  renderBriefingTip,
} from "../actual-forecast-data";

export const meta = { label: "Cash Hindcast Chart" };

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
  const range = rangeOf(points);

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
          renderHoverTooltip={renderBriefingTip}
        />
      </ChartFrame>
    </div>
  );
};

export default CashHindcastChartBench;
