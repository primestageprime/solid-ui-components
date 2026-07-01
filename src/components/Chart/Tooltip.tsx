// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Chart slot: Tooltip — HTML overlay anchored to the hovered X.
// Rendered via Solid <Portal> into Chart's overlay div, NOT into the SVG —
// HTML inside <svg><g> has zero layout (needs <foreignObject>), so the tooltip
// would be invisible. The overlay div is a position:absolute sibling of the SVG
// inside .sui-chart, so absolute coords (left/top) resolve against the chart.
import { type JSX, Show, createMemo } from "solid-js";
import { Portal } from "solid-js/web";
import { useChart } from "./context";

export interface ChartTooltipProps<T> {
  data: readonly T[];
  x: (d: T) => number;
  /**
   * Optional y accessor. When provided, the tooltip's vertical position
   * tracks the hovered point's y in screen coords (anchored just above it)
   * instead of being pinned to the top of the plot. Clamped so the tooltip
   * never enters the annotation lane (top-margin band reserved for pins
   * and ghost arcs).
   */
  y?: (d: T) => number;
  /** Render content for the nearest point. */
  children: (point: T, dataX: number) => JSX.Element;
  /** Pixel offset to shift tooltip from anchor. Default { x: 12, y: -12 }. */
  offset?: { x: number; y: number };
}

const nearest = <T,>(data: readonly T[], x: (d: T) => number, target: number): T | null => {
  if (data.length === 0) return null;
  let best: T | null = null;
  let bestDist = Infinity;
  for (const d of data) {
    const dist = Math.abs(x(d) - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
};

export function ChartTooltip<T>(props: ChartTooltipProps<T>) {
  const ctx = useChart();
  const offset = () => props.offset ?? { x: 12, y: -12 };

  const point = createMemo(() => {
    const hx = ctx.hoverX();
    if (hx == null) return null;
    const p = nearest(props.data, props.x, hx);
    return p == null ? null : { p, hx };
  });

  return (
    <Show when={point()}>
      {(pt) => {
        const px = () => ctx.xScale()(props.x(pt().p)) + ctx.margin().left + offset().x;
        const py = () => {
          const baseTop = ctx.margin().top;
          if (!props.y) return baseTop + offset().y;
          // Anchor near the hovered point, then clamp to keep the tooltip inside
          // the plot region — never into the annotation lane (above plot) nor
          // below the x-axis baseline.
          const pointY = ctx.yScale()(props.y(pt().p)) + baseTop + offset().y;
          const minTop = baseTop;
          const maxTop = baseTop + ctx.innerHeight();
          return Math.max(minTop, Math.min(maxTop, pointY));
        };
        return (
          <Portal mount={ctx.overlay.tooltipMount() ?? undefined}>
            <div
              class="sui-chart__tooltip"
              style={{
                left: `${px()}px`,
                top: `${py()}px`,
              }}
            >
              {props.children(pt().p, pt().hx)}
            </div>
          </Portal>
        );
      }}
    </Show>
  );
}
