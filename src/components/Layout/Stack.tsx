// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Stack — Primitive (Depth 0)
// Owns CSS (Layout.css). Flex-column container
// with gap/align/justify. Factory: createStack().
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import { mergeStyle } from "./mergeStyle";
import "./Layout.css";

export interface StackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  gap?: "xs" | "sm";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  /** Fill the parent's height and forward it through (height:100%; min-height:0)
   *  so a scrolling child — e.g. a `fill` BaseTable — has concrete height. */
  fill?: boolean;
}

export const Stack: Component<StackProps> = (props) => {
  const [local, others] = splitProps(props, [
    "gap",
    "align",
    "justify",
    "fill",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["stack"];
    if (local.gap) classList.push(`stack--gap-${local.gap}`);
    if (local.align) classList.push(`stack--align-${local.align}`);
    if (local.justify) classList.push(`stack--justify-${local.justify}`);
    if (local.fill) classList.push("stack--fill");
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
export type StackOverrides = Pick<
  StackProps,
  "gap" | "align" | "justify" | "fill"
>;

/** Props that remain available to consumers of a curried Stack variant. */
export type StackDataProps = Omit<StackProps, keyof StackOverrides>;

export function createStack(
  defaults: Partial<Omit<StackProps, "children">>,
): Component<StackDataProps> {
  // `style` is merged (not clobbered) — see mergeStyle / createBox.
  return (props) => (
    <Stack
      {...mergeProps(defaults, props)}
      style={mergeStyle(defaults.style, props.style)}
    />
  );
}
