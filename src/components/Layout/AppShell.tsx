// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// AppShell + AppHeader + AppMain — Primitive layout (Depth 0)
// Owns CSS (Layout.css). Vertical column root that fills the viewport height,
// with a non-shrinking header on top and a flexing main below. The standard
// "full-page app" frame. Use AppShell as the root, AppHeader as the top bar,
// AppMain (or any flex child with min-height: 0) as the body.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface AppShellProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Pin the shell to the full viewport (position: fixed; inset: 0;
   * overflow: hidden) instead of flowing in the document. Use for full-bleed
   * app screens that must escape any ancestor page padding. Default false.
   */
  fixed?: boolean;
}

export const AppShell: Component<AppShellProps> = (props) => {
  const [local, others] = splitProps(props, ["fixed", "class", "children"]);
  const cls = () => {
    const c = ["app-shell"];
    if (local.fixed) c.push("app-shell--fixed");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <div class={cls()} {...others}>
      {local.children}
    </div>
  );
};

export interface AppHeaderProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Padding shorthand: `sm` = 8px 12px, `md` = 12px 20px (default), `lg` = 16px 24px. */
  size?: "sm" | "md" | "lg";
  /** Render as an inline child of AppMain instead of as the page-top bar. Default false. */
  inline?: boolean;
}

export const AppHeader: Component<AppHeaderProps> = (rawProps) => {
  const props = mergeProps({ size: "md" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "size",
    "inline",
    "class",
    "children",
  ]);
  const cls = () => {
    const c = ["app-header", `app-header--${local.size}`];
    if (local.inline) c.push("app-header--inline");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <header class={cls()} {...others}>
      {local.children}
    </header>
  );
};

/** Visual/layout overrides — locked at variant-definition time. */
export type AppHeaderOverrides = Pick<AppHeaderProps, "size" | "inline">;

/** Props available to consumers of a curried AppHeader variant. */
export type AppHeaderDataProps = Omit<AppHeaderProps, keyof AppHeaderOverrides>;

export function createAppHeader(
  defaults: Partial<AppHeaderProps>,
): Component<AppHeaderDataProps> {
  return (props) => <AppHeader {...mergeProps(defaults, props)} />;
}

export interface AppMainProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Pad the main area. Default false (caller handles padding). */
  padded?: boolean;
}

export const AppMain: Component<AppMainProps> = (props) => {
  const [local, others] = splitProps(props, ["padded", "class", "children"]);
  const cls = () => {
    const c = ["app-main"];
    if (local.padded) c.push("app-main--padded");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  return (
    <main class={cls()} {...others}>
      {local.children}
    </main>
  );
};
