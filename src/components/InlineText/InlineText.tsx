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
//
// `tone` (added 2026-08-26) is the SEMANTIC alternative to `color`: it names
// a meaning from the shared Tone vocabulary (src/types.ts, same one Text /
// Table fields / ValueMatrix key off) and this component resolves it to a
// --sui-* token, so the call site never writes a color value at all — just
// `<InlineText tone="highlight">`. `color` stays for the rare case an app
// genuinely has its own token to apply (still var(--...), never a literal
// hex — see the example below); `tone` wins if both are given.
// ============================================
import { type JSX, splitProps } from "solid-js";
import type { Tone } from "../../types";

const TONE_COLOR: Record<Exclude<Tone, "default">, string> = {
  success: "var(--sui-success)",
  warning: "var(--sui-warning)",
  danger: "var(--sui-danger)",
  accent: "var(--sui-accent)",
  muted: "var(--sui-text-muted)",
  highlight: "var(--sui-highlight)",
};

export interface InlineTextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Data-driven text colour, applied inline. Omit to inherit the parent's colour. */
  color?: string;
  /** Semantic alternative to `color` — a Tone name, resolved to its themed
   *  token. Wins over `color` when both are set. `"default"` (or omitted)
   *  inherits, same as omitting `color`. */
  tone?: Tone;
  children?: JSX.Element;
}

export function InlineText(props: InlineTextProps) {
  const [local, others] = splitProps(props, [
    "color",
    "tone",
    "style",
    "children",
  ]);

  const resolvedColor = () =>
    local.tone && local.tone !== "default"
      ? TONE_COLOR[local.tone]
      : local.color;

  const mergedStyle = (): JSX.CSSProperties | string | undefined => {
    const color = resolvedColor();
    if (!color) return local.style;
    const base = (
      typeof local.style === "object" ? local.style : {}
    ) as JSX.CSSProperties;
    return { ...base, color };
  };

  return (
    <span style={mergedStyle()} {...others}>
      {local.children}
    </span>
  );
}
