// Anchored to context.hoverX; `descriptor=null` hides the ghost.
import { Component, Show, mergeProps } from "solid-js";
import { useChart } from "./context";
import { ShapeGlyph, type Descriptor } from "./shapes";

export interface GhostPinProps {
  /** Descriptor for the ghost glyph, or null to hide. */
  descriptor: Descriptor | null;
  /** Y position in data domain. Defaults to top edge of plot area. */
  y?: number;
  /** Override glyph size. Default 12. */
  size?: number;
  /** Opacity multiplier (0..1). Default 0.4. */
  opacity?: number;
  class?: string;
}

export interface GhostPinOverrides {
  size?: number;
  opacity?: number;
  class?: string;
}
export type GhostPinDataProps = Omit<GhostPinProps, keyof GhostPinOverrides>;

export const GhostPin: Component<GhostPinProps> = (props) => {
  const ctx = useChart();
  const merged = mergeProps({ size: 12, opacity: 0.4 }, props);
  return (
    <Show when={merged.descriptor != null && ctx.hoverX() != null}>
      <g
        class={`sui-chart__ghost-pin${merged.class ? " " + merged.class : ""}`}
        opacity={merged.opacity}
        aria-hidden="true"
        pointer-events="none"
        clip-path={ctx.clipPathUrl()}
      >
        <ShapeGlyph
          descriptor={merged.descriptor!}
          cx={ctx.xScale()(ctx.hoverX()!)}
          cy={merged.y != null ? ctx.yScale()(merged.y) : 0}
          size={merged.size}
        />
      </g>
    </Show>
  );
};

export function createGhostPin(
  defaults: Partial<Omit<GhostPinProps, "children">>,
): Component<GhostPinDataProps> {
  return (props) => <GhostPin {...mergeProps(defaults, props as GhostPinProps)} />;
}
