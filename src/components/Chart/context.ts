// ============================================
// Chart context — shared scales/dims for slot children.
// ============================================
import { Accessor, createContext, useContext } from "solid-js";
import { Scale } from "./scales";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartContextValue {
  width: Accessor<number>;
  height: Accessor<number>;
  margin: Accessor<Margin>;
  innerWidth: Accessor<number>;
  innerHeight: Accessor<number>;
  xScale: Accessor<Scale>;
  yScale: Accessor<Scale>;
  /** Hover x-position in DATA domain, or null when not hovering. */
  hoverX: Accessor<number | null>;
  setHoverX: (x: number | null) => void;
  /** Currently-active drag selection in DATA-domain units, or null when no drag. */
  dragRange: Accessor<{ start: number; end: number } | null>;
  setDragRange: (range: { start: number; end: number } | null) => void;
  /**
   * Pulses on pointerup at the end of a drag. Distinct from `dragRange` —
   * `dragRange` updates continuously while the pointer is held; this signal
   * is set ONCE per completed drag and stays until the consumer (or the next
   * drag start) clears it. Slots like `DragRangeSelect` listen to this to
   * fire commit-only callbacks (`onRange`) without echoing every move.
   */
  committedDragRange: Accessor<{ start: number; end: number } | null>;
  setCommittedDragRange: (range: { start: number; end: number } | null) => void;
  /** Mount node for portal-style overlays (e.g. ChartTooltip). Set by Chart root. */
  tooltipMount: Accessor<HTMLElement | null>;
  setTooltipMount: (el: HTMLElement | null) => void;
  /**
   * `url(#<id>)` reference for the plot-area clipPath defined by the Chart
   * root. Data slots opt-in by wrapping their rendered content in
   * `<g clip-path={ctx.clipPathUrl()}>`. Axes/labels/ReferenceLine intentionally
   * skip clipping so they can render at or just past the inner-plot edge.
   */
  clipPathUrl: Accessor<string>;
  /**
   * `url(#<id>)` reference for the bottom-margin clipPath defined by the
   * Chart root. Covers `x ∈ [0, innerWidth]`, `y ∈ [innerHeight, innerHeight
   * + margin.bottom]` in plot-local coords — i.e. the strip just below the
   * x-axis. Use for slots that render BELOW the axis (e.g. a timeline strip
   * anchored via `bandY="margin-bottom"`) so they stay horizontally clipped
   * to the plot area while extending vertically into the bottom margin.
   */
  axisStripClipPathUrl: Accessor<string>;
  /**
   * Chart-wide "nearest emphasis" coordinator. Slots that participate in
   * `emphasizeNearestX` report their currently-nearest candidate's distance
   * to `hoverX` (in DATA-domain units) via `reportEmphasisCandidate`. The
   * coordinator picks the single global minimum and exposes its `slotId`
   * via `emphasisWinnerSlotId`. Slots gate their visual emphasis on the
   * winner equality so only ONE slot in the chart emphasizes at a time.
   *
   * Slots withdraw via `clearEmphasisCandidate` when `emphasizeNearestX` is
   * off, `hoverX` is null, the slot has no data, or the slot unmounts.
   */
  reportEmphasisCandidate: (slotId: string, distance: number) => void;
  clearEmphasisCandidate: (slotId: string) => void;
  emphasisWinnerSlotId: Accessor<string | null>;
}

export const ChartContext = createContext<ChartContextValue>();

export const useChart = (): ChartContextValue => {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("Chart child component used outside <Chart>");
  }
  return ctx;
};
