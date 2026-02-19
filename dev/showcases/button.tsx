import { createSignal, Component } from "solid-js";
import { Button } from "../../src/components/Button";
import {
  PrimaryButton, DangerButton, GhostButton,
  SmallPrimaryButton, SmallDangerButton, SmallGhostButton,
  LargePrimaryButton,
} from "../../src/components/Button";

export const ButtonShowcase: Component = () => {
  const [loading, setLoading] = createSignal(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div class="component-section">
      <h2>Button — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Button.css), no component imports. Multi-variant button with loading spinner.</p>

      <div class="example-group">
        <h3>Variants</h3>
        <div class="example-row">
          <Button>Default</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-row" style={{ "align-items": "center" }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <div class="example-row">
          <Button disabled>Disabled</Button>
          <Button loading={loading()} onClick={handleClick}>
            {loading() ? "Loading..." : "Click Me"}
          </Button>
        </div>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <div class="example-row" style={{ "align-items": "center" }}>
          <PrimaryButton>PrimaryButton</PrimaryButton>
          <DangerButton>DangerButton</DangerButton>
          <GhostButton>GhostButton</GhostButton>
        </div>
        <div class="text-meta">Default size — variant pre-set</div>

        <div class="example-row" style={{ "align-items": "center", "margin-top": "12px" }}>
          <SmallPrimaryButton>SmallPrimary</SmallPrimaryButton>
          <SmallDangerButton>SmallDanger</SmallDangerButton>
          <SmallGhostButton>SmallGhost</SmallGhostButton>
        </div>
        <div class="text-meta">Small size — variant + size pre-set</div>

        <div class="example-row" style={{ "align-items": "center", "margin-top": "12px" }}>
          <LargePrimaryButton>LargePrimary</LargePrimaryButton>
        </div>
        <div class="text-meta">LargePrimaryButton — variant: "primary", size: "lg"</div>
      </div>
    </div>
  );
};
