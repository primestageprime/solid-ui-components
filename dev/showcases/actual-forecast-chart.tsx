// ActualForecastChart — the past and the future of one balance in one plot.
//
// The showcase plays the CONSUMER: it owns the window, the data, the words
// and the frame. `BriefingCashChart` is `createActualForecastChart` called
// ONCE with thorcasting's words ("Baseline", "Starting balance"), and every
// chart below passes data only. The second card is the variant SUI ships,
// with its own English words, so the default is visible rather than
// described. The example data is shared with the
// `workshop:cash-hindcast-chart` bench in `./actual-forecast-data`.
import { createMemo, createSignal, type Component } from "solid-js";
import {
  ActualForecastChart,
  createActualForecastChart,
} from "../../src/components/ActualForecastChart";
import { ChartFrame } from "../../src/components/ChartFrame";
import { ClusterRow } from "../../src/components/Layout";
import {
  MutedBody,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";
import { Toggle } from "../../src/components/Toggle";
import {
  BACK_DAYS,
  TODAY_CENTS,
  buildCells,
  buildPoints,
  rangeOf,
  renderBriefingTip,
} from "./actual-forecast-data";

// The consumer's words, fixed once.
const BriefingCashChart = createActualForecastChart({
  labels: { forecast: "Baseline", openingBalance: "Starting balance" },
});

export const ActualForecastChartShowcase: Component = () => {
  const [yearAhead, setYearAhead] = createSignal(false);
  const forwardDays = () => (yearAhead() ? 365 : BACK_DAYS);
  const points = createMemo(() => buildPoints(forwardDays()));
  const cells = createMemo(() => buildCells(points(), forwardDays()));
  const range = rangeOf(points);

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
            renderHoverTooltip={renderBriefingTip}
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
            renderHoverTooltip={renderBriefingTip}
          />
        </ChartFrame>
      </div>
    </div>
  );
};
