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

export interface PinMarkersProps<TPin extends Pin = Pin> {
  data: readonly TPin[];
  selectedId?: Id | null;
  /** Default glyph size in px. Default `DEFAULT_GLYPH_SIZE` from shapes.ts. */
  size?: number;
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
  const merged = mergeProps({ size: DEFAULT_GLYPH_SIZE }, props);
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

  return (
    <g
      class={`sui-chart__pin-markers${merged.class ? " " + merged.class : ""}`}
      clip-path={ctx.clip.plotPathUrl()}
    >
      <For each={merged.data}>
        {(pin, i) => {
          const cx = () => ctx.xScale()(pin.x);
          const cy = () => (pin.y != null ? ctx.yScale()(pin.y) : 0);
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
