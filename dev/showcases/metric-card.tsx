import { Component } from "solid-js";
import { MetricCard } from "../../src/components/DataDisplay";
import { Row } from "../../src/components/Layout";

interface Depth3Props {
  onNavigate?: (id: string) => void;
}

export const MetricCardShowcase: Component<Depth3Props> = (props) => {
  return (
    <div class="component-section">
      <h2>MetricCard — Depth 3</h2>
      <p class="text-meta">Owns CSS (MetricCard.css). Composes NumberWithUnits (Depth 2). Labeled value card with status color variants.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Color Variants</h3>
          <Row gap="md" wrap>
            <MetricCard label="Default" value={42} />
            <MetricCard label="Success" value={0} color="success" />
            <MetricCard label="Warning" value={3} color="warning" />
            <MetricCard label="Danger" value={12} color="danger" />
          </Row>

          <h3 style={{ "margin-top": "24px" }}>Composed — With Units</h3>
          <Row gap="md" wrap>
            <MetricCard label="NOx Average" value={3.81} units="g/kWh" />
            <MetricCard label="ROG Average" value={1.24} units="g/kWh" />
            <MetricCard label="Duration" value="48h 12m" />
          </Row>

          <h3 style={{ "margin-top": "24px" }}>Composed — Color + Units</h3>
          <Row gap="md" wrap>
            <MetricCard label="Compliant" value={0.42} units="ppm" color="success" />
            <MetricCard label="Over Limit" value={12.7} units="ppm" color="danger" />
          </Row>

          <h3 style={{ "margin-top": "24px" }}>Composed — Dashboard Row</h3>
          <Row gap="md" wrap>
            <MetricCard label="Missing Metrics" value={3} color="warning" />
            <MetricCard label="Total Violations" value={7} color="danger" />
            <MetricCard label="Assets w/ Violations" value={0} color="success" />
          </Row>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">TextSublabel</div>
              <div class="text-meta">uppercase label, 0.7rem, --text-muted</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Surface</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">Surface</div>
              <div class="text-meta">padding: md, radius: md, accent bg + border</div>
            </div>
          </div>
          <h3>Depth 2</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Data Display</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">monospace number + sans-serif units (when units prop set)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
