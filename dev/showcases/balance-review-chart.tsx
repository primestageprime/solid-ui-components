// BalanceReviewChart — the month as it happened against the forecast made
// when it began, with the variance strip under it.
import { type Component } from "solid-js";
import { BalanceReviewChart } from "../../src/components/BalanceReviewChart";
import { Legend } from "../../src/components/Legend";
import { SectionTitle, MutedBody } from "../../src/components/Text";
import { BALANCE, DAYS, FORECAST, MARKS, fmt } from "./balance-review-data";

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const BalanceReviewChartShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>BalanceReviewChart — Composite (Depth 2)</SectionTitle>
      <MutedBody>
        The actual balance, solid, against the forecast frozen on the 1st,
        dashed from that day. The floor is the chart's bottom. The largest
        variance days carry a dot and a caption placed by the label ladder;
        each line's end is captioned in the right gutter. Under the plot, the
        <code>VarianceStrip</code> draws what each day did that the forecast
        did not, and one crosshair spans both.
      </MutedBody>
      <div class="balance-review-chart-demo">
        <BalanceReviewChart
          actual={BALANCE}
          forecast={FORECAST}
          forecastMadeOn={FORECAST[0].date}
          floor={0}
          variance={DAYS}
          marks={MARKS}
          endLabels={{ actual: `${fmt(BALANCE[BALANCE.length - 1].value)} today`, forecast: `${fmt(FORECAST[FORECAST.length - 1].value)} forecast` }}
          xDomain={[BALANCE[0].date, BALANCE[BALANCE.length - 1].date]}
          valueFormat={fmt}
          dateFormat={short}
          labels={{ floor: "floor", forecastMade: "forecast made", strip: "variance against the forecast, by day" }}
          strip={{ minExtent: 5_000 }}
        />
        <Legend
          items={[
            { label: "actual balance", color: "var(--sui-text-primary)", line: true },
            { label: "forecast made Sep 1", color: "var(--sui-text-secondary)", line: { dash: "5 4" } },
            { label: "cash floor", color: "var(--sui-danger)", line: { dash: "2 4" } },
          ]}
        />
      </div>
    </div>
    <div class="example-group">
      <SectionTitle>Without a forecast</SectionTitle>
      <MutedBody>No forecast, no dashed line and no strip: the chart ends above the day labels.</MutedBody>
      <div class="balance-review-chart-demo">
        <BalanceReviewChart actual={BALANCE} floor={0} xDomain={[BALANCE[0].date, BALANCE[BALANCE.length - 1].date]} valueFormat={fmt} dateFormat={short} labels={{ floor: "floor" }} endLabels={{ actual: `${fmt(BALANCE[BALANCE.length - 1].value)} today` }} />
      </div>
    </div>
  </div>
);
