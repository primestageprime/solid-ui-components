// ============================================
// ButtonGroup Curried Variants — Depth 1 (zero CSS)
// Layout config (orientation / gap / bordered / tone) is baked; children stay runtime.
// ============================================
import { createButtonGroup } from "./ButtonGroup";
import type { ButtonGroupDataProps } from "./ButtonGroup";
import type { Component } from "solid-js";

/** Default horizontal button group. */
export const ButtonGroup: Component<ButtonGroupDataProps> = createButtonGroup({});

/** Vertically stacked button group. */
export const VerticalButtonGroup: Component<ButtonGroupDataProps> = createButtonGroup({ orientation: "vertical" });

/** Bordered horizontal group — segmented-control look. */
export const BorderedButtonGroup: Component<ButtonGroupDataProps> = createButtonGroup({ bordered: true });
