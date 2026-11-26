// SUI's Text, as React markup.
import { createElement, type ReactElement, type ReactNode } from "react";
import "../../src/components/Text/Text.css";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";
import type { SolidStyle } from "./internal/style.ts";

export type TextVariant =
  | "value"
  | "label"
  | "title"
  | "body"
  | "units"
  | "sublabel";
export type Tone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "muted"
  | "highlight";

export interface TextProps extends Attrs<HTMLElement> {
  readonly variant?: TextVariant;
  readonly color?: string;
  readonly tone?: Tone;
  readonly as?: "span" | "p" | "pre" | "h1" | "h2" | "h3" | "h4" | "div";
  readonly children?: ReactNode;
}
export type TextDataProps = Omit<TextProps, "variant" | "color" | "as">;

export const textClasses = (
  p: Pick<TextProps, "variant" | "tone" | "class">,
): string =>
  classNames(
    "text",
    p.variant && `text--${p.variant}`,
    p.tone && p.tone !== "default" && `sui-text-tone--${p.tone}`,
    p.class,
  );

/** SUI's merge: a color overrides an object style and replaces a string one. */
export const textStyle = (
  color: string | undefined,
  style: SolidStyle | undefined,
): SolidStyle | undefined =>
  color ? { ...(typeof style === "object" ? style : {}), color } : style;

export const Text = (props: TextProps): ReactElement => {
  const {
    variant,
    color,
    tone,
    as,
    style,
    children,
    class: c,
    className,
    ...rest
  } = props;
  return createElement(
    as || "span",
    {
      className: textClasses({
        variant,
        tone,
        class: classNames(c, className) || undefined,
      }),
      ...domProps({
        ...rest,
        style: textStyle(color, style as SolidStyle | undefined),
      }),
    },
    children,
  );
};

export const createText =
  (defaults: Partial<Omit<TextProps, "children">>) =>
  (props: TextDataProps): ReactElement => (
    <Text {...mergeDefined(defaults, props)} />
  );
