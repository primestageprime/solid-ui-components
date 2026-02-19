// ============================================
// ButtonGroup — Atomic (Depth 1)
// Owns CSS (ButtonGroup.css), no component imports.
// Button arrangement with orientation + gap.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./ButtonGroup.css";

export interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Orientation of buttons */
  orientation?: "horizontal" | "vertical";
  /** Gap between buttons */
  gap?: "none" | "sm" | "md" | "lg";
  /** Border around group */
  bordered?: boolean;
}

export const ButtonGroup: Component<ButtonGroupProps> = (props) => {
  const [local, others] = splitProps(props, [
    "orientation",
    "gap",
    "bordered",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-btn-group"];
    if (local.orientation === "vertical") classList.push("sui-btn-group--vertical");
    classList.push(`sui-btn-group--gap-${local.gap || "md"}`);
    if (local.bordered) classList.push("sui-btn-group--bordered");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} role="group" {...others}>
      {local.children}
    </div>
  );
};
