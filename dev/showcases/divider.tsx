import type { Component } from "solid-js";
import { Panel } from "../../src/components/Panel/Panel";
import { Divider, DashedDivider } from "../../src/components/Divider";

export const DividerShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Divider — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Section.css), no component imports. Horizontal/vertical
        content separator.
      </p>

      <div class="example-group">
        <h3>Solid & Dashed</h3>
        <Panel>
          <p style={{ margin: 0, color: "var(--sui-text-secondary)" }}>
            Content above
          </p>
          <Divider />
          <p style={{ margin: 0, color: "var(--sui-text-secondary)" }}>
            Content below (solid)
          </p>
          <DashedDivider />
          <p style={{ margin: 0, color: "var(--sui-text-secondary)" }}>
            Content below (dashed)
          </p>
        </Panel>
      </div>
    </div>
  );
};
