// ============================================
// HighlightSegments — Chart slot (Depth 2).
// Renders rectangular highlight bands across an x-range. Consumer maps
// domain → `HighlightSegment` records; the slot is a pure renderer.
// ============================================
import { Component, For, mergeProps } from "solid-js";
import { useChart } from "./context";
import type { ClickHandler, HoverHandler, Id } from "./slot-types";

export interface HighlightSegment {
  id: Id;
  start: number;
  end: number;
  color: string;
  label?: string;
  opacity?: number;
}

export interface HighlightSegmentsProps<T extends HighlightSegment = HighlightSegment> {
  data: readonly T[];
  /** IDs currently selected (highlighted with extra emphasis). */
  selectedIds?: ReadonlySet<Id>;
  /** Default opacity for unselected segments. Default 0.18. */
  fillOpacity?: number;
  /** Pointer events. */
  onClick?: ClickHandler<T>;
  onHover?: HoverHandler<T>;
  class?: string;
}

export interface HighlightSegmentsOverrides {
  fillOpacity?: number;
  class?: string;
}
export type HighlightSegmentsDataProps<T extends HighlightSegment = HighlightSegment> =
  Omit<HighlightSegmentsProps<T>, keyof HighlightSegmentsOverrides>;

export function HighlightSegments<T extends HighlightSegment = HighlightSegment>(
  props: HighlightSegmentsProps<T>,
) {
  const ctx = useChart();
  const merged = mergeProps({ fillOpacity: 0.18 }, props);

  return (
    <g class={`sui-chart__highlight-segments${merged.class ? " " + merged.class : ""}`}>
      <For each={merged.data}>
        {(seg) => {
          const x1 = () => ctx.xScale()(seg.start);
          const x2 = () => ctx.xScale()(seg.end);
          const isSelected = () => merged.selectedIds?.has(seg.id) ?? false;
          return (
            <rect
              class="sui-chart__highlight-segment"
              data-id={seg.id}
              data-selected={isSelected() ? "true" : undefined}
              x={Math.min(x1(), x2())}
              y={0}
              width={Math.abs(x2() - x1())}
              height={ctx.innerHeight()}
              fill={seg.color}
              opacity={seg.opacity ?? (isSelected() ? Math.min(1, merged.fillOpacity * 2.5) : merged.fillOpacity)}
              onPointerDown={(e) => merged.onClick?.(seg, e)}
              onPointerEnter={(e) => merged.onHover?.(seg, e)}
              onPointerLeave={(e) => merged.onHover?.(null, e)}
              style={{ cursor: merged.onClick ? "pointer" : undefined }}
            />
          );
        }}
      </For>
    </g>
  );
}

export function createHighlightSegments<T extends HighlightSegment = HighlightSegment>(
  defaults: Partial<Omit<HighlightSegmentsProps<T>, "children">>,
): Component<HighlightSegmentsDataProps<T>> {
  return (props) => <HighlightSegments<T> {...mergeProps(defaults, props as HighlightSegmentsProps<T>)} />;
}
