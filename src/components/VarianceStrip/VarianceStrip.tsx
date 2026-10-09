// lastReviewedAt: 2026-10-09
// lastReviewedBy: adlai.arnold
// ============================================
// VarianceStrip — Structural (Depth 1). SVG chart slot; composes no library
// components. Owns VarianceStrip.css.
//
// ONE BAR PER DAY: what the day's actual movement did that the forecast did
// not. Up is better than forecast, down is worse. The strip has its own
// scale, symmetric about zero and fitted to the largest bar, and the chart's
// x scale, so it sits under a balance plot on the same days.
//
// THE KIND IS A MARK, NOT A HUE. Revenue bars are filled, cost bars are
// hatched, other bars are muted: three marks one colour can carry, so the
// strip never needs a second hue that would have to pass a palette check
// against the chart's lines.
//
// TWO PLACEMENTS. `placement="below"` (the default) draws the strip in the
// chart's BOTTOM MARGIN, under the plot and above the x-axis labels; the
// caller sizes `margin.bottom` and pushes the axis labels down with
// `XAxis.labelOffset`. `placement="plot"` draws it across the plot area, for
// a chart that is nothing but the strip (`VarianceStripChart`).
//
// The geometry is `./varianceStripGeometry` (ADR 0010; a name differing from the component only by case would resolve to the wrong file on a case-insensitive disk); this adapter reads
// `useChart()` and draws.
// ============================================
import { For, Show, createMemo, createUniqueId } from "solid-js";
import { map } from "../../fn";
import { useChart } from "../Chart/context";
import {
  type VarianceBand,
  type VarianceKind,
  varianceStripGeometry,
} from "./varianceStripGeometry";
import "./VarianceStrip.css";

export type { VarianceKind, VarianceBand } from "./varianceStripGeometry";

export interface VarianceStripProps<T> {
  readonly data: readonly T[];
  /** Item → x, in the chart's x-domain unit (epoch ms on a time axis). */
  readonly x: (d: T) => number;
  /** Item → the day's variance. + is better than forecast. */
  readonly value: (d: T) => number;
  /** Item → the kind that chooses the mark. Default `"other"`. */
  readonly kind?: (d: T) => VarianceKind;
  /** One day in x-domain units, for the bar width. Default one day in ms. */
  readonly step?: number;
  /** Where the strip sits. Default `"below"`. */
  readonly placement?: "below" | "plot";
  /** `placement="below"`: the strip's height in px. Default 64. */
  readonly height?: number;
  /** `placement="below"`: the gap between the plot's bottom and the strip. Default 22. */
  readonly gap?: number;
  /** The smallest extent the scale takes, so a quiet strip stays flat. Default 1. */
  readonly minExtent?: number;
  /** The ± extent labels at the left gutter. Omitted, no labels draw. */
  readonly format?: (value: number) => string;
  /** A caption above the strip's left edge. */
  readonly title?: string;
  /** Extend the chart's crosshair across the strip. Default true. */
  readonly guide?: boolean;
  readonly class?: string;
}

const DAY_MS = 86_400_000;

export function VarianceStrip<T>(props: VarianceStripProps<T>) {
  const ctx = useChart();
  const hatchId = `sui-variance-strip-hatch-${createUniqueId()}`;
  const band = createMemo<VarianceBand>(() =>
    props.placement === "plot"
      ? { top: 0, height: ctx.innerHeight() }
      : { top: ctx.innerHeight() + (props.gap ?? 22), height: props.height ?? 64 },
  );
  const g = createMemo(() =>
    varianceStripGeometry({
      data: map(
        (d: T) => ({ x: props.x(d), value: props.value(d), kind: props.kind?.(d) ?? "other" }),
        props.data,
      ),
      xScale: ctx.xScale(),
      step: props.step ?? DAY_MS,
      band: band(),
      minExtent: props.minExtent ?? 1,
    }),
  );
  const clip = () =>
    props.placement === "plot" ? ctx.clip.plotPathUrl() : ctx.clip.axisStripPathUrl();
  const rootClass = () => (props.class ? `sui-variance-strip ${props.class}` : "sui-variance-strip");
  return (
    <g class={rootClass()}>
      <defs>
        <pattern
          id={hatchId}
          class="sui-variance-strip__hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" />
        </pattern>
      </defs>
      <Show when={props.format}>
        {(f) => (
          <>
            <text class="sui-variance-strip__label" x={-8} y={band().top + 4} text-anchor="end">
              {f()(g().extent)}
            </text>
            <text class="sui-variance-strip__label" x={-8} y={band().top + band().height} text-anchor="end">
              {f()(-g().extent)}
            </text>
          </>
        )}
      </Show>
      <Show when={props.title}>
        <text class="sui-variance-strip__title" x={6} y={band().top - 6}>
          {props.title}
        </text>
      </Show>
      <line class="sui-variance-strip__zero" x1={0} x2={ctx.innerWidth()} y1={g().zeroY} y2={g().zeroY} />
      <g clip-path={clip()}>
        <For each={g().bars}>
          {(b) => (
            <rect
              class={`sui-variance-strip__bar sui-variance-strip__bar--${b.kind}`}
              x={b.x.toFixed(1)}
              y={b.y.toFixed(1)}
              width={b.width.toFixed(1)}
              height={b.height.toFixed(1)}
              fill={b.kind === "costs" ? `url(#${hatchId})` : undefined}
            />
          )}
        </For>
      </g>
      <Show when={(props.guide ?? true) && ctx.hoverX() !== null}>
        <line
          class="sui-variance-strip__guide"
          x1={ctx.xScale()(ctx.hoverX() as number)}
          x2={ctx.xScale()(ctx.hoverX() as number)}
          y1={band().top}
          y2={band().top + band().height}
        />
      </Show>
    </g>
  );
}
