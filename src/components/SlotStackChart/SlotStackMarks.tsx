// ============================================
// SlotStackMarks — Structural Primitive (Depth 1), a slot child of `Chart`.
// Tags: shows:mark, shows:bar, does:view, does:hover, data:multi-series, data:grouped, role:slot
// Owns CSS (SlotStackChart.css). Composes HatchPattern (SvgMarks, Depth 1).
//
// Draws every slot of a slot stack inside the chart's plot: the fills, the
// transparent rest of each container, and the three border paths. The
// geometry is `layoutSlots` (./slotStackGeometry.ts), recomputed from the
// chart's scales, so the marks follow a chart that measures its own box.
//
// READ-ONLY BY CONSTRUCTION: no handler, no role, no tabindex, no grip. A
// part answers the pointer with an SVG <title> and nothing else.
// ============================================
import { type Component, For, Index, Show, createMemo } from "solid-js";
import { useChart } from "../Chart/context";
import { seriesPaint } from "../Chart/StackedAreaSeries";
import { createHatchPattern } from "../SvgMarks";
import {
  type PlacedSlot,
  type SlotFill,
  type SlotFillPaint,
  type SlotStackSeries,
  type SlotStackStatus,
  layoutSlots,
  placeSlots,
} from "./slotStackGeometry";
import "./SlotStackChart.css";

export interface SlotStackMarksProps {
  /** The stack, BOTTOM FIRST. A series' place is its colour. */
  readonly series: readonly SlotStackSeries[];
  /** Unique per chart: the hatch patterns' ids are built on it. */
  readonly paintId: string;
  /** A part's hover text. */
  readonly title: (
    placed: PlacedSlot,
    part: "filled" | "unfilled" | "overflow",
    value: number,
    status: SlotStackStatus | null,
  ) => string;
  /** A column's width as a fraction of its period. */
  readonly band: number;
  /** Pixels of ground between two slots of a column. */
  readonly gap: number;
  /** The overflow border's stroke width, in px. */
  readonly heavy: number;
  /** A series' paint by its place. Default: the theme's series tokens. */
  readonly paintOfSeries?: (seriesIndex: number) => string;
}

/** The container outline's stroke width, in px. */
const THIN = 1.5;

/* The textures, in the series colour. The stripes are the mockup's: a 2.4px
   stripe on a 6px tile, over a ground of the same colour. */
const STRIPES = { stripe: 2.4, gap: 3.6 };
const TEXTURES: readonly {
  readonly paint: Exclude<SlotFillPaint, "solid">;
  readonly Pattern: ReturnType<typeof createHatchPattern>;
}[] = [
  { paint: "tint", Pattern: createHatchPattern({ groundOpacity: 0.45, stripeOpacity: 0 }) },
  { paint: "light", Pattern: createHatchPattern({ groundOpacity: 0.18, stripeOpacity: 0 }) },
  { paint: "hatch", Pattern: createHatchPattern({ ...STRIPES, groundOpacity: 0.28, stripeOpacity: 1 }) },
  { paint: "hatch-tint", Pattern: createHatchPattern({ ...STRIPES, groundOpacity: 0.18, stripeOpacity: 0.6 }) },
  { paint: "hatch-light", Pattern: createHatchPattern({ ...STRIPES, groundOpacity: 0.08, stripeOpacity: 0.32 }) },
];

export const SlotStackMarks: Component<SlotStackMarksProps> = (props) => {
  const ctx = useChart();
  const colorOf = (i: number): string =>
    (props.paintOfSeries ?? seriesPaint)(i);
  const patternId = (paint: SlotFillPaint, i: number): string =>
    `${props.paintId}-${paint}-${i}`;
  const paintOf = (fill: SlotFill, i: number): string =>
    fill.paint === "solid" ? colorOf(i) : `url(#${patternId(fill.paint, i)})`;

  /* A memo over the scales, never a read inside a row: `For` keeps a row's
     nodes, so a scale read there runs once and the marks would stay laid out
     for the chart's first (fallback) size. */
  const boxes = createMemo(() =>
    layoutSlots(placeSlots(props.series), ctx.xScale(), ctx.yScale(), {
      band: props.band,
      gap: props.gap,
      thin: THIN,
      heavy: props.heavy,
    }),
  );

  return (
    <g class="sui-slot-stack" clip-path={ctx.clip.plotPathUrl()}>
      <Index each={props.series}>
        {(_series, i) => (
          <For each={TEXTURES}>
            {(texture) => (
              <texture.Pattern id={patternId(texture.paint, i)} color={colorOf(i)} />
            )}
          </For>
        )}
      </Index>
      <For each={boxes()}>
        {(box) => {
          const i = box.placed.seriesIndex;
          const slot = box.placed.slot;
          return (
            <>
              <For each={box.fills}>
                {(fill) => (
                  <rect
                    class="sui-slot-stack__fill"
                    data-part={fill.part}
                    data-status={fill.status ?? undefined}
                    x={box.x}
                    y={fill.y}
                    width={box.width}
                    height={fill.height}
                    fill={paintOf(fill, i)}
                  >
                    <title>
                      {props.title(box.placed, fill.part, fill.value, fill.status)}
                    </title>
                  </rect>
                )}
              </For>
              <Show when={box.dashed !== null}>
                <rect
                  class="sui-slot-stack__unfilled"
                  data-part="unfilled"
                  x={box.x}
                  y={box.expectedTop}
                  width={box.width}
                  height={box.fillTop - box.expectedTop}
                >
                  <title>
                    {props.title(box.placed, "unfilled", slot.unfilled, null)}
                  </title>
                </rect>
              </Show>
              <Show when={box.solid}>
                {(d) => (
                  <path
                    class="sui-slot-stack__solid"
                    d={d()}
                    stroke={colorOf(i)}
                    stroke-width={THIN}
                  />
                )}
              </Show>
              <Show when={box.dashed}>
                {(d) => (
                  <path
                    class="sui-slot-stack__dashed"
                    d={d()}
                    stroke={colorOf(i)}
                    stroke-width={THIN}
                  />
                )}
              </Show>
              <Show when={box.heavy}>
                {(d) => (
                  <path
                    class="sui-slot-stack__heavy"
                    d={d()}
                    stroke-width={props.heavy}
                  />
                )}
              </Show>
            </>
          );
        }}
      </For>
    </g>
  );
};
