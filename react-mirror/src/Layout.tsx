// SUI's layout bases (Stack, Row, Box, Grid, AppHeader), as React markup.
import type { ReactElement, ReactNode } from "react";
import "../../src/components/Layout/Layout.css";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";
import { mergeStyle, type SolidStyle } from "./internal/style.ts";

interface Base extends Attrs<HTMLDivElement> {
  readonly children?: ReactNode;
}

const joined = (cls: string | undefined, className: string | undefined) =>
  classNames(cls, className) || undefined;

// ── Stack ──────────────────────────────────────────────────────────────────
export interface StackProps extends Base {
  readonly gap?: "xs" | "sm" | "md" | "lg";
  readonly align?: "start" | "center" | "end" | "stretch";
  readonly justify?: "start" | "center" | "end" | "between";
  readonly fill?: boolean;
  readonly sizeMotion?: boolean;
}
export type StackDataProps = Omit<
  StackProps,
  "gap" | "align" | "justify" | "fill" | "sizeMotion"
>;

export const stackClasses = (
  p: Pick<
    StackProps,
    "gap" | "align" | "justify" | "fill" | "sizeMotion" | "class"
  >,
): string =>
  classNames(
    "stack",
    p.gap && `stack--gap-${p.gap}`,
    p.align && `stack--align-${p.align}`,
    p.justify && `stack--justify-${p.justify}`,
    p.fill && "stack--fill",
    p.sizeMotion && "stack--size-motion",
    p.class,
  );

export const Stack = (props: StackProps): ReactElement => {
  const {
    gap,
    align,
    justify,
    fill,
    sizeMotion,
    children,
    class: c,
    className,
    ...rest
  } = props;
  return (
    <div
      className={stackClasses({
        gap,
        align,
        justify,
        fill,
        sizeMotion,
        class: joined(c, className),
      })}
      {...domProps(rest)}
    >
      {children}
    </div>
  );
};

// ── Row ────────────────────────────────────────────────────────────────────
export interface RowProps extends Base {
  readonly gap?: "xs" | "sm" | "md" | "lg" | "xl";
  readonly align?: "start" | "center" | "end" | "stretch" | "baseline";
  readonly justify?: "start" | "center" | "end" | "between";
  readonly wrap?: boolean;
  readonly fill?: boolean;
  readonly equal?: boolean;
}
export type RowDataProps = Omit<
  RowProps,
  "gap" | "align" | "justify" | "wrap" | "fill"
>;

export const rowClasses = (
  p: Pick<
    RowProps,
    "gap" | "align" | "justify" | "wrap" | "fill" | "equal" | "class"
  >,
): string =>
  classNames(
    "row",
    p.gap && `row--gap-${p.gap}`,
    p.align && `row--align-${p.align}`,
    p.justify && `row--justify-${p.justify}`,
    p.wrap && "row--wrap",
    p.fill && "row--fill",
    p.equal && "row--equal",
    p.class,
  );

export const Row = (props: RowProps): ReactElement => {
  const {
    gap,
    align,
    justify,
    wrap,
    fill,
    equal,
    children,
    class: c,
    className,
    ...rest
  } = props;
  return (
    <div
      className={rowClasses({
        gap,
        align,
        justify,
        wrap,
        fill,
        equal,
        class: joined(c, className),
      })}
      {...domProps(rest)}
    >
      {children}
    </div>
  );
};

// ── Box ────────────────────────────────────────────────────────────────────
export interface BoxProps extends Base {
  readonly grow?: boolean;
  readonly shrink?: boolean;
}
export type BoxDataProps = Omit<BoxProps, "grow" | "shrink">;

export const boxClasses = (
  p: Pick<BoxProps, "grow" | "shrink" | "class">,
): string =>
  classNames(
    "box",
    p.grow && "box--grow",
    p.shrink === false && "box--no-shrink",
    p.class,
  );

