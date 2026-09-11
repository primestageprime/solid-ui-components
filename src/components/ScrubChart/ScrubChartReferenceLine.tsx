// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ScrubChartReferenceLine — Structural (Depth 1). SVG chart mark; composes no
// library components.
// ============================================
// The `ScrubChart` ADAPTER for the reference-line mark, per
// docs/adr/0010-a-mark-is-a-core-plus-one-adapter-per-context.md.
//
// `Chart`'s `ReferenceLine` (Series.tsx) reads `useChart()` — plot-local,
// value-addressed. `ScrubChart` has no such context (mounting one is
// rejected by the ADR); a caller reaches this component by passing its own
// `ctx: ScrubChartContext<C>`, the same convention `ruleMarker.tsx` uses.
//
// This adapter converts `ctx`'s FRAME-ABSOLUTE pixels — `plotLeft`,
// `plotRight`, `yToPlot` — into the geometry `buildReferenceLine` takes, then
// draws whatever the core returns. It is deliberately thin: no geometry
// decision lives here that the core could make instead.
//
// `value` is in the chart's own y-domain unit — cents for
// `CashflowScrubChart`, whatever unit a caller's `yDomain` uses otherwise.
// This component does no unit conversion; it passes `value` straight to
// `ctx.yToPlot`. Never let a raw value and a cents value meet here — the
// caller converts before it calls in, not after.
// ============================================
import { Show, createMemo } from "solid-js";
import type { Cell } from "../DateAxis";
import { buildReferenceLine } from "../Chart/referenceLine";
import type { ScrubChartContext } from "./types";

export interface ScrubChartReferenceLineProps<C extends Cell> {
  /** The current frame's geometry, passed by the caller — there is no
   *  Solid context for `ScrubChart` (see the ADR). */
  ctx: ScrubChartContext<C>;
  /** Y-domain value where the rule is drawn, in the chart's own y unit. */
  value: number;
  /** Caption drawn at the rule's right end, inside the plot. Optional. */
  label?: string;
  /** Class on the drawn `<line>`. No default: a caller's stylesheet is the
   *  only styling when this and every stroke prop below are omitted. */
  class?: string;
  /** Class on the caption `<text>`, when `label` is set. */
  labelClass?: string;
  /** Stroke color. Falls back to `currentColor` when omitted and no
   *  stylesheet rule targets `class`. */
  stroke?: string;
  /** Stroke width in px. Default `1`. */
  strokeWidth?: number;
  /** Dash pattern, e.g. `"4 4"`. Omit for a solid line. */
  strokeDasharray?: string;
  /** Opacity. Omitted (not defaulted) so a caller relying on its own
   *  stylesheet for the line's look — `CashflowScrubChart`'s zero line,
   *  which sets none of these style props — draws at full opacity, exactly
   *  as it did before this mark moved to a shared adapter. */
  opacity?: number;
}

/**
 * Draws one horizontal reference rule inside a `ScrubChart` render callback,
 * spanning `ctx.plotLeft` to `ctx.plotRight` at `value`. Returns a fragment
 * (a `<line>`, plus a `<text>` when `label` is set) — no wrapping `<g>`, so
 * the caller's own group (and its classes) stays exactly what it was.
 *
 * Renders nothing when `ctx.yToPlot` is `null` (no `yDomain` on the chart).
 */
export function ScrubChartReferenceLine<C extends Cell>(
  props: ScrubChartReferenceLineProps<C>,
) {
  const mark = createMemo(() => {
    const yToPlot = props.ctx.yToPlot;
    if (!yToPlot) return null;
    return buildReferenceLine({
      y: yToPlot(props.value),
      x1: props.ctx.plotLeft,
      x2: props.ctx.plotRight,
      caption: props.label,
    });
  });

  return (
    <Show when={mark()}>
      {(m) => (
        <>
          <line
            class={props.class}
            x1={m().line.x1}
            x2={m().line.x2}
            y1={m().line.y1}
            y2={m().line.y2}
            stroke={props.stroke ?? "currentColor"}
            stroke-width={props.strokeWidth ?? 1}
            stroke-dasharray={props.strokeDasharray}
            opacity={props.opacity}
          />
          <Show when={m().caption}>
            {(caption) => (
              <text
                class={props.labelClass}
                x={caption().x}
                y={caption().y}
                text-anchor={caption().textAnchor}
              >
                {caption().text}
              </text>
            )}
          </Show>
        </>
      )}
    </Show>
  );
}
