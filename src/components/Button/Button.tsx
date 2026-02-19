// ============================================
// Button — Atomic (Depth 1)
// Owns CSS (Button.css), no component imports.
// Multi-variant button with loading spinner.
// ============================================
import { Component, JSX, splitProps, mergeProps } from "solid-js";
import "./Button.css";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "class",
    "children",
    "disabled",
  ]);

  const classes = () => {
    const classList = ["btn"];
    if (local.variant) classList.push(`btn--${local.variant}`);
    if (local.size) classList.push(`btn--${local.size}`);
    if (local.loading) classList.push("btn--loading");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <button
      class={classes()}
      disabled={local.disabled || local.loading}
      {...others}
    >
      {local.loading && <span class="btn__spinner" />}
      <span class="btn__content">{local.children}</span>
    </button>
  );
};

export function createButton(defaults: Partial<Omit<ButtonProps, "children">>): Component<ButtonProps> {
  return (props) => <Button {...mergeProps(defaults, props)} />;
}
