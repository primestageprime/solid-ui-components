import { createSegmentedControl } from "./SegmentedControl";

// AUTO | (PROD | OFF) override control. `Auto` sits in its own group; `Prod`
// and `Off` form the override group, separated from Auto by a divider. Each
// state reads as a distinct colour when selected: Auto accent (primary),
// Prod success (green = live/on), Off danger (red).
export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode", color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "success" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});
