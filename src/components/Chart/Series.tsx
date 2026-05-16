// Chart slots: LineSeries, AreaSeries, PointSeries, ReferenceLine.
import { Component, For, Show, createMemo } from "solid-js";
import { useChart } from "./context";

interface SeriesBase<T> {
  data: readonly T[];
  x: (d: T) => number;
  y: (d: T) => number;
  /** Skip points where x or y is NaN. Default true. */
  skipMissing?: boolean;
}

const buildLine = <T,>(
  data: readonly T[],
  x: (d: T) => number,
  y: (d: T) => number,
  xs: (v: number) => number,
  ys: (v: number) => number,
  skipMissing: boolean,
): string => {
  let path = "";
  let need = true;
  for (const d of data) {
    const xv = x(d);
    const yv = y(d);
    if (skipMissing && (Number.isNaN(xv) || Number.isNaN(yv))) {
      need = true;
      continue;
    }
    const X = xs(xv).toFixed(2);
    const Y = ys(yv).toFixed(2);
    path += need ? `M${X},${Y}` : `L${X},${Y}`;
    need = false;
  }
  return path;
};

// ---- LineSeries ----
export interface LineSeriesProps<T> extends SeriesBase<T> {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  class?: string;
}

export function LineSeries<T>(props: LineSeriesProps<T>) {
  const ctx = useChart();
  const d = createMemo(() =>
    buildLine(
      props.data,
      props.x,
      props.y,
      ctx.xScale(),
      ctx.yScale(),
      props.skipMissing ?? true,
    ),
  );
  return (
    <path
      class={`sui-chart__line${props.class ? " " + props.class : ""}`}
      d={d()}
      stroke={props.stroke}
      stroke-width={props.strokeWidth ?? 2}
      stroke-dasharray={props.strokeDasharray}
      fill="none"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  );
}

// ---- AreaSeries ----
export interface AreaSeriesProps<T> extends SeriesBase<T> {
  /** Fill color. */
  fill?: string;
  fillOpacity?: number;
  /** Y value for the baseline (in data domain). Default = bottom of yDomain. */
  baseline?: number;
  class?: string;
}

export function AreaSeries<T>(props: AreaSeriesProps<T>) {
  const ctx = useChart();
  const d = createMemo(() => {
    const xs = ctx.xScale();
    const ys = ctx.yScale();
    const baselineValue = props.baseline ?? ys.domain[0];
    const baseY = ys(baselineValue);
    const top = buildLine(props.data, props.x, props.y, xs, ys, props.skipMissing ?? true);
    if (!top) return "";
    // Find first/last data x to close the area along the baseline.
    let first: number | null = null;
    let last: number | null = null;
    for (const dd of props.data) {
      const xv = props.x(dd);
      if (Number.isNaN(xv)) continue;
      if (first === null) first = xv;
      last = xv;
    }
    if (first === null || last === null) return top;
    return `${top} L${xs(last).toFixed(2)},${baseY.toFixed(2)} L${xs(first).toFixed(2)},${baseY.toFixed(2)} Z`;
  });
  return (
    <path
      class={`sui-chart__area${props.class ? " " + props.class : ""}`}
      d={d()}
      fill={props.fill}
      fill-opacity={props.fillOpacity ?? 0.18}
      stroke="none"
    />
  );
}

// ---- PointSeries (markers) ----
export interface PointSeriesProps<T> extends SeriesBase<T> {
  /** Marker radius in px. Default 3. */
  radius?: number | ((d: T) => number);
  fill?: string | ((d: T) => string);
  stroke?: string | ((d: T) => string);
  strokeWidth?: number;
  /** Tooltip / aria title per point. */
  title?: (d: T) => string;
}

export function PointSeries<T>(props: PointSeriesProps<T>) {
  const ctx = useChart();
  const radius = (d: T) => (typeof props.radius === "function" ? props.radius(d) : props.radius ?? 3);
  const fill = (d: T) => (typeof props.fill === "function" ? props.fill(d) : props.fill);
  const stroke = (d: T) => (typeof props.stroke === "function" ? props.stroke(d) : props.stroke);
  return (
    <g class="sui-chart__points">
      <For each={props.data}>
        {(d) => {
          const xv = props.x(d);
          const yv = props.y(d);
          if ((props.skipMissing ?? true) && (Number.isNaN(xv) || Number.isNaN(yv))) return null;
          return (
            <circle
              cx={ctx.xScale()(xv)}
              cy={ctx.yScale()(yv)}
              r={radius(d)}
              fill={fill(d)}
              stroke={stroke(d)}
              stroke-width={props.strokeWidth}
            >
              <Show when={props.title}>
                <title>{props.title!(d)}</title>
              </Show>
            </circle>
          );
        }}
      </For>
    </g>
  );
}

// ---- BarSeries ----
export interface BarSegment {
  /** Signed value — positive stacks up from baseline, negative stacks down. */
  value: number;
  fill?: string;
  /** Stable key for keyed iteration / click identification. */
  key?: string | number;
}

export interface BarSeriesProps<T> {
  data: readonly T[];
  /** Bar center on the x scale (typically `(_d, i) => i`). */
  x: (d: T, i: number) => number;
  /** Single-value mode. Mutually exclusive with `segments`. */
  value?: (d: T) => number;
  /** Stacked-bar mode — caller returns segments. */
  segments?: (d: T) => readonly BarSegment[];
  /** Bar width as fraction of slot. Default 0.65. */
  bandWidth?: number;
  /** Y value to stack against. Default 0. */
  baseline?: number;
  /** Default fill when a segment doesn't specify one. */
  fill?: string;
  onBarClick?: (datum: T, index: number) => void;
  onSegmentClick?: (datum: T, segment: BarSegment, segmentIndex: number) => void;
  class?: string;
}

