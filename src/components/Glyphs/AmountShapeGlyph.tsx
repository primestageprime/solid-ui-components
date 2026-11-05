// ============================================
// AmountShapeGlyph — Composite (Depth 2)
// Tags: shows:icon, does:hover, data:enum, role:inline
// Composes GlyphFrame. A metronome is a fixed amount (the same beat every
// time); error bars are a variable one (a value with a spread).
// Exported directly: it has no design-config props.
// ============================================
import { type Component, Show } from "solid-js";
import { GlyphFrame } from "./GlyphFrame";

export type AmountShape = "fixed" | "variable";

export interface AmountShapeGlyphProps {
  shape: AmountShape;
}

export const AmountShapeGlyph: Component<AmountShapeGlyphProps> = (props) => (
  <GlyphFrame
    label={props.shape === "fixed" ? "Fixed amount: the same every time" : "Variable amount: a range"}
  >
    <Show
      when={props.shape === "variable"}
      fallback={
        <>
          <path d="M5.2 14.2 6.6 2.5h2.8l1.4 11.7z" />
          <path d="M8 11.2 10.6 5" />
          <circle cx="10.2" cy="6" r="0.9" fill="currentColor" />
        </>
      }
    >
      <path d="M3 3v10M1.8 3h2.4M1.8 13h2.4" />
      <path d="M8 5v8M6.8 5h2.4M6.8 13h2.4" />
      <path d="M13 2v7M11.8 2h2.4M11.8 9h2.4" />
      <circle cx="3" cy="8" r="0.9" fill="currentColor" />
      <circle cx="8" cy="9" r="0.9" fill="currentColor" />
      <circle cx="13" cy="5.5" r="0.9" fill="currentColor" />
    </Show>
  </GlyphFrame>
);
