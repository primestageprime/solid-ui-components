// ============================================
// FixedCard Curried Variants — Depth 2 (zero CSS)
// Tags: shows:card, shows:dialog, does:click, does:view, data:scalar, role:container
// The size is baked; title/children/detail/active/onClick stay runtime.
// ============================================
import type { Component } from "solid-js";
import { createFixedCard } from "./FixedCard";
import type { FixedCardDataProps } from "./FixedCard";

/** A 320 x 240 card for a wrapping row: clips its summary, never grows, and
 *  opens the rest in a modal from a "More" button. */
export const FixedCard: Component<FixedCardDataProps> = createFixedCard({
  size: "md",
});
