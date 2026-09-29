import { createToggle } from "./Toggle";

// Small T/F toggle suitable for inline use inside list cards.
export const TruthToggle = createToggle({ size: "sm", color: "primary" });

// TruthToggle with its label before it: a labelled switch in a toolbar row
// ("Full auto ⬤"), where the words lead and the switch closes the line.
export const LeftTruthToggle = createToggle({
  size: "sm",
  color: "primary",
  labelPosition: "left",
});
