// ============================================
// LineChart — Atomic (Depth 1)
// Owns CSS (LineChart.css), no component imports.
// SVG line chart for time-series visualization:
// auto-scales to data extremes, supports multiple
// stacked series with themed ColorVariant colors,
// optional grid and legend, "No data" placeholder.
// Intentionally interaction-free (no hover/click).
// ============================================
import { Component, For, Show, createMemo, splitProps } from "solid-js";
import type { ColorVariant } from "../../types";
import "./LineChart.css";

export interface LineChartPoint {
  x: number;
  y: number;
}

export interface LineChartSeries {
  label: string;
  points: LineChartPoint[];
  color?: ColorVariant;
}

export interface LineChartProps {
  series: LineChartSeries[];
  height?: number;
  yLabel?: string;
  xLabel?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
const GRID_STEPS = 4;
const TICK_COUNT_X = 4;
const DOT_RADIUS = 2.5;
const DEFAULT_HEIGHT = 120;

const seriesColor = (s: LineChartSeries): ColorVariant => s.color ?? "primary";

const allPoints = (series: LineChartSeries[]): LineChartPoint[] =>
  series.flatMap((s) => s.points);

const isEmpty = (series: LineChartSeries[]): boolean =>
  series.length === 0 || allPoints(series).length === 0;

const formatTick = (v: number): string => {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 10000 || abs < 0.01)) return v.toExponential(1);
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2).replace(/\.?0+$/, "");
};

export const LineChart: Component<LineChartProps> = (props) => {
  const [local] = splitProps(props, [
    "series",
    "height",
    "yLabel",
    "xLabel",
    "showGrid",
    "showLegend",
  ]);

  const h = () => local.height ?? DEFAULT_HEIGHT;
  // Width is responsive via viewBox; we pick a base width that gives a pleasing aspect ratio.
  const w = () => Math.max(320, Math.round(h() * 3));
  const showGrid = () => local.showGrid ?? true;
  const showLegend = () => (local.showLegend ?? local.series.length > 1) && local.series.length > 0;
  const empty = createMemo(() => isEmpty(local.series));

  const chartL = PAD.left;
  const chartR = () => w() - PAD.right;
  const chartT = PAD.top;
  const chartB = () => h() - PAD.bottom;
  const chartW = () => chartR() - chartL;
  const chartH = () => chartB() - chartT;

  const extents = createMemo(() => {
    const pts = allPoints(local.series);
    if (pts.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMaxRaw = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMaxRaw = Math.max(...ys);
    // Avoid degenerate (zero-range) extents; widen by 1 unit so the line is visible.
    const xMax = xMaxRaw === xMin ? xMin + 1 : xMaxRaw;
    const yMax = yMaxRaw === yMin ? yMin + 1 : yMaxRaw;
    return { xMin, xMax, yMin, yMax };
  });

  const xScale = (x: number): number => {
    const { xMin, xMax } = extents();
    return chartL + ((x - xMin) / (xMax - xMin)) * chartW();
  };

  const yScale = (y: number): number => {
    const { yMin, yMax } = extents();
    return chartB() - ((y - yMin) / (yMax - yMin)) * chartH();
  };

  const yTicks = createMemo(() => {
    const { yMin, yMax } = extents();
    return Array.from({ length: GRID_STEPS + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / GRID_STEPS);
  });

  const xTicks = createMemo(() => {
    const { xMin, xMax } = extents();
    return Array.from({ length: TICK_COUNT_X + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / TICK_COUNT_X);
  });

  const seriesPath = (s: LineChartSeries): string =>
    s.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y)}`)
      .join(" ");

  return (
    <div style={{ width: "100%" }}>
      <svg
        class="sui-linechart"
        viewBox={`0 0 ${w()} ${h()}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: `${h()}px` }}
      >
        <Show
          when={!empty()}
          fallback={
            <text
              x={w() / 2}
              y={h() / 2}
              class="sui-linechart__empty"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              No data
            </text>
          }
        >
          {/* Grid */}
          <Show when={showGrid()}>
            <For each={yTicks()}>
              {(v) => (
                <line
                  x1={chartL}
                  y1={yScale(v)}
                  x2={chartR()}
                  y2={yScale(v)}
                  class="sui-linechart__grid"
                />
              )}
            </For>
          </Show>

          {/* Axes */}
          <line
            x1={chartL}
            y1={chartB()}
            x2={chartR()}
            y2={chartB()}
            class="sui-linechart__axis"
          />
          <line
            x1={chartL}
            y1={chartT}
            x2={chartL}
            y2={chartB()}
            class="sui-linechart__axis"
          />

          {/* Y ticks + labels */}
          <For each={yTicks()}>
            {(v) => (
              <>
                <line
                  x1={chartL - 3}
                  y1={yScale(v)}
                  x2={chartL}
                  y2={yScale(v)}
                  class="sui-linechart__tick"
                />
                <text
                  x={chartL - 6}
                  y={yScale(v)}
                  class="sui-linechart__label-y"
                  text-anchor="end"
                  dominant-baseline="middle"
                >
                  {formatTick(v)}
                </text>
              </>
            )}
          </For>

          {/* X ticks + labels */}
          <For each={xTicks()}>
            {(v) => (
              <>
                <line
                  x1={xScale(v)}
                  y1={chartB()}
                  x2={xScale(v)}
                  y2={chartB() + 3}
                  class="sui-linechart__tick"
                />
                <text
                  x={xScale(v)}
                  y={chartB() + 14}
                  class="sui-linechart__label-x"
                  text-anchor="middle"
                >
                  {formatTick(v)}
                </text>
              </>
            )}
          </For>

          {/* Axis labels */}
          <Show when={local.yLabel}>
            <text
              x={chartL}
              y={chartT - 6}
              class="sui-linechart__axis-label"
              text-anchor="start"
            >
              {local.yLabel}
            </text>
          </Show>
          <Show when={local.xLabel}>
            <text
              x={chartR()}
              y={h() - 4}
              class="sui-linechart__axis-label"
              text-anchor="end"
            >
              {local.xLabel}
            </text>
          </Show>

          {/* Series */}
          <For each={local.series}>
            {(s) => (
              <Show when={s.points.length > 0}>
                <g class={`sui-linechart__series sui-linechart__series--${seriesColor(s)}`}>
                  <Show when={s.points.length > 1}>
                    <path d={seriesPath(s)} class="sui-linechart__line" />
                  </Show>
                  <For each={s.points}>
                    {(p) => (
                      <circle
                        cx={xScale(p.x)}
                        cy={yScale(p.y)}
                        r={DOT_RADIUS}
                        class="sui-linechart__dot"
                      />
                    )}
                  </For>
                </g>
              </Show>
            )}
          </For>
        </Show>
      </svg>

      <Show when={showLegend() && !empty()}>
        <div class="sui-linechart-legend">
          <For each={local.series}>
            {(s) => (
              <span class="sui-linechart-legend__item">
                <span
                  class={`sui-linechart-legend__swatch sui-linechart-legend__swatch--${seriesColor(s)}`}
                />
                {s.label}
              </span>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
