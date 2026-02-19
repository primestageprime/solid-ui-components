// ============================================
// Divider — Atomic (Depth 1)
// Owns CSS (Divider.css), no component imports.
// Content separator with orientation variants.
// Moved from Section.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./Divider.css";

export interface DividerProps extends JSX.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  variant?: "solid" | "dashed" | "dotted";
  spacing?: "sm" | "md" | "lg";
}

export const Divider: Component<DividerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "orientation",
    "variant",
    "spacing",
    "class",
  ]);

  const classes = () => {
    const classList = ["sui-divider"];
    classList.push(`sui-divider--${local.orientation || "horizontal"}`);
    classList.push(`sui-divider--${local.variant || "solid"}`);
    classList.push(`sui-divider--spacing-${local.spacing || "md"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return <hr class={classes()} {...others} />;
};
