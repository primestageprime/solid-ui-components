import type { JSX } from "solid-js";

export type DagArrowMarkerProps = {
  /** Element id to reference with marker-end="url(#<id>)". */
  id: string;
  /** CSS class applied to the arrow path. Use this to theme the fill via the
   * existing chart CSS (e.g. "sui-dag__arrow" or "sui-swimlane__arrow"). */
  pathClass: string;
};

/**
 * SVG arrowhead marker definition. Drop this inside a `<defs>` block in your
 * chart's `<svg>`. Reference it with marker-end={`url(#${id})`}.
 */
export function DagArrowMarker(props: DagArrowMarkerProps): JSX.Element {
  return (
    <marker
      id={props.id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" class={props.pathClass} />
    </marker>
  );
}
