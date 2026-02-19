// ============================================
// Panel Curried Variants — Depth 1 (zero CSS)
// Pre-configured Panel via createPanel() factory.
// Merged from HUD variants + generic variants.
// ============================================
import { createPanel } from "./Panel";

// --- Variants from HUDPanel ---

// Info panel — default color, subtle glow, clipped corners
export const InfoPanel = createPanel({ corners: "clip", glow: "subtle" });

// Accent panel — primary color, medium glow, bracket corners
export const AccentPanel = createPanel({ variant: "primary", corners: "bracket", glow: "medium" });

// Danger panel — danger color, strong glow, clipped corners
export const DangerPanel = createPanel({ variant: "danger", corners: "clip", glow: "strong" });

// Warning panel — warning color, subtle glow, clipped corners
export const WarningPanel = createPanel({ variant: "warning", corners: "clip", glow: "subtle" });

// Success panel — success color, subtle glow, clipped corners
export const SuccessPanel = createPanel({ variant: "success", corners: "clip", glow: "subtle" });

// Compact info panel — small size, no glow, clipped corners
export const CompactPanel = createPanel({ size: "sm", corners: "clip", glow: "none" });

// Decorated panel — bracket corners with edge accents and medium glow
export const DecoratedPanel = createPanel({ corners: "bracket", edgeAccents: true, glow: "medium" });

// --- Variants from generic Panel ---

// Simple panel — small size (was CompactJTFPanel)
export const SimplePanel = createPanel({ size: "sm" });

// Spacious panel — large padding
export const SpaciousPanel = createPanel({ size: "lg" });
