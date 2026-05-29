import { Component } from "solid-js";
import { MetricCard } from "../../src/components/DataDisplay";
import { Row } from "../../src/components/Layout/Row";

export const MetricCardShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>MetricCard — Atomic Primitive (Depth 1)</h2>
      <p class="text-meta">Owns CSS (MetricCard.css); no library-component imports. Labeled value card with optional units and status color variants. When `units` is supplied the value uses the same monospace face as the sibling NumberWithUnits Primitive.</p>

      <h3>Color variants</h3>
      <Row gap="md" wrap>
        <MetricCard label="Default" value={42} />
        <MetricCard label="Success" value={0} color="success" />
        <MetricCard label="Warning" value={3} color="warning" />
        <MetricCard label="Danger" value={12} color="danger" />
      </Row>

      <h3 style={{ "margin-top": "24px" }}>With units</h3>
      <Row gap="md" wrap>
        <MetricCard label="NOx Average" value={3.81} units="g/kWh" />
        <MetricCard label="ROG Average" value={1.24} units="g/kWh" />
        <MetricCard label="Duration" value="48h 12m" />
      </Row>

      <h3 style={{ "margin-top": "24px" }}>Color + units</h3>
      <Row gap="md" wrap>
        <MetricCard label="Compliant" value={0.42} units="ppm" color="success" />
        <MetricCard label="Over Limit" value={12.7} units="ppm" color="danger" />
      </Row>

      <h3 style={{ "margin-top": "24px" }}>Dashboard row</h3>
      <Row gap="md" wrap>
        <MetricCard label="Missing Metrics" value={3} color="warning" />
        <MetricCard label="Total Violations" value={7} color="danger" />
        <MetricCard label="Assets w/ Violations" value={0} color="success" />
      </Row>
    </div>
  );
};
