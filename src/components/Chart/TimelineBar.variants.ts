// ============================================
// TimelineBar Curried Variants — explicit Component<…DataProps>
// annotations per ADR 0001 so vite-plugin-dts emits a self-contained
// .d.ts without leaking pnpm temp paths.
// ============================================
import type { Component } from "solid-js";
import { createTimelineBar } from "./TimelineBar";
import type { TimelineBarDatum, TimelineBarDataProps } from "./TimelineBar";

/** Dense — bars fill 90% of lane height; for tightly-packed schedule views. */
export const DenseTimelineBar: Component<TimelineBarDataProps<TimelineBarDatum>> =
  createTimelineBar<TimelineBarDatum>({ barHeight: 0.9 });

/** Sparse — bars fill 40% of lane height; for sparse "event" markers. */
export const SparseTimelineBar: Component<TimelineBarDataProps<TimelineBarDatum>> =
  createTimelineBar<TimelineBarDatum>({ barHeight: 0.4 });
