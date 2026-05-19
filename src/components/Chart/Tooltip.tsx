// Chart slot: Tooltip — HTML overlay anchored to the hovered X.
// Rendered via Solid <Portal> into Chart's overlay div, NOT into the SVG —
// HTML inside <svg><g> has zero layout (needs <foreignObject>), so the tooltip
// would be invisible. The overlay div is a position:absolute sibling of the SVG
// inside .sui-chart, so absolute coords (left/top) resolve against the chart.
import { JSX, Show, createMemo } from "solid-js";
import { Portal } from "solid-js/web";
import { useChart } from "./context";

export interface ChartTooltipProps<T> {
  data: readonly T[];
  x: (d: T) => number;
  /** Render content for the nearest point. */
  children: (point: T, dataX: number) => JSX.Element;
  /** Pixel offset to shift tooltip from anchor. Default { x: 12, y: 0 }. */
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
  const offset = () => props.offset ?? { x: 12, y: 0 };

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
        const py = () => ctx.margin().top + offset().y;
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
