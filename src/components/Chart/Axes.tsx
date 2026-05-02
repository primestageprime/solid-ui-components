// Chart slots: XAxis, YAxis — tick lines + labels at scale ticks.
import { Component, For } from "solid-js";
import { useChart } from "./context";

export interface AxisProps {
  tickCount?: number;
  /** Override scale-derived ticks (e.g. categorical bar positions). */
  tickValues?: readonly number[];
  tickFormat?: (value: number) => string;
  /** Hide the baseline. Default false. */
  hideLine?: boolean;
}

const defaultFormat = (v: number): string => {
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
};

export const XAxis: Component<AxisProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const fmt = () => props.tickFormat ?? defaultFormat;

  return (
    <g class="sui-chart__axis sui-chart__axis--x" transform={`translate(0, ${ctx.innerHeight()})`}>
      {!props.hideLine && (
        <line class="sui-chart__axis-line" x1={0} x2={ctx.innerWidth()} y1={0} y2={0} />
      )}
      <For each={props.tickValues ?? ctx.xScale().ticks(tickCount())}>
        {(t) => (
          <g transform={`translate(${ctx.xScale()(t)}, 0)`}>
            <line class="sui-chart__axis-tick" y1={0} y2={4} />
            <text class="sui-chart__axis-label" y={16} text-anchor="middle">
              {fmt()(t)}
            </text>
          </g>
        )}
      </For>
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
    </g>
  );
};