export function BarSeries<T>(props: BarSeriesProps<T>) {
  const ctx = useChart();
  const bandWidth = () => props.bandWidth ?? 0.65;
  const baseline = () => props.baseline ?? 0;
  return (
    <g class={`sui-chart__bars${props.class ? " " + props.class : ""}`}>
      <For each={props.data}>
        {(d, i) => {
          const xs = ctx.xScale();
          const ys = ctx.yScale();
          const center = props.x(d, i());
          // Slot pixel width: distance to the next-integer center in data space.
          const slotPx = Math.abs(xs(center + 1) - xs(center)) || (xs.range[1] - xs.range[0]) / Math.max(1, props.data.length);
          const bw = slotPx * bandWidth();
          const xPx = xs(center) - bw / 2;
          const baseY = ys(baseline());

          const segs: readonly BarSegment[] = props.segments
            ? props.segments(d)
            : [{ value: props.value?.(d) ?? 0 }];

          let posCursor = baseline();
          let negCursor = baseline();

          return (
            <For each={segs}>
              {(seg, si) => {
                if (seg.value === 0) return null;
                const top = seg.value > 0 ? posCursor + seg.value : negCursor;
                const bottom = seg.value > 0 ? posCursor : negCursor + seg.value;
                if (seg.value > 0) posCursor += seg.value;
                else negCursor += seg.value;
                const yPx = ys(top);
                const hPx = Math.abs(ys(bottom) - ys(top));
                const click = (e: MouseEvent) => {
                  e.stopPropagation();
                  props.onSegmentClick?.(d, seg, si());
                  props.onBarClick?.(d, i());
                };
                return (
                  <rect
                    class="sui-chart__bar"
                    x={xPx}
                    y={yPx}
                    width={bw}
                    height={hPx}
                    fill={seg.fill ?? props.fill}
                    onClick={click}
                    style={{
                      cursor: props.onBarClick || props.onSegmentClick ? "pointer" : undefined,
                    }}
                  />
                );
              }}
            </For>
          );
        }}
      </For>
    </g>
  );
}

// ---- ReferenceLine ----
export interface ReferenceLineStyleProps {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  label?: string;
  /** Color override; takes precedence over `stroke`. Defaults via CSS class. */
  color?: string;
}

export type ReferenceLineProps =
  | (ReferenceLineStyleProps & {
      /** Preferred API: orientation + value (accepts Date when chart has time domain). */
      orientation: "horizontal" | "vertical";
      value: number | Date;
      x?: never;
      y?: never;
    })
  | (ReferenceLineStyleProps & {
      /** @deprecated Legacy API — use orientation="vertical" + value. */
      x: number;
      orientation?: never;
      value?: never;
      y?: never;
    })
  | (ReferenceLineStyleProps & {
      /** @deprecated Legacy API — use orientation="horizontal" + value. */
      y: number;
      orientation?: never;
      value?: never;
      x?: never;
    });

const toScaleValue = (v: number | Date): number =>
  v instanceof Date ? v.getTime() : v;

type ReferenceLineInternal = ReferenceLineStyleProps & {
  orientation?: "horizontal" | "vertical";
  value?: number | Date;
  x?: number;
  y?: number;
};

export const ReferenceLine: Component<ReferenceLineProps> = (rawProps) => {
  const props = rawProps as ReferenceLineInternal;
  const ctx = useChart();
  const resolved = () => {
    if (props.orientation && props.value != null) {
      return { orientation: props.orientation, value: toScaleValue(props.value) };
    }
    if (props.x != null) return { orientation: "vertical" as const, value: props.x };
    if (props.y != null) return { orientation: "horizontal" as const, value: props.y };
    return null;
  };
  const strokeColor = () => props.color ?? props.stroke ?? "currentColor";

  return (
    <g class="sui-chart__ref">
      <Show when={resolved()}>
        {(r) => (
          <>
            <Show when={r().orientation === "horizontal"}>
              <line
                x1={0}
                x2={ctx.innerWidth()}
                y1={ctx.yScale()(r().value)}
                y2={ctx.yScale()(r().value)}
                stroke={strokeColor()}
                stroke-width={props.strokeWidth ?? 1}
                stroke-dasharray={props.strokeDasharray ?? "4 4"}
                opacity={0.6}
              />
              <Show when={props.label}>
                <text
                  class="sui-chart__ref-label"
                  x={ctx.innerWidth() - 4}
                  y={ctx.yScale()(r().value) - 4}
                  text-anchor="end"
                >
                  {props.label}
                </text>
              </Show>
            </Show>
            <Show when={r().orientation === "vertical"}>
              <line
                y1={0}
                y2={ctx.innerHeight()}
                x1={ctx.xScale()(r().value)}
                x2={ctx.xScale()(r().value)}
                stroke={strokeColor()}
                stroke-width={props.strokeWidth ?? 1}
                stroke-dasharray={props.strokeDasharray ?? "4 4"}
                opacity={0.6}
              />
            </Show>
          </>
        )}
      </Show>
    </g>
  );
};
