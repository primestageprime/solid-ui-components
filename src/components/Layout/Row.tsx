// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Row — Primitive (Depth 0)
// Owns CSS (Layout.css). Flex-row container
// with gap/align/justify/wrap. Factory: createRow().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import { mergeStyle } from "./mergeStyle";
import { assertModifierClass } from "../../internal/dom/assertModifierClass";
import "./Layout.css";

export interface RowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** 4/8/12/16px. Matches Grid and AutoStack, which have carried `md` all along. */
  gap?: "xs" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  /** Fill the parent's width and forward it through (width:100%; min-width:0)
   *  so a scrolling child has concrete width to constrain against. */
  fill?: boolean;
}

export const Row: Component<RowProps> = (props) => {
  const [local, others] = splitProps(props, [
    "gap",
    "align",
    "justify",
    "wrap",
    "fill",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["row"];
    if (local.gap) {
      const c = `row--gap-${local.gap}`;
      assertModifierClass("Row", "gap", String(local.gap), c);
      classList.push(c);
    }
    if (local.align) {
      const c = `row--align-${local.align}`;
      assertModifierClass("Row", "align", String(local.align), c);
      classList.push(c);
    }
    if (local.justify) {
      const c = `row--justify-${local.justify}`;
      assertModifierClass("Row", "justify", String(local.justify), c);
      classList.push(c);
    }
    if (local.wrap) classList.push("row--wrap");
    if (local.fill) classList.push("row--fill");
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
export type RowOverrides = Pick<
  RowProps,
  "gap" | "align" | "justify" | "wrap" | "fill"
>;

/** Props that remain available to consumers of a curried Row variant. */
export type RowDataProps = Omit<RowProps, keyof RowOverrides>;

export function createRow(
  defaults: Partial<Omit<RowProps, "children">>,
): Component<RowDataProps> {
  // `style` is merged (not clobbered) — see mergeStyle / createBox.
  return (props) => (
    <Row
      {...mergeProps(defaults, props)}
      style={mergeStyle(defaults.style, props.style)}
    />
  );
}
