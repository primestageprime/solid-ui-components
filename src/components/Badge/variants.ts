// ============================================
// StatusBadge Curried Variants — Depth 1 (zero CSS)
// One baked badge per compliance variant. Callers supply only runtime
// data (label / children / href); `variant` and `size` are locked here.
// ============================================
import { createStatusBadge } from "./StatusBadge";
import type { StatusBadgeDataProps } from "./StatusBadge";
import type { Component } from "solid-js";

/** Green compliance badge. */
export const CompliantBadge: Component<StatusBadgeDataProps> = createStatusBadge({ variant: "compliant" });

/** Red violation badge. */
export const ViolationBadge: Component<StatusBadgeDataProps> = createStatusBadge({ variant: "violation" });

/** Amber warning badge. */
export const WarningBadge: Component<StatusBadgeDataProps> = createStatusBadge({ variant: "warning" });

/** Neutral pending badge. */
export const PendingBadge: Component<StatusBadgeDataProps> = createStatusBadge({ variant: "pending" });

/** Blue informational badge. */
export const InfoBadge: Component<StatusBadgeDataProps> = createStatusBadge({ variant: "info" });
