// ============================================
// DirectionGlyph — Composite (Depth 2)
// Tags: shows:icon, does:hover, data:enum, role:inline
// Composes GlyphFrame. Direction of money: a red down arrow is an expense, a
// green up arrow is revenue. Shape carries the meaning, colour backs it up.
// Exported directly: it has no design-config props.
// ============================================
import { type Component, Show } from "solid-js";
import { GlyphFrame } from "./GlyphFrame";

export type Direction = "expense" | "revenue";

export interface DirectionGlyphProps {
  direction: Direction;
}

export const DirectionGlyph: Component<DirectionGlyphProps> = (props) => (
  <GlyphFrame
    label={props.direction === "expense" ? "Expense: money going out" : "Revenue: money coming in"}
    tone={props.direction === "expense" ? "danger" : "success"}
  >
    <Show
      when={props.direction === "expense"}
      fallback={<path d="M8 13V3M4 7l4-4 4 4" />}
    >
      <path d="M8 3v10M4 9l4 4 4-4" />
    </Show>
  </GlyphFrame>
);
