// ============================================
// Grid — Primitive (Depth 1)
// Owns CSS (Layout.css). A CSS-grid container: the `columns` override supplies
// `grid-template-columns` (any track list), `gap`/`align` come from the scale.
// For genuine 2-D / label-value layouts that a flex Row/Stack can't express.
// Factory: createGrid(); see the LabelValueGrid curried variant in variants.ts.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface GridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** `grid-template-columns` track list, e.g. "minmax(80px, max-content) 1fr". */
  columns?: string;
  /** Gap between cells. Default `sm` (8px). */
  gap?: "xs" | "sm" | "md";
  /** Cross-axis alignment of each cell's content. */
  align?: "start" | "center" | "end" | "baseline" | "stretch";
}

export const Grid: Component<GridProps> = (rawProps) => {
  const props = mergeProps({ gap: "sm" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "columns",
    "gap",
    "align",
    "class",
    "style",
    "children",
  ]);
  const classes = () => {
    const cls = ["grid", `grid--gap-${local.gap}`];
    if (local.align) cls.push(`grid--align-${local.align}`);
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };
  const style = (): JSX.CSSProperties | string => {
    const base: JSX.CSSProperties = local.columns
      ? { "grid-template-columns": local.columns }
      : {};
    return typeof local.style === "string"
      ? local.style
      : { ...base, ...local.style };
  };
  return (
    <div class={classes()} style={style()} {...others}>
      {local.children}
    </div>
  );
};

/** Props locked at variant-definition time. */
export type GridOverrides = Pick<GridProps, "columns" | "gap" | "align">;
/** Props a curried Grid variant still exposes. */
export type GridDataProps = Omit<GridProps, keyof GridOverrides>;

export function createGrid(
  defaults: Partial<Omit<GridProps, "children">>,
): Component<GridDataProps> {
  return (props) => <Grid {...mergeProps(defaults, props)} />;
}
