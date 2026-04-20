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

// Primary button — default size
export const PrimaryButton: Component<ButtonDataProps> = createButton({ variant: "primary" });

// Danger button — default size
export const DangerButton: Component<ButtonDataProps> = createButton({ variant: "danger" });

// Ghost button — default size
export const GhostButton: Component<ButtonDataProps> = createButton({ variant: "ghost" });

// Small primary button — compact primary action
export const SmallPrimaryButton: Component<ButtonDataProps> = createButton({ variant: "primary", size: "sm" });

// Small danger button — compact destructive action
export const SmallDangerButton: Component<ButtonDataProps> = createButton({ variant: "danger", size: "sm" });

// Small ghost button — compact subtle action
export const SmallGhostButton: Component<ButtonDataProps> = createButton({ variant: "ghost", size: "sm" });

// Large primary button — prominent primary action
export const LargePrimaryButton: Component<ButtonDataProps> = createButton({ variant: "primary", size: "lg" });
