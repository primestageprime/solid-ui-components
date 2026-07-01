// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Anchored to context.hoverX; `descriptor=null` hides the ghost.
import { type Component, Show, mergeProps } from "solid-js";
import { useChart } from "./context";
import { ShapeGlyph, type Descriptor } from "./shapes";
import type { AnnotationLane } from "./slot-types";

/**
 * Where in the chart the ghost glyph renders vertically. See
 * {@link AnnotationLane} for the variant semantics. In `"plot-data"` mode
 * with no `y`, the ghost renders at plot-top (y=0).
 */
export type GhostPinLane = AnnotationLane;

export interface GhostPinProps {
  /** Descriptor for the ghost glyph, or null to hide. */
  descriptor: Descriptor | null;
  /** Y position in data domain. Defaults to top edge of plot area. Ignored when `lane === "annotation"`. */
  y?: number;
  /** Override glyph size. Default 12. */
  size?: number;
  /** Opacity multiplier (0..1). Default 0.4. */
  opacity?: number;
  /** Vertical placement strategy. See {@link GhostPinLane}. Default `"plot-data"`. */
  lane?: GhostPinLane;
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
  const merged = mergeProps(
    { size: 12, opacity: 0.4, lane: "plot-data" as GhostPinLane },
    props,
  );
  const isAnnotationLane = () => merged.lane === "annotation";
  // Vertical center of the annotation lane in plot-local coords. Falls
  // back to 0 when the chart isn't hosting a lane — keeps the glyph
  // visible rather than rendering off-canvas.
  const annotationCy = () => {
    const h = ctx.annotationLaneHeight();
    return h > 0 ? -h / 2 : 0;
  };
  const clipPath = () =>
    isAnnotationLane() && ctx.annotationLaneHeight() > 0
      ? ctx.clip.annotationLanePathUrl()
      : ctx.clip.plotPathUrl();
  const cy = () => {
    if (isAnnotationLane()) return annotationCy();
    return merged.y != null ? ctx.yScale()(merged.y) : 0;
  };
  return (
    <Show when={merged.descriptor != null && ctx.hoverX() != null}>
      <g
        class={`sui-chart__ghost-pin${merged.class ? " " + merged.class : ""}`}
        opacity={merged.opacity}
        aria-hidden="true"
        pointer-events="none"
        clip-path={clipPath()}
        data-lane={merged.lane}
      >
        <ShapeGlyph
          descriptor={merged.descriptor!}
          cx={ctx.xScale()(ctx.hoverX()!)}
          cy={cy()}
          size={merged.size}
        />
      </g>
    </Show>
  );
};

export function createGhostPin(
  defaults: Partial<Omit<GhostPinProps, "children">>,
): Component<GhostPinDataProps> {
  return (props) => (
    <GhostPin {...mergeProps(defaults, props as GhostPinProps)} />
  );
}
