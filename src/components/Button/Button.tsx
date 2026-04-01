// ============================================
// Button — Atomic (Depth 1)
// Owns CSS (Button.css), no component imports.
// Multi-variant button with loading spinner.
// Updated: absorbs HUDButton's active prop.
// ============================================
import { Component, JSX, splitProps, mergeProps } from "solid-js";
import "./Button.css";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** Active/selected state (absorbed from HUDButton) */
  active?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "active",
    "class",
    "children",
    "disabled",
  ]);

  const classes = () => {
    const classList = ["sui-btn"];
    if (local.variant) classList.push(`sui-btn--${local.variant}`);
    if (local.size) classList.push(`sui-btn--${local.size}`);
    if (local.loading) classList.push("sui-btn--loading");
    if (local.active) classList.push("sui-btn--active");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <button
      class={classes()}
      disabled={local.disabled || local.loading}
      {...others}
    >
      {local.loading && <span class="sui-btn__spinner" />}
      <span class="sui-btn__content">{local.children}</span>
    </button>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ButtonOverrides = Pick<ButtonProps, "variant" | "size" | "loading">;

/** Props that remain available to consumers of a curried Button variant. */
export type ButtonDataProps = Omit<ButtonProps, keyof ButtonOverrides>;

export function createButton(defaults: Partial<Omit<ButtonProps, "children">>): Component<ButtonDataProps> {
  return (props) => <Button {...mergeProps(defaults, props)} />;
}
