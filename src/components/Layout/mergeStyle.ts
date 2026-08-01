import type { JSX } from "solid-js";

type StyleProp = JSX.HTMLAttributes<HTMLElement>["style"];

/**
 * Merge a curried variant's BAKED `style` with a caller-supplied `style`.
 *
 * Solid's `mergeProps(defaults, props)` shallow-overrides whole keys, so a
 * caller passing `style={{ maxHeight }}` to a variant that bakes
 * `style={{ overflow: "auto" }}` would CLOBBER the baked overflow entirely
 * (the variant silently loses its geometry). This deep-merges the two so the
 * baked style survives and the caller wins only on the keys it sets.
 *
 * Object styles merge per-key (caller overrides). If either side is a string
 * (Solid also accepts string styles), they can't be merged — the caller's
 * value wins, matching the caller-overrides intent.
 */
export function mergeStyle(base: StyleProp, override: StyleProp): StyleProp {
  if (base == null) return override;
  if (override == null) return base;
  if (typeof base === "string" || typeof override === "string") return override;
  return { ...base, ...override };
}
