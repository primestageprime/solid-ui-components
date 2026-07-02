// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import { type Component, For } from "solid-js";
import { clamp } from "../../internal/math/clamp";
import { useChart } from "../Chart/context";
import type { HotZone } from "./alarm";
import "./Alarm.css";

/**
 * Striped block + thick border + `×N` count badge for the "barcode"
 * visual treatment — collapses a tight cluster of overlapping alarms
 * into one unambiguous rectangle.
 *
 * Renders inside the plot-area transform of a `<Chart>`. Requires an
 * `<AlarmStripeDefs />` somewhere in the same chart so the `fill="url(#…)"`
 * pattern resolves.
 *
 * Like `AlarmBands`, accepts `laneIndex` / `laneCount` so a single chart
 * with multiple alarm series gets independent blocks per series (e.g.
 * one bar-code in the top lane, another in the bottom lane). The count
 * badge sits inside the lane, anchored to its top-right corner.
 *
 * Compute `zones` with `findHotZones` (see `alarm.ts`) — and remember
 * to call `subtractZones` on your `<AlarmBands>` ranges so the smooth
 * bands don't leak through behind the stripe.
 *
 * Style via `--sui-alarm-zone-*` CSS vars in your theme.
 *
 * @example
 *   <Chart ...>
 *     <AlarmStripeDefs />
 *     <AlarmHotZones zones={zones} laneIndex={0} laneCount={2} />
 *   </Chart>
 */
export interface AlarmHotZonesProps {
  /** Pre-computed hot zones to render. */
  zones: readonly HotZone[];
  /** 0-based lane index for this series in a multi-series chart. */
  laneIndex?: number;
  /** Total lanes the chart is divided into. Default `1`. */
  laneCount?: number;
  /** Pattern id matching the corresponding `<AlarmStripeDefs patternId>`. */
  patternId?: string;
}

export const AlarmHotZones: Component<AlarmHotZonesProps> = (props) => {
  const ctx = useChart();
  const patternUrl = () => `url(#${props.patternId ?? "alarm-stripe"})`;
  return (
    <For each={props.zones}>
      {(z) => {
        const xs = ctx.xScale();
        const x = xs(z.start);
        const w = Math.max(1, xs(z.end) - x);
        const lanes = Math.max(1, props.laneCount ?? 1);
        const idx = clamp(props.laneIndex ?? 0, 0, lanes - 1);
        const laneH = ctx.innerHeight() / lanes;
        return (
          <g class="sui-alarm-zone">
            <rect
              x={x}
              y={idx * laneH}
              width={w}
              height={laneH}
              fill={patternUrl()}
              stroke="var(--sui-alarm-zone-stroke, #ff4040)"
              stroke-width="var(--sui-alarm-zone-stroke-width, 2)"
            />
            <text
              class="sui-alarm-zone-count"
              x={x + w - 6}
              y={idx * laneH + 14}
              text-anchor="end"
              fill="var(--sui-alarm-count-fill, #ffd0d0)"
              font-size="var(--sui-alarm-count-size, 11px)"
              font-family="var(--sui-alarm-count-font, 'JetBrains Mono', monospace)"
              font-weight="var(--sui-alarm-count-weight, 600)"
            >
              ×{z.count}
            </text>
          </g>
        );
      }}
    </For>
  );
};
