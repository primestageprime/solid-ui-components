import { Component } from "solid-js";
import { Page } from "../../src/components/Page";
import { Stack } from "../../src/components/Layout/Stack";

export const PageShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Page — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Page container with scanline and grid overlays.</p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="sm">
          <div>
            <div class="text-meta">default — dark bg, no pattern</div>
            <Page style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--sui-text-secondary)", margin: 0 }}>Default page shell</p>
            </Page>
          </div>

          <div>
            <div class="text-meta">gridPattern — 40px accent grid overlay</div>
            <Page gridPattern style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--sui-text-secondary)", margin: 0 }}>Grid pattern background</p>
            </Page>
          </div>

          <div>
            <div class="text-meta">scanLines — animated horizontal scan line effect</div>
            <Page scanLines style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--sui-text-secondary)", margin: 0 }}>Scan lines overlay</p>
            </Page>
          </div>

          <div>
            <div class="text-meta">gridPattern + scanLines — combined effects</div>
            <Page gridPattern scanLines style={{ height: "120px", "min-height": "unset" }}>
              <p style={{ color: "var(--sui-text-secondary)", margin: 0 }}>Both effects combined</p>
            </Page>
          </div>
        </Stack>
      </div>
    </div>
  );
};
