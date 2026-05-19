// Defaults to pointer-events=none so the arc never intercepts clicks on
// slots beneath it (a preview connection must not block its targets).
import { Component, Show, mergeProps } from "solid-js";
import { useChart } from "./context";

export interface ArcPoint {
  x: number | Date;
  y: number;
}

export interface GhostArcProps {
  /** Arc start point in data domain. Null hides the arc. */
  from: ArcPoint | null;
  /** Arc end point in data domain. Null hides the arc. */
  to: ArcPoint | null;
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
        const x1 = () => ctx.xScale()(toScalar(f.x));
        const y1 = () => ctx.yScale()(f.y);
        const x2 = () => ctx.xScale()(toScalar(t.x));
        const y2 = () => ctx.yScale()(t.y);
        const d = () => {
          const ax = x1();
          const ay = y1();
          const bx = x2();
          const by = y2();
          const mx = (ax + bx) / 2;
          // Lift the midpoint above (smaller y in SVG space) by curvature * |dx|.
          const my = Math.min(ay, by) - Math.abs(bx - ax) * merged.curvature;
          return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
        };
        return (
          <g clip-path={ctx.clipPathUrl()}>
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
