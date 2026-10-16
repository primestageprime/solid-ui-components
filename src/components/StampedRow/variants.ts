// ============================================
// StampedRow Curried Variants — Depth 2 (zero CSS)
// `density` is the only presentational knob, so the variants ARE the rows.
// ============================================
import type { Component } from "solid-js";
import { createStampedRow } from "./StampedRow";
import type { StampedRowDataProps } from "./StampedRow";

/** A 22px list line: glyph, label, mono time. For a log or activity trail. */
export const StampedRow: Component<StampedRowDataProps> = createStampedRow({
  density: "list",
});

/** A 40px bar line: the pinned current step above a scrolling region. */
export const PinnedStampedRow: Component<StampedRowDataProps> = createStampedRow({
  density: "pinned",
});
