// BalanceReviewChart — the month as it happened against the forecast made
// when it began, with the variance strip under it.
import { type Component } from "solid-js";
import { BalanceReviewChart } from "../../src/components/BalanceReviewChart";
import { ChartFrame } from "../../src/components/ChartFrame";
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
        variance days carry a dot and a caption placed by the label ladder, clear
        of every line; each line's end is captioned in the right gutter, and a
        bracket between the two ends says how far the month landed from the
        forecast. Under the plot, the
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
          endLabels={{
            actual: `${fmt(BALANCE[BALANCE.length - 1].value)} today`,
            forecast: `${fmt(FORECAST[FORECAST.length - 1].value)} forecast`,
            gap: `${fmt(BALANCE[BALANCE.length - 1].value - FORECAST[FORECAST.length - 1].value)} vs forecast`,
          }}
          xDomain={[BALANCE[0].date, BALANCE[BALANCE.length - 1].date]}
          valueFormat={fmt}
          dateFormat={short}
          labels={{ floor: "floor", forecastMade: "forecast made", strip: "variance against the forecast, by day" }}
          strip={{ minExtent: 5_000 }}
        />
        <Legend
          items={[
            { label: "actual balance", color: "var(--sui-cashflow-line-stroke, var(--sui-accent))", line: true },
            { label: "forecast made Sep 1", color: "var(--sui-text-muted)", line: { dash: "6 4" } },
            { label: "cash floor", color: "var(--sui-cashflow-negative)", line: { dash: "4 3" } },
          ]}
        />
      </div>
    </div>
    <div class="example-group">
      <SectionTitle>In a ChartFrame, filling it</SectionTitle>
      <MutedBody>
        <code>size="fill"</code> takes the frame's box, as the Cash Flow charts do, with the
        same accent, grid and gutter captions. The box is 360px high here.
      </MutedBody>
      <div class="balance-review-chart-demo balance-review-chart-demo__frame">
        <ChartFrame title="Cash Flow" yTitle="Balance ($)">
          <BalanceReviewChart
            actual={BALANCE}
            forecast={FORECAST}
            forecastMadeOn={FORECAST[0].date}
            floor={0}
            variance={DAYS}
            marks={MARKS}
            endLabels={{
              actual: `${fmt(BALANCE[BALANCE.length - 1].value)} today`,
              forecast: `${fmt(FORECAST[FORECAST.length - 1].value)} forecast`,
              gap: `${fmt(BALANCE[BALANCE.length - 1].value - FORECAST[FORECAST.length - 1].value)} vs forecast`,
            }}
            xDomain={[BALANCE[0].date, BALANCE[BALANCE.length - 1].date]}
            valueFormat={fmt}
            dateFormat={short}
            labels={{ floor: "floor", forecastMade: "forecast made", strip: "variance against the forecast, by day" }}
            strip={{ minExtent: 5_000 }}
            size="fill"
          />
        </ChartFrame>
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
