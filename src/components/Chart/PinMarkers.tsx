// `renderPin` is an escape hatch when the descriptor cannot express what
// the consumer needs (otherwise the slot renders one ShapeGlyph per pin).
import {
  Component,
  For,
  JSX,
  Show,
  createEffect,
  createMemo,
  createUniqueId,
  mergeProps,
  onCleanup,
} from "solid-js";
import { useChart } from "./context";
import { DEFAULT_GLYPH_SIZE, ShapeGlyph, type Descriptor } from "./shapes";
import { slotId as brandSlotId, type Id, type ClickHandler, type DblClickHandler, type HoverHandler } from "./slot-types";

export interface Pin {
  id: Id;
  x: number;
  y?: number;
  descriptor: Descriptor;
}

export interface PinMarkersRenderContext {
  cx: number;
  cy: number;
  selected: boolean;
}

/**
 * Where in the chart the pin glyphs render vertically:
 *
 * - `"plot-data"` (default): each pin's `y` resolves through the y-scale.
 *   Missing `y` falls back to plot-top (y=0). Clipped to the plot path.
 * - `"plot-top"` (alias for the legacy default behavior — same as
 *   `"plot-data"`, kept for explicit call-sites): pin y resolves through
 *   the y-scale; consumers that always omit `y` get rendered at plot-top.
 *   Clipped to the plot path.
 * - `"annotation"`: pins render in the dedicated annotation lane carved
 *   out of the top margin (requires `<Chart annotationLaneHeight={N}>`
 *   to be > 0). Each pin's `y` is ignored; cy is the vertical center of
 *   the lane (`-annotationLaneHeight / 2`). Clipped to the annotation-
 *   lane path so glyphs stay horizontally bounded to the plot.
 */
export type PinMarkersLane = "plot-data" | "plot-top" | "annotation";

export interface PinMarkersProps<TPin extends Pin = Pin> {
  data: readonly TPin[];
  selectedId?: Id | null;
  /** Default glyph size in px. Default `DEFAULT_GLYPH_SIZE` from shapes.ts. */
  size?: number;
  /**
   * Vertical placement strategy. See {@link PinMarkersLane}. Default
   * `"plot-data"` (back-compat: pins render at their `y` inside the plot).
   */
  lane?: PinMarkersLane;
  onClick?: ClickHandler<TPin>;
  onDelete?: DblClickHandler<TPin>;
  onHover?: HoverHandler<TPin>;
  /** Escape hatch — full render control per pin. Receives (pin, renderCtx). */
  renderPin?: (pin: TPin, renderCtx: PinMarkersRenderContext) => JSX.Element;
  /**
   * When true and `ctx.hoverX()` is non-null, the pin whose `x` is closest
   * to hoverX renders with `size * emphasisScale`. Default false.
   */
  emphasizeNearestX?: boolean;
  /** Size multiplier applied to the emphasized pin. Default 1.6. */
  emphasisScale?: number;
  class?: string;
}

export interface PinMarkersOverrides {
  size?: number;
  class?: string;
}
export type PinMarkersDataProps<TPin extends Pin = Pin> =
  Omit<PinMarkersProps<TPin>, keyof PinMarkersOverrides>;

