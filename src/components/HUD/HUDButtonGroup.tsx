// ============================================
// HUDButtonGroup + HUDButton — Atomic (Depth 1)
// Owns CSS (HUD.css), no component imports.
// Button arrangement with orientation + gap.
// ============================================
import { Component, splitProps } from "solid-js";
import { HUDButtonGroupProps } from "./types";
import "./HUD.css";

export const HUDButtonGroup: Component<HUDButtonGroupProps> = (props) => {
  const [local, others] = splitProps(props, [
    "orientation",
    "gap",
    "bordered",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["hud-button-group"];
    if (local.orientation === "vertical") classList.push("hud-button-group--vertical");
    classList.push(`hud-button-group--gap-${local.gap || "md"}`);
    if (local.bordered) classList.push("hud-button-group--bordered");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} role="group" {...others}>
      {local.children}
    </div>
  );
};

// Export HUDButton as well for convenience
import { JSX } from "solid-js";

export interface HUDButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  active?: boolean;
}

export const HUDButton: Component<HUDButtonProps> = (props) => {
  const [local, others] = splitProps(props, ["variant", "active", "class", "children"]);

  const classes = () => {
    const classList = ["hud-button"];
    if (local.variant) classList.push(`hud-button--${local.variant}`);
    if (local.active) classList.push("hud-button--active");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <button class={classes()} {...others}>
      {local.children}
    </button>
  );
};
