// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// AppNavLink — Atomic (Depth 1)
// Owns CSS (Layout.css). Button-based top-bar nav link with an active state.
// Pair with AppHeader. Use over the existing <NavLink> when the consumer
// dispatches navigation through a router callback (onClick) rather than via
// an <a href>.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./Layout.css";

export interface AppNavLinkProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  active?: boolean;
}

export const AppNavLink: Component<AppNavLinkProps> = (props) => {
  const [local, others] = splitProps(props, ["active", "class", "children"]);
  const cls = () => {
    const c = ["app-nav-link"];
    if (local.active) c.push("app-nav-link--active");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <button type="button" class={cls()} {...others}>
      {local.children}
    </button>
  );
};
