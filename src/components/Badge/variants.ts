// ============================================
// StatusBadge Curried Variants — Depth 1 (zero CSS)
// One baked badge per compliance variant (size default). Callers supply runtime
// data (label / children / href) and may set `variant` (it's data, not locked).
// `SmStatusBadge` bakes only the small size and leaves `variant` to the caller —
// for status driven by runtime data (e.g. work category).
// ============================================
import { createStatusBadge } from "./StatusBadge";
import type { StatusBadgeDataProps } from "./StatusBadge";
import type { Component } from "solid-js";

/** Small badge with size baked; variant supplied at the call site (data-driven). */
export const SmStatusBadge: Component<StatusBadgeDataProps> = createStatusBadge(
  { size: "sm" },
);

/** Green compliance badge. */
export const CompliantBadge: Component<StatusBadgeDataProps> =
  createStatusBadge({ variant: "compliant" });

/** Red violation badge. */
export const ViolationBadge: Component<StatusBadgeDataProps> =
  createStatusBadge({ variant: "violation" });

/** Amber warning badge. */
export const WarningBadge: Component<StatusBadgeDataProps> = createStatusBadge({
  variant: "warning",
});

/** Neutral pending badge. */
export const PendingBadge: Component<StatusBadgeDataProps> = createStatusBadge({
  variant: "pending",
});

/** Blue informational badge. */
export const InfoBadge: Component<StatusBadgeDataProps> = createStatusBadge({
  variant: "info",
});

// ── Workflow status — what a row IS, over the same tones ──
// A job's state (todo → doing, or pending on something) reads as its own word;
// the tone is borrowed from the compliance palette, the meaning is not.
// `PendingBadge` above already serves the third state.

/** Work under way (blue). */
export const DoingBadge: Component<StatusBadgeDataProps> = createStatusBadge({
  variant: "info",
});

/** Work ready to start (green). */
export const TodoBadge: Component<StatusBadgeDataProps> = createStatusBadge({
  variant: "compliant",
});
