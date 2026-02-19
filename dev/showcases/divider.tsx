import { Component } from "solid-js";
import { Panel, Divider } from "../../src/components/Section";

export const DividerShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Divider — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Section.css), no component imports. Horizontal/vertical content separator.</p>

      <div class="example-group">
        <h3>Solid & Dashed</h3>
        <Panel>
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content above</p>
          <Divider />
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content below (solid)</p>
          <Divider variant="dashed" />
          <p style={{ margin: 0, color: "var(--jtf-text-secondary)" }}>Content below (dashed)</p>
        </Panel>
      </div>
    </div>
  );
};
