import { Component } from "solid-js";
import { HUDSection } from "../../src/components/HUD";
import { Button } from "../../src/components/Button";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const HUDSectionShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>HUDSection — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Collapsible section with title, subtitle, corners.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <HUDSection
            title="System Status"
            subtitle="Real-time monitoring"
            headerAction={<Button variant="primary" size="sm">Refresh</Button>}
          >
            <p style={{ margin: "0", color: "var(--hud-text-dim)", "font-size": "0.875rem" }}>
              HUD section content goes here.
            </p>
          </HUDSection>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Title</div>
            <h2 style={{ margin: "0", "font-size": "1rem", "font-weight": "600" }}>System Status</h2>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("text")}
          >
            <div class="depth2-atom__label">Sublabel</div>
            <p style={{ margin: "0", "font-size": "0.75rem", color: "var(--jtf-text-muted)" }}>Real-time monitoring</p>
          </div>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("button")}
          >
            <div class="depth2-atom__label">Button</div>
            <Button variant="primary" size="sm">Refresh</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
