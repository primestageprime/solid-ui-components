// Chart slot: Grid — horizontal/vertical reference lines at scale ticks.
import { Component, For, Show } from "solid-js";
import { useChart } from "./context";

export interface GridProps {
  /** Show horizontal lines at Y ticks. Default true. */
  horizontal?: boolean;
  /** Show vertical lines at X ticks. Default false. */
  vertical?: boolean;
  /** Approximate tick count for each axis. Default 5. */
  tickCount?: number;
}

export const Grid: Component<GridProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const showH = () => props.horizontal ?? true;
  const showV = () => props.vertical ?? false;

  return (
    <g class="sui-chart__grid" aria-hidden="true">
      <Show when={showH()}>
        <For each={ctx.yScale().ticks(tickCount())}>
          {(t) => (
            <line
              class="sui-chart__grid-line"
              x1={0}
              x2={ctx.innerWidth()}
              y1={ctx.yScale()(t)}
              y2={ctx.yScale()(t)}
            />
          )}
        </For>
      </Show>
      <Show when={showV()}>
        <For each={ctx.xScale().ticks(tickCount())}>
          {(t) => (
            <line
              class="sui-chart__grid-line"
              y1={0}
              y2={ctx.innerHeight()}
              x1={ctx.xScale()(t)}
              x2={ctx.xScale()(t)}
            />
          )}
        </For>
      </Show>
    </g>
  );
};
