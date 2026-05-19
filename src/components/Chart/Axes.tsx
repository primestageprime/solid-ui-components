// Chart slots: XAxis, YAxis — tick lines + labels at scale ticks.
import { Component, For, Show } from "solid-js";
import { useChart } from "./context";
import type { Scale } from "./scales";

export interface AxisProps {
  tickCount?: number;
  /** Override scale-derived ticks (e.g. categorical bar positions). */
  tickValues?: readonly number[];
  tickFormat?: (value: number) => string;
  /** Hide the baseline. Default false. */
  hideLine?: boolean;
  /**
   * Optional axis title rendered centered along the axis. For XAxis it sits
   * below the tick labels; for YAxis it sits to the left of the y-tick
   * labels, rotated 90deg counter-clockwise.
   */
  label?: string;
  /**
   * Vertical pixel offset for XAxis tick labels (the `y` of each label
   * `<text>`). Default 16. Increase to push labels further below the axis
   * line — useful when a slot (e.g. a timeline strip) needs to sit between
   * the axis and the labels. No effect on YAxis.
   */
  labelOffset?: number;
  /**
   * Vertical pixel offset for XAxis tick marks. Default 0 — ticks render
   * from `y=0` to `y=4` relative to the axis baseline. Increase to push tick
   * marks DOWN so they emerge below a strip occupying the top of the axis
   * region (e.g. a TimelineBar with `bandY="margin-bottom"` flush against
   * the axis line). Independent of `labelOffset` — adjust both when ticks
   * move so labels still clear them. No effect on YAxis.
   */
  tickOffset?: number;
}

const defaultFormat = (v: number): string => {
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
};

const isTimeScale = (
  s: Scale,
): s is Scale & { tickFormat: (count?: number) => (v: number) => string } =>
  typeof (s as { tickFormat?: unknown }).tickFormat === "function";

export const XAxis: Component<AxisProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const fmt = () => {
    if (props.tickFormat) return props.tickFormat;
    const scale = ctx.xScale();
    if (isTimeScale(scale)) return scale.tickFormat(tickCount());
    return defaultFormat;
  };

  return (
    <g class="sui-chart__axis sui-chart__axis--x" transform={`translate(0, ${ctx.innerHeight()})`}>
      {!props.hideLine && (
        <line class="sui-chart__axis-line" x1={0} x2={ctx.innerWidth()} y1={0} y2={0} />
      )}
      <For each={props.tickValues ?? ctx.xScale().ticks(tickCount())}>
        {(t) => (
          <g transform={`translate(${ctx.xScale()(t)}, 0)`}>
            <line
              class="sui-chart__axis-tick"
              y1={props.tickOffset ?? 0}
              y2={(props.tickOffset ?? 0) + 4}
            />
            <text class="sui-chart__axis-label" y={props.labelOffset ?? 16} text-anchor="middle">
              {fmt()(t)}
            </text>
          </g>
        )}
      </For>
      <Show when={props.label}>
        {(label) => (
          <text
            class="sui-chart__axis-title"
            x={ctx.innerWidth() / 2}
            y={(props.labelOffset ?? 16) + 18}
            text-anchor="middle"
          >
            {label()}
          </text>
        )}
      </Show>
    </g>
  );
};

export const YAxis: Component<AxisProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const fmt = () => props.tickFormat ?? defaultFormat;

  return (
    <g class="sui-chart__axis sui-chart__axis--y">
      {!props.hideLine && (
        <line class="sui-chart__axis-line" y1={0} y2={ctx.innerHeight()} x1={0} x2={0} />
      )}
      <For each={props.tickValues ?? ctx.yScale().ticks(tickCount())}>
        {(t) => (
          <g transform={`translate(0, ${ctx.yScale()(t)})`}>
            <line class="sui-chart__axis-tick" x1={-4} x2={0} />
            <text class="sui-chart__axis-label" x={-8} dy="0.32em" text-anchor="end">
              {fmt()(t)}
            </text>
          </g>
        )}
      </For>
      <Show when={props.label}>
        {(label) => (
          <text
            class="sui-chart__axis-title sui-chart__axis-title--y"
            transform={`rotate(-90) translate(${-ctx.innerHeight() / 2}, ${-(28 + (props.labelOffset ?? 0))})`}
            text-anchor="middle"
          >
            {label()}
          </text>
        )}
      </Show>
    </g>
  );
};
