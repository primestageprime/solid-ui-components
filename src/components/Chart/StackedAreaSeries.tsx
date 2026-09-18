// lastReviewedAt: 2026-09-17
// lastReviewedBy: adlai.arnold
// StackedAreaSeries — Structural (Depth 1). SVG chart slot; composes no
// library components.
// ============================================
// The `Chart` ADAPTER for the stacked-area mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
// `buildStackedArea` (`./stackedArea.ts`) is the CORE. This adapter reads
// `useChart()` — PLOT-LOCAL pixels — and hands the core its two scales and the
// x extent to draw across. It is the only adapter today; a chart context that
// is not `Chart` would add a second one, not a branch in the core.
//
// PAINT IS NOT CONFIGURABLE. Band k takes series-palette slot k+1
// (`var(--sui-series-N)`, ADR 0003) — a translucent fill with a hairline edge
// in the same hue, the opacity and the hairline living in `Chart.css`. Eight
// slots is the hard cap in that ADR: a ninth band falls back to
// `currentColor` rather than vanishing, because a stack that quietly drops a
// series is worse than one that says a ninth is a redesign.
//
// The props are therefore `series`, `curve` and `class` and nothing else. No
// fill, no opacity, no stroke width, no baseline: a caller who could move them
// could take two bands out of the palette's order, and the picture's whole
// claim is that band k sits on band k−1.
// ============================================
import { For, createMemo } from "solid-js";
import { map } from "../../fn";
import { useChart } from "./context";
import { type StackedAreaCurve, buildStackedArea } from "./stackedArea";

/** ADR 0003: eight series slots, and a ninth category is a redesign. */
const PALETTE_SLOTS = 8;

const paint = (index: number): string =>
  index < PALETTE_SLOTS
    ? `var(--sui-series-${index + 1}, currentColor)`
    : "currentColor";

/**
 * One step point at the call site. `at` takes `number | Date` — the same
 * pair `ReferenceLine`'s `value` takes, and for the same reason: a chart on a
 * time domain is handed `Date`s, and the conversion belongs in the adapter,
 * not in the core, which knows only numbers.
 */
export interface StackedAreaPoint {
  readonly at: number | Date;
  readonly value: number;
}

/** One series at the call site. */
export interface StackedAreaSeriesData {
  readonly id: string;
  readonly label?: string;
  /**
   * ASCENDING by `at`, and values are NOT negative. Both are the caller's to
   * hold: the mark holds a value forward from its point, so an out-of-order
   * point would silently draw a different stack, and a negative value would
   * put a band below its own floor — neither is a shape this mark has.
   */
  readonly points: readonly StackedAreaPoint[];
}

const toScaleValue = (at: number | Date): number =>
  at instanceof Date ? at.getTime() : at;

export interface StackedAreaSeriesProps {
  /**
   * The stack, BOTTOM FIRST — array order is stacking order and palette
   * order. Each series is step-valued: a point's `value` takes hold at its
   * `at` and is held until the next point, and a series contributes nothing
   * before its first point.
   */
  series: readonly StackedAreaSeriesData[];
  /**
   * How a change is crossed. `"smoothStep"` (default) spends a transition on
   * it — the Sankey blend, flat in and flat out. `"linear"` lands it square
   * on its own x.
   */
  curve?: StackedAreaCurve;
  /** Extra class on the wrapping `<g>`. */
  class?: string;
}

/**
 * Draws a stack of step-valued bands as a `Chart` slot child: band k is
 * closed between the cumulative top of bands 0..k−1 and its own value, so the
 * top of the whole stack is the total. Plot-local pixels, read from
 * `useChart()`.
 */
export function StackedAreaSeries(props: StackedAreaSeriesProps) {
  const ctx = useChart();
  const geometry = createMemo(() => {
    const xs = ctx.xScale();
    const ys = ctx.yScale();
    // The one conversion this adapter exists to absorb: the call site's
    // `Date`s become the scale's own numbers before the core sees them.
    const series = map(
      (one: StackedAreaSeriesData) => ({
        id: one.id,
        label: one.label,
        points: map(
          (point: StackedAreaPoint) => ({
            at: toScaleValue(point.at),
            value: point.value,
          }),
          one.points,
        ),
      }),
      props.series,
    );
    return buildStackedArea(
      series,
      xs,
      ys,
      xs.domain,
      props.curve ?? "smoothStep",
    );
  });

  return (
    <g
      class={`sui-chart__stacked-area${props.class ? ` ${props.class}` : ""}`}
      clip-path={ctx.clip.plotPathUrl()}
    >
      <For each={geometry().bands}>
        {(band) => (
          <>
            <path
              class="sui-chart__stacked-area-band"
              d={band.path}
              fill={paint(band.index)}
            >
              <title>{band.label ?? band.id}</title>
            </path>
            <path
              class="sui-chart__stacked-area-edge"
              d={band.edge}
              stroke={paint(band.index)}
            />
          </>
        )}
      </For>
    </g>
  );
}
