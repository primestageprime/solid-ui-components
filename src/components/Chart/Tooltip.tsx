// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ChartTooltip — Structural (Depth 1). HTML overlay chart slot; composes no library components.
// Chart slot: Tooltip — HTML overlay anchored to the hovered X.
// Rendered via Solid <Portal> into Chart's overlay div, NOT into the SVG —
// HTML inside <svg><g> has zero layout (needs <foreignObject>), so the tooltip
// would be invisible. The overlay div is a position:absolute sibling of the SVG
// inside .sui-chart, so absolute coords (left/top) resolve against the chart.
import {
  type JSX,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";
import { observeSize } from "../../internal/dom/observeSize";
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
  /**
   * Cap the tooltip's width (px) and let its content wrap onto several lines.
   *
   * Omitted (the default), the tooltip is a single `nowrap` line — the look
   * CompletionTimeline and ThroughputChart are built around. Set it only for
   * inherently multi-line content (a title plus a timestamp range plus a
   * free-text message), where `nowrap` would render one enormous line.
   */
  maxWidth?: number;
  /**
   * Content for when `data` is empty and there is therefore no point to
   * describe — anchored to the hovered x itself rather than to a datum.
   *
   * Omit it (the default) and an empty series simply shows no tooltip. Supply
   * it when the tooltip carries more than the point readout: a chart can hold
   * hoverable annotations (alarm bands, timeline bars) that outlive its series,
   * and those must still explain themselves on a chart with no data.
   */
  fallback?: (dataX: number) => JSX.Element;
}

const nearest = <T,>(
  data: readonly T[],
  x: (d: T) => number,
  target: number,
): T | null => {
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

  // Rendered border-box width. Needed to keep the tooltip inside the chart:
  // where the anchor sits is known up front, how wide the content renders is
  // not. Zero until measured, which places the first frame at the preferred
  // spot — exactly where a zero-width tooltip belongs.
  const [tipWidth, setTipWidth] = createSignal(0);

  // `p` is null only when `data` is empty — `nearest` has no distance cutoff,
  // so any non-empty series always yields a point however far the cursor is.
  const point = createMemo(() => {
    const hx = ctx.hoverX();
    if (hx == null) return null;
    const p = nearest(props.data, props.x, hx);
    if (p == null && !props.fallback) return null;
    return { p, hx };
  });

  return (
    <Show when={point()}>
      {(pt) => {
        let el: HTMLDivElement | undefined;
        const measure = () => setTipWidth(el?.offsetWidth ?? 0);
        onMount(() => {
          measure();
          // Content can change without the anchor point changing (a consumer
          // render prop closing over its own hover signals), so a one-shot
          // measurement goes stale. Border-box, because offsetWidth is one —
          // a content-box observer never fires on a padding change.
          if (el) onCleanup(observeSize(el, measure, { box: "border-box" }));
        });

        // With no datum to sit beside (empty series + `fallback`), the hovered
        // x is the anchor — the tooltip then tracks the cursor.
        const anchorX = () => {
          const p = pt().p;
          const dataX = p == null ? pt().hx : props.x(p);
          return ctx.xScale()(dataX) + ctx.margin().left;
        };
        // Mirror of the py() clamp, in x. Preferred placement is offset to the
        // RIGHT of the anchor; when that overflows the chart the tooltip flips
        // to the left of the anchor instead, which reads better than sliding it
        // along the edge and keeps the anchor gap symmetric.
        const px = () => {
          const rightEdge = ctx.width();
          const preferred = anchorX() + offset().x;
          if (preferred + tipWidth() <= rightEdge) return preferred;
          const flipped = anchorX() - offset().x - tipWidth();
          if (flipped >= 0) return flipped;
          // Wider than the chart itself: pin to whichever edge loses less.
          return Math.max(0, rightEdge - tipWidth());
        };
        const py = () => {
          const baseTop = ctx.margin().top;
          const p = pt().p;
          if (!props.y || p == null) return baseTop + offset().y;
          // Anchor near the hovered point, then clamp to keep the tooltip inside
          // the plot region — never into the annotation lane (above plot) nor
          // below the x-axis baseline.
          const pointY = ctx.yScale()(props.y(p)) + baseTop + offset().y;
          const minTop = baseTop;
          const maxTop = baseTop + ctx.innerHeight();
          return Math.max(minTop, Math.min(maxTop, pointY));
        };
        return (
          <Portal mount={ctx.overlay.tooltipMount() ?? undefined}>
            <div
              ref={el}
              class="sui-chart__tooltip"
              classList={{
                "sui-chart__tooltip--wrap": props.maxWidth != null,
              }}
              style={{
                left: `${px()}px`,
                top: `${py()}px`,
                "--sui-chart-tooltip-max-width":
                  props.maxWidth == null ? undefined : `${props.maxWidth}px`,
              }}
            >
              {pt().p == null
                ? props.fallback?.(pt().hx)
                : props.children(pt().p as T, pt().hx)}
            </div>
          </Portal>
        );
      }}
    </Show>
  );
}
