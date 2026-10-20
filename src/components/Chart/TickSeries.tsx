// ============================================
// TickSeries — Structural (Depth 1). SVG chart slot; composes no library components.
// Tags: shows:mark, does:view, data:events, role:slot
//
// A SHORT VERTICAL TICK at each point, centred on it: an event on a track,
// where a dot would read as a value. The tick is `length` px tall whatever
// the y scale. A word under a tick is a `PointCaptions side="below"` on the
// same accessors, with `offset` past half the tick.
// ============================================
import { For } from "solid-js";
import { useChart } from "./context";

export interface TickSeriesProps<T> {
  data: readonly T[];
  x: (d: T) => number;
  y: (d: T) => number;
  /** Tick height in px. Default 20. */
  length?: number;
  /** Any SVG paint, per datum or for all. Default the chart's tick colour. */
  stroke?: string | ((d: T) => string);
  /** Default 2.5. */
  strokeWidth?: number;
  /** Tooltip / aria title per tick. */
  title?: (d: T) => string;
  class?: string;
}

export function TickSeries<T>(props: TickSeriesProps<T>) {
  const ctx = useChart();
  const half = () => (props.length ?? 20) / 2;
  // Inline style, because the stylesheet's default stroke beats an attribute.
  const stroke = (d: T) =>
    typeof props.stroke === "function" ? props.stroke(d) : props.stroke;
  return (
    <g class={`sui-chart__tick-series${props.class ? ` ${props.class}` : ""}`}>
      <For each={props.data}>
        {(d) => {
          const px = () => ctx.xScale()(props.x(d));
          const py = () => ctx.yScale()(props.y(d));
          return (
            <line
              class="sui-chart__tick"
              x1={px()}
              x2={px()}
              y1={py() - half()}
              y2={py() + half()}
              style={stroke(d) ? { stroke: stroke(d) } : undefined}
              stroke-width={props.strokeWidth ?? 2.5}
            >
              {/* In the line's own template, never behind a condition: Solid
                  compiles a <title> that starts its own template as an HTML
                  <title>, which the browser takes for the page's title. */}
              <title>{props.title?.(d) ?? ""}</title>
            </line>
          );
        }}
      </For>
    </g>
  );
}
