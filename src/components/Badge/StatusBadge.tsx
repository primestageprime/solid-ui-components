// ============================================
// StatusBadge — Atomic (Depth 1)
// Owns CSS (StatusBadge.css), no component imports.
// Compliance-themed status badge with 5 variants.
// When href is provided, renders as an anchor tag.
// ============================================
import { Component, JSX, Show, splitProps } from "solid-js";
import "./StatusBadge.css";

export type StatusBadgeVariant = "compliant" | "violation" | "warning" | "pending" | "info";
export type StatusBadgeSize = "sm" | "md";

export interface StatusBadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  label?: string;
  href?: string;
  target?: string;
  rel?: string;
}

export const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "label",
    "href",
    "target",
    "rel",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["status-badge"];
    if (local.variant) classList.push(`status-badge--${local.variant}`);
    if (local.size) classList.push(`status-badge--${local.size}`);
    if (local.href) classList.push("status-badge--link");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const content = () => local.children ?? local.label;

  return (
    <Show when={local.href} fallback={
      <span class={classes()} {...others}>
        {content()}
      </span>
    }>
      <a
        class={classes()}
        href={local.href}
        target={local.target}
        rel={local.rel}
      >
        {content()}
      </a>
    </Show>
  );
};
