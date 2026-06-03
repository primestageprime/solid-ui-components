import { Component, createSignal } from "solid-js";
import { SegmentedControl, OverrideToggle } from "../../src/components/SegmentedControl";
import { Stack } from "../../src/components/Layout/Stack";

export const SegmentedControlShowcase: Component = () => {
  const [mode, setMode] = createSignal("auto");
  const [view, setView] = createSignal("day");
  const [sizeDemo, setSizeDemo] = createSignal("a");

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
          form the override group. <code>Off</code> colors danger when selected.
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
        <h3>Sizes</h3>
        <Stack gap="md">
          <SegmentedControl size="sm" options={[{ value: "a", label: "SM A" }, { value: "b", label: "SM B" }]} value={sizeDemo()} onValueChange={setSizeDemo} />
          <SegmentedControl size="md" options={[{ value: "a", label: "MD A" }, { value: "b", label: "MD B" }]} value={sizeDemo()} onValueChange={setSizeDemo} />
          <SegmentedControl size="lg" options={[{ value: "a", label: "LG A" }, { value: "b", label: "LG B" }]} value={sizeDemo()} onValueChange={setSizeDemo} />
        </Stack>
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
