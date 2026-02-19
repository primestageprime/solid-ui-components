import { Component } from "solid-js";
import { StatusBadge } from "../../src/components/Badge";
import { ResultDisplay } from "../../src/components/DataDisplay";

interface Depth3Props {
  onNavigate?: (id: string) => void;
}

export const ResultDisplayShowcase: Component<Depth3Props> = (props) => {
  return (
    <div class="component-section">
      <h2>ResultDisplay — Depth 3</h2>
      <p class="text-meta">Owns CSS (ResultDisplay.css). Composes NumberWithUnits (Depth 2). Large value + units row with label, sublabel, badge.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <ResultDisplay
            label="Performance Score"
            sublabel="Target: 85 pts"
            value="92.4"
            units="pts"
            badge={<StatusBadge variant="compliant">PASSING</StatusBadge>}
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Violation</h3>
          <ResultDisplay
            label="NOx Emissions"
            sublabel="Threshold: 3.5 g/kWh"
            value="4.12"
            units="g/kWh"
            valueColor="#ff0040"
            badge={<StatusBadge variant="violation">VIOLATION</StatusBadge>}
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — No Units</h3>
          <ResultDisplay
            label="Count"
            value={42}
          />
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">Label</div>
              <div class="text-meta">1rem / 600 weight header</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">Sublabel</div>
              <div class="text-meta">0.75rem, --text-muted</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Badge</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("status-badge")}>
              <div class="depth2-atom__label">StatusBadge</div>
              <StatusBadge variant="compliant">PASSING</StatusBadge>
            </div>
          </div>
          <h3>Depth 2</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Data Display</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">monospace number + sans-serif units</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
