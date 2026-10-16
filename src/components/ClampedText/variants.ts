// ============================================
// ClampedText Curried Variants — Depth 1 (zero CSS)
// `lines` is the only presentational knob, so the variant IS the component.
// ============================================
import type { Component } from "solid-js";
import { createClampedText } from "./ClampedText";
import type { ClampedTextDataProps } from "./ClampedText";

/** Body text from 1 to 6 lines tall, then scrolling inside. For notes and descriptions. */
export const ClampedText: Component<ClampedTextDataProps> = createClampedText({
  lines: { min: 1, max: 6 },
});
