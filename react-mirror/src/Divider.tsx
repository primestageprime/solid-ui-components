// SUI's Divider, as React markup.
import type { ReactElement } from "react";
import "../../src/components/Divider/Divider.css";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";

export interface DividerProps extends Attrs<HTMLHRElement> {
  readonly orientation?: "horizontal" | "vertical";
  readonly variant?: "solid" | "dashed" | "dotted";
  readonly spacing?: "sm" | "md" | "lg";
}
export type DividerDataProps = Omit<
  DividerProps,
  "orientation" | "variant" | "spacing"
>;

export const dividerClasses = (
  p: Pick<DividerProps, "orientation" | "variant" | "spacing" | "class">,
): string =>
  classNames(
    "sui-divider",
    `sui-divider--${p.orientation || "horizontal"}`,
    `sui-divider--${p.variant || "solid"}`,
    `sui-divider--spacing-${p.spacing || "md"}`,
    p.class,
  );

export const Divider = (props: DividerProps): ReactElement => {
  const { orientation, variant, spacing, class: c, className, ...rest } = props;
  return (
    <hr
      className={dividerClasses({
        orientation,
        variant,
        spacing,
        class: classNames(c, className) || undefined,
      })}
      {...domProps(rest)}
    />
  );
};

export const createDivider =
  (defaults: Partial<DividerProps>) =>
  (props: DividerDataProps): ReactElement => (
    <Divider {...mergeDefined(defaults, props)} />
  );
