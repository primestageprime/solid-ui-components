// lastReviewedAt: 2026-10-13
// lastReviewedBy: adlai.arnold
// ============================================
// OutOfRangeMarkers — Structural (Depth 1). SVG chart slot; composes no library components.
//
// A y domain that does not cover the data clips it. This slot marks the one
// value the reader cannot see at each clipped edge — the global PEAK past the
// plot top and the global TROUGH past the plot bottom — with a chevron at the
// edge and the compact value beside it. The decision is `outOfRange`
// (outOfRange.ts, pure); `CashflowScrubChart` draws the same marker on its
// own cell axis.
// ============================================
import { type Component, Show, createMemo } from "solid-js";
import { map } from "../../fn";
import type { Tone } from "../../types";
import { useChart } from "./context";
import { edgeLabelX, outOfRange } from "./outOfRange";

export interface OutOfRangePoint {
  readonly x: number;
  readonly y: number;
}

export interface OutOfRangeMarkersProps {
  /** Every drawn value, in data units: the candidates for an extreme. */
  points: readonly OutOfRangePoint[];
  format: (value: number) => string;
  /** The chevron's and the value's tone (src/types.ts). Default `muted`. */
  tone?: Tone;
  class?: string;
}

const CHEVRON = 5;
const LABEL_INSET = 16;

export const OutOfRangeMarkers: Component<OutOfRangeMarkersProps> = (props) => {
  const ctx = useChart();
  const edges = createMemo(() => {
    const xs = ctx.xScale();
    const ys = ctx.yScale();
    return outOfRange(
      map((p: OutOfRangePoint) => ({ x: xs(p.x), y: ys(p.y), value: p.y }), props.points),
      0,
      ctx.innerHeight(),
    );
  });
  const labelX = (x: number) => edgeLabelX(x, 0, ctx.innerWidth());
  return (
    <g
      class={`sui-chart__out-of-range${props.class ? ` ${props.class}` : ""}`}
      data-tone={props.tone ?? "muted"}
    >
      <Show when={edges().top}>
        {(m) => (
          <g class="sui-chart__out-of-range-edge" data-edge="top">
            <path
              class="sui-chart__out-of-range-chevron"
              d={`M ${m().x} 1 l 4 ${CHEVRON} l -8 0 Z`}
            />
            <text
              class="sui-chart__out-of-range-label"
              x={labelX(m().x)}
              y={LABEL_INSET}
              text-anchor="middle"
            >
              {props.format(m().value)}
            </text>
          </g>
        )}
      </Show>
      <Show when={edges().bottom}>
        {(m) => (
          <g class="sui-chart__out-of-range-edge" data-edge="bottom">
            <path
              class="sui-chart__out-of-range-chevron"
              d={`M ${m().x} ${ctx.innerHeight() - 1} l 4 -${CHEVRON} l -8 0 Z`}
            />
            <text
              class="sui-chart__out-of-range-label"
              x={labelX(m().x)}
              y={ctx.innerHeight() - LABEL_INSET + 4}
              text-anchor="middle"
            >
              {props.format(m().value)}
            </text>
          </g>
        )}
      </Show>
    </g>
  );
};