export function PinMarkers<TPin extends Pin = Pin>(props: PinMarkersProps<TPin>) {
  const ctx = useChart();
  const slotId = brandSlotId(createUniqueId());
  const merged = mergeProps(
    { size: DEFAULT_GLYPH_SIZE, lane: "plot-data" as PinMarkersLane },
    props,
  );
  const isAnnotationLane = () => merged.lane === "annotation";
  // Vertical center of the annotation lane in plot-local coords (negative
  // because the lane lives ABOVE y=0). Falls back to 0 if the chart isn't
  // hosting a lane — keeps the visual identical to plot-top in that case
  // rather than rendering off-canvas.
  const annotationCy = () => {
    const h = ctx.annotationLaneHeight();
    return h > 0 ? -h / 2 : 0;
  };
  const clipPath = () =>
    isAnnotationLane() ? ctx.clip.annotationLanePathUrl() : ctx.clip.plotPathUrl();
  // Nearest pin + its distance to hoverX (DATA-domain units). `null` when
  // emphasis is disabled, no hover, no data, or no valid candidate.
  const nearest = createMemo<{ idx: number; dist: number } | null>(() => {
    if (!merged.emphasizeNearestX) return null;
    const hx = ctx.hoverX();
    if (hx == null) return null;
    const best = merged.data.reduce<{ idx: number; dist: number }>(
      (acc, pin, i) => {
        const dist = Math.abs(pin.x - hx);
        return dist < acc.dist ? { idx: i, dist } : acc;
      },
      { idx: -1, dist: Infinity },
    );
    return best.idx < 0 ? null : best;
  });
  const nearestIdx = createMemo(() => nearest()?.idx ?? -1);

  // Participate in the chart-level "nearest emphasis" coordinator.
  createEffect(() => {
    const n = nearest();
    if (n == null) {
      ctx.emphasis.clear(slotId);
    } else {
      ctx.emphasis.report(slotId, n.dist);
    }
  });
  onCleanup(() => ctx.emphasis.clear(slotId));

  const isWinner = () => ctx.emphasis.winnerId() === slotId;

  // Pins are decorative when the consumer hasn't wired ANY pointer handler
  // (the chevron use-case in DotChart, for example, is a pure bounds
  // indicator). Letting decorative pins capture pointer events steals
  // `:hover` / `data-hovered` from the highlight rects beneath when the
  // cursor crosses a chevron at an alarm edge. So: pointer-events on only
  // when at least one handler is provided.
  const interactive = (): boolean =>
    merged.onClick != null || merged.onDelete != null || merged.onHover != null;

  return (
    <g
      class={`sui-chart__pin-markers${merged.class ? " " + merged.class : ""}`}
      clip-path={clipPath()}
      data-lane={merged.lane}
      style={{ "pointer-events": interactive() ? undefined : "none" }}
    >
      <For each={merged.data}>
        {(pin, i) => {
          const cx = () => ctx.xScale()(pin.x);
          // Annotation-lane pins ignore `pin.y` entirely — they live in
          // the reserved band above the plot. Plot-lane pins keep the
          // existing y-scale + plot-top fallback behavior.
          const cy = () => {
            if (isAnnotationLane()) return annotationCy();
            return pin.y != null ? ctx.yScale()(pin.y) : 0;
          };
          const selected = () => merged.selectedId === pin.id;
          const isEmphasized = () => isWinner() && i() === nearestIdx();
          const glyphSize = () => {
            const base = pin.descriptor.size ?? merged.size;
            return isEmphasized() ? base * (merged.emphasisScale ?? 1.6) : base;
          };
          return (
            <g
              class="sui-chart__pin-marker"
              data-id={pin.id}
              data-selected={selected() ? "true" : undefined}
              data-emphasized={isEmphasized() ? "true" : undefined}
              onPointerDown={(e) => merged.onClick?.(pin, e)}
              onDblClick={(e) => merged.onDelete?.(pin, e)}
              onPointerEnter={(e) => merged.onHover?.(pin, e)}
              onPointerLeave={(e) => merged.onHover?.(null, e)}
              style={{ cursor: merged.onClick ? "pointer" : undefined }}
            >
              <Show
                when={merged.renderPin}
                fallback={
                  <ShapeGlyph
                    descriptor={pin.descriptor}
                    cx={cx()}
                    cy={cy()}
                    size={glyphSize()}
                  />
                }
              >
                {(rp) => <>{() => rp()(pin, { cx: cx(), cy: cy(), selected: selected() })}</>}
              </Show>
            </g>
          );
        }}
      </For>
    </g>
  );
}

export function createPinMarkers<TPin extends Pin = Pin>(
  defaults: Partial<Omit<PinMarkersProps<TPin>, "children">>,
): Component<PinMarkersDataProps<TPin>> {
  return (props) => <PinMarkers<TPin> {...mergeProps(defaults, props as PinMarkersProps<TPin>)} />;
}
