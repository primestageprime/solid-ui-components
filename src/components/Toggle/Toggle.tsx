// ============================================
// Toggle — Atomic (Depth 1)
// Owns CSS (Toggle.css), no component imports.
// Checkbox toggle switch with label positioning.
// ============================================
import { Component, JSX, splitProps, createUniqueId } from "solid-js";
import "./Toggle.css";

export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: ToggleSize;
  label?: string;
  labelPosition?: "left" | "right";
}

export const Toggle: Component<ToggleProps> = (props) => {
  const [local, others] = splitProps(props, [
    "size",
    "label",
    "labelPosition",
    "class",
    "id",
  ]);

  const generatedId = createUniqueId();
  const toggleId = () => local.id || `toggle-${generatedId}`;

  const classes = () => {
    const classList = ["jtf-toggle"];
    classList.push(`jtf-toggle--${local.size || "md"}`);
    if (local.labelPosition === "left") classList.push("jtf-toggle--label-left");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()}>
      {local.label && local.labelPosition === "left" && (
        <label class="jtf-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
      <div class="jtf-toggle__track">
        <input
          type="checkbox"
          id={toggleId()}
          class="jtf-toggle__input"
          {...others}
        />
        <label class="jtf-toggle__slider" for={toggleId()} />
      </div>
      {local.label && local.labelPosition !== "left" && (
        <label class="jtf-toggle__label" for={toggleId()}>
          {local.label}
        </label>
      )}
    </div>
  );
};
