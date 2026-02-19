import { createSignal, Component } from "solid-js";
import { Toggle } from "../../src/components/Toggle";

export const ToggleShowcase: Component = () => {
  const [enabled1, setEnabled1] = createSignal(false);
  const [enabled2, setEnabled2] = createSignal(true);
  const [enabled3, setEnabled3] = createSignal(false);

  return (
    <div class="component-section">
      <h2>Toggle — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Toggle.css), no component imports. Checkbox toggle switch with label positioning.</p>

      <div class="example-group">
        <h3>Basic Toggle</h3>
        <div class="example-column">
          <Toggle checked={enabled1()} onChange={() => setEnabled1(!enabled1())} />
          <span style={{ color: "var(--jtf-text-secondary)" }}>
            State: {enabled1() ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div class="example-group">
        <h3>With Label</h3>
        <div class="example-column">
          <Toggle label="Enable notifications" checked={enabled2()} onChange={() => setEnabled2(!enabled2())} />
          <Toggle label="Dark mode" labelPosition="left" checked={enabled3()} onChange={() => setEnabled3(!enabled3())} />
        </div>
      </div>

      <div class="example-group">
        <h3>Sizes</h3>
        <div class="example-column">
          <Toggle size="sm" label="Small toggle" />
          <Toggle size="md" label="Medium toggle (default)" />
          <Toggle size="lg" label="Large toggle" />
        </div>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <div class="example-column">
          <Toggle label="Disabled (off)" disabled />
          <Toggle label="Disabled (on)" disabled checked />
        </div>
      </div>
    </div>
  );
};
