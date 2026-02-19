// ============================================
// HUD Curried Variants — Depth 1 (zero CSS)
// Pre-configured HUDPanel via createHUDPanel() factory.
// ============================================
import { createHUDPanel } from "./HUDPanel";

// Info panel — default color, subtle glow, clipped corners
export const InfoPanel = createHUDPanel({ corners: "clip", glow: "subtle" });

// Accent panel — primary color, medium glow, bracket corners
export const AccentPanel = createHUDPanel({ variant: "primary", corners: "bracket", glow: "medium" });

// Danger panel — danger color, strong glow, clipped corners
export const DangerPanel = createHUDPanel({ variant: "danger", corners: "clip", glow: "strong" });

// Warning panel — warning color, subtle glow, clipped corners
export const WarningPanel = createHUDPanel({ variant: "warning", corners: "clip", glow: "subtle" });

// Success panel — success color, subtle glow, clipped corners
export const SuccessPanel = createHUDPanel({ variant: "success", corners: "clip", glow: "subtle" });

// Compact info panel — small size, no glow, clipped corners
export const CompactPanel = createHUDPanel({ size: "sm", corners: "clip", glow: "none" });

// Decorated panel — bracket corners with edge accents and medium glow
export const DecoratedPanel = createHUDPanel({ corners: "bracket", edgeAccents: true, glow: "medium" });
