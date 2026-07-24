// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Surface — Primitive (Depth 0)
// Owns CSS (Surface.css). Themed container with
// padding/radius/bg/border. Factory: createSurface().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import { Stack } from "../Layout/Stack";
import { Row } from "../Layout/Row";
import "./Surface.css";

export interface SurfaceProps extends JSX.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md";
  radius?: "none" | "sm" | "md";
  bg?: string;
  borderColor?: string;
  interactive?: boolean;
  active?: boolean;
  shadow?: boolean;
  direction?: "row" | "column";
  align?: "start" | "center" | "stretch";
  gap?: "none" | "sm" | "md" | "lg";
  minWidth?: string;
  maxWidth?: string;
}

export const Surface: Component<SurfaceProps> = (rawProps) => {
  // Default to md padding so content is offset from the surface edge without
  // consumers needing to hand-roll it. Pass padding="none" to suppress.
  const props = mergeProps(
    { padding: "md" as const, radius: "sm" as const },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "padding",
    "radius",
    "bg",
    "borderColor",
    "interactive",
    "active",
    "shadow",
    "direction",
    "align",
    "gap",
    "minWidth",
    "maxWidth",
    "class",
    "children",
    "style",
  ]);

  const classes = () => {
    const classList = ["surface"];
    if (local.padding) classList.push(`surface--padding-${local.padding}`);
    if (local.radius) classList.push(`surface--radius-${local.radius}`);
    if (local.direction) classList.push(`surface--dir-${local.direction}`);
    if (local.align) classList.push(`surface--align-${local.align}`);
    if (local.gap) classList.push(`surface--gap-${local.gap}`);
    if (local.interactive) classList.push("surface--interactive");
    if (local.active) classList.push("surface--active");
    if (local.shadow) classList.push("surface--shadow");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mergedStyle = (): JSX.CSSProperties | undefined => {
    const custom: JSX.CSSProperties = {};
    // When active, .surface--active owns background/border — inline idle
    // colors would override the class and make the active state invisible.
    if (local.bg && !local.active) custom.background = local.bg;
    if (local.borderColor && !local.active)
      custom["border-color"] = local.borderColor;
    if (local.minWidth) custom["min-width"] = local.minWidth;
    if (local.maxWidth) custom["max-width"] = local.maxWidth;
    if (Object.keys(custom).length === 0)
      return local.style as JSX.CSSProperties | undefined;
    const base = (
      typeof local.style === "object" ? local.style : {}
    ) as JSX.CSSProperties;
    return { ...base, ...custom };
  };

  // Layout is delegated to a composed Stack/Row so Surface owns no
  // flex/gap/align geometry (layout-purity). The surface--dir-/align-/gap-
  // classes stay as inert back-compat hooks; the actual geometry lives on the
  // inner Layout wrapper, present only when `direction` is set (a bare Surface,
  // like every idle card, stays a plain block div — no wrapper). Surface's gap
  // scale snaps onto the Stack/Row scale (sm/md/lg → sm); `none` → no gap. The
  // column wrapper fills the surface height so bottom-pinned meta rows
  // (margin-top:auto) still reach the card's bottom edge.
  const laidOut = (): JSX.Element => {
    if (!local.direction) return local.children as JSX.Element;
    const gap = local.gap && local.gap !== "none" ? ("sm" as const) : undefined;
    if (local.direction === "row") {
      return (
        <Row gap={gap} align={local.align}>
          {local.children}
        </Row>
      );
    }
    return (
      <Stack gap={gap} align={local.align} fill>
        {local.children}
      </Stack>
    );
  };

  return (
    <div class={classes()} style={mergedStyle()} {...others}>
      {laidOut()}
    </div>
  );
};

/** Props that are visual/layout overrides — locked at variant-definition time. */
export type SurfaceOverrides = Pick<
  SurfaceProps,
  | "padding"
  | "radius"
  | "bg"
  | "borderColor"
  | "interactive"
  | "shadow"
  | "direction"
  | "align"
  | "gap"
  | "minWidth"
  | "maxWidth"
>;

/** Props that remain available to consumers of a curried Surface variant. */
export type SurfaceDataProps = Omit<SurfaceProps, keyof SurfaceOverrides>;

export function createSurface(
  defaults: Partial<Omit<SurfaceProps, "children">>,
): Component<SurfaceDataProps> {
  return (props) => <Surface {...mergeProps(defaults, props)} />;
}
