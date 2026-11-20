// Styles as SUI writes them (Solid: dashed keys, or a string) and as React
// takes them (camel-cased keys). SUI's variant tables bake Solid styles, so
// every base converts at the one place it hands a style to React.
import type { CSSProperties } from "react";

/** A style as SUI's variant tables and Solid components write it. */
export type SolidStyle =
  | string
  | Readonly<Record<string, string | number | undefined>>;

/** `font-variant-numeric` → `fontVariantNumeric`; `--x` stays `--x`. */
export const camelProperty = (property: string): string =>
  property.startsWith("--")
    ? property
    : property
        .replace(/^-(webkit|moz|ms)-/, (_, vendor: string) => `${vendor}-`)
        .replace(
          /^(webkit|moz)-/,
          (vendor: string) => `${vendor[0]?.toUpperCase()}${vendor.slice(1)}`,
        )
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** `"a: b; c: d"` → `{ a: "b", c: "d" }`. */
export const parseStyle = (style: string): Record<string, string> =>
  Object.fromEntries(
    style
      .split(";")
      .map((piece) => piece.trim())
      .filter((piece) => piece.includes(":"))
      .map((piece) => {
        const colon = piece.indexOf(":");
        return [piece.slice(0, colon).trim(), piece.slice(colon + 1).trim()];
      }),
  );

/** A Solid style as React's `style` prop, or `undefined` for none. */
export const reactStyle = (
  style: SolidStyle | undefined,
): CSSProperties | undefined => {
  if (style === undefined) return undefined;
  const entries = Object.entries(
    typeof style === "string" ? parseStyle(style) : style,
  ).filter(([, value]) => value !== undefined);
  return Object.fromEntries(
    entries.map(([key, value]) => [camelProperty(key), value]),
  ) as CSSProperties;
};

/**
 * A variant's baked style under a caller's, key by key — SUI's own
 * `mergeStyle` (Layout/mergeStyle.ts), so a caller's `max-height` never
 * wipes a variant's baked `overflow`. A string on either side cannot merge:
 * the override wins.
 */
export const mergeStyle = (
  base: SolidStyle | undefined,
  override: SolidStyle | undefined,
): SolidStyle | undefined => {
  if (base === undefined) return override;
  if (override === undefined) return base;
  if (typeof base === "string" || typeof override === "string") return override;
  return { ...base, ...override };
};
