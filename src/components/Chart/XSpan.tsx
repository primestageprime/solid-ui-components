// ============================================
// XSpan — Structural (Depth 1). SVG chart slot; composes no library components.
//
// A SHADED STRETCH of the x axis, across the full plot height: a window with
// no data, a period out of scope, a span under review. It sits under every
// series, so draw it first among the Chart's children. It takes no pointer
// events, so tooltips and drags pass through to the marks above it.
//
// The fill is a `tone` (a translucent wash of that tone) or any SVG `paint`.
// For a hatch, draw one `HatchPattern` in the Chart and pass its
// `url(#id)` as `paint`. An optional `label` sits at the top centre.
// ============================================
import { Show } from "solid-js";
import type { Tone } from "../../types";
import { useChart } from "./context";

export interface XSpanProps {
  /** The span's start and end on the x scale, in data units. */
  from: number;
  to: number;
  /** The wash colour. Default `default` (neutral). `paint` overrides it. */
  tone?: Tone;
  /** Any SVG paint, e.g. `url(#hatch)` from a sibling `HatchPattern`. */
  paint?: string;
  /** A short word at the top centre of the span. */
  label?: string;
  class?: string;
}

export function XSpan(props: XSpanProps) {
  const ctx = useChart();
  const clamp = (v: number) => Math.min(Math.max(v, 0), ctx.innerWidth());
  const x0 = () => clamp(ctx.xScale()(Math.min(props.from, props.to)));
  const x1 = () => clamp(ctx.xScale()(Math.max(props.from, props.to)));
  return (
    <g
      class={`sui-chart__x-span${props.class ? ` ${props.class}` : ""}`}
      data-tone={props.paint ? undefined : (props.tone ?? "default")}
      pointer-events="none"
    >
      <rect
        x={x0()}
        y={0}
        width={x1() - x0()}
        height={ctx.innerHeight()}
        style={props.paint ? { fill: props.paint } : undefined}
      />
      <Show when={props.label}>
        <text
          class="sui-chart__x-span-label"
          x={(x0() + x1()) / 2}
          y={4}
          text-anchor="middle"
          dominant-baseline="hanging"
        >
          {props.label}
        </text>
      </Show>
    </g>
  );
}
