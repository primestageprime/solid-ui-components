import { type Component, createSignal } from "solid-js";
import { SegmentedControl, createSegmentedControl } from "../../src/components/SegmentedControl";
import { Stack } from "../../src/components/Layout/Stack";

// The dev gallery is itself a consumer app: domain-specific variants belong
// here, not in the library. This AUTO | (PROD | OFF) control is curried
// locally from the generic factory — exactly how a real consumer builds one.
const OverrideControl = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode" },
    { value: "prod", label: "Prod", group: "override", color: "success" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});

export const SegmentedControlShowcase: Component = () => {
  const [mode, setMode] = createSignal("auto");
  const [view, setView] = createSignal("day");

  return (
    <div class="component-section">
      <h2>SegmentedControl — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Single-select control across more than two states, with group dividers and per-state color.
      </p>

      <div class="example-group">
        <h3>App-defined variant via <code>createSegmentedControl</code> — <code>AUTO | (PROD | OFF)</code></h3>
        <p class="text-meta">
          Domain variants live in consumer apps, not the library. This control is curried
          locally from the factory: <code>Auto</code> in its own group; <code>Prod</code>/<code>Off</code>
          form the override group. Selected colors are distinct: Auto accent, Prod green, Off red.
        </p>
        <OverrideControl value={mode()} onValueChange={setMode} />
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
        <Stack gap="sm">
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
