// ============================================
// DragRangeSelect — Chart slot (Depth 2).
// Config-only consumer of context.dragRange (per spec D3 — the root
// <Chart> owns the pointer listener). Renders a visual band over the
// active drag range and fires `onRange` callbacks. Does NOT attach
// pointer listeners of its own.
// ============================================
import { Component, Show, createEffect, mergeProps } from "solid-js";
import { useChart } from "./context";

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
export type DragRangeSelectDataProps = Omit<DragRangeSelectProps, keyof DragRangeSelectOverrides>;

export const DragRangeSelect: Component<DragRangeSelectProps> = (props) => {
  const ctx = useChart();
  const merged = mergeProps(
    { minPixelDelta: 5, fill: "var(--sui-accent)", fillOpacity: 0.15 },
    props,
  );

  let lastCommitted: { start: number; end: number } | null = null;

  createEffect(() => {
    const range = ctx.dragRange();
    if (range == null) return;
    const xs = ctx.xScale();
    const pxDelta = Math.abs(xs(range.end) - xs(range.start));

    merged.onRangePreview?.(range.start, range.end);

    if (pxDelta >= merged.minPixelDelta) {
      if (
        lastCommitted === null ||
        lastCommitted.start !== range.start ||
        lastCommitted.end !== range.end
      ) {
        lastCommitted = { start: range.start, end: range.end };
        merged.onRange?.(range.start, range.end);
      }
    }
  });

  return (
    <Show when={ctx.dragRange()}>
      {(r) => {
        const xs = () => ctx.xScale();
        const x = () => Math.min(xs()(r().start), xs()(r().end));
        const w = () => Math.abs(xs()(r().end) - xs()(r().start));
        return (
          <g clip-path={ctx.clipPathUrl()}>
            <rect
              class={`sui-chart__drag-range${merged.class ? " " + merged.class : ""}`}
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
  return (props) => <DragRangeSelect {...mergeProps(defaults, props as DragRangeSelectProps)} />;
}
