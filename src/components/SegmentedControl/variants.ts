import { createSegmentedControl } from "./SegmentedControl";

// AUTO | (PROD | OFF) override control. `Auto` sits in its own group; `Prod`
// and `Off` form the override group, separated from Auto by a divider. `Off`
// is coloured danger (red) when selected.
export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode", color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "primary" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});
