// Curried Placeholder variants — the correct call-site form (shape baked in).
import type { Component } from "solid-js";
import { createPlaceholder, type PlaceholderDataProps } from "./Placeholder";

// ── Kind variants (composition pieces) — describe how a slot behaves ──────────

/** Shrinkwraps to its label, single line. Chips, tags, buttons, short labels. */
export const FitPlaceholder: Component<PlaceholderDataProps> = createPlaceholder({
  fit: true,
  multiline: false,
});

/** Expands to fill its container, single line. A full-width bar / input. */
export const FillPlaceholder: Component<PlaceholderDataProps> = createPlaceholder(
  { fit: false, multiline: false },
);

/** Expands to fill its container, multi-line / tall. Paragraphs, content areas. */
export const BlockPlaceholder: Component<PlaceholderDataProps> = createPlaceholder(
  { fit: false, multiline: true },
);

// ── Tile size presets (fill width, fixed min-height) ──────────────────────────

/** 60px min-height tile. */
export const SmallPlaceholder: Component<PlaceholderDataProps> = createPlaceholder(
  { size: "sm" },
);

/** 120px min-height tile — KPI/metric tiles. */
export const MediumPlaceholder: Component<PlaceholderDataProps> =
  createPlaceholder({ size: "md" });

/** 200px min-height tile — chart/table tiles. */
export const LargePlaceholder: Component<PlaceholderDataProps> = createPlaceholder(
  { size: "lg" },
);
