// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// PinMarkers — Structural (Depth 1). SVG chart slot (renders ShapeGlyph, a same-dir render helper).
// `renderPin` is an escape hatch when the descriptor cannot express what
// the consumer needs (otherwise the slot renders one ShapeGlyph per pin).
import {
  type Component,
  For,
  type JSX,
  Show,
  createEffect,
  createMemo,
  createUniqueId,
  mergeProps,
  onCleanup,
} from "solid-js";
import { clickableCursor } from "../../internal/style/clickable";
import { useChart } from "./context";
import { DEFAULT_GLYPH_SIZE, ShapeGlyph, type Descriptor } from "./shapes";
import {
  slotId as brandSlotId,
  type AnnotationLane,
  type Id,
  type ClickHandler,
  type DblClickHandler,
  type HoverHandler,
} from "./slot-types";

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
 * Where in the chart the pin glyphs render vertically. See
 * {@link AnnotationLane} for the variant semantics. For PinMarkers
 * specifically, the `"plot-data"` fallback for a pin with no `y` is
 * the plot top (y=0).
 */
export type PinMarkersLane = AnnotationLane;

export interface PinMarkersProps<TPin extends Pin = Pin> {
  data: readonly TPin[];
  selectedId?: Id | null;
  /**
   * IDs externally driven into the same visual state as CSS `:hover`
   * (raised emphasis flag). Independent of `selectedId` and the internal
   * `emphasizeNearestX` channel — all three can apply simultaneously,
   * and the `data-emphasized` attribute lights up if ANY of them flags
   * the pin. Use this to mirror hover from a sibling slot (e.g. when an
   * alarm edge is hovered, emphasize every pin that points at it).
   */
  emphasizedIds?: ReadonlySet<Id>;
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
export type PinMarkersDataProps<TPin extends Pin = Pin> = Omit<
  PinMarkersProps<TPin>,
  keyof PinMarkersOverrides
>;

export function PinMarkers<TPin extends Pin = Pin>(
  props: PinMarkersProps<TPin>,
) {
  const ctx = useChart();
  const slotId = brandSlotId(createUniqueId());
  const merged = mergeProps(
    { size: DEFAULT_GLYPH_SIZE, lane: "plot-data" as PinMarkersLane },
    props,
  );
  const isAnnotationLane = () => merged.lane === "annotation";
  // Vertical center of the annotation lane in plot-local coords (negative
  // because the lane lives ABOVE y=0). Falls back to 0 if the chart isn't
  // hosting a lane — degrades to the plot-top fallback rather than
  // rendering off-canvas.
  const annotationCy = () => {
    const h = ctx.annotationLaneHeight();
    return h > 0 ? -h / 2 : 0;
  };
  const clipPath = () =>
    isAnnotationLane() && ctx.annotationLaneHeight() > 0
      ? ctx.clip.annotationLanePathUrl()
      : ctx.clip.plotPathUrl();
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

  // Decorative pins (no pointer handlers wired) must not capture pointer
  // events — otherwise they steal `:hover` / `data-hovered` from siblings
  // beneath. Enable pointer-events only when at least one handler is set.
  const interactive = (): boolean =>
    merged.onClick != null || merged.onDelete != null || merged.onHover != null;

  return (
    <g
      class={`sui-chart__pin-markers${merged.class ? ` ${merged.class}` : ""}`}
      classList={{ "sui-chart__pin-markers--inert": !interactive() }}
      clip-path={clipPath()}
      data-lane={merged.lane}
    >
      <For each={merged.data}>
        {(pin, i) => {
          const cx = () => ctx.xScale()(pin.x);
          // Annotation-lane pins ignore `pin.y` entirely — they live in
          // the reserved band above the plot. Plot-lane pins resolve `y`
          // through the y-scale, falling back to y=0 when omitted.
          const cy = () => {
            if (isAnnotationLane()) return annotationCy();
            return pin.y != null ? ctx.yScale()(pin.y) : 0;
          };
          const selected = () => merged.selectedId === pin.id;
          // Nearest-X winner: drives glyph size scaling (the per-chart
          // "magnify the closest pin" affordance).
          const isNearestEmphasized = () => isWinner() && i() === nearestIdx();
          // External emphasis: sibling-slot hover sync. Flips
          // `data-emphasized` but does NOT scale the glyph — same contract
          // as HighlightSegments.emphasizedIds.
          const isExternallyEmphasized = () =>
            merged.emphasizedIds?.has(pin.id) ?? false;
          const isEmphasized = () =>
            isNearestEmphasized() || isExternallyEmphasized();
          const glyphSize = () => {
            const base = pin.descriptor.size ?? merged.size;
            return isNearestEmphasized()
              ? base * (merged.emphasisScale ?? 1.6)
              : base;
          };
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: interactive role/tabIndex + Enter/Space keyboard parity are wired dynamically when onClick is provided; the analyzer can't see the conditional role
            <g
              class="sui-chart__pin-marker"
              role={merged.onClick ? "button" : undefined}
              tabIndex={merged.onClick ? 0 : undefined}
              data-id={pin.id}
              data-selected={selected() ? "true" : undefined}
              data-emphasized={isEmphasized() ? "true" : undefined}
              onPointerDown={(e) => merged.onClick?.(pin, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  merged.onClick?.(pin, e as unknown as PointerEvent);
                }
              }}
              onDblClick={(e) => merged.onDelete?.(pin, e)}
              onPointerEnter={(e) => merged.onHover?.(pin, e)}
              onPointerLeave={(e) => merged.onHover?.(null, e)}
              style={clickableCursor(!!merged.onClick)}
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
                {(rp) => (
                  <>
                    {() =>
                      rp()(pin, { cx: cx(), cy: cy(), selected: selected() })
                    }
                  </>
                )}
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
  return (props) => (
    <PinMarkers<TPin>
      {...mergeProps(defaults, props as PinMarkersProps<TPin>)}
    />
  );
}
