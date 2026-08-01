// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// AlarmBands — Structural (Depth 1). SVG chart slot; composes no library components.
import { type Component, For } from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { useChart } from "../Chart/context";
import type { Range } from "./alarm";
import "./Alarm.css";

/**
 * Translucent red rectangles, one per `Range`, for the "smooth alarm"
 * visual treatment. Renders as SVG inside a `<Chart>`'s plot-area
 * transform group, using the chart's `xScale` for placement.
 *
 * Each rectangle occupies a single horizontal "lane" so multiple alarm
 * series in the same chart can stair-step top-to-bottom rather than
 * stack and darken on overlap. Pass `laneIndex` (0-based) and
 * `laneCount` to size & position; defaults render full-height (1 lane).
 *
 * `Range` instances are expected to already be padded / clamped / zone-
 * subtracted — see `alarm.ts` for the pipeline helpers. This component
 * is a pure renderer.
 *
 * Style via `--sui-alarm-band-fill` and `--sui-alarm-band-fill-opacity`.
 *
 * @example
 *   import { Chart, AlarmBands, detectRanges } from "solid-ui-components";
 *   const ranges = detectRanges(points, threshold);
 *   <Chart ...>
 *     <AlarmBands ranges={ranges} />
 *   </Chart>
 *
 * @example  Two series stair-stepped in two lanes:
 *   <For each={perSeries}>
 *     {(s, i) => (
 *       <AlarmBands ranges={s.bands} laneIndex={i()} laneCount={2} />
 *     )}
 *   </For>
 */
export interface AlarmBandsProps {
  /** Pre-computed alarm ranges to render. */
  ranges: readonly Range[];
  /** 0-based lane index for this series in a multi-series chart. */
  laneIndex?: number;
  /** Total lanes the chart is divided into. Default `1` (full height). */
  laneCount?: number;
}

export const AlarmBands: Component<AlarmBandsProps> = (props) => {
  const ctx = useChart();
  return (
    <For each={props.ranges}>
      {(r) => {
        const xs = ctx.xScale();
        const x = xs(r.start);
        const w = Math.max(1, xs(r.end) - x);
        const lanes = Math.max(1, props.laneCount ?? 1);
        const idx = clamp(props.laneIndex ?? 0, 0, lanes - 1);
        const laneH = ctx.innerHeight() / lanes;
        return (
          <rect
            class="sui-alarm-band"
            x={x}
            y={idx * laneH}
            width={w}
            height={laneH}
            fill="var(--sui-alarm-band-fill, #ff4040)"
            fill-opacity="var(--sui-alarm-band-fill-opacity, 0.22)"
          />
        );
      }}
    </For>
  );
};
