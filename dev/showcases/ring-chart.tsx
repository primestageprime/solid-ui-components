import { Component } from "solid-js";
import { RingChart } from "../../src/components/RingChart";
import { Row } from "../../src/components/Layout/Row";

export const RingChartShowcase: Component = () => (
  <div class="component-section">
    <h2>RingChart — Atomic (Depth 1)</h2>
    <p class="text-meta">
      Donut / ring chart with stacked segments + center label. Pure SVG.
    </p>
    <div class="example-group">
      <Row gap="sm" align="center" wrap>
        <RingChart
          size={140}
          total={100}
          label="62%"
          sublabel="complete"
          segments={[
            { value: 62, color: "var(--sui-success, #2a6)" },
            { value: 38, color: "var(--sui-border-bright, #2a2a3e)" },
          ]}
        />
        <RingChart
          size={140}
          total={20}
          label="3 / 20"
          sublabel="closed"
          segments={[
            { value: 3, color: "var(--sui-success, #2a6)" },
            { value: 8, color: "var(--sui-accent)" },
            { value: 4, color: "var(--sui-warning, #b80)" },
            { value: 5, color: "var(--sui-border-bright, #2a2a3e)" },
          ]}
        />
      </Row>
    </div>
  </div>
);
