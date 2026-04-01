// ============================================
// Box — Primitive (Depth 0)
// Owns CSS (Layout.css). Flex child with
// grow/shrink control. Factory: createBox().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface BoxProps extends JSX.HTMLAttributes<HTMLDivElement> {
  grow?: boolean;
  shrink?: boolean;
}

export const Box: Component<BoxProps> = (props) => {
  const [local, others] = splitProps(props, [
    "grow",
    "shrink",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["box"];
    if (local.grow) classList.push("box--grow");
    if (local.shrink === false) classList.push("box--no-shrink");
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
export type BoxOverrides = Pick<BoxProps, "grow" | "shrink">;

/** Props that remain available to consumers of a curried Box variant. */
export type BoxDataProps = Omit<BoxProps, keyof BoxOverrides>;

export function createBox(defaults: Partial<Omit<BoxProps, "children">>): Component<BoxDataProps> {
  return (props) => <Box {...mergeProps(defaults, props)} />;
}
