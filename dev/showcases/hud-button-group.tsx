import { Component } from "solid-js";
import { HUDButtonGroup, HUDButton } from "../../src/components/HUD";

export const HUDButtonGroupShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>HUDButtonGroup + HUDButton — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Button arrangement with gap variants.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Horizontal</h3>
          <HUDButtonGroup>
            <HUDButton>Scan</HUDButton>
            <HUDButton>Analyze</HUDButton>
            <HUDButton>Deploy</HUDButton>
            <HUDButton variant="primary">Execute</HUDButton>
          </HUDButtonGroup>

          <h3 style={{ "margin-top": "24px" }}>Composed — Connected (gap: none)</h3>
          <HUDButtonGroup gap="none">
            <HUDButton active>Day</HUDButton>
            <HUDButton>Week</HUDButton>
            <HUDButton>Month</HUDButton>
            <HUDButton>Year</HUDButton>
          </HUDButtonGroup>

          <h3 style={{ "margin-top": "24px" }}>Composed — Vertical</h3>
          <HUDButtonGroup orientation="vertical" gap="sm">
            <HUDButton>Option A</HUDButton>
            <HUDButton>Option B</HUDButton>
            <HUDButton variant="danger">Delete</HUDButton>
          </HUDButtonGroup>

          <h3 style={{ "margin-top": "24px" }}>Composed — Button Variants</h3>
          <HUDButtonGroup>
            <HUDButton>Default</HUDButton>
            <HUDButton variant="primary">Primary</HUDButton>
            <HUDButton variant="danger">Danger</HUDButton>
            <HUDButton variant="ghost">Ghost</HUDButton>
          </HUDButtonGroup>
        </div>
        <div class="depth2-atoms">
          <h3>Props — Group</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Orientation</div>
            <div class="depth2-atom"><div class="depth2-atom__label">horizontal / vertical</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Gap</div>
            <div class="depth2-atom"><div class="depth2-atom__label">none / sm / md / lg</div></div>
          </div>
          <h3>Props — Button</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / primary / danger / ghost</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
