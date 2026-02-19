// ============================================
// Text — Primitive (Depth 0)
// Owns CSS (Text.css). Polymorphic text element
// with variant/color. Factory: createText().
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import "./Text.css";

export type TextVariant = "value" | "label" | "title" | "body" | "units" | "sublabel";

export interface TextProps extends JSX.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  color?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
}

export const Text: Component<TextProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "color",
    "as",
    "class",
    "children",
    "style",
  ]);

  const classes = () => {
    const classList = ["text"];
    if (local.variant) classList.push(`text--${local.variant}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mergedStyle = (): JSX.CSSProperties | undefined => {
    if (!local.color) return local.style as JSX.CSSProperties | undefined;
    const base = (typeof local.style === "object" ? local.style : {}) as JSX.CSSProperties;
    return { ...base, color: local.color };
  };

  return (
    <Dynamic component={local.as || "span"} class={classes()} style={mergedStyle()} {...others}>
      {local.children}
    </Dynamic>
  );
};

export function createText(defaults: Partial<Omit<TextProps, "children">>): Component<TextProps> {
  return (props) => <Text {...mergeProps(defaults, props)} />;
}
