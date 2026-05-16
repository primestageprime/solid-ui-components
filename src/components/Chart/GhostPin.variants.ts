import type { Component } from "solid-js";
import { createGhostPin } from "./GhostPin";
import type { GhostPinDataProps } from "./GhostPin";

/** Warning ghost — bumps size + opacity for the canonical "drop a warning pin here" cue. */
export const WarningGhostPin: Component<GhostPinDataProps> =
  createGhostPin({ size: 16, opacity: 0.5, class: "sui-chart__ghost-pin--warning" });

/** Subtle ghost — low opacity, default size. */
export const SubtleGhostPin: Component<GhostPinDataProps> =
  createGhostPin({ opacity: 0.25 });
