import { Component } from "solid-js";
import { EngineDataSection } from "../../src/components/DataDisplay";

export const EngineDataSectionShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>EngineDataSection — Depth 3 (zero CSS)</h2>
      <p class="text-meta">Composes AlertBox (Depth 2) + NumberWithUnits (Depth 2) + Text/Layout variants. Heading + warning box + table slot.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — With Warning</h3>
          <EngineDataSection
            showWarning
            defaultKw={500}
            auxEngineHref="#"
          >
            <div style={{ padding: "12px", border: "1px solid var(--hud-border)", "border-radius": "4px", color: "var(--hud-text-dim)", "font-size": "13px" }}>
              [Table slot — engine power data would go here]
            </div>
          </EngineDataSection>

          <h3 style={{ "margin-top": "24px" }}>Composed — No Warning</h3>
          <EngineDataSection heading="Auxiliary Engine Data">
            <div style={{ padding: "12px", border: "1px solid var(--hud-border)", "border-radius": "4px", color: "var(--hud-text-dim)", "font-size": "13px" }}>
              [Table slot — aux engine entries]
            </div>
          </EngineDataSection>
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">AlertBox (Depth 2)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Warning box with action slot</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">NumberWithUnits (Depth 2)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Default kW value in warning</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">TextTitle / TextBody (curried)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Heading + warning body text</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">NarrowStack (curried)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Vertical layout wrapper</div></div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">heading</div>
            <div class="depth2-atom"><div class="depth2-atom__label">string (default: "Engine Power Compensation")</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">showWarning</div>
            <div class="depth2-atom"><div class="depth2-atom__label">boolean — show "Add Power Log" alert</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
