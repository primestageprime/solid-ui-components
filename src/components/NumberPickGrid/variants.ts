// ============================================
// NumberPickGrid Curried Variants — Depth 1 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import {
  createNumberPickGrid,
  type NumberPickGridDataProps,
} from "./NumberPickGrid";

/** Numbered cells in rows of ten: pick one, see the run to the next stop. */
export const NumberPickGrid: Component<NumberPickGridDataProps> =
  createNumberPickGrid({ columns: 10 });
