import type { JSX } from "solid-js";

export type DagSvgEdgeProps = {
  /** SVG path `d` attribute. */
  d: string;
  /** CSS class(es) for the path element. */
  class?: string;
  /** When set, applies marker-end={`url(#${arrowMarkerId})`} for an arrowhead. */
  arrowMarkerId?: string;
  /**
   * Optional classification token, emitted verbatim as `data-kind`. Charts
   * that paint edges by a caller-supplied category (e.g. a diff's
   * added/removed) use it so the category is readable from the DOM rather
   * than parsed back out of the class string. Omit it and no attribute is
   * written.
   */
  dataKind?: string;
};

/**
 * Base edge path. Charts that need extras (hover hitarea, label, delete
 * badge, highlight class) layer those as sibling elements; this component
 * is just the visible stroke + optional arrowhead. Pointer events are
 * disabled on the path so siblings (e.g. a wider hitarea) can capture them.
 */
export function DagSvgEdge(props: DagSvgEdgeProps): JSX.Element {
  return (
    <path
      class={props.class}
      d={props.d}
      marker-end={
        props.arrowMarkerId ? `url(#${props.arrowMarkerId})` : undefined
      }
      data-kind={props.dataKind}
      style={{ "pointer-events": "none" }}
    />
  );
}
