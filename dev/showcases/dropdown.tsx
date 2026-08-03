import { type Component, createSignal } from "solid-js";
import {
  Dropdown,
  InlineSubtleDropdown,
  type DropdownItem,
} from "../../src/components/Dropdown";
import { Stack } from "../../src/components/Layout/Stack";

const SCENARIOS: DropdownItem[] = [
  { id: "baseline", label: "Baseline", color: "#a855f7", shape: "circle" },
  { id: "lean", label: "Lean", color: "#22d3ee", shape: "diamond" },
  { id: "growth", label: "Growth", color: "#f97316", shape: "chevron" },
  { id: "stress", label: "Stress", color: "#f43f5e", shape: "square" },
  // No shape — falls back to the plain dot, as it always has.
  { id: "draft", label: "Draft", color: "#94a3b8" },
];

export const DropdownShowcase: Component = () => {
  const [v, setV] = createSignal<string>("us-east-1");
  const [scenario, setScenario] = createSignal<string>("lean");
  return (
    <div class="component-section">
      <h2>Dropdown — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Selectable list with optional footer, label, and color accent. Uses
        controlled <code>value</code> + <code>onChange</code>.
      </p>
      <div class="example-group">
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
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

      <div class="example-group">
        <h3>Shape indicators — double-coded identity</h3>
        <p class="text-meta">
          An item with <code>color</code> alone keeps the plain dot; adding{" "}
          <code>shape</code> renders that shape as the indicator instead, in the
          trigger and the menu alike. Colour plus shape stays legible at small
          sizes, under colour-blindness, and in greyscale.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            value={scenario()}
            onChange={setScenario}
            items={SCENARIOS}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>InlineSubtleDropdown — curried (size "sm", subtle)</h3>
        <p class="text-meta">
          Compact inline picker that reads as plain text until hovered — for
          values embedded in dense editors and panes.
        </p>
        <InlineSubtleDropdown
          value={v()}
          onChange={(id) => setV(id)}
          items={[
            { id: "us-east-1", label: "us-east-1" },
            { id: "us-west-2", label: "us-west-2" },
            { id: "eu-west-1", label: "eu-west-1" },
          ]}
        />
      </div>
    </div>
  );
};
