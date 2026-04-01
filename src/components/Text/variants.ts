// ============================================
// Text Curried Variants — Depth 1 (zero CSS)
// Pre-configured Text via createText() factory.
// ============================================
import { createText } from "./Text";

// Base text variants
export const TextValue = createText({ variant: "value" });
export const TextLabel = createText({ variant: "label" });
export const TextTitle = createText({ variant: "title" });
export const TextBody = createText({ variant: "body" });
export const TextUnits = createText({ variant: "units" });
export const TextSublabel = createText({ variant: "sublabel" });

// Right-aligned sublabel — for counts/metadata in card corners
export const EndSublabel = createText({ variant: "sublabel", style: { "text-align": "right" } });

// Flex-filling label — title text that grows to fill available space
export const FlexLabel = createText({ variant: "label", style: { flex: "1" } });

// Nowrap text — inline formatted values that must not break
export const NowrapBody = createText({ variant: "body", as: "span", style: { "white-space": "nowrap" } });

// Color-shifted body text
export const MutedBody = createText({ variant: "body", color: "var(--text-muted, var(--jtf-text-muted, #64748b))" });
export const AccentBody = createText({ variant: "body", color: "var(--hud-accent, #00d4ff)" });

// Monospace value — for numeric readouts alongside units
export const MonoValue = createText({
  variant: "value",
  style: { "font-family": '"JetBrains Mono", "Fira Code", monospace' },
});

// Preformatted mono dump — for JSON/debug output beneath cards
export const MonoDump = createText({
  variant: "value",
  as: "pre",
  style: { "font-family": '"JetBrains Mono", "Fira Code", monospace', "font-size": "10px", "white-space": "pre", margin: "0" },
});

// Inline units — inherits font-size from parent, muted color, left margin
export const InlineUnits = createText({ variant: "sublabel", style: { "font-size": "inherit", "margin-left": "4px" } });

// Semantic heading — top-level page title, renders as <h1>
export const PageTitle = createText({ variant: "title", as: "h1" });

// Status-colored titles
export const InfoTitle = createText({ variant: "title", color: "#00d4ff" });
export const WarningTitle = createText({ variant: "title", color: "#ffcc00" });
export const SuccessTitle = createText({ variant: "title", color: "#00ff88" });
export const DangerTitle = createText({ variant: "title", color: "#ff0040" });

// ── Dashboard / game text roles ──

/** Large score readout — 3rem, tight line-height */
export const ScoreValue = createText({ variant: "value", as: "div", style: { "font-size": "3rem", "line-height": "1" } });

/** Multiplier readout — primary-colored, medium size */
export const MultiplierLabel = createText({ variant: "value", color: "var(--sui-color-primary, #00d4ff)", style: { "font-size": "1.25rem" } });

/** Monospace formula variable */
export const FormulaVar = createText({ variant: "value", style: { "font-family": "ui-monospace, monospace", "font-size": "1rem" } });

/** Centered hint/insight text */
export const HintText = createText({ variant: "sublabel", style: { "text-align": "center" } });
