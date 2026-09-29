// ============================================
// SegmentBar — Primitive (Depth 1). SVG mark; composes no library components.
// Owns SvgMarks.css (seam and hover paint).
//
// One bar made of consecutive SEGMENTS, drawn inside the box it is handed and
// clipped to a rounded rectangle: phases of a job, stages of a pipeline, the
// states a thing passed through. Each segment is a stretch of the box's width
// in FRACTIONS and any SVG paint (a colour, a token, or a `url(#hatch)`), so
// the mark knows no unit and no domain. A segment that begins where the last
// one ended gets a hairline seam. `hovered` draws an outline.
//
// THE BOX CONTRACT (see ./geometry.ts): the mark never positions itself.
// ============================================
import {
  type Component,
  Index,
  Show,
  createUniqueId,
  mergeProps,
} from "solid-js";
import { type SegmentSpec, type SvgBox, segmentRects } from "./geometry";
import "./SvgMarks.css";

export interface SegmentBarProps {
  readonly box: SvgBox;
  readonly segments: readonly SegmentSpec[];
  /** Draw the hover outline. */
  readonly hovered?: boolean;
  /** Corner radius in user units. Default 4. */
  readonly radius?: number;
}

export type SegmentBarOverrides = Pick<SegmentBarProps, "radius">;
export type SegmentBarDataProps = Omit<
  SegmentBarProps,
  keyof SegmentBarOverrides
>;

export const SegmentBar: Component<SegmentBarProps> = (raw) => {
  const props = mergeProps({ radius: 4 }, raw);
  const clip = `sui-segment-bar-clip-${createUniqueId()}`;
  const rects = () => segmentRects(props.box, props.segments);
  return (
    <g class="sui-segment-bar" data-hovered={props.hovered ? "" : undefined}>
      <clipPath id={clip}>
        <rect
          x={props.box.x}
          y={props.box.y}
          width={props.box.width}
          height={props.box.height}
          rx={props.radius}
        />
      </clipPath>
      <g clip-path={`url(#${clip})`}>
        <Index each={rects()}>
          {(r) => (
            <rect
              x={r().x}
              y={props.box.y}
              width={r().width}
              height={props.box.height}
              fill={r().fill}
            />
          )}
        </Index>
        <Index each={rects()}>
          {(r) => (
            <Show when={r().seam}>
              <line
                class="sui-segment-bar__seam"
                x1={r().x}
                x2={r().x}
                y1={props.box.y}
                y2={props.box.y + props.box.height}
              />
            </Show>
          )}
        </Index>
      </g>
      <rect
        class="sui-segment-bar__hover"
        x={props.box.x - 1}
        y={props.box.y - 1}
        width={props.box.width + 2}
        height={props.box.height + 2}
        rx={props.radius + 1}
      />
    </g>
  );
};

export function createSegmentBar(
  defaults: Partial<SegmentBarOverrides>,
): Component<SegmentBarDataProps> {
  return (props) => <SegmentBar {...mergeProps(defaults, props)} />;
}
