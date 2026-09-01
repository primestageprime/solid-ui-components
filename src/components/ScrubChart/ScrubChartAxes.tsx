// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartAxes — Structural (Depth 1). SVG axis-chrome render fragment; composes no library components.
// ScrubChart — axis-chrome render fragments: <ScrubChartAxes> (y-axis line +
// ticks + labels, x-axis line + ticks + labels) and <ScrubChartGrid> (opt-in
// horizontal rules at the same y-ticks). Both live here because they share the
// tick geometry; they render in DIFFERENT layers (see ScrubChartGrid's doc).
//
// Split out of ScrubChart.tsx verbatim so the parent's render body stays
// readable. This is pure presentation: it owns NO state and reads NO signals
// of its own — every value it needs (frame size, plot bounds, the computed
// tick arrays, the y-label formatter) arrives as a REACTIVE ACCESSOR prop.
// Passing accessors (not snapshot values) is deliberate: the parent's signals
// keep driving updates through these thunks, so nothing here goes stale when
// the chart resizes or the ticks recompute. The component simply re-reads its
// accessors inside the JSX.
//
// Visibility is the caller's job — ScrubChart wraps <ScrubChartAxes> in the
// same `chartWidth > 0 && (yScale || xTicks.length)` <Show> guard the inline
// SVG used, so this fragment always renders with a positive frame.
// ============================================

import { For, type JSX, Show } from "solid-js";

/** One y-axis tick: its data value + the pixel y it maps to. */
export interface ScrubChartYTick {
  value: number;
  y: number;
}

/** One x-axis tick: its pixel x + the pre-formatted label. */
export interface ScrubChartXTick {
  x: number;
  label: string;
}

/**
 * Props are accessor thunks so the parent's reactivity flows through
 * unbroken. `yScaleActive` distinguishes "y-axis present" (draw the y line +
 * ticks) from "no y-domain" without leaking the d3 scale itself.
 */
export interface ScrubChartAxesProps {
  chartWidth: () => number;
  chartHeight: () => number;
  plotLeft: () => number;
  plotTop: () => number;
  plotRight: () => number;
  plotBottom: () => number;
  yScaleActive: () => boolean;
  yTicks: () => ScrubChartYTick[];
  xTicks: () => ScrubChartXTick[];
  formatY: () => (value: number) => string;
}

/**
 * Props for the gridline fragment. It takes the SAME `yTicks` accessor the
 * axes take, so a rule can never sit where no label is.
 */
export interface ScrubChartGridProps {
  chartWidth: () => number;
  chartHeight: () => number;
  plotLeft: () => number;
  plotRight: () => number;
  yTicks: () => ScrubChartYTick[];
}

/**
 * Horizontal gridlines — one rule per y-axis tick, spanning the plot region
 * from `plotLeft` to `plotRight`. The same shape `Chart/Grid.tsx` draws for
 * the low-level chart kit, and styled to match it: solid `--sui-border`, 1px,
 * `crispEdges`, transparent to the pointer.
 *
 * A SEPARATE fragment from <ScrubChartAxes>, rendered in its own layer BENEATH
 * `renderChart`, because a gridline crosses the plot where the 4px axis stub
 * does not. The axes SVG paints AFTER the series on purpose (so labels stay
 * legible over any line bleed); a rule drawn there would sit on top of the
 * balance line instead of behind it.
 */
export const ScrubChartGrid = (props: ScrubChartGridProps): JSX.Element => (
  <svg
    class="sui-scrub-chart__grid"
    aria-hidden="true"
    viewBox={`0 0 ${props.chartWidth()} ${props.chartHeight()}`}
    preserveAspectRatio="none"
  >
    <For each={props.yTicks()}>
      {(tick) => (
        <line
          class="sui-scrub-chart__grid-line"
          x1={props.plotLeft()}
          x2={props.plotRight()}
          y1={tick.y}
          y2={tick.y}
        />
      )}
    </For>
  </svg>
);

export const ScrubChartAxes = (props: ScrubChartAxesProps): JSX.Element => (
  <svg
    class="sui-scrub-chart__axes"
    role="img"
    aria-label="Chart axes"
    viewBox={`0 0 ${props.chartWidth()} ${props.chartHeight()}`}
    preserveAspectRatio="none"
  >
    <Show when={props.yScaleActive()}>
      <line
        class="sui-scrub-chart__axis-line"
        x1={props.plotLeft()}
        x2={props.plotLeft()}
        y1={props.plotTop()}
        y2={props.plotBottom()}
      />
      <For each={props.yTicks()}>
        {(tick) => (
          <>
            <line
              class="sui-scrub-chart__tick"
              x1={props.plotLeft() - 4}
              x2={props.plotLeft()}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              class="sui-scrub-chart__label sui-scrub-chart__label--y"
              x={props.plotLeft() - 6}
              y={tick.y}
              text-anchor="end"
              dominant-baseline="central"
            >
              {props.formatY()(tick.value)}
            </text>
          </>
        )}
      </For>
    </Show>
    <Show when={props.xTicks().length > 0}>
      <line
        class="sui-scrub-chart__axis-line"
        x1={props.plotLeft()}
        x2={props.plotRight()}
        y1={props.plotBottom()}
        y2={props.plotBottom()}
      />
      <For each={props.xTicks()}>
        {(tick) => (
          <>
            <line
              class="sui-scrub-chart__tick"
              x1={tick.x}
              x2={tick.x}
              y1={props.plotBottom()}
              y2={props.plotBottom() + 4}
            />
            <text
              class="sui-scrub-chart__label sui-scrub-chart__label--x"
              x={tick.x}
              y={props.plotBottom() + 6}
              text-anchor="middle"
              dominant-baseline="hanging"
            >
              {tick.label}
            </text>
          </>
        )}
      </For>
    </Show>
  </svg>
);
