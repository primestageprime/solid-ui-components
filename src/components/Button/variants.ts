// ============================================
// Button Curried Variants — Depth 1 (zero CSS)
// Pre-configured Button via createButton() factory.
//
// Exports carry explicit `Component<ButtonDataProps>` annotations to keep
// `vite-plugin-dts` from inlining solid-js type paths through pnpm's
// github-dep build store (TS2742 "inferred type cannot be named without
// a reference to …"). Without the annotation the generated `.d.ts` can
// end up with references to pnpm's ephemeral temp paths, which then
// strip the declarations entirely and surface as TS2305 downstream.
// ============================================
import { createButton } from "./Button";
import type { ButtonDataProps } from "./Button";
import type { Component } from "solid-js";

// Default button — standard, no-emphasis action (the no-variant baseline)
export const DefaultButton: Component<ButtonDataProps> = createButton({
  variant: "default",
});

// Primary button — default size
export const PrimaryButton: Component<ButtonDataProps> = createButton({
  variant: "primary",
});

// Secondary button — neutral/supporting action
export const SecondaryButton: Component<ButtonDataProps> = createButton({
  variant: "secondary",
});

// Danger button — default size
export const DangerButton: Component<ButtonDataProps> = createButton({
  variant: "danger",
});

// Warning button — amber-informational, distinct from danger
export const WarningButton: Component<ButtonDataProps> = createButton({
  variant: "warning",
});

// Ghost button — default size
export const GhostButton: Component<ButtonDataProps> = createButton({
  variant: "ghost",
});

// Outlined button — transparent fill, accent border + text
export const OutlinedButton: Component<ButtonDataProps> = createButton({
  variant: "outlined",
});

// Text button — link-like, no border or fill
export const TextButton: Component<ButtonDataProps> = createButton({
  variant: "text",
});

// Icon-only button — square 1.4rem, accent-colored icon
export const IconOnlyButton: Component<ButtonDataProps> = createButton({
  variant: "icon-only",
});

// Small primary button — compact primary action
export const SmallPrimaryButton: Component<ButtonDataProps> = createButton({
  variant: "primary",
  size: "sm",
});

// Small button — compact, no variant baked. `tone` (accent/outline/muted) is a
// runtime data prop (not stripped), so callers select tone per instance.
export const SmallButton: Component<ButtonDataProps> = createButton({
  size: "sm",
});

// Small danger button — compact destructive action
export const SmallDangerButton: Component<ButtonDataProps> = createButton({
  variant: "danger",
  size: "sm",
});

// Small ghost button — compact subtle action
export const SmallGhostButton: Component<ButtonDataProps> = createButton({
  variant: "ghost",
  size: "sm",
});

// Small outlined button — compact mid-emphasis action (accent border + text)
export const SmallOutlinedButton: Component<ButtonDataProps> = createButton({
  variant: "outlined",
  size: "sm",
});

// Small warning button — compact amber caution action (not destructive)
export const SmallWarningButton: Component<ButtonDataProps> = createButton({
  variant: "warning",
  size: "sm",
});

// Large primary button — prominent primary action
export const LargePrimaryButton: Component<ButtonDataProps> = createButton({
  variant: "primary",
  size: "lg",
});

// Pressable label button — a NAME that is also the select control: the button
// stripped back to its own text, taking the accent when `active`. Pass
// `aria-pressed` at the call site (it is a toggle, not a command) and
// `data-struck` for a name that is struck through. For the label above an
// instrument in a row of them, where the name IS the thing you click to pin
// it — see MutationSliders.
export const PressableLabelButton: Component<ButtonDataProps> = createButton({
  variant: "plain-label",
});

// Glyph-slot ghost button — a compact ghost action whose BOX IS PINNED (24px,
// line-height 1), so the several glyphs it may hold cannot change its height.
// Measured in the browser: a text glyph and an `Icon` span gave button heights
// 1px apart, and that pixel moved the whole column the moment the state
// changed. A fixed box makes the states interchangeable by construction rather
// than by coincidence of font metrics.
export const GlyphSlotGhostButton: Component<ButtonDataProps> = createButton({
  variant: "ghost",
  size: "sm",
  style: { height: "24px", "line-height": "1" },
});

// Reserved glyph slot — a `GlyphSlotGhostButton` that HOLDS ITS SPACE AND DOES
// NOTHING (`visibility: hidden`). For the state where the consumer supplied no
// action: removing the button would shorten the column and move every
// neighbour, and `visibility` (unlike `display: none`) keeps the box while
// taking the node out of the accessibility tree and out of the tab order, so a
// reserved button is not a focus trap.
export const ReservedGlyphSlotButton: Component<ButtonDataProps> =
  createButton({
    variant: "ghost",
    size: "sm",
    style: { height: "24px", "line-height": "1", visibility: "hidden" },
  });
