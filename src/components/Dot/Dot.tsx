// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Dot — Atomic (Depth 0)
// Owns CSS (Dot.css), no component imports.
// Generic colored indicator dot — caller supplies any CSS color
// via the `color` prop. Domain-agnostic; use when the variant set
// in `StatusLight` doesn't fit (e.g., severity palettes mapped to
// arbitrary hex colors from a caller-supplied scheme).
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./Dot.css";

export interface DotProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Any CSS color value (hex, rgb, var(--…), named color). */
  color: string;
  /** Pixel size, or any CSS length. Default 8px. */
  size?: number | string;
}

const toLength = (size: number | string | undefined): string => {
  if (size === undefined) return "8px";
  return typeof size === "number" ? `${size}px` : size;
};

export const Dot: Component<DotProps> = (props) => {
  const [local, others] = splitProps(props, ["color", "size", "class", "style"]);

  const cls = () => {
    const classList = ["sui-dot"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const inlineStyle = (): JSX.CSSProperties => {
    const length = toLength(local.size);
    return {
      "background-color": local.color,
      width: length,
      height: length,
      ...((local.style as JSX.CSSProperties | undefined) ?? {}),
    };
  };

  return <span class={cls()} style={inlineStyle()} aria-hidden="true" {...others} />;
};
