// VarianceStrip — the slot on its own terms: inside a Chart, in the bottom
// margin under a plot (the default), and across the plot.
import { type Component } from "solid-js";
import { Chart, LineSeries, XAxis, YAxis, Crosshair } from "../../src/components/Chart";
import { VarianceStrip } from "../../src/components/VarianceStrip";
import { SectionTitle, MutedBody } from "../../src/components/Text";
import { DAYS, BALANCE, x, fmt } from "./balance-review-data";

export const VarianceStripShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>VarianceStrip — Structural (Depth 1)</SectionTitle>
      <MutedBody>
        A Chart slot: one bar per day of variance against a forecast, up is
        better. The kind is a mark, not a hue: revenue filled, costs hatched,
        other muted. Default placement is the chart's bottom margin, under the
        plot; the caller sizes <code>margin.bottom</code> and pushes the x
        labels down with <code>XAxis.labelOffset</code>.
      </MutedBody>
      <div class="variance-strip-demo">
        <Chart width={880} height={300} xDomain={[DAYS[0].date, DAYS[DAYS.length - 1].date]} yDomain={[0, 160_000]} margin={{ top: 12, right: 24, bottom: 34 + 86, left: 56 }} responsive>
          <YAxis hideLine tickCount={4} tickFormat={fmt} />
          <XAxis hideLine labelOffset={16 + 86} tickOffset={86} />
          <LineSeries data={BALANCE} x={x} y={(p) => p.value} stroke="var(--sui-text-primary)" strokeWidth={2} />
          <VarianceStrip data={DAYS} x={x} value={(d) => d.value} kind={(d) => d.kind} format={fmt} title="variance against the forecast, by day" />
          <Crosshair series={[{ data: BALANCE, x, y: (p) => p.value }]} />
        </Chart>
      </div>
    </div>
    <div class="example-group">
      <SectionTitle>Across the plot</SectionTitle>
      <MutedBody>
        <code>placement="plot"</code> spans the plot area, for a chart that is
        nothing but the strip. <code>VarianceStripChart</code> wraps this case.
      </MutedBody>
      <div class="variance-strip-demo">
        <Chart width={880} height={120} xDomain={[DAYS[0].date, DAYS[DAYS.length - 1].date]} yDomain={[-1, 1]} margin={{ top: 18, right: 24, bottom: 26, left: 56 }} responsive>
          <XAxis hideLine />
          <VarianceStrip data={DAYS} x={x} value={(d) => d.value} kind={(d) => d.kind} placement="plot" format={fmt} />
          <Crosshair />
        </Chart>
      </div>
    </div>
  </div>
);
