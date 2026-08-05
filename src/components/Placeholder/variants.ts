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

/** Expands to fill its container, multi-line / tall — an open block with no
 *  natural height of its own, so it grows to fill remaining space in a flex
 *  column. Paragraphs, content areas, detail panes. */
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

// ── Square tile presets (fixed width AND height — a fixed aspect ratio) ──────

/** 60px square tile — a small fixed-aspect slot (e.g. an avatar). */
export const SmallSquarePlaceholder: Component<PlaceholderDataProps> =
  createPlaceholder({ size: "sm", square: true });

/** 120px square tile — a thumbnail slot. */
export const MediumSquarePlaceholder: Component<PlaceholderDataProps> =
  createPlaceholder({ size: "md", square: true });

/** 200px square tile — a large fixed-aspect preview slot. */
export const LargeSquarePlaceholder: Component<PlaceholderDataProps> =
  createPlaceholder({ size: "lg", square: true });
