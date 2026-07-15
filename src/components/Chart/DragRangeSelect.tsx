// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// DragRangeSelect — Structural (Depth 1). SVG chart slot; composes no library components.
// Config-only consumer of context.drag.range — the root <Chart> owns the
// pointer listener, so this slot deliberately attaches none of its own
// (would clobber dispatch).
import { type Component, Show, createEffect, mergeProps } from "solid-js";
import { useChart } from "./context";
import type { DragRange } from "./context";

export interface DragRangeSelectProps {
  /** Fires when the user finishes a drag whose pixel span exceeds `minPixelDelta`. */
  onRange?: (start: number, end: number) => void;
  /** Live preview callback — fires for every change of the active drag range. */
  onRangePreview?: (start: number, end: number) => void;
  /** Minimum pixel distance before `onRange` is considered a real selection. Default 5. */
  minPixelDelta?: number;
  /** Visual band fill. Default 'var(--sui-accent)'. */
  fill?: string;
  /** Visual band fill opacity. Default 0.15. */
  fillOpacity?: number;
  class?: string;
}

export interface DragRangeSelectOverrides {
  minPixelDelta?: number;
  fill?: string;
  fillOpacity?: number;
  class?: string;
}
export type DragRangeSelectDataProps = Omit<
  DragRangeSelectProps,
  keyof DragRangeSelectOverrides
>;

export const DragRangeSelect: Component<DragRangeSelectProps> = (props) => {
  const ctx = useChart();
  const merged = mergeProps(
    { minPixelDelta: 5, fill: "var(--sui-accent)", fillOpacity: 0.15 },
    props,
  );

  let lastCommitted: DragRange | null = null;

  // Live preview: fires on every drag.range change while the pointer is held.
  // The visual band (below) renders from the same live signal.
  createEffect(() => {
    const range = ctx.drag.range();
    if (range == null) return;
    merged.onRangePreview?.(range.start, range.end);
  });

  // Commit: fires ONLY when a drag completes (pointerup). The Chart root
  // pulses `drag.committed` once per drag; the `lastCommitted` guard
  // dedupes if downstream reactivity re-runs the effect with the same value.
  createEffect(() => {
    const committed = ctx.drag.committed();
    if (committed == null) return;
    const xs = ctx.xScale();
    const pxDelta = Math.abs(xs(committed.end) - xs(committed.start));
    if (pxDelta < merged.minPixelDelta) return;
    if (
      lastCommitted !== null &&
      lastCommitted.start === committed.start &&
      lastCommitted.end === committed.end
    ) {
      return;
    }
    lastCommitted = { start: committed.start, end: committed.end };
    merged.onRange?.(committed.start, committed.end);
  });

  return (
    <Show when={ctx.drag.range()}>
      {(r) => {
        const xs = () => ctx.xScale();
        const x = () => Math.min(xs()(r().start), xs()(r().end));
        const w = () => Math.abs(xs()(r().end) - xs()(r().start));
        return (
          <g clip-path={ctx.clip.plotPathUrl()}>
            <rect
              class={`sui-chart__drag-range${merged.class ? ` ${merged.class}` : ""}`}
              x={x()}
              y={0}
              width={w()}
              height={ctx.innerHeight()}
              fill={merged.fill}
              fill-opacity={merged.fillOpacity}
              pointer-events="none"
            />
          </g>
        );
      }}
    </Show>
  );
};

export function createDragRangeSelect(
  defaults: Partial<Omit<DragRangeSelectProps, "children">>,
): Component<DragRangeSelectDataProps> {
  return (props) => (
    <DragRangeSelect {...mergeProps(defaults, props as DragRangeSelectProps)} />
  );
}
