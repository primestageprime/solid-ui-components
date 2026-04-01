// ============================================
// Row — Primitive (Depth 0)
// Owns CSS (Layout.css). Flex-row container
// with gap/align/justify/wrap. Factory: createRow().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface RowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
}

export const Row: Component<RowProps> = (props) => {
  const [local, others] = splitProps(props, [
    "gap",
    "align",
    "justify",
    "wrap",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["row"];
    if (local.gap) classList.push(`row--gap-${local.gap}`);
    if (local.align) classList.push(`row--align-${local.align}`);
    if (local.justify) classList.push(`row--justify-${local.justify}`);
    if (local.wrap) classList.push("row--wrap");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};

/** Props that are layout overrides — locked at variant-definition time. */
export type RowOverrides = Pick<RowProps, "gap" | "align" | "justify" | "wrap">;

/** Props that remain available to consumers of a curried Row variant. */
export type RowDataProps = Omit<RowProps, keyof RowOverrides>;

export function createRow(defaults: Partial<Omit<RowProps, "children">>): Component<RowDataProps> {
  return (props) => <Row {...mergeProps(defaults, props)} />;
}
