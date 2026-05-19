// ============================================
// Chart context — shared scales/dims for slot children.
// ============================================
import { Accessor, createContext, useContext } from "solid-js";
import { Scale } from "./scales";
import type { Id } from "./slot-types";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Drag selection in DATA-domain units. */
export interface DragRange {
  start: number;
  end: number;
}

/**
 * Drag-selection subsystem.
 *
 * `range` updates continuously while the pointer is held. `committed` pulses
 * once on pointerup at the end of a drag and stays until the consumer (or the
 * next drag start) clears it — slots like `DragRangeSelect` listen to it to
 * fire commit-only callbacks (`onRange`) without echoing every move.
 */
export interface ChartDragContext {
  range: Accessor<DragRange | null>;
  setRange: (range: DragRange | null) => void;
  committed: Accessor<DragRange | null>;
  setCommitted: (range: DragRange | null) => void;
}

/**
 * Chart-wide "nearest emphasis" coordinator. Slots that participate in
 * `emphasizeNearestX` report their currently-nearest candidate's distance to
 * `hoverX` (in DATA-domain units) via `report`. The coordinator picks the
 * single global minimum and exposes its `slotId` via `winnerId`. Slots gate
 * their visual emphasis on the winner equality so only ONE slot in the chart
 * emphasizes at a time.
 *
 * Slots withdraw via `clear` when `emphasizeNearestX` is off, `hoverX` is
 * null, the slot has no data, or the slot unmounts.
 */
export interface ChartEmphasisContext {
  report: (slotId: Id, distance: number) => void;
  clear: (slotId: Id) => void;
  winnerId: Accessor<Id | null>;
}

/**
 * Clip-path URLs (`url(#<id>)`) defined by the Chart root.
 *
 * - `plotPathUrl` — plot-area clip. Data slots opt-in by wrapping rendered
 *   content in `<g clip-path={ctx.clip.plotPathUrl()}>`. Axes/labels/
 *   ReferenceLine intentionally skip clipping so they can render at or just
 *   past the inner-plot edge.
 * - `axisStripPathUrl` — bottom-margin clip covering `x ∈ [0, innerWidth]`,
 *   `y ∈ [innerHeight, innerHeight + margin.bottom]` in plot-local coords.
 *   Use for slots that render BELOW the axis (e.g. a timeline strip anchored
 *   via `bandY.anchor === "margin-bottom"`) so they stay horizontally clipped
 *   to the plot area while extending vertically into the bottom margin.
 */
export interface ChartClipContext {
  plotPathUrl: Accessor<string>;
  axisStripPathUrl: Accessor<string>;
}

/** Portal-style overlay mounts owned by the Chart root. */
export interface ChartOverlayContext {
  /** Mount node for portal-style overlays (e.g. ChartTooltip). */
  tooltipMount: Accessor<HTMLElement | null>;
  setTooltipMount: (el: HTMLElement | null) => void;
}

export interface ChartContextValue {
  // ---- Geometry / scales ----
  width: Accessor<number>;
  height: Accessor<number>;
  margin: Accessor<Margin>;
  innerWidth: Accessor<number>;
  innerHeight: Accessor<number>;
  xScale: Accessor<Scale>;
  yScale: Accessor<Scale>;

  // ---- Pointer ----
  /** Hover x-position in DATA domain, or null when not hovering. */
  hoverX: Accessor<number | null>;
  setHoverX: (x: number | null) => void;

  // ---- Namespaced subsystems ----
  drag: ChartDragContext;
  emphasis: ChartEmphasisContext;
  clip: ChartClipContext;
  overlay: ChartOverlayContext;
}

export const ChartContext = createContext<ChartContextValue>();

export const useChart = (): ChartContextValue => {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("Chart child component used outside <Chart>");
  }
  return ctx;
};
