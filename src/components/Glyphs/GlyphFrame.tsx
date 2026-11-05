// ============================================
// GlyphFrame — Atomic (Depth 1), internal to Glyphs
// Tags: shows:icon, does:hover, role:inline
// Owns Glyphs.css. Composes Tooltip.
// The shared chrome of DirectionGlyph, CadenceGlyph and AmountShapeGlyph: a
// 1em svg box in currentColor, a Tooltip that says what the glyph means, and
// an aria-label so a screen reader says the same words. Not exported from the
// package: the three glyphs are the call sites.
// ============================================
import type { Component, JSX } from "solid-js";
import { Tooltip } from "../Tooltip";
import "./Glyphs.css";

export interface GlyphFrameProps {
  /** What the glyph means, in words. Tooltip text and accessible name. */
  label: string;
  /** Colour role. Omit for the inherited text colour. */
  tone?: "danger" | "success";
  /** The drawing, in a 16 by 16 box, stroked or filled with currentColor. */
  children: JSX.Element;
}

export const GlyphFrame: Component<GlyphFrameProps> = (props) => (
  <Tooltip
    content={props.label}
    class={`sui-glyph${props.tone ? ` sui-glyph--${props.tone}` : ""}`}
  >
    <svg
      class="sui-glyph__svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label={props.label}
    >
      {props.children}
    </svg>
  </Tooltip>
);
