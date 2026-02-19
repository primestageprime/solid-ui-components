import { Component, createSignal } from "solid-js";
import { HUDToggle } from "../../src/components/HUD";
import { Stack } from "../../src/components/Layout";

export const HUDToggleShowcase: Component = () => {
  const [checked, setChecked] = createSignal(false);
  const [power, setPower] = createSignal(true);
  const [circuit, setCircuit] = createSignal(false);
  const [minimal, setMinimal] = createSignal(true);

  return (
    <div class="component-section">
      <h2>HUDToggle — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HUD.css), no component imports. Sci-fi toggle with power/circuit/minimal variants.</p>

      <div class="example-group">
        <h3>Variants</h3>
        <Stack gap="md">
          <div>
            <HUDToggle label="Default" checked={checked()} onChange={setChecked} />
            <div class="text-meta">default — standard slider toggle</div>
          </div>
          <div>
            <HUDToggle variant="power" label="Power" checked={power()} onChange={setPower} />
            <div class="text-meta">power — circular power button</div>
          </div>
          <div>
            <HUDToggle variant="circuit" label="Circuit" checked={circuit()} onChange={setCircuit} />
            <div class="text-meta">circuit — line trace with sliding node</div>
          </div>
          <div>
            <HUDToggle variant="minimal" label="Minimal" checked={minimal()} onChange={setMinimal} />
            <div class="text-meta">minimal — thin rail with dot</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
          <HUDToggle size="sm" label="SM" checked={checked()} onChange={setChecked} />
          <HUDToggle size="md" label="MD" checked={checked()} onChange={setChecked} />
          <HUDToggle size="lg" label="LG" checked={checked()} onChange={setChecked} />
        </div>
      </div>

      <div class="example-group">
        <h3>Colors</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center", "flex-wrap": "wrap" }}>
          <HUDToggle label="Default" checked={true} onChange={() => {}} />
          <HUDToggle color="danger" label="Danger" checked={true} onChange={() => {}} />
          <HUDToggle color="warning" label="Warning" checked={true} onChange={() => {}} />
          <HUDToggle color="success" label="Success" checked={true} onChange={() => {}} />
        </div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <div style={{ display: "flex", gap: "24px", "align-items": "center" }}>
          <HUDToggle label="Disabled off" disabled checked={false} onChange={() => {}} />
          <HUDToggle label="Disabled on" disabled checked={true} onChange={() => {}} />
        </div>
      </div>

      <div class="example-group">
        <h3>Label Position</h3>
        <Stack gap="sm">
          <HUDToggle label="Right (default)" checked={checked()} onChange={setChecked} />
          <HUDToggle label="Left" labelPosition="left" checked={checked()} onChange={setChecked} />
        </Stack>
      </div>
    </div>
  );
};