export const Box = (props: BoxProps): ReactElement => {
  const { grow, shrink, children, class: c, className, ...rest } = props;
  return (
    <div
      className={boxClasses({ grow, shrink, class: joined(c, className) })}
      {...domProps(rest)}
    >
      {children}
    </div>
  );
};

// ── Grid ───────────────────────────────────────────────────────────────────
export interface GridProps extends Base {
  readonly columns?: string;
  readonly gap?: "xs" | "sm" | "md";
  readonly align?: "start" | "center" | "end" | "baseline" | "stretch";
}
export type GridDataProps = Omit<GridProps, "columns" | "gap" | "align">;

export const gridClasses = (
  p: Pick<GridProps, "gap" | "align" | "class">,
): string =>
  classNames(
    "grid",
    `grid--gap-${p.gap ?? "sm"}`,
    p.align && `grid--align-${p.align}`,
    p.class,
  );

/** SUI's rule: a string style replaces everything; an object rides on the columns. */
export const gridStyle = (
  columns: string | undefined,
  style: SolidStyle | undefined,
): SolidStyle =>
  typeof style === "string"
    ? style
    : { ...(columns ? { "grid-template-columns": columns } : {}), ...style };

export const Grid = (props: GridProps): ReactElement => {
  const {
    columns,
    gap,
    align,
    style,
    children,
    class: c,
    className,
    ...rest
  } = props;
  return (
    <div
      className={gridClasses({ gap, align, class: joined(c, className) })}
      {...domProps({
        ...rest,
        style: gridStyle(columns, style as SolidStyle | undefined),
      })}
    >
      {children}
    </div>
  );
};

// ── AppHeader ──────────────────────────────────────────────────────────────
export interface AppHeaderProps extends Attrs<HTMLElement> {
  readonly size?: "sm" | "md" | "lg";
  readonly inline?: boolean;
  readonly children?: ReactNode;
}
export type AppHeaderDataProps = Omit<AppHeaderProps, "size" | "inline">;

export const appHeaderClasses = (
  p: Pick<AppHeaderProps, "size" | "inline" | "class">,
): string =>
  classNames(
    "app-header",
    `app-header--${p.size ?? "md"}`,
    p.inline && "app-header--inline",
    p.class,
  );

export const AppHeader = (props: AppHeaderProps): ReactElement => {
  const { size, inline, children, class: c, className, ...rest } = props;
  return (
    <header
      className={appHeaderClasses({
        size,
        inline,
        class: joined(c, className),
      })}
      {...domProps(rest)}
    >
      {children}
    </header>
  );
};

// ── Factories (SUI's createX: the variant's defaults under the caller's props;
//    Stack/Row/Box also merge the two styles rather than replacing one) ────────
const withStyle = <P extends { readonly style?: unknown }>(
  defaults: Partial<P>,
  props: P,
): P => ({
  ...mergeDefined(defaults, props),
  style: mergeStyle(
    defaults.style as SolidStyle | undefined,
    props.style as SolidStyle | undefined,
  ),
});

export const createStack =
  (defaults: Partial<Omit<StackProps, "children">>) =>
  (props: StackDataProps): ReactElement => (
    <Stack {...withStyle<StackProps>(defaults, props)} />
  );

export const createRow =
  (defaults: Partial<Omit<RowProps, "children">>) =>
  (props: RowDataProps): ReactElement => (
    <Row {...withStyle<RowProps>(defaults, props)} />
  );

export const createBox =
  (defaults: Partial<Omit<BoxProps, "children">>) =>
  (props: BoxDataProps): ReactElement => (
    <Box {...withStyle<BoxProps>(defaults, props)} />
  );

export const createGrid =
  (defaults: Partial<Omit<GridProps, "children">>) =>
  (props: GridDataProps): ReactElement => (
    <Grid {...mergeDefined(defaults, props)} />
  );

export const createAppHeader =
  (defaults: Partial<AppHeaderProps>) =>
  (props: AppHeaderDataProps): ReactElement => (
    <AppHeader {...mergeDefined(defaults, props)} />
  );
