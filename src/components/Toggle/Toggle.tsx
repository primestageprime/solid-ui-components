// ============================================
// Toggle — Atomic (Depth 1)
// Owns CSS (Toggle.css), no component imports.
// Checkbox toggle switch with label positioning.
// Updated: absorbs HUDToggle features (variant, color).
// Dropped: power and circuit variants.
// ============================================
import { Component, JSX, splitProps, createUniqueId } from "solid-js";
import type { ColorVariant } from "../../types";
import "./Toggle.css";

export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: ToggleSize;
  label?: string;
  labelPosition?: "left" | "right";
  /** Toggle style variant — "default" or "minimal" */
  variant?: "default" | "minimal";
  /** Accent color when checked */
  color?: ColorVariant;
}

export const Toggle: Component<ToggleProps> = (props) => {
  const [local, others] = splitProps(props, [
    "size",
    "label",
    "labelPosition",
    "variant",
    "color",
    "class",
    "id",
  ]);

  const generatedId = createUniqueId();
  const toggleId = () => local.id || `toggle-${generatedId}`;

  const classes = () => {
    const classList = ["sui-toggle"];
    classList.push(`sui-toggle--${local.size || "md"}`);
    if (local.labelPosition === "left") classList.push("sui-toggle--label-left");
    if (local.variant === "minimal") classList.push("sui-toggle--minimal");
    if (local.color && local.color !== "default") classList.push(`sui-toggle--${local.color}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()}>
      {local.label && local.labelPosition === "left" && (
        <label class="sui-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
      <div class="sui-toggle__track">
        <input
          type="checkbox"
          id={toggleId()}
          class="sui-toggle__input"
          {...others}
        />
        <label class="sui-toggle__slider" for={toggleId()} />
      </div>
      {local.label && local.labelPosition !== "left" && (
        <label class="sui-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
    </div>
  );
};
