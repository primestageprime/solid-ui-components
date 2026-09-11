// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// DeviationBand — Structural (Depth 1). SVG chart slot; composes no
// library components.
// ============================================
// The `Chart` ADAPTER for the deviation-band mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
// `buildDeviationBand` (`./deviationBand.ts`) is the CORE. This adapter
// reads `useChart()` — PLOT-LOCAL — and converts `data` through
// `xScale`/`yScale` into the core's geometry. `ScrubChart`'s `ScrubChartBand`
// (`../ScrubChart/ScrubChartBand.tsx`) is the other adapter; it supplies
// FRAME-ABSOLUTE pixels instead — the difference the two adapters absorb.
// It carries no colour default of its own: `positiveClass`/`negativeClass`
// are plain per-sign pass-through props.
// Filed as DeviationBandMark.tsx, not DeviationBand.tsx: a name differing
// only in case from the core's `deviationBand.ts` breaks TS/Vite module
// resolution on a case-preserving filesystem (macOS). `ReferenceLine`
// (Series.tsx) dodges the same hazard the same way. The export stays
// `DeviationBand`.
// ============================================
import { For, createMemo } from "solid-js";
import { useChart } from "./context";
import { buildDeviationBand } from "./deviationBand";

export interface DeviationBandProps<T> {
  /** Ordered items the band is built over. */
  data: readonly T[];
  /** Item → x, in the chart's x-domain unit. */
  x: (d: T, index: number) => number;
  /** Item → series value, in the chart's y-domain unit. `null` breaks the
   *  band over that item. */
  series: (d: T, index: number) => number | null;
  /** Item → reference value the deviation is measured against. `null`
   *  breaks the band over that item. */
  reference: (d: T, index: number) => number | null;
  /** Class on a run where `series` sits ABOVE `reference`. No default. */
  positiveClass?: string;
  /** Class on a run where `series` sits BELOW `reference`. No default. */
  negativeClass?: string;
  /** Extra class on the wrapping `<g>`, alongside the base
   *  `sui-chart__deviation-band` class. */
  class?: string;
}

/**
 * Draws a deviation band as a `Chart` slot child: one filled `<polygon>`
 * per run `buildDeviationBand` returns, split at every crossing between
 * `series` and `reference`. Plot-local pixels, read from `useChart()`.
 */
export function DeviationBand<T>(props: DeviationBandProps<T>) {
  const ctx = useChart();
  const runs = createMemo(() =>
    buildDeviationBand(
      props.data,
      (i) => ctx.xScale()(props.x(props.data[i], i)),
      (v) => ctx.yScale()(v),
      props.series,
      props.reference,
    ),
  );

  return (
    <g
      class={`sui-chart__deviation-band${props.class ? ` ${props.class}` : ""}`}
    >
      <For each={runs()}>
        {(run) => (
          <polygon
            class={
              run.sign === "positive"
                ? props.positiveClass
                : props.negativeClass
            }
            points={run.points}
          />
        )}
      </For>
    </g>
  );
}
