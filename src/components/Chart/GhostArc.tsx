// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// pointer-events=none so the arc (a preview-only affordance) never
// intercepts clicks intended for the slots beneath it.
import { type Component, Show, mergeProps } from "solid-js";
import { useChart } from "./context";

export interface ArcPoint {
  x: number | Date;
  /**
   * Data-domain y value. Ignored when `anchor === "above"` — the
   * caller may pass `0` (or any value) as a placeholder.
   */
  y: number;
}

export type GhostArcAnchor = "data" | "above";

export interface GhostArcProps {
  /** Arc start point in data domain. Null hides the arc. */
  from: ArcPoint | null;
  /** Arc end point in data domain. Null hides the arc. */
  to: ArcPoint | null;
  /**
   * Where to anchor the arc vertically.
   *   - `"data"` (default) — endpoints use their `y` in data domain,
   *     curve arches inside the plot, clipped to the plot path.
   *   - `"above"` — endpoints + apex live in the chart's annotation lane
   *     when one is configured (see `<Chart annotationLaneHeight>`);
   *     otherwise endpoints sit at y=0 with the apex arching up into
   *     the top margin unclipped. Either way the arc stays out of the
   *     plot-data region.
   */
  anchor?: GhostArcAnchor;
  /** Stroke color. Default 'var(--sui-accent)'. */
  color?: string;
  /** Stroke opacity. Default 0.5. */
  opacity?: number;
  /** Stroke width. Default 1.5. */
  strokeWidth?: number;
  /** Dash pattern. Default "4 3". */
  strokeDasharray?: string;
  /** Curvature factor (0 = straight line, 1 = strong arc). Default 0.3. */
  curvature?: number;
  class?: string;
}

export interface GhostArcOverrides {
  anchor?: GhostArcAnchor;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string;
  curvature?: number;
  class?: string;
}
export type GhostArcDataProps = Omit<GhostArcProps, keyof GhostArcOverrides>;

const toScalar = (v: number | Date): number =>
  v instanceof Date ? v.getTime() : v;

export const GhostArc: Component<GhostArcProps> = (props) => {
  const ctx = useChart();
  const merged = mergeProps(
    {
      anchor: "data" as GhostArcAnchor,
      color: "var(--sui-accent)",
      opacity: 0.5,
      strokeWidth: 1.5,
      strokeDasharray: "4 3",
      curvature: 0.3,
    },
    props,
  );

  return (
    <Show when={merged.from != null && merged.to != null}>
      {(() => {
        const f = merged.from!;
        const t = merged.to!;
        const isAbove = () => merged.anchor === "above";
        // When the chart hosts an annotation lane and we're in "above"
        // mode, anchor the endpoints at the vertical center of the lane.
        // No lane configured → fall back to y=0 (legacy "above" behavior:
        // endpoints sit at the top of the plot and the apex floats up
        // into the top margin).
        const laneEndpointY = () => {
          const h = ctx.annotationLaneHeight();
          return h > 0 ? -h / 2 : 0;
        };
        const x1 = () => ctx.xScale()(toScalar(f.x));
        const x2 = () => ctx.xScale()(toScalar(t.x));
        const y1 = () => (isAbove() ? laneEndpointY() : ctx.yScale()(f.y));
        const y2 = () => (isAbove() ? laneEndpointY() : ctx.yScale()(t.y));
        // Bezier apex (control point) y. Inside an annotation lane the
        // apex is clamped near the TOP of the lane so the arc lifts off
        // the endpoints without escaping the band. Without a lane (or
        // in "data" mode) the legacy curvature-based lift applies.
        const apexY = (ay: number, by: number, dx: number) => {
          const lift = Math.abs(dx) * merged.curvature;
          if (isAbove()) {
            const h = ctx.annotationLaneHeight();
            if (h > 0) {
              // Lane top sits at y = -h. Apex floats 4px below the top
              // edge so the arc has visible breathing room; never above
              // the lane.
              return Math.max(-h + 4, Math.min(ay, by) - lift);
            }
          }
          return Math.min(ay, by) - lift;
        };
        const d = () => {
          const ax = x1();
          const ay = y1();
          const bx = x2();
          const by = y2();
          const mx = (ax + bx) / 2;
          const my = apexY(ay, by, bx - ax);
          return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
        };
        // "above" + annotation lane → clip to the lane so the arc is
        // horizontally bounded to the plot but free to occupy the full
        // band vertically.
        // "above" + no lane → unclipped (legacy: apex above y=0 visible).
        // "data" → clipped to the plot.
        const clip = () => {
          if (!isAbove()) return ctx.clip.plotPathUrl();
          return ctx.annotationLaneHeight() > 0
            ? ctx.clip.annotationLanePathUrl()
            : undefined;
        };
        return (
          <g clip-path={clip()}>
            {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: decorative SVG chrome; <path> has no tabindex/handlers and is not actually focusable */}
            <path
              class={`sui-chart__ghost-arc${merged.class ? ` ${merged.class}` : ""}`}
              d={d()}
              fill="none"
              stroke={merged.color}
              stroke-width={merged.strokeWidth}
              stroke-dasharray={merged.strokeDasharray}
              opacity={merged.opacity}
              pointer-events="none"
              aria-hidden="true"
            />
          </g>
        );
      })()}
    </Show>
  );
};

export function createGhostArc(
  defaults: Partial<Omit<GhostArcProps, "children">>,
): Component<GhostArcDataProps> {
  return (props) => (
    <GhostArc {...mergeProps(defaults, props as GhostArcProps)} />
  );
}
