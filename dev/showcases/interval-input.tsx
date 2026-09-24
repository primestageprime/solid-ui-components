import { type Component, createSignal } from "solid-js";
import {
  IntervalInput,
  type IntervalValue,
} from "../../src/components/IntervalInput";
import { Text } from "../../src/components/Text/Text";

export const IntervalInputShowcase: Component = () => {
  const [cadence, setCadence] = createSignal<IntervalValue>({
    every: 2,
    unit: "week",
  });
  const [singular, setSingular] = createSignal<IntervalValue>({
    every: 1,
    unit: "month",
  });
  const [customUnits, setCustomUnits] = createSignal<IntervalValue>({
    every: 1,
    unit: "day",
  });
  const [disabled, setDisabled] = createSignal<IntervalValue>({
    every: 3,
    unit: "day",
  });

  return (
    <div class="component-section">
      <h2>IntervalInput — Composite (Depth 2)</h2>
      <p class="text-meta">
        An "Every [#] [unit]" cadence control — `ThemedNumberInput` + `Select`
        in one row. `value`/`onChange` carry a plain `{"{"} every, unit {"}"}`
        object; unit labels pluralise from the current `every` by default
        ("week" at 1, "weeks" otherwise).
      </p>

      <div class="example-group">
        <h3>Default (pluralised label)</h3>
        <IntervalInput value={cadence()} onChange={setCadence} />
        <Text variant="sublabel">
          Value: every {cadence().every} {cadence().unit}(s)
        </Text>
      </div>

      <div class="example-group">
        <h3>Singular at every = 1</h3>
        <IntervalInput value={singular()} onChange={setSingular} />
      </div>

      <div class="example-group">
        <h3>Group label</h3>
        <IntervalInput
          value={cadence()}
          onChange={setCadence}
          label="Repeats"
        />
      </div>

      <div class="example-group">
        <h3>Custom units (verbatim labels)</h3>
        <IntervalInput
          value={customUnits()}
          onChange={setCustomUnits}
          units={[
            { value: "day", label: "Daily" },
            { value: "week", label: "Weekly" },
            { value: "month", label: "Monthly" },
          ]}
        />
      </div>

      <div class="example-group">
        <h3>Custom min (min = 2)</h3>
        <IntervalInput
          value={cadence()}
          onChange={setCadence}
          min={2}
        />
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <IntervalInput value={disabled()} onChange={setDisabled} disabled />
      </div>
    </div>
  );
};
