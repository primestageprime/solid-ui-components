// ============================================
// Button Curried Variants — Depth 1 (zero CSS)
// Pre-configured Button via createButton() factory.
// ============================================
import { createButton } from "./Button";

// Primary button — default size
export const PrimaryButton = createButton({ variant: "primary" });

// Danger button — default size
export const DangerButton = createButton({ variant: "danger" });

// Ghost button — default size
export const GhostButton = createButton({ variant: "ghost" });

// Small primary button — compact primary action
export const SmallPrimaryButton = createButton({ variant: "primary", size: "sm" });

// Small danger button — compact destructive action
export const SmallDangerButton = createButton({ variant: "danger", size: "sm" });

// Small ghost button — compact subtle action
export const SmallGhostButton = createButton({ variant: "ghost", size: "sm" });

// Large primary button — prominent primary action
export const LargePrimaryButton = createButton({ variant: "primary", size: "lg" });
