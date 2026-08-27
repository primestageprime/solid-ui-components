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
export const EndSublabel = createText({
  variant: "sublabel",
  style: { "text-align": "right" },
});

// Non-wrapping sublabel — trailing meta (icon + duration/name) that must
// stay one line while the leading text wraps
export const NoWrapSublabel = createText({
  variant: "sublabel",
  style: { "white-space": "nowrap" },
});

// Flex-filling label — title text that grows to fill available space
export const FlexLabel = createText({ variant: "label", style: { flex: "1" } });

// Single-line title that ellipsizes when it overflows. Use inside cards/rows
// where the title can be longer than the slot. Requires a flex parent.
export const EllipsizedTitle = createText({
  variant: "label",
  style: {
    flex: "1",
    "min-width": "0",
    "white-space": "nowrap",
    overflow: "hidden",
    "text-overflow": "ellipsis",
  },
});

// Nowrap text — inline formatted values that must not break
export const NowrapBody = createText({
  variant: "body",
  as: "span",
  style: { "white-space": "nowrap" },
});

// Nowrap label — single-line `label` variant for tight indicator rows
// (e.g. service name above a status trace) where wrapping would break layout.
export const NowrapLabel = createText({
  variant: "label",
  as: "span",
  style: { "white-space": "nowrap" },
});

// Faded nowrap sublabel — for inline secondary metadata (e.g. "age" / time-since
// readouts) that should stay on one line and recede visually.
export const FadedNowrapSublabel = createText({
  variant: "sublabel",
  as: "span",
  style: { "white-space": "nowrap", opacity: "0.75" },
});

// Color-shifted body text
export const MutedBody = createText({
  variant: "body",
  color: "var(--sui-text-muted)",
});
export const AccentBody = createText({
  variant: "body",
  color: "var(--sui-accent)",
});

// ── Compact data-display variants ──
// Used for tight chip/pivot/legend/cell typography where 1rem `label` text
// is too large. Pair `ChipLabel` (the key) with `CountText` (the trailing
// count) inside a `TightSpreadRow`.

/** Small bold key text (11px / 600) — pivot cell keys, legend swatch labels, chip titles. */
export const ChipLabel = createText({
  variant: "label",
  as: "span",
  style: { "font-size": "11px", "font-weight": "600", "line-height": "1.2" },
});

/** Single-line truncating `ChipLabel` — sized to fit any flex parent that
 *  supplies a constrained width. */
export const EllipsizedChipLabel = createText({
  variant: "label",
  as: "span",
  style: {
    "font-size": "11px",
    "font-weight": "600",
    "line-height": "1.2",
    "min-width": "0",
    overflow: "hidden",
    "white-space": "nowrap",
    "text-overflow": "ellipsis",
  },
});

/** Small muted count/meta text (10px) — the trailing-count companion to
 *  `ChipLabel`. */
export const CountText = createText({
  variant: "sublabel",
  as: "span",
  style: { "font-size": "10px", color: "var(--sui-text-muted)" },
});

// Monospace value — for numeric readouts alongside units
export const MonoValue = createText({
  variant: "value",
  style: { "font-family": '"JetBrains Mono", "Fira Code", monospace' },
});

// Preformatted mono dump — for JSON/debug output beneath cards
export const MonoDump = createText({
  variant: "value",
  as: "pre",
  style: {
    "font-family": '"JetBrains Mono", "Fira Code", monospace',
    "font-size": "10px",
    "white-space": "pre",
    margin: "0",
  },
});

// Mono meta text (11px monospace, muted) — panel subtitles, tiny section
// labels, footnotes beside data readouts. The library-side home for what the
// dev-only `.text-meta` showcase class provided; library components must not
// depend on that class (it doesn't exist for consumers).
export const MonoMeta = createText({
  variant: "sublabel",
  style: { "font-size": "11px", "font-family": "var(--sui-font-mono)" },
});

// Danger-tinted body text — inline error reasons in detail panels.
export const DangerBody = createText({
  variant: "body",
  color: "var(--sui-danger)",
});

// Warning-tinted body text — inline caution notes (non-destructive).
export const WarningBody = createText({
  variant: "body",
  color: "var(--sui-warning)",
});

// Success-tinted body text — inline confirmation / healthy-state notes.
export const SuccessBody = createText({
  variant: "body",
  color: "var(--sui-success)",
});

