// SUI's Icon, as React markup. The glyphs are SUI's own ICON_PATHS table,
// read from Icon.tsx at build time (see build/source.ts), never copied.
import type { ReactElement } from "react";
import "../../src/components/Icon/Icon.css";
import { ICON_PATHS, type IconName } from "sui:Icon/paths";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";

export type { IconName };
export type IconVariant = "outline" | "solid";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface IconProps extends Attrs<HTMLSpanElement> {
  readonly name: IconName;
  readonly variant?: IconVariant;
  readonly size?: IconSize;
  readonly flipped?: boolean;
}
export type IconDataProps = Omit<IconProps, "variant" | "size">;

export const iconClasses = (
  p: Pick<IconProps, "size" | "flipped" | "class"> & { readonly name: string },
): string =>
  classNames(
    "jtf-icon",
    `jtf-icon--${p.size || "md"}`,
    p.name === "spinner" && "jtf-icon--spinning",
    p.flipped !== undefined && "jtf-icon--turnable",
    p.flipped && "jtf-icon--flipped",
    p.class,
  );

export const iconMarkup = (
  paths: { readonly outline: string; readonly solid: string },
  variant: IconVariant | undefined,
): string =>
  `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">${paths[variant || "outline"]}</svg>`;

export const Icon = (props: IconProps): ReactElement => {
  const { name, variant, size, flipped, class: c, className, ...rest } = props;
  return (
    <span
      className={iconClasses({
        name,
        size,
        flipped,
        class: classNames(c, className) || undefined,
      })}
      role="img"
      aria-label={name}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SUI's own static glyph table, as SUI renders it
      dangerouslySetInnerHTML={{
        __html: iconMarkup(ICON_PATHS[name], variant),
      }}
      {...domProps(rest)}
    />
  );
};

export const createIcon =
  (defaults: Partial<IconProps>) =>
  (props: IconDataProps): ReactElement => (
    <Icon {...mergeDefined(defaults, props as IconProps)} />
  );

/** Inline icon beside sublabel/meta text (outline, xs). */
export const InlineMetaIcon = createIcon({ variant: "outline", size: "xs" });
