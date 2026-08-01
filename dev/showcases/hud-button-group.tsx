import type { Component } from "solid-js";
import {
  ButtonGroup,
  createButtonGroup,
} from "../../src/components/ButtonGroup";
import { Button } from "../../src/components/Button/Button";

// Local prop-matrix instances — this showcase demonstrates the gap and
// orientation axes, which no shipped variant bakes. Factory-curried at module
// top so the visual config stays in one place rather than at the call site.
const ConnectedButtonGroup = createButtonGroup({ gap: "none" });
const VerticalGapButtonGroup = createButtonGroup({
  orientation: "vertical",
  gap: "sm",
});

export const ButtonGroupShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ButtonGroup + Button — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Button arrangement with gap
        variants.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Horizontal</h3>
          <ButtonGroup>
            <Button>Scan</Button>
            <Button>Analyze</Button>
            <Button>Deploy</Button>
            <Button variant="primary">Execute</Button>
          </ButtonGroup>

          <h3 class="showcase-heading-gap">
            Composed — Connected (gap: none)
          </h3>
          <ConnectedButtonGroup>
            <Button active>Day</Button>
            <Button>Week</Button>
            <Button>Month</Button>
            <Button>Year</Button>
          </ConnectedButtonGroup>

          <h3 class="showcase-heading-gap">Composed — Vertical</h3>
          <VerticalGapButtonGroup>
            <Button>Option A</Button>
            <Button>Option B</Button>
            <Button variant="danger">Delete</Button>
          </VerticalGapButtonGroup>

          <h3 class="showcase-heading-gap">Composed — Button Variants</h3>
          <ButtonGroup>
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </ButtonGroup>
        </div>
        <div class="depth2-atoms">
          <h3>Props — Group</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Orientation</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">horizontal / vertical</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Gap</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">none / sm / md / lg</div>
            </div>
          </div>
          <h3>Props — Button</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                default / primary / danger / ghost
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
