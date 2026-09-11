// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ScrubChartBand — Structural (Depth 1). SVG chart mark; composes no
// library components.
// ============================================
// The `ScrubChart` ADAPTER for the deviation-band mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
//
// `buildDeviationBand` (`../Chart/deviationBand.ts`) is the CORE: it takes
// explicit pixel geometry and returns `BandRun[]`, data — never JSX. This
// adapter converts `ctx`'s FRAME-ABSOLUTE pixels — `cellToX`, `yToPlot` —
// into that geometry, then draws whatever the core returns. `Chart`'s
// `DeviationBand` (`../Chart/DeviationBandMark.tsx`) is the other adapter; it
// supplies PLOT-LOCAL pixels from `useChart()` instead — the coordinate
// difference the two adapters exist to absorb.
//
// `ScrubChart` has no Solid context (mounting one is rejected by the ADR —
// see the ADR's "A bridge" option); a caller reaches this component by
// passing its own `ctx: ScrubChartContext<C>`, the same convention
// `ruleMarker.tsx` and `ScrubChartReferenceLine` use.
//
// This adapter carries NO colour or polarity reading of its own — no
// "positive is green" default. `positiveClass` / `negativeClass` /
// `positiveFill` / `negativeFill` are plain per-sign pass-through props,
// left undefined when the caller supplies none. `CashflowScrubChart`'s
// green-above / red-below surplus/shortfall reading is ITS default, applied
// at its own call site — see `CashflowSeriesFill` in
// `../CashflowScrubChart/types.ts`.
// ============================================
import { For, createMemo } from "solid-js";
import type { Cell } from "../DateAxis";
import { buildDeviationBand } from "../Chart/deviationBand";
import type { ScrubChartContext } from "./types";

export interface ScrubChartBandProps<C extends Cell> {
  /** The current frame's geometry, passed by the caller — there is no
   *  Solid context for `ScrubChart` (see the ADR). */
  ctx: ScrubChartContext<C>;
  /** Ordered items the band is built over. Indices must line up with
   *  `ctx.cellToX` — pass `ctx.cells`, or a same-length derivation of it. */
  items: readonly C[];
  /** Item → series value, in the chart's own y-domain unit. `null` breaks
   *  the band over that item. */
  series: (item: C, index: number) => number | null;
  /** Item → reference value the deviation is measured against. `null`
   *  breaks the band over that item. */
  reference: (item: C, index: number) => number | null;
  /** Class on a run where `series` sits ABOVE `reference`. No default. */
  positiveClass?: string;
  /** Class on a run where `series` sits BELOW `reference`. No default. */
  negativeClass?: string;
  /** `fill` on a positive run. Omitted (not defaulted) so a caller relying
   *  on its own stylesheet draws with no inline fill at all. */
  positiveFill?: string;
  /** `fill` on a negative run. Omitted (not defaulted), same reasoning. */
  negativeFill?: string;
}

/**
 * Draws a deviation band inside a `ScrubChart` render callback: one filled
 * `<polygon>` per run `buildDeviationBand` returns, split at every crossing
 * between `series` and `reference`. Returns a bare fragment — no wrapping
 * `<g>` — so the caller's own group (and its clip, its classes) stays
 * exactly what it was.
 *
 * Renders nothing when `ctx.yToPlot` is `null` (no `yDomain` on the chart).
 */
export function ScrubChartBand<C extends Cell>(props: ScrubChartBandProps<C>) {
  const runs = createMemo(() => {
    const yToPlot = props.ctx.yToPlot;
    if (!yToPlot) return [];
    return buildDeviationBand(
      props.items,
      props.ctx.cellToX,
      yToPlot,
      props.series,
      props.reference,
    );
  });

  return (
    <For each={runs()}>
      {(run) => (
        <polygon
          class={
            run.sign === "positive" ? props.positiveClass : props.negativeClass
          }
          points={run.points}
          stroke="none"
          fill={
            run.sign === "positive" ? props.positiveFill : props.negativeFill
          }
        />
      )}
    </For>
  );
}
