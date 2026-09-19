import { type Component, createSignal } from "solid-js";
import {
  SegmentedControl,
  createSegmentedControl,
  type SegmentOption,
} from "../../src/components/SegmentedControl";
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

// A removable set. "All" is pinned — a scope list that can lose its catch-all
// is a list you can strand.
const SCOPES: SegmentOption[] = [
  { value: "all", label: "All", removable: false },
  { value: "june", label: "W23 · Jun 2" },
  { value: "september", label: "W36 · Sep 1" },
  { value: "december", label: "W49 · Dec 1" },
];

export const SegmentedControlShowcase: Component = () => {
  const [mode, setMode] = createSignal("auto");
  const [view, setView] = createSignal("day");
  const [scopes, setScopes] = createSignal<SegmentOption[]>(SCOPES);
  const [scope, setScope] = createSignal("june");

  return (
    <div class="component-section">
      <h2>SegmentedControl — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Single-select control across more than two states, with group dividers
        and per-state color.
      </p>

      <div class="example-group">
        <h3>
          App-defined variant via <code>createSegmentedControl</code> —{" "}
          <code>AUTO | (PROD | OFF)</code>
        </h3>
        <p class="text-meta">
          Domain variants live in consumer apps, not the library. This control
          is curried locally from the factory: <code>Auto</code> in its own
          group; <code>Prod</code>/<code>Off</code>
          form the override group. Selected colors are distinct: Auto accent,
          Prod green, Off red.
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
        <h3>Removable segments</h3>
        <p class="text-meta">
          With <code>onRemove</code> every segment grows a × — hover one, or
          focus a segment and press Delete. <code>removable: false</code> pins
          one out of it: <code>All</code> here has no ×. The × is a sibling of
          the radio, never nested inside it, so the segment keeps answering
          clicks.
        </p>
        <SegmentedControl
          options={scopes()}
          value={scope()}
          onValueChange={setScope}
          onRemove={(value) => {
            const rest = scopes().filter((o) => o.value !== value);
            setScopes(rest);
            if (scope() === value) setScope(rest[0]?.value ?? "");
          }}
        />
        <div class="text-meta">
          Scope: {scope() || "—"} ·{" "}
          <button type="button" onClick={() => setScopes(SCOPES)}>
            restore
          </button>
        </div>
      </div>

      <div class="example-group">
        <h3>States</h3>
        <Stack gap="sm">
          <SegmentedControl
            options={[
              { value: "a", label: "Enabled" },
              { value: "b", label: "Disabled seg", disabled: true },
              { value: "c", label: "Other" },
            ]}
            value="a"
            onValueChange={() => {}}
          />
          <SegmentedControl
            disabled
            options={[
              { value: "a", label: "Whole" },
              { value: "b", label: "Control" },
              { value: "c", label: "Disabled" },
            ]}
            value="a"
            onValueChange={() => {}}
          />
        </Stack>
      </div>
    </div>
  );
};
