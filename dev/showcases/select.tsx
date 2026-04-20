import { Component, createSignal } from "solid-js";
import { Select, type SelectOption } from "../../src/components/Select";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "open", label: "Open" },
  { value: "triaged", label: "Triaged" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "blocked", label: "Blocked" },
];

export const SelectShowcase: Component = () => {
  const [priority, setPriority] = createSignal<SelectOption | null>(
    PRIORITY_OPTIONS[1],
  );
  const [statuses, setStatuses] = createSignal<SelectOption[]>([
    STATUS_OPTIONS[0],
    STATUS_OPTIONS[2],
  ]);

  return (
    <div class="component-section">
      <h2>Select — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (Select.css). Unified single + multi built on
        `@kobalte/core/select`. `multiple` literal narrows `value` /
        `onChange`. Kobalte passthrough via spread — e.g. `placement`,
        `gutter`, `open`.
      </p>

      <div class="example-group">
        <h3>Single-mode (default)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `value: SelectOption | null`. Trigger shows the selected label.
        </div>
        <div style={{ "max-width": "240px" }}>
          <Select
            label="Priority"
            description="Defines escalation rules."
            options={() => PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
          />
        </div>
        <Text variant="sublabel">
          Selected: {priority()?.label ?? "(none)"}
        </Text>
      </div>

      <div class="example-group">
        <h3>Multi-mode</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `multiple` flips `value` to `SelectOption[]`. Trigger shows a
          comma-joined preview with an inline clear button.
        </div>
        <div style={{ "max-width": "320px" }}>
          <Select
            multiple
            label="Statuses"
            placeholder="Filter by status…"
            options={() => STATUS_OPTIONS}
            value={statuses}
            onChange={setStatuses}
          />
        </div>
        <Stack gap="xs">
          <Text variant="sublabel">
            Selected count: {statuses().length}
          </Text>
          <Text variant="sublabel">
            Labels: {statuses().map((o) => o.label).join(", ") || "(none)"}
          </Text>
        </Stack>
      </div>
    </div>
  );
};
