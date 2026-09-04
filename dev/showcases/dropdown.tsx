import { type Component, createSignal } from "solid-js";
import {
  Dropdown,
  InlineSubtleDropdown,
  type DropdownItem,
  type DropdownTriggerState,
} from "../../src/components/Dropdown";
import { Icon } from "../../src/components/Icon";
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
  const [named, setNamed] = createSignal<string>("baseline");
  const [draftName, setDraftName] = createSignal<string>("Baseline");
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
        <h3>trigger — render your own trigger</h3>
        <p class="text-meta">
          The <code>trigger</code> render prop replaces the whole trigger
          content — indicator, label and caret — with your own element. The
          wrapper is a <code>div[role="combobox"]</code> that keeps the ARIA
          wiring and the arrow keys, and binds <em>no</em> click, so a click
          reaches the input below and places the caret where the user aims. Call{" "}
          <code>toggle</code> from the state to open the menu. Enter is
          unclaimed, so an input in an ancestor <code>&lt;form&gt;</code> still
          submits. Dropdown restores the focus itself — after a pick or an
          Escape it gives the focus back to the element that held it when the
          menu opened, so do <em>not</em> refocus in your own{" "}
          <code>onChange</code>. Type a name, open the menu, pick another
          scenario: the caret comes back to the field.
        </p>
        <Stack gap="sm" class="dropdown-demo">
          <Dropdown
            items={SCENARIOS}
            value={named()}
            onChange={(id) => {
              setNamed(id);
              setDraftName(
                SCENARIOS.find((item) => item.id === id)?.label ?? "",
              );
            }}
            trigger={(state: DropdownTriggerState) => (
              <>
                <input
                  class="name-trigger__input"
                  aria-label="Scenario name"
                  value={draftName()}
                  onInput={(e) => setDraftName(e.currentTarget.value)}
                />
                <Icon
                  name="edit"
                  size="xs"
                  class="name-trigger__pencil"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  class="name-trigger__caret"
                  aria-label={state.open ? "Close scenarios" : "Open scenarios"}
                  onClick={state.toggle}
                >
                  &#9660;
                </button>
              </>
            )}
          />
          <span class="text-meta">
            selected: {named()} — typed: {draftName()}
          </span>
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