// Highlight-tinted body text — flag a notable in-cell/inline VALUE (e.g. a
// non-zero remaining-gap count) without implying an error/caution/success
// severity. Uses `tone` (not `color`) so it stays in the shared Tone system.
export const HighlightBody = createText({
  variant: "body",
  tone: "highlight",
});

// Emphasized body — inline bold (600) accentuation inside table cells and
// labels where a word/value must stand out without changing typographic role.
export const EmphasisBody = createText({
  variant: "body",
  as: "span",
  style: { "font-weight": "600" },
});

// Accent-emphasized body — bold (600), accent-colored inline counts/values.
export const AccentEmphasisBody = createText({
  variant: "body",
  as: "span",
  color: "var(--sui-accent)",
  style: { "font-weight": "600" },
});

// Italic note — parenthetical default/fallback annotation beside a value.
export const NoteText = createText({
  variant: "sublabel",
  as: "span",
  style: { "font-style": "italic" },
});

// Danger-tinted small caption — compact inline error text beside a control.
export const DangerSublabel = createText({
  variant: "sublabel",
  color: "var(--sui-danger)",
  as: "span",
});

// Uppercase section caption (secondary tone) above a table / card group.
export const CaptionLabel = createText({
  variant: "label",
  color: "var(--sui-text-secondary)",
  style: {
    "font-size": "0.9rem",
    "text-transform": "uppercase",
    "letter-spacing": "0.5px",
  },
});

// Uppercase accent caption — settings-style column headings.
export const AccentCaptionLabel = createText({
  variant: "label",
  color: "var(--sui-accent)",
  style: {
    "font-size": "0.85rem",
    "text-transform": "uppercase",
    "letter-spacing": "0.08em",
  },
});

// Inline units — inherits font-size from parent, muted color, left margin
export const InlineUnits = createText({
  variant: "sublabel",
  style: { "font-size": "inherit", "margin-left": "4px" },
});

// Semantic headings — h1/h2/h3, all use the `title` variant for typography
// and let the consumer pick the right semantic level for their document tree.
export const PageTitle = createText({ variant: "title", as: "h1" });
export const SectionTitle = createText({ variant: "title", as: "h2" });
export const SubsectionTitle = createText({ variant: "title", as: "h3" });
export const TopicTitle = createText({ variant: "title", as: "h4" });

// Status-colored titles
export const InfoTitle = createText({
  variant: "title",
  color: "var(--sui-accent)",
});
export const WarningTitle = createText({
  variant: "title",
  color: "var(--sui-warning, #ffcc00)",
});
export const SuccessTitle = createText({
  variant: "title",
  color: "var(--sui-success)",
});
export const DangerTitle = createText({
  variant: "title",
  color: "var(--sui-danger)",
});

// Status-colored small value readouts — for compact in-cell numeric values
// where color carries compliance state. Sized down from the default value
// variant so they sit comfortably inside table rows / cards.
export const TextValueSuccessSm = createText({
  variant: "value",
  color: "var(--sui-success)",
  style: { "font-size": "0.85rem" },
});
export const TextValueDangerSm = createText({
  variant: "value",
  color: "var(--sui-danger)",
  style: { "font-size": "0.85rem" },
});

// Flag a compact in-cell value as notable (Tone vocabulary — see Text's
// `tone` prop / src/types.ts). Same size class as the Success/Danger Sm
// siblings above; uses `tone` rather than a literal `color` so the value
// stays in the shared Tone system (ruled 2026-07-17) instead of a one-off
// color string. E.g. a table's remaining-gap cell going non-zero:
// `<TextValueHighlightSm>{`${remaining} (${pct}%)`}</TextValueHighlightSm>`.
export const TextValueHighlightSm = createText({
  variant: "value",
  tone: "highlight",
  style: { "font-size": "0.85rem" },
});

// ── Dashboard / game text roles ──

/** Large score readout — 3rem, tight line-height */
export const ScoreValue = createText({
  variant: "value",
  as: "div",
  style: { "font-size": "3rem", "line-height": "1" },
});

/** Multiplier readout — primary-colored, medium size */
export const MultiplierLabel = createText({
  variant: "value",
  color: "var(--sui-accent)",
  style: { "font-size": "1.25rem" },
});

/** Monospace formula variable */
export const FormulaVar = createText({
  variant: "value",
  style: { "font-family": "ui-monospace, monospace", "font-size": "1rem" },
});

/** Centered hint/insight text */
export const HintText = createText({
  variant: "sublabel",
  style: { "text-align": "center" },
});
