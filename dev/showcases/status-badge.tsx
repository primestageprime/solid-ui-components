import { Component } from "solid-js";
import { StatusBadge } from "../../src/components/Badge";

export const StatusBadgeShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>StatusBadge — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (StatusBadge.css), no component imports. Compliance-themed status badge with 5 variants.</p>

      <div class="example-group">
        <h3>Variants</h3>
        <div class="example-row" style={{ gap: "12px" }}>
          <StatusBadge variant="compliant">Compliant</StatusBadge>
          <StatusBadge variant="violation">Violation</StatusBadge>
          <StatusBadge variant="warning">Needs Power Log</StatusBadge>
          <StatusBadge variant="pending">Pending</StatusBadge>
          <StatusBadge variant="info">Info</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center", gap: "12px" }}>
          <StatusBadge variant="compliant" size="sm">Small</StatusBadge>
          <StatusBadge variant="compliant">Default</StatusBadge>
        </div>
      </div>

      <div class="example-group">
        <h3>With label prop</h3>
        <div class="example-row" style={{ gap: "12px" }}>
          <StatusBadge variant="compliant" label="COMPLIANT" />
          <StatusBadge variant="violation" label="VIOLATION" />
        </div>
      </div>

      <div class="example-group">
        <h3>In Context</h3>
        <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
          <span style={{ "font-size": "1.5rem", "font-weight": "600", color: "var(--jtf-text-primary)" }}>2.314</span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <StatusBadge variant="compliant">COMPLIANT</StatusBadge>
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: "12px", "margin-top": "12px" }}>
          <span style={{ "font-size": "1.5rem", "font-weight": "600", color: "#ff0040" }}>4.821</span>
          <span style={{ color: "var(--jtf-text-secondary)", "font-size": "0.9rem" }}>g/kWh</span>
          <StatusBadge variant="violation">VIOLATION</StatusBadge>
        </div>
      </div>
    </div>
  );
};
