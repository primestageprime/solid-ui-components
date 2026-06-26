import { Component, createSignal } from "solid-js";
import { ThemedNumberInput } from "../../src/components/ThemedNumberInput";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

export const ThemedNumberInputShowcase: Component = () => {
  const [plain, setPlain] = createSignal<number | undefined>(undefined);
  const [labeled, setLabeled] = createSignal<number | undefined>(42);
  const [described, setDescribed] = createSignal<number | undefined>(1200);
  const [withError, setWithError] = createSignal<number | undefined>(-5);
  const [bounded, setBounded] = createSignal<number | undefined>(500);
  const [locked] = createSignal<number | undefined>(99);

  const errorMessage = () =>
    (withError() ?? 0) < 0 ? "Value must be non-negative." : undefined;

  return (
    <div class="component-section">
      <h2>ThemedNumberInput — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ThemedNumberInput.css), composes Icon for stepper triggers.
        Kobalte-backed (`@kobalte/core/number-field`). Zero-config default —
        <code> &lt;ThemedNumberInput name="qty" /&gt;</code> is an unbounded
        field with step 1. All other `NumberFieldRootProps` are forwarded via
        spread.
      </p>

      <div class="example-group">
        <h3>Default (zero config)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          No label, no bounds, step 1. Emits `undefined` when cleared (kobalte's
          NaN is normalized out).
        </div>
        <div style={{ "max-width": "240px" }}>
          <ThemedNumberInput name="plain" value={plain} onChange={setPlain} />
        </div>
        <Text variant="sublabel">
          Value: {plain() === undefined ? "(none)" : String(plain())}
        </Text>
      </div>

      <div class="example-group">
        <h3>Labeled</h3>
        <div style={{ "max-width": "240px" }}>
          <ThemedNumberInput
            name="quantity"
            label="Quantity"
            value={labeled}
            onChange={setLabeled}
          />
        </div>
        <Text variant="sublabel">
          Value: {labeled() === undefined ? "(none)" : String(labeled())}
        </Text>
      </div>

      <div class="example-group">
        <h3>With description</h3>
        <div style={{ "max-width": "320px" }}>
          <ThemedNumberInput
            name="engine-kw"
            label="Engine Power"
            description="Rated mechanical output in kilowatts."
            value={described}
            onChange={setDescribed}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>With error message</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          When `errorMessage` is present, the field renders in invalid state and
          the description (if any) is suppressed.
        </div>
        <div style={{ "max-width": "320px" }}>
          <ThemedNumberInput
            name="elevation"
            label="Elevation (m)"
            description="Positive integer, metres above sea level."
            value={withError}
            onChange={setWithError}
            errorMessage={errorMessage()}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Bounded (min + max + step)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `min=0`, `max=1000`, `step=50`. The stepper triggers disable at the
          bounds via kobalte's built-in behavior.
        </div>
        <div style={{ "max-width": "240px" }}>
          <ThemedNumberInput
            name="rpm"
            label="RPM"
            value={bounded}
            onChange={setBounded}
            min={0}
            max={1000}
            step={50}
          />
        </div>
        <Stack gap="xs">
          <Text variant="sublabel">
            Value: {bounded() === undefined ? "(none)" : String(bounded())}
          </Text>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `disabled` forwarded to kobalte's root — input and triggers are
          non-interactive and opacity drops.
        </div>
        <div style={{ "max-width": "240px" }}>
          <ThemedNumberInput
            name="locked"
            label="Threshold (locked)"
            value={locked}
            disabled
          />
        </div>
      </div>
    </div>
  );
};
