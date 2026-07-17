import type { Component } from "solid-js";
import { InlineChartErrorOverlay } from "../../src/components/Feedback";

/**
 * InlineChartErrorOverlay showcase — closes the showcase gap so the
 * layout-purity migration (absolute overlay's flex-centering → `CenteredStack`,
 * keeping only the `position:absolute` anchoring) is visually verifiable. The
 * overlay fills a `position:relative` chart-area stand-in and centers its
 * title/subtitle.
 */
const ChartArea: Component<{ children: unknown }> = (props) => (
  <div class="inline-chart-error-demo__area">{props.children as never}</div>
);

export const InlineChartErrorOverlayShowcase: Component = () => (
  <div class="component-section">
    <h2>InlineChartErrorOverlay — Atomic (Depth 1)</h2>
    <p class="text-meta">
      A centered error overlay that fills its (relatively-positioned) chart area
      and centers a title + optional subtitle.
    </p>

    <div class="example-group">
      <h3>Title + subtitle</h3>
      <ChartArea>
        <InlineChartErrorOverlay
          title="No data available"
          subtitle="Try widening the selected date range."
        />
      </ChartArea>
    </div>

    <div class="example-group">
      <h3>Title only</h3>
      <ChartArea>
        <InlineChartErrorOverlay title="Failed to load chart" />
      </ChartArea>
    </div>
  </div>
);
