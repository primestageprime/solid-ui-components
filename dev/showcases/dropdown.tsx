import { Component, createSignal } from "solid-js";
import { Dropdown } from "../../src/components/Dropdown";
import { Stack } from "../../src/components/Layout/Stack";

export const DropdownShowcase: Component = () => {
  const [v, setV] = createSignal<string>("us-east-1");
  return (
    <div class="component-section">
      <h2>Dropdown — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Selectable list with optional footer, label, and color accent. Uses
        controlled <code>value</code> + <code>onChange</code>.
      </p>
      <div class="example-group">
        <Stack gap="sm" style={{ "max-width": "300px" }}>
          <Dropdown
            id="region"
            label="Region"
            value={v()}
            onChange={(id) => setV(id)}
            items={[
              { id: "us-east-1", label: "us-east-1" },
              { id: "us-west-2", label: "us-west-2" },
              { id: "eu-west-1", label: "eu-west-1" },
              { id: "eu-north-1", label: "eu-north-1" },
              { id: "ap-south-1", label: "ap-south-1" },
            ]}
          />
          <span class="text-meta">selected: {v()}</span>
        </Stack>
      </div>
    </div>
  );
};
