// ============================================
// TruthIndicator Curried Variants — Depth 1 (zero CSS)
// `size` is baked; `value` / `onClick` / `label` stay runtime data.
// ============================================
import { createTruthIndicator } from "./TruthIndicator";
import type { TruthIndicatorDataProps } from "./TruthIndicator";
import type { Component } from "solid-js";

/** Default medium boolean indicator. */
export const TruthIndicator: Component<TruthIndicatorDataProps> =
  createTruthIndicator({});

/** Small indicator — for dense rows. */
export const SmallTruthIndicator: Component<TruthIndicatorDataProps> =
  createTruthIndicator({ size: "sm" });

/** Large indicator — for prominent status. */
export const LargeTruthIndicator: Component<TruthIndicatorDataProps> =
  createTruthIndicator({ size: "lg" });
