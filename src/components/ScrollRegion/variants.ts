import type { Component } from "solid-js";
import { createScrollRegion } from "./ScrollRegion";
import type { ScrollRegionProps } from "./ScrollRegion";

// Explicit Component<ScrollRegionProps> annotations keep the shipped .d.ts
// portable across pnpm/github-dep installs (avoids vite-plugin-dts inlining
// solid-js paths through the ephemeral build store — TS2742/TS2305 downstream).
//
// These are OPTIONAL convenience presets, not behaviour changes. The base
// ScrollRegion is height-agnostic (fills its flex parent); these presets only
// bake a `max-height` on the scroll viewport for callers who want a bounded box
// and do NOT have a sizing flex parent. The viewport (`overflow-y: auto`) caps
// at the max-height and scrolls; the dynamic fade logic is untouched. Prefer the
// base ScrollRegion in flex layouts.

/** Bounded box, viewport caps at ~240px tall. Convenience for non-flex contexts. */
export const ScrollRegionMd: Component<ScrollRegionProps> = createScrollRegion({
  style: { "max-height": "240px" },
});

/** Bounded box, viewport caps at ~360px tall. Convenience for non-flex contexts. */
export const ScrollRegionLg: Component<ScrollRegionProps> = createScrollRegion({
  style: { "max-height": "360px" },
});
