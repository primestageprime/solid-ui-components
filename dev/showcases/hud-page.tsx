import type { Component } from "solid-js";
import { Page } from "../../src/components/Page";
import { Stack } from "../../src/components/Layout/Stack";
import { MutedBody } from "../../src/components/Text";

export const PageShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Page — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Page container with scanline
        and grid overlays.
      </p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="sm">
          <div>
            <div class="text-meta">default — dark bg, no pattern</div>
            <Page class="hud-page-demo__frame">
              <MutedBody>Default page shell</MutedBody>
            </Page>
          </div>

          <div>
            <div class="text-meta">gridPattern — 40px accent grid overlay</div>
            <Page
              gridPattern
              class="hud-page-demo__frame"
            >
              <MutedBody>Grid pattern background</MutedBody>
            </Page>
          </div>

          <div>
            <div class="text-meta">
              scanLines — animated horizontal scan line effect
            </div>
            <Page scanLines class="hud-page-demo__frame">
              <MutedBody>Scan lines overlay</MutedBody>
            </Page>
          </div>

          <div>
            <div class="text-meta">
              gridPattern + scanLines — combined effects
            </div>
            <Page
              gridPattern
              scanLines
              class="hud-page-demo__frame"
            >
              <MutedBody>Both effects combined</MutedBody>
            </Page>
          </div>
        </Stack>
      </div>
    </div>
  );
};
