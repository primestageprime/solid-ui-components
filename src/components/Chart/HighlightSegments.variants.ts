// ============================================
// HighlightSegments Curried Variants — explicit Component<…DataProps>
// annotations per ADR 0001 (commit 3152ef7) so vite-plugin-dts emits a
// self-contained .d.ts without leaking pnpm temp paths.
// ============================================
import type { Component } from "solid-js";
import { createHighlightSegments } from "./HighlightSegments";
import type {
  HighlightSegment,
  HighlightSegmentsDataProps,
} from "./HighlightSegments";

/** Faint band (default opacity 0.12) — for non-emphatic backdrop highlights. */
export const FaintHighlightSegments: Component<HighlightSegmentsDataProps<HighlightSegment>> =
  createHighlightSegments<HighlightSegment>({ fillOpacity: 0.12 });

/** Accent band (opacity 0.22) — for the primary in-bounds highlight use. */
export const AccentHighlightSegments: Component<HighlightSegmentsDataProps<HighlightSegment>> =
  createHighlightSegments<HighlightSegment>({ fillOpacity: 0.22 });
