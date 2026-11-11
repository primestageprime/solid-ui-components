// ============================================
// SlotStackMarks — Structural Primitive (Depth 1), a slot child of `Chart`.
// Tags: shows:mark, shows:bar, does:view, does:hover, data:multi-series, data:grouped, role:slot
// Owns CSS (SlotStackChart.css). Composes HatchPattern (SvgMarks, Depth 1).
//
// Draws every slot of a slot stack inside the chart's plot: the fills, the
// transparent rest of each container, and the two border paths (solid round
// the fill, dashed round what is unfilled; the overflow has no border). The
// geometry is `layoutSlots` (./slotStackGeometry.ts), recomputed from the
// chart's scales, so the marks follow a chart that measures its own box.
//
// TWO STATES. Given `totals`, a column at rest is ONE slot (its own expected
// and actual) in the chart's default blue, `--sui-accent` (Peter: "instead
// of white, use the normal blue default color for the dollars chart"), or
// in `totalPaint`; the column under the pointer is its per-series
// slots in the series colours. Which is which is `visibleSlots`; this file
// only feeds it the chart's own `hoverX`. Nothing holds the height steady
// between the two, and nothing animates it.
//
// READ-ONLY BY CONSTRUCTION: no handler, no role, no tabindex, no grip. The
// hover is read from the Chart root's pointer signal, so this mark adds no
// listener of its own; a part answers the pointer with an SVG <title>.
// ============================================
import { type Component, For, Index, Show, createMemo } from "solid-js";
import { useChart } from "../Chart/context";
import { seriesPaint } from "../Chart/StackedAreaSeries";
import { createHatchPattern } from "../SvgMarks";
import {
  type PlacedSlot,
  type SlotFill,
  type SlotFillPaint,
  type SlotStackExpand,
  type SlotStackSeries,
  type SlotStackSlot,
  type SlotStackStatus,
  SLOT_STACK_TOTAL_INDEX,
  hoveredPeriod,
  layoutSlots,
  visibleSlots,
} from "./slotStackGeometry";
import "./SlotStackChart.css";

export interface SlotStackMarksProps {
  /** The stack, BOTTOM FIRST. A series' place is its colour. */
  readonly series: readonly SlotStackSeries[];
  /**
   * Each column's own slot (its expected and actual, netted by the caller).
   * Given, a column at rest draws this one slot in neutral and only an
   * expanded column draws its series. Omitted, every column is its series.
   */
  readonly totals?: readonly SlotStackSlot[];
  /** When a column shows its series. Default "hover". Needs `totals`. */
  readonly expand?: SlotStackExpand;
  /** The chart's periods: the columns the pointer can be over. */
  readonly periods: readonly number[];
  /** What a column's own slot is called in its hover text. */
  readonly totalLabel: string;
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
  /** A series' paint by its place. Default: the theme's series tokens. */
  readonly paintOfSeries?: (seriesIndex: number) => string;
  /**
   * What a column's own slot is painted with: fill, dashes and stripes
   * alike. Default `SLOT_STACK_TOTAL_PAINT`, the theme's accent blue.
   */
  readonly totalPaint?: string;
}

/** The container outline's stroke width, in px. */
const THIN = 1.5;

/**
 * A column's own slot belongs to no series, so it takes no series colour:
 * it is drawn in the chart's default blue (Peter, 2026-11-10: "instead of
 * white, use the normal blue default color for the dollars chart").
 */
export const SLOT_STACK_TOTAL_PAINT = "var(--sui-accent)";

/* The textures, in the slot's colour. The stripes are the mockup's: a 2.4px
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
  const totalPaint = (): string => props.totalPaint ?? SLOT_STACK_TOTAL_PAINT;
  const colorOf = (i: number): string =>
    i === SLOT_STACK_TOTAL_INDEX
      ? totalPaint()
      : (props.paintOfSeries ?? seriesPaint)(i);
  const patternId = (paint: SlotFillPaint, i: number): string =>
    `${props.paintId}-${paint}-${i === SLOT_STACK_TOTAL_INDEX ? "total" : i}`;
  const paintOf = (fill: SlotFill, i: number): string =>
    fill.paint === "solid" ? colorOf(i) : `url(#${patternId(fill.paint, i)})`;

  /* The one piece of state, and it is the Chart root's: where the pointer is.
     A memo, so moving WITHIN a column re-places nothing. */
  const hovered = createMemo(() => hoveredPeriod(ctx.hoverX(), props.periods));

  /* A memo over the scales, never a read inside a row: `For` keeps a row's
     nodes, so a scale read there runs once and the marks would stay laid out
     for the chart's first (fallback) size. */
  const boxes = createMemo(() =>
    layoutSlots(
      visibleSlots(
        props.series,
        props.totals,
        props.expand ?? "hover",
        hovered(),
        props.totalLabel,
      ),
      ctx.xScale(),
      ctx.yScale(),
      { band: props.band, gap: props.gap, thin: THIN },
    ),
  );

  return (
    <g class="sui-slot-stack" clip-path={ctx.clip.plotPathUrl()}>
      <For each={TEXTURES}>
        {(texture) => (
          <>
            <texture.Pattern
              id={patternId(texture.paint, SLOT_STACK_TOTAL_INDEX)}
              color={totalPaint()}
            />
            <Index each={props.series}>
              {(_series, i) => (
                <texture.Pattern id={patternId(texture.paint, i)} color={colorOf(i)} />
              )}
            </Index>
          </>
        )}
      </For>
      <For each={boxes()}>
        {(box) => {
          const i = box.placed.seriesIndex;
          const slot = box.placed.slot;
          return (
            <g
              class="sui-slot-stack__slot"
              data-slot={i === SLOT_STACK_TOTAL_INDEX ? "total" : "series"}
            >
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
            </g>
          );
        }}
      </For>
    </g>
  );
};
