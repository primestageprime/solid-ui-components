import { createSignal, Component } from "solid-js";
import { Button } from "../../src/components/Button";
import {
  PrimaryButton, SecondaryButton, DangerButton, WarningButton, GhostButton,
  OutlinedButton, TextButton, IconOnlyButton,
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
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="icon-only" aria-label="close">x</Button>
        </div>
        <div class="text-meta">
          Note: `warning` is amber-informational (attention/caution), distinct from `danger` which is red-destructive.
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
        <h3>Pill</h3>
        <p class="text-meta">
          Pure shape variant — rounded ends. Composes with any color variant and size.
          Use a wrapper component if you need pill-specific padding/typography.
        </p>
        <div class="example-row" style={{ "align-items": "center" }}>
          <Button variant="pill">Default</Button>
          <Button variant="pill" size="sm">Small</Button>
          <Button variant="pill" size="lg">Large</Button>
        </div>
        <div class="example-row" style={{ "align-items": "center", "margin-top": "12px" }}>
          <Button variant="pill" tone="accent">Pill + accent tone</Button>
          <Button variant="pill" tone="outline">Pill + outline tone</Button>
          <Button variant="pill" tone="muted">Pill + muted tone</Button>
        </div>
        <div class="text-meta">Tone matrix composes with pill shape.</div>
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
          <SecondaryButton>SecondaryButton</SecondaryButton>
          <DangerButton>DangerButton</DangerButton>
          <WarningButton>WarningButton</WarningButton>
          <GhostButton>GhostButton</GhostButton>
          <OutlinedButton>OutlinedButton</OutlinedButton>
          <TextButton>TextButton</TextButton>
          <IconOnlyButton aria-label="close">x</IconOnlyButton>
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
