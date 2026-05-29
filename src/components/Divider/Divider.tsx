// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Divider — Atomic (Depth 1)
// Owns CSS (Divider.css), no component imports.
// Content separator with orientation variants.
// Moved from Section.
// ============================================
import { Component, JSX, splitProps, mergeProps } from "solid-js";
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

/** Visual overrides — locked at variant-definition time. */
export type DividerOverrides = Pick<DividerProps, "orientation" | "variant" | "spacing">;

/** Props available to consumers of a curried Divider variant. */
export type DividerDataProps = Omit<DividerProps, keyof DividerOverrides>;

export function createDivider(defaults: Partial<DividerProps>): Component<DividerDataProps> {
  return (props) => <Divider {...mergeProps(defaults, props)} />;
}
