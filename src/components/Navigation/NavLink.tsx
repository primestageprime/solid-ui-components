// ============================================
// NavLink — Atomic (Depth 1)
// Owns CSS (NavLink.css), no component imports.
// Anchor link with active state, color variants, badge.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import "./NavLink.css";

export type NavLinkColor = "accent" | "warning" | "danger" | "success";

export interface NavLinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  color?: NavLinkColor;
  badge?: string | number;
}

export const NavLink: Component<NavLinkProps> = (props) => {
  const [local, others] = splitProps(props, [
    "active",
    "color",
    "badge",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["nav-link"];
    if (local.active) classList.push("nav-link--active");
    if (local.color) classList.push(`nav-link--${local.color}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <a class={classes()} {...others}>
      {local.children}
      {local.badge !== undefined && <span class="nav-link__badge">{local.badge}</span>}
    </a>
  );
};
