import { createSegmentedControl } from "./SegmentedControl";

export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode", color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "primary" },
    { value: "off", label: "Off", group: "override", color: "danger" },
  ],
});
