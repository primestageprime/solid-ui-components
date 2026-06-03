import { Component, createSignal } from "solid-js";
import { SegmentedControl, OverrideToggle } from "../../src/components/SegmentedControl";
import { Stack } from "../../src/components/Layout/Stack";

export const SegmentedControlShowcase: Component = () => {
  const [mode, setMode] = createSignal("auto");
  const [view, setView] = createSignal("day");

  return (
    <div class="component-section">
      <h2>SegmentedControl — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Single-select control across more than two states, with group dividers and per-state color.
      </p>

      <div class="example-group">
        <h3>OverrideToggle — <code>AUTO | (PROD | OFF)</code></h3>
        <p class="text-meta">
          Curried variant. <code>Auto</code> is its own group; <code>Prod</code>/<code>Off</code>
          form the override group. Selected colors are distinct: Auto accent, Prod green, Off red.
        </p>
        <OverrideToggle value={mode()} onValueChange={setMode} />
        <div class="text-meta">State: {mode()}</div>
      </div>

      <div class="example-group">
        <h3>Ungrouped, control-level color</h3>
        <SegmentedControl
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={view()}
          onValueChange={setView}
          color="success"
        />
        <div class="text-meta">View: {view()}</div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <Stack gap="md">
          <SegmentedControl
            options={[{ value: "a", label: "Enabled" }, { value: "b", label: "Disabled seg", disabled: true }, { value: "c", label: "Other" }]}
            value="a"
            onValueChange={() => {}}
          />
          <SegmentedControl disabled options={[{ value: "a", label: "Whole" }, { value: "b", label: "Control" }, { value: "c", label: "Disabled" }]} value="a" onValueChange={() => {}} />
        </Stack>
      </div>
    </div>
  );
};
