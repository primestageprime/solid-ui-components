// Defaults to pointer-events=none so the arc never intercepts clicks on
// slots beneath it (a preview connection must not block its targets).
//
// `anchor` selects how the arc's y-coords are interpreted:
//   - "data" (default): both endpoints' `y` are read in data domain — the
//     arc arches through the plot region. Clipped by the plot path so the
//     curve never escapes the inner box.
//   - "above": both endpoints' `y` are IGNORED — the arc anchors at y=0
//     (top of inner plot) at each timestamp and arches UP into the top
//     margin. NOT clipped to the plot path so the apex can sit above the
//     plot. Use when the arc represents a temporal relationship rather
//     than a value-space relationship (e.g. "pin A caused edge B" arching
//     in the chart's top margin).
import { Component, Show, mergeProps } from "solid-js";
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
   *   - `"above"` — endpoints sit at the top of the inner plot
   *     (y=0 in plot-local coords), curve arches UP into the top
   *     margin; not clipped so the apex is visible.
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

const toScalar = (v: number | Date): number => (v instanceof Date ? v.getTime() : v);

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
        const x1 = () => ctx.xScale()(toScalar(f.x));
        const x2 = () => ctx.xScale()(toScalar(t.x));
        // "above" pins both endpoints to y=0 in plot-local coords (top of
        // inner plot). "data" reads each endpoint's `y` through the y-scale.
        const y1 = () => (isAbove() ? 0 : ctx.yScale()(f.y));
        const y2 = () => (isAbove() ? 0 : ctx.yScale()(t.y));
        const d = () => {
          const ax = x1();
          const ay = y1();
          const bx = x2();
          const by = y2();
          const mx = (ax + bx) / 2;
          // Lift the midpoint above (smaller y in SVG space) by curvature * |dx|.
          // In "above" mode this lifts the apex UP into the top margin.
          const my = Math.min(ay, by) - Math.abs(bx - ax) * merged.curvature;
          return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
        };
        // "above" mode intentionally bypasses the plot clip so the arc's
        // apex (which sits ABOVE y=0) is visible in the top margin.
        const clip = () => (isAbove() ? undefined : ctx.clip.plotPathUrl());
        return (
          <g clip-path={clip()}>
            <path
              class={`sui-chart__ghost-arc${merged.class ? " " + merged.class : ""}`}
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
  return (props) => <GhostArc {...mergeProps(defaults, props as GhostArcProps)} />;
}
