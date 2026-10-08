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
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { Portal } from "solid-js/web";
import { observeSize } from "../../internal/dom/observeSize";
import { useChart } from "./context";
import { chartToOverlay, placeTooltipX } from "./tooltipPlacement";

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
  /**
   * Milliseconds the pointer must rest on the plot before the tooltip first
   * opens. Once open it follows the pointer from point to point with no
   * further delay, and it closes the moment the pointer leaves the plot (the
   * next entry waits again).
   *
   * Omitted (0, the default), the tooltip opens on the first hover frame.
   * Set it for a large breakdown that would otherwise flash over the marks as
   * the pointer merely crosses the chart.
   */
  openDelay?: number;
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
  const openDelay = () => props.openDelay ?? 0;

  // `openDelay`: armed once the pointer has rested on the plot that long,
  // disarmed the moment it leaves. With no delay nothing is ever scheduled and
  // `open()` is true synchronously — every existing caller is unchanged.
  const [armed, setArmed] = createSignal(false);
  let armTimer: ReturnType<typeof setTimeout> | undefined;
  const stopArming = () => {
    if (armTimer !== undefined) clearTimeout(armTimer);
    armTimer = undefined;
  };
  createEffect(
    on(ctx.hoverX, (hx) => {
      if (openDelay() <= 0) return;
      if (hx == null) {
        stopArming();
        setArmed(false);
        return;
      }
      if (!armed() && armTimer === undefined) {
        armTimer = setTimeout(() => {
          armTimer = undefined;
          setArmed(true);
        }, openDelay());
      }
    }),
  );
  onCleanup(stopArming);
  const open = () => openDelay() <= 0 || armed();

  // Chart units -> overlay px. The svg's viewBox is the chart's width/height,
  // but CSS may draw it at any size (`responsive`, a fill frame), and the
  // overlay may hold a title above it — so measure both boxes at the moment
  // of placing. The svg is the overlay mount's sibling (Chart's JSX).
  const toOverlay = () => {
    const mount = ctx.overlay.tooltipMount();
    const svg = mount?.parentElement?.querySelector(":scope > svg");
    if (!mount || !svg) return { scale: 1, offsetX: 0, offsetY: 0 };
    return chartToOverlay({
      viewBoxWidth: ctx.width(),
      viewBoxHeight: ctx.height(),
      svgBox: svg.getBoundingClientRect(),
      overlayBox: mount.getBoundingClientRect(),
    });
  };

  // Rendered border-box width. Needed to keep the tooltip inside the chart:
  // where the anchor sits is known up front, how wide the content renders is
  // not. Zero until measured, which places the first frame at the preferred
  // spot — exactly where a zero-width tooltip belongs.
  const [tipWidth, setTipWidth] = createSignal(0);

  // `p` is null only when `data` is empty — `nearest` has no distance cutoff,
  // so any non-empty series always yields a point however far the cursor is.
  const point = createMemo(() => {
    const hx = ctx.hoverX();
    if (hx == null || !open()) return null;
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
        // One measurement per placement, shared by x and y.
        const t = createMemo(() => {
          pt();
          tipWidth();
          return toOverlay();
        });
        const anchorX = () => {
          const p = pt().p;
          const dataX = p == null ? pt().hx : props.x(p);
          return (
            t().offsetX + (ctx.xScale()(dataX) + ctx.margin().left) * t().scale
          );
        };
        // Mirror of the py() clamp, in x. Preferred placement is offset to the
        // RIGHT of the anchor; when that overflows the chart the tooltip flips
        // to the left of the anchor instead, which reads better than sliding it
        // along the edge and keeps the anchor gap symmetric.
        const px = () =>
          placeTooltipX({
            anchorX: anchorX(),
            tipWidth: tipWidth(),
            offsetX: offset().x,
            boundsLeft: t().offsetX,
            boundsRight: t().offsetX + ctx.width() * t().scale,
          });
        const py = () => {
          const baseTop = t().offsetY + ctx.margin().top * t().scale;
          const p = pt().p;
          if (!props.y || p == null) return baseTop + offset().y;
          // Anchor near the hovered point, then clamp to keep the tooltip inside
          // the plot region — never into the annotation lane (above plot) nor
          // below the x-axis baseline.
          const pointY =
            baseTop + ctx.yScale()(props.y(p)) * t().scale + offset().y;
          const minTop = baseTop;
          const maxTop = baseTop + ctx.innerHeight() * t().scale;
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
