import { Component } from "solid-js";
import { HUDPage } from "../../src/components/HUD";
import { Stack } from "../../src/components/Layout";

export const HUDPageShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>HUDPage — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Page container with scanline and grid overlays.</p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="md">
          <div>
            <div class="text-meta">default — dark bg, no pattern</div>
            <HUDPage style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--hud-text-dim)", margin: 0 }}>Default page shell</p>
            </HUDPage>
          </div>

          <div>
            <div class="text-meta">gridPattern — 40px accent grid overlay</div>
            <HUDPage gridPattern style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--hud-text-dim)", margin: 0 }}>Grid pattern background</p>
            </HUDPage>
          </div>

          <div>
            <div class="text-meta">scanLines — animated horizontal scan line effect</div>
            <HUDPage scanLines style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--hud-text-dim)", margin: 0 }}>Scan lines overlay</p>
            </HUDPage>
          </div>

          <div>
            <div class="text-meta">gridPattern + scanLines — combined effects</div>
            <HUDPage gridPattern scanLines style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--hud-text-dim)", margin: 0 }}>Both effects combined</p>
            </HUDPage>
          </div>
        </Stack>
      </div>
    </div>
  );
};
