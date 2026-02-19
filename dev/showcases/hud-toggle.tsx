import { Component, createSignal } from "solid-js";
import { Toggle } from "../../src/components/Toggle";
import { Stack } from "../../src/components/Layout";

export const ToggleShowcase: Component = () => {
  const [checked, setChecked] = createSignal(false);
  const [minimal, setMinimal] = createSignal(true);

  return (
    <div class="component-section">
      <h2>Toggle — Atomic (Depth 1)</h2>
      <p class="text-meta">Toggle component with default and minimal variants.</p>

      <div class="example-group">
        <h3>Variants</h3>
        <Stack gap="md">
          <div>
            <Toggle label="Default" checked={checked()} onChange={setChecked} />
            <div class="text-meta">default — standard slider toggle</div>
          </div>
          <div>
            <Toggle variant="minimal" label="Minimal" checked={minimal()} onChange={setMinimal} />
            <div class="text-meta">minimal — thin rail with dot</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
          <Toggle size="sm" label="SM" checked={checked()} onChange={setChecked} />
          <Toggle size="md" label="MD" checked={checked()} onChange={setChecked} />
          <Toggle size="lg" label="LG" checked={checked()} onChange={setChecked} />
        </div>
      </div>

      <div class="example-group">
        <h3>Colors</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center", "flex-wrap": "wrap" }}>
          <Toggle label="Default" checked={true} onChange={() => {}} />
          <Toggle color="danger" label="Danger" checked={true} onChange={() => {}} />
          <Toggle color="warning" label="Warning" checked={true} onChange={() => {}} />
          <Toggle color="success" label="Success" checked={true} onChange={() => {}} />
        </div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
          <Toggle label="Disabled off" disabled checked={false} onChange={() => {}} />
          <Toggle label="Disabled on" disabled checked={true} onChange={() => {}} />
        </div>
      </div>

      <div class="example-group">
        <h3>Label Position</h3>
        <Stack gap="sm">
          <Toggle label="Right (default)" checked={checked()} onChange={setChecked} />
          <Toggle label="Left" labelPosition="left" checked={checked()} onChange={setChecked} />
        </Stack>
      </div>
    </div>
  );
};
