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
export const InteractiveCard = createSurface({
  padding: "sm",
  radius: "sm",
  interactive: true,
  bg: "rgba(var(--sui-accent-rgb), 0.05)",
  borderColor: "rgba(var(--sui-accent-rgb), 0.3)",
});

// Status-colored surfaces (card shape + status colors)
export const InfoSurface = createSurface({
  padding: "md",
  radius: "md",
  bg: "rgba(var(--sui-accent-rgb), 0.05)",
  borderColor: "rgba(var(--sui-accent-rgb), 0.3)",
});
export const WarningSurface = createSurface({
  padding: "md",
  radius: "md",
  bg: "rgba(255,204,0,0.1)",
  borderColor: "rgba(255,204,0,0.3)",
});
export const SuccessSurface = createSurface({
  padding: "md",
  radius: "md",
  bg: "rgba(var(--sui-success-rgb), 0.1)",
  borderColor: "rgba(var(--sui-success-rgb), 0.3)",
});
export const DangerSurface = createSurface({
  padding: "md",
  radius: "md",
  bg: "rgba(var(--sui-danger-rgb), 0.1)",
  borderColor: "rgba(var(--sui-danger-rgb), 0.3)",
});

// Card frame variants (responsive sizing via min/max-width)
export const CompactCard = createSurface({
  padding: "sm",
  radius: "sm",
  direction: "row",
  align: "center",
  gap: "sm",
  minWidth: "200px",
  maxWidth: "360px",
});

export const NoteCard = createSurface({
  padding: "md",
  radius: "md",
  direction: "column",
  align: "stretch",
  gap: "md",
  minWidth: "260px",
  maxWidth: "400px",
});

export const WideCard = createSurface({
  padding: "md",
  radius: "md",
  direction: "row",
  align: "start",
  gap: "md",
  minWidth: "320px",
  maxWidth: "1000px",
});

export const SquareCard = createSurface({
  padding: "md",
  radius: "md",
  direction: "column",
  align: "center",
  gap: "sm",
  minWidth: "180px",
  maxWidth: "260px",
});

/** Dark recessed container for formula/code displays */
export const FormulaBlock = createSurface({
  padding: "sm",
  radius: "sm",
  bg: "var(--sui-bg-inset)",
});

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

/** Elevated floating panel for overlay controls (popover/menu dropdowns):
 *  elevated bg, hairline border, md radius, drop shadow, 280–360px wide. */
export const PopoverSurface = createSurface({
  padding: "sm",
  radius: "md",
  bg: "var(--sui-bg-elevated)",
  borderColor: "var(--sui-border)",
  shadow: true,
  minWidth: "280px",
  maxWidth: "360px",
});

/** InboxPopoverSurface — PopoverSurface's wider sibling (400–460px) for a
 *  popover whose ROWS carry inline actions rather than being single-action menu
 *  items. `PopoverSurface`'s 360px measure is sized for a menu (one label per
 *  row); once a row pairs a navigating CTA with a couple of triage controls,
 *  three actions no longer fit. Widen the panel rather than growing an overflow
 *  menu — three actions on a notification is a normal shape, not an edge case.
 *
 *  It is the **minWidth** that does the work, not maxWidth: the surface is
 *  shrink-to-fit, so a wrapping action row simply wraps instead of forcing the
 *  box wider, and a raised cap alone is never reached. The floor is what buys
 *  the room. Kept separate so plain menus/dropdowns keep the narrow measure. */
export const InboxPopoverSurface = createSurface({
  padding: "sm",
  radius: "md",
  bg: "var(--sui-bg-elevated)",
  borderColor: "var(--sui-border)",
  shadow: true,
  minWidth: "400px",
  maxWidth: "460px",
});

// NoticeBar — full-width, edge-to-edge informational bar (ruled 2026-07-22):
// row-arranged, center-aligned, accent-tinted like InfoSurface but flush
// (radius none) so it sits against app chrome. For top-of-app notices with
// text + action + dismiss. Shipping consumer: the Auth sibling banner.
export const NoticeBar = createSurface({
  direction: "row",
  align: "center",
  gap: "sm",
  padding: "sm",
  radius: "none",
  bg: "rgba(var(--sui-accent-rgb), 0.05)",
  borderColor: "rgba(var(--sui-accent-rgb), 0.3)",
});
