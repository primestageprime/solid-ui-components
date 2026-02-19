import { Component } from "solid-js";
import {
  Panel,
  InfoPanel, AccentPanel, DangerPanel, WarningPanel,
  SuccessPanel, CompactPanel, DecoratedPanel,
} from "../../src/components/Panel";
import { Stack } from "../../src/components/Layout";

export const PanelShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Panel — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Sci-fi panel with title, corners, glow.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Corner Variants</h3>
          <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "16px" }}>
            <Panel title="Clip Corners" corners="clip" glow="subtle">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                Angled corners using clip-path.
              </p>
            </Panel>
            <Panel title="Bracket Corners" corners="bracket" glow="medium">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                L-shaped bracket decorations.
              </p>
            </Panel>
            <Panel title="Notch Corners" corners="notch" glow="strong">
              <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
                Asymmetric notch cut-outs.
              </p>
            </Panel>
          </div>

          <h3 style={{ "margin-top": "24px" }}>Composed — Color Variants</h3>
          <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "16px" }}>
            <Panel title="Primary" variant="primary" corners="clip" size="sm">
              <span style={{ color: "var(--hud-accent)" }}>Accent color</span>
            </Panel>
            <Panel title="Danger" variant="danger" corners="clip" size="sm">
              <span style={{ color: "var(--hud-danger)" }}>Warning state</span>
            </Panel>
            <Panel title="Success" variant="success" corners="clip" size="sm">
              <span style={{ color: "var(--hud-success)" }}>Positive state</span>
            </Panel>
          </div>

          <h3 style={{ "margin-top": "24px" }}>Composed — Edge Accents</h3>
          <Panel title="With Edge Accents" corners="clip" edgeAccents glow="subtle">
            <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>
              Decorative edge lines on the panel borders.
            </p>
          </Panel>

          <h3 style={{ "margin-top": "24px" }}>Curried Variants</h3>
          <Stack gap="md">
            <div>
              <InfoPanel title="InfoPanel">
                <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>clip corners, subtle glow</p>
              </InfoPanel>
              <div class="text-meta">InfoPanel — corners: "clip", glow: "subtle"</div>
            </div>
            <div>
              <AccentPanel title="AccentPanel">
                <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>primary, bracket corners, medium glow</p>
              </AccentPanel>
              <div class="text-meta">AccentPanel — variant: "primary", corners: "bracket", glow: "medium"</div>
            </div>
            <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "16px" }}>
              <div>
                <DangerPanel title="DangerPanel">
                  <span style={{ "font-size": "13px" }}>danger + strong glow</span>
                </DangerPanel>
              </div>
              <div>
                <WarningPanel title="WarningPanel">
                  <span style={{ "font-size": "13px" }}>warning + subtle glow</span>
                </WarningPanel>
              </div>
              <div>
                <SuccessPanel title="SuccessPanel">
                  <span style={{ "font-size": "13px" }}>success + subtle glow</span>
                </SuccessPanel>
              </div>
            </div>
            <div>
              <CompactPanel title="CompactPanel">
                <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>small size, no glow</p>
              </CompactPanel>
              <div class="text-meta">CompactPanel — size: "sm", corners: "clip", glow: "none"</div>
            </div>
            <div>
              <DecoratedPanel title="DecoratedPanel">
                <p style={{ color: "var(--hud-text-dim)", "font-size": "13px", margin: 0 }}>bracket corners + edge accents</p>
              </DecoratedPanel>
              <div class="text-meta">DecoratedPanel — corners: "bracket", edgeAccents, glow: "medium"</div>
            </div>
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Corners</div>
            <div class="depth2-atom"><div class="depth2-atom__label">clip / bracket / notch / round / none</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Glow</div>
            <div class="depth2-atom"><div class="depth2-atom__label">none / subtle / medium / strong</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / primary / danger / warning / success</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Size</div>
            <div class="depth2-atom"><div class="depth2-atom__label">sm / md / lg</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
