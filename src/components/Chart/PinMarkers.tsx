// ============================================
// PinMarkers — Chart slot (Depth 2).
// Renders a descriptor-anchored glyph per pin. `y` is optional; defaults
// to the top edge of the plot area (y=0 in pixel space). Supports
// selection + click/delete callbacks. `renderPin` is an escape hatch
// when the descriptor cannot express what the consumer needs.
// ============================================
import { Component, For, JSX, Show, mergeProps } from "solid-js";
import { useChart } from "./context";
import { ShapeGlyph, type Descriptor } from "./shapes";
import type { Id, ClickHandler, DblClickHandler } from "./slot-types";

export interface Pin<TDomain = unknown> {
  id: Id;
  x: number;
  y?: number;
  descriptor: Descriptor;
  data?: TDomain;
}

export interface PinMarkersRenderContext {
  cx: number;
  cy: number;
  selected: boolean;
}

export interface PinMarkersProps<TPin extends Pin = Pin> {
  data: readonly TPin[];
  selectedId?: Id | null;
  /** Default glyph size in px. Default 12 (matches DEFAULT_GLYPH_SIZE in shapes.ts). */
  size?: number;
  onClick?: ClickHandler<TPin>;
  onDelete?: DblClickHandler<TPin>;
  /** Escape hatch — full render control per pin. Receives (pin, renderCtx). */
  renderPin?: (pin: TPin, renderCtx: PinMarkersRenderContext) => JSX.Element;
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
  const merged = mergeProps({ size: 12 }, props);

  return (
    <g class={`sui-chart__pin-markers${merged.class ? " " + merged.class : ""}`}>
      <For each={merged.data}>
        {(pin) => {
          const cx = () => ctx.xScale()(pin.x);
          const cy = () => (pin.y != null ? ctx.yScale()(pin.y) : 0);
          const selected = () => merged.selectedId === pin.id;
          return (
            <g
              class="sui-chart__pin-marker"
              data-id={pin.id}
              data-selected={selected() ? "true" : undefined}
              onPointerDown={(e) => merged.onClick?.(pin, e)}
              onDblClick={(e) => merged.onDelete?.(pin, e)}
              style={{ cursor: merged.onClick ? "pointer" : undefined }}
            >
              <Show
                when={merged.renderPin}
                fallback={
                  <ShapeGlyph
                    descriptor={pin.descriptor}
                    cx={cx()}
                    cy={cy()}
                    size={pin.descriptor.size ?? merged.size}
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
