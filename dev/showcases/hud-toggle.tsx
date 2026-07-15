import { type Component, createSignal } from "solid-js";
import { Toggle } from "../../src/components/Toggle";
import { Stack } from "../../src/components/Layout/Stack";
import { ClusterRow, WrappedClusterRow } from "../../src/components/Layout";

export const ToggleShowcase: Component = () => {
  const [checked, setChecked] = createSignal(false);
  const [minimal, setMinimal] = createSignal(true);
  const [enabled, setEnabled] = createSignal(false);

  return (
    <div class="component-section">
      <h2>Toggle — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Toggle component with default and minimal variants.
      </p>

      <div class="example-group">
        <h3>
          Clean value-handler — <code>onCheckedChange</code>
        </h3>
        <p class="text-meta">
          Pass a signal setter directly. No{" "}
          <code>event.currentTarget.checked</code> unwrap required.
        </p>
        <Toggle
          label="Enable nominal display"
          checked={enabled()}
          onCheckedChange={setEnabled}
        />
        <div class="text-meta">State: {enabled() ? "ON" : "OFF"}</div>
      </div>

      <div class="example-group">
        <h3>Variants</h3>
        <Stack gap="sm">
          <div>
            <Toggle
              label="Default"
              checked={checked()}
              onCheckedChange={setChecked}
            />
            <div class="text-meta">default — standard slider toggle</div>
          </div>
          <div>
            <Toggle
              variant="minimal"
              label="Minimal"
              checked={minimal()}
              onCheckedChange={setMinimal}
            />
            <div class="text-meta">minimal — thin rail with dot</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <ClusterRow>
          <Toggle
            size="sm"
            label="SM"
            checked={checked()}
            onCheckedChange={setChecked}
          />
          <Toggle
            size="md"
            label="MD"
            checked={checked()}
            onCheckedChange={setChecked}
          />
          <Toggle
            size="lg"
            label="LG"
            checked={checked()}
            onCheckedChange={setChecked}
          />
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Colors</h3>
        <WrappedClusterRow>
          <Toggle label="Default" checked={true} onChange={() => {}} />
          <Toggle
            color="danger"
            label="Danger"
            checked={true}
            onChange={() => {}}
          />
          <Toggle
            color="warning"
            label="Warning"
            checked={true}
            onChange={() => {}}
          />
          <Toggle
            color="success"
            label="Success"
            checked={true}
            onChange={() => {}}
          />
        </WrappedClusterRow>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <ClusterRow>
          <Toggle
            label="Disabled off"
            disabled
            checked={false}
            onChange={() => {}}
          />
          <Toggle
            label="Disabled on"
            disabled
            checked={true}
            onChange={() => {}}
          />
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Label Position</h3>
        <Stack gap="sm">
          <Toggle
            label="Right (default)"
            checked={checked()}
            onCheckedChange={setChecked}
          />
          <Toggle
            label="Left"
            labelPosition="left"
            checked={checked()}
            onCheckedChange={setChecked}
          />
        </Stack>
      </div>
    </div>
  );
};
