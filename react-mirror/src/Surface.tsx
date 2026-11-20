// SUI's Surface, as React markup.
import type { ReactElement, ReactNode } from "react";
import "../../src/components/Surface/Surface.css";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";
import type { SolidStyle } from "./internal/style.ts";
import { Row, Stack } from "./Layout.tsx";

export interface SurfaceProps extends Attrs<HTMLDivElement> {
  readonly padding?: "none" | "sm" | "md";
  readonly radius?: "none" | "sm" | "md";
  readonly bg?: string;
  readonly borderColor?: string;
  readonly interactive?: boolean;
  readonly active?: boolean;
  readonly shadow?: boolean;
  readonly direction?: "row" | "column";
  readonly align?: "start" | "center" | "stretch";
  readonly gap?: "none" | "xs" | "sm" | "md" | "lg";
  readonly minWidth?: string;
  readonly maxWidth?: string;
  readonly children?: ReactNode;
}

export type SurfaceDataProps = Omit<
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

export const surfaceClasses = (
  p: Pick<
    SurfaceProps,
    | "padding"
    | "radius"
    | "direction"
    | "align"
    | "gap"
    | "interactive"
    | "active"
    | "shadow"
    | "class"
  >,
): string =>
  classNames(
    "surface",
    `surface--padding-${p.padding ?? "md"}`,
    `surface--radius-${p.radius ?? "sm"}`,
    p.direction && `surface--dir-${p.direction}`,
    p.align && `surface--align-${p.align}`,
    p.gap && `surface--gap-${p.gap}`,
    p.interactive && "surface--interactive",
    p.active && "surface--active",
    p.shadow && "surface--shadow",
    p.class,
  );

type StyleInputs = Pick<
  SurfaceProps,
  "bg" | "borderColor" | "active" | "minWidth" | "maxWidth"
> & {
  readonly style?: SolidStyle;
};

/** SUI's merge: bg/border (not while active) and widths override an object style. */
export const surfaceStyle = (p: StyleInputs): SolidStyle | undefined => {
  const custom: Record<string, string> = {
    ...(p.bg && !p.active ? { background: p.bg } : {}),
    ...(p.borderColor && !p.active ? { "border-color": p.borderColor } : {}),
    ...(p.minWidth ? { "min-width": p.minWidth } : {}),
    ...(p.maxWidth ? { "max-width": p.maxWidth } : {}),
  };
  if (Object.keys(custom).length === 0) return p.style;
  return { ...(typeof p.style === "object" ? p.style : {}), ...custom };
};

export const Surface = (props: SurfaceProps): ReactElement => {
  const {
    padding,
    radius,
    bg,
    borderColor,
    interactive,
    active,
    shadow,
    direction,
    align,
    gap,
    minWidth,
    maxWidth,
    style,
    children,
    class: c,
    className,
    ...rest
  } = props;
  const innerGap = gap !== "none" ? gap : undefined;
  return (
    <div
      className={surfaceClasses({
        padding,
        radius,
        direction,
        align,
        gap,
        interactive,
        active,
        shadow,
        class: classNames(c, className) || undefined,
      })}
      {...domProps({
        ...rest,
        style: surfaceStyle({
          bg,
          borderColor,
          active,
          minWidth,
          maxWidth,
          style: style as SolidStyle | undefined,
        }),
      })}
    >
      {direction === "row" ? (
        <Row gap={innerGap} align={align}>
          {children}
        </Row>
      ) : direction === "column" ? (
        <Stack gap={innerGap} align={align} fill>
          {children}
        </Stack>
      ) : (
        children
      )}
    </div>
  );
};

export const createSurface =
  (defaults: Partial<Omit<SurfaceProps, "children">>) =>
  (props: SurfaceDataProps): ReactElement => (
    <Surface {...mergeDefined(defaults, props)} />
  );
