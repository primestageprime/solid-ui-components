// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// SidebarPanel — Primitive (Depth 0)
// Owns CSS (Layout.css). Flexible-width sidebar with right-edge delineation
// and internal scrolling. The non-mock counterpart to DelineatedSidebar
// (which is pinned at 400px for drafting); SidebarPanel takes a `width` prop
// so app callers can size it for production layouts.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface SidebarPanelProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Pixel width of the column. Default 280. */
  width?: number;
  /** Side of the parent the sidebar attaches to. Default "left". */
  side?: "left" | "right";
}

export const SidebarPanel: Component<SidebarPanelProps> = (rawProps) => {
  const props = mergeProps(
    { width: 280 as number, side: "left" as const },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "width",
    "side",
    "class",
    "style",
    "children",
  ]);
  const cls = () => {
    const c = ["app-sidebar", `app-sidebar--${local.side}`];
    if (local.class) c.push(local.class);
    return c.join(" ");
  };
  const baseStyle = () => ({
    width: `${local.width}px`,
    "min-width": `${local.width}px`,
  });
  return (
    <aside
      class={cls()}
      style={
        typeof local.style === "string"
          ? local.style
          : { ...baseStyle(), ...local.style }
      }
      {...others}
    >
      {local.children}
    </aside>
  );
};
