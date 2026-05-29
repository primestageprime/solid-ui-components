// ============================================
// Divider Curried Variants — Depth 1 (zero CSS)
// Divider carries only visual config (orientation / variant / spacing), so
// the variants ARE the dividers. `Divider` is the plain default rule.
// ============================================
import { createDivider } from "./Divider";
import type { DividerDataProps } from "./Divider";
import type { Component } from "solid-js";

/** Default horizontal solid rule. */
export const Divider: Component<DividerDataProps> = createDivider({});

/** Dashed horizontal rule. */
export const DashedDivider: Component<DividerDataProps> = createDivider({ variant: "dashed" });

/** Vertical rule for inline separation. */
export const VerticalDivider: Component<DividerDataProps> = createDivider({ orientation: "vertical" });
