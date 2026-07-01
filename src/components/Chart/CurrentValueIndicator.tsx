// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Pure slot — no internal state; consumer controls the point.
import { type Component, Show, mergeProps } from "solid-js";
import { useChart } from "./context";

export interface CurrentValue {
  x: number;
  y: number;
  label?: string;
}

export interface CurrentValueIndicatorProps {
  point: CurrentValue | null;
  /** Dot radius in px. Default 4. */
  radius?: number;
  /** Dot color. Default 'var(--sui-accent)'. */
  color?: string;
  /** Label offset in px from the dot. Default { x: 8, y: -4 }. */
  labelOffset?: { x: number; y: number };
  class?: string;
}

export interface CurrentValueIndicatorOverrides {
  radius?: number;
  color?: string;
  labelOffset?: { x: number; y: number };
  class?: string;
}
export type CurrentValueIndicatorDataProps = Omit<
  CurrentValueIndicatorProps,
  keyof CurrentValueIndicatorOverrides
>;

export const CurrentValueIndicator: Component<CurrentValueIndicatorProps> = (
  props,
) => {
  const ctx = useChart();
  const merged = mergeProps(
    { radius: 4, color: "var(--sui-accent)", labelOffset: { x: 8, y: -4 } },
    props,
  );
  return (
    <Show when={merged.point}>
      {(p) => (
        <g
          class={`sui-chart__current-value${merged.class ? ` ${merged.class}` : ""}`}
          clip-path={ctx.clip.plotPathUrl()}
        >
          <circle
            cx={ctx.xScale()(p().x)}
            cy={ctx.yScale()(p().y)}
            r={merged.radius}
            fill={merged.color}
          />
          <Show when={p().label}>
            <text
              class="sui-chart__current-value-label"
              x={ctx.xScale()(p().x) + merged.labelOffset.x}
              y={ctx.yScale()(p().y) + merged.labelOffset.y}
            >
              {p().label}
            </text>
          </Show>
        </g>
      )}
    </Show>
  );
};

export function createCurrentValueIndicator(
  defaults: Partial<Omit<CurrentValueIndicatorProps, "children">>,
): Component<CurrentValueIndicatorDataProps> {
  return (props) => (
    <CurrentValueIndicator
      {...mergeProps(defaults, props as CurrentValueIndicatorProps)}
    />
  );
}
