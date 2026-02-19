// ============================================
// Stack — Primitive (Depth 0)
// Owns CSS (Layout.css). Flex-column container
// with gap/align/justify. Factory: createStack().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface StackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}

export const Stack: Component<StackProps> = (props) => {
  const [local, others] = splitProps(props, [
    "gap",
    "align",
    "justify",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["stack"];
    if (local.gap) classList.push(`stack--gap-${local.gap}`);
    if (local.align) classList.push(`stack--align-${local.align}`);
    if (local.justify) classList.push(`stack--justify-${local.justify}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};

export function createStack(defaults: Partial<Omit<StackProps, "children">>): Component<StackProps> {
  return (props) => <Stack {...mergeProps(defaults, props)} />;
}
