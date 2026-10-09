// VarianceStripChart — the strip alone: a Chart that is nothing but the
// variance bars, the x axis and a tooltip.
import { type Component } from "solid-js";
import { VarianceStripChart } from "../../src/components/VarianceStripChart";
import { SectionTitle, MutedBody } from "../../src/components/Text";
import { DAYS, fmt } from "./balance-review-data";

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const VarianceStripChartShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>VarianceStripChart — Composite (Depth 2)</SectionTitle>
      <MutedBody>
        One bar per day of variance against the forecast, on its own: the strip
        across the plot, the ± extent at the left, the days along the bottom,
        and a tooltip naming the day, the figure and the kind.
      </MutedBody>
      <div class="variance-strip-chart-demo">
        <VarianceStripChart data={DAYS} valueFormat={fmt} dateFormat={short} title="variance against the forecast, by day" minExtent={5_000} />
      </div>
    </div>
  </div>
);
