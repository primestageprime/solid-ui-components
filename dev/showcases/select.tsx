import { type Component, createSignal } from "solid-js";
import { Select, type SelectOption } from "../../src/components/Select";
import { Stack } from "../../src/components/Layout/Stack";
import { NarrowStack } from "../../src/components/Layout";
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

// 30 options to exercise listbox scroll / overflow CSS.
const LONG_OPTIONS: SelectOption[] = Array.from({ length: 30 }, (_, i) => ({
  value: `asset-${i + 1}`,
  label: `Asset ${String(i + 1).padStart(3, "0")}`,
}));

export const SelectShowcase: Component = () => {
  const [priority, setPriority] = createSignal<SelectOption | null>(
    PRIORITY_OPTIONS[1],
  );
  const [statuses, setStatuses] = createSignal<SelectOption[]>([
    STATUS_OPTIONS[0],
    STATUS_OPTIONS[2],
  ]);
  const [lockedPriority] = createSignal<SelectOption | null>(
    PRIORITY_OPTIONS[3],
  );
  const [asset, setAsset] = createSignal<SelectOption | null>(null);

  return (
    <div class="component-section">
      <h2>Select — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Select.css). Unified single + multi built on
        `@kobalte/core/select`. `multiple` literal narrows `value` / `onChange`.
        Kobalte passthrough via spread — e.g. `placement`, `gutter`, `open`.
      </p>

      <div class="example-group">
        <h3>Single-mode (default)</h3>
        <NarrowStack>
          <div class="text-meta">
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
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Multi-mode</h3>
        <NarrowStack>
          <div class="text-meta">
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
            <Text variant="sublabel">Selected count: {statuses().length}</Text>
            <Text variant="sublabel">
              Labels:{" "}
              {statuses()
                .map((o) => o.label)
                .join(", ") || "(none)"}
            </Text>
          </Stack>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <NarrowStack>
          <div class="text-meta">
            `disabled` is forwarded to Kobalte's root — the trigger is
            non-interactive and the opacity drops to 50%.
          </div>
          <div style={{ "max-width": "240px" }}>
            <Select
              label="Priority (locked)"
              options={() => PRIORITY_OPTIONS}
              value={lockedPriority}
              disabled
            />
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Long option list (30 items — scrolling)</h3>
        <NarrowStack>
          <div class="text-meta">
            Validates the listbox `max-height: 280px` overflow rule — the popup
            should scroll, the trigger should not grow.
          </div>
          <div style={{ "max-width": "280px" }}>
            <Select
              label="Asset"
              placeholder="Pick an asset…"
              options={() => LONG_OPTIONS}
              value={asset}
              onChange={setAsset}
            />
          </div>
          <Text variant="sublabel">Selected: {asset()?.label ?? "(none)"}</Text>
        </NarrowStack>
      </div>
    </div>
  );
};
