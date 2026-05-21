// ============================================
// LabeledDivider Curried Variants — Depth 1 (zero CSS)
// Pre-configured LabeledDivider via createLabeledDivider().
// ============================================
import type { Component } from "solid-js";
import { createLabeledDivider } from "./LabeledDivider";
import type { LabeledDividerDataProps } from "./LabeledDivider";

/** Semantic alias for date-style separators between message groups. */
export const DateDivider: Component<LabeledDividerDataProps> =
  createLabeledDivider({});
