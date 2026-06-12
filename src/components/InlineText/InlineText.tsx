// ============================================
// InlineText — Atomic Primitive (Depth 1, styleless)
// Owns NO CSS file (styleless-Primitive waiver, per CONTEXT.md — same
// rationale as Duration / NumberWithUnits). A bare <span> that imposes
// NO typography of its own: font-size / weight / family all inherit from
// the surrounding context (table cell, list row, label). The single
// optional `color` is data-driven and applied inline — the allowed place
// for inline style in a Primitive.
//
// Use when a value's COLOUR is computed from data (muted when zero/null,
// normal otherwise) but its TYPOGRAPHY must match wherever it sits, so no
// size-baking Text variant (TextValue / MutedBody / TextSublabel …) fits.
// No factory / no variants: colour is the only input and it's data-driven.
// ============================================
import { JSX, splitProps } from "solid-js";

export interface InlineTextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Data-driven text colour, applied inline. Omit to inherit the parent's colour. */
  color?: string;
  children?: JSX.Element;
}

export function InlineText(props: InlineTextProps) {
  const [local, others] = splitProps(props, ["color", "style", "children"]);

  const mergedStyle = (): JSX.CSSProperties | string | undefined => {
    if (!local.color) return local.style;
    const base = (typeof local.style === "object" ? local.style : {}) as JSX.CSSProperties;
    return { ...base, color: local.color };
  };

  return (
    <span style={mergedStyle()} {...others}>
      {local.children}
    </span>
  );
}
