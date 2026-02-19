// ============================================
// Surface — Primitive (Depth 0)
// Owns CSS (Surface.css). Themed container with
// padding/radius/bg/border. Factory: createSurface().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./Surface.css";

export interface SurfaceProps extends JSX.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg";
  bg?: string;
  borderColor?: string;
  interactive?: boolean;
  active?: boolean;
}

export const Surface: Component<SurfaceProps> = (props) => {
  const [local, others] = splitProps(props, [
    "padding",
    "radius",
    "bg",
    "borderColor",
    "interactive",
    "active",
    "class",
    "children",
    "style",
  ]);

  const classes = () => {
    const classList = ["surface"];
    if (local.padding) classList.push(`surface--padding-${local.padding}`);
    if (local.radius) classList.push(`surface--radius-${local.radius}`);
    if (local.interactive) classList.push("surface--interactive");
    if (local.active) classList.push("surface--active");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mergedStyle = (): JSX.CSSProperties | undefined => {
    const custom: JSX.CSSProperties = {};
    if (local.bg) custom["background"] = local.bg;
    if (local.borderColor) custom["border-color"] = local.borderColor;
    if (!local.bg && !local.borderColor) return local.style as JSX.CSSProperties | undefined;
    const base = (typeof local.style === "object" ? local.style : {}) as JSX.CSSProperties;
    return { ...base, ...custom };
  };

  return (
    <div class={classes()} style={mergedStyle()} {...others}>
      {local.children}
    </div>
  );
};

export function createSurface(defaults: Partial<Omit<SurfaceProps, "children">>): Component<SurfaceProps> {
  return (props) => <Surface {...mergeProps(defaults, props)} />;
}
