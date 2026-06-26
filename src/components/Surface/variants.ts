// ============================================
// Surface Curried Variants — Depth 1 (zero CSS)
// Pre-configured Surface via createSurface() factory.
// ============================================
import { createSurface } from "./Surface";
import type { SurfaceDataProps } from "./Surface";
import type { Component } from "solid-js";

// Shape variants
export const CardSurface = createSurface({ padding: "md", radius: "md" });
export const CompactSurface = createSurface({ padding: "sm", radius: "sm" });

// Interactive card surfaces (clickable with hover glow)
export const InteractiveCard = createSurface({ padding: "sm", radius: "sm", interactive: true, bg: "rgba(var(--sui-accent-rgb), 0.05)", borderColor: "rgba(var(--sui-accent-rgb), 0.3)" });

// Status-colored surfaces (card shape + status colors)
export const InfoSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(var(--sui-accent-rgb), 0.05)", borderColor: "rgba(var(--sui-accent-rgb), 0.3)" });
export const WarningSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(255,204,0,0.1)", borderColor: "rgba(255,204,0,0.3)" });
export const SuccessSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(var(--sui-success-rgb), 0.1)", borderColor: "rgba(var(--sui-success-rgb), 0.3)" });
export const DangerSurface = createSurface({ padding: "md", radius: "md", bg: "rgba(var(--sui-danger-rgb), 0.1)", borderColor: "rgba(var(--sui-danger-rgb), 0.3)" });

// Card frame variants (responsive sizing via min/max-width)
export const CompactCard = createSurface({
  padding: "sm", radius: "sm",
  direction: "row", align: "center", gap: "sm",
  minWidth: "200px", maxWidth: "360px",
});

export const NoteCard = createSurface({
  padding: "md", radius: "md",
  direction: "column", align: "stretch", gap: "md",
  minWidth: "260px", maxWidth: "400px",
});

export const WideCard = createSurface({
  padding: "md", radius: "md",
  direction: "row", align: "start", gap: "md",
  minWidth: "320px", maxWidth: "1000px",
});

export const SquareCard = createSurface({
  padding: "md", radius: "md",
  direction: "column", align: "center", gap: "sm",
  minWidth: "180px", maxWidth: "260px",
});

/** Dark recessed container for formula/code displays */
export const FormulaBlock = createSurface({ padding: "sm", radius: "sm", bg: "var(--sui-bg-inset)" });

// Content-area surfaces — ergonomic defaults for the common "box of content"
// pattern so consumers never need to hand-roll padding/gap/direction.

/** General-purpose content area: md padding, sm gap, column layout.
 *  The everyday alternative to a bare Surface — use this when content
 *  should be vertically stacked with breathing room. */
export const ContentSurface: Component<SurfaceDataProps> = createSurface({
  padding: "md",
  radius: "sm",
  direction: "column",
  gap: "sm",
});

/** Centered surface — content centered both axes. For empty states,
 *  placeholders, loading indicators, or any single-focus content area. */
export const CenteredSurface: Component<SurfaceDataProps> = createSurface({
  padding: "md",
  radius: "sm",
  direction: "column",
  align: "center",
  gap: "sm",
});
