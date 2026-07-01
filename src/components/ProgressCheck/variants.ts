// ============================================
// ProgressCheck Curried Variants — Depth 1 (zero CSS)
// `size` is baked; `progress` (0–1) stays runtime data.
// ============================================
import { createProgressCheck } from "./ProgressCheck";
import type { ProgressCheckDataProps } from "./ProgressCheck";
import type { Component } from "solid-js";

/** Default small three-state progress indicator. */
export const ProgressCheck: Component<ProgressCheckDataProps> =
  createProgressCheck({});

/** Large progress indicator — for prominent status rows. */
export const LargeProgressCheck: Component<ProgressCheckDataProps> =
  createProgressCheck({ size: "lg" });
