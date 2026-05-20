import type { JSX } from "solid-js";
import type { DAGNode, NodeRenderState } from "../types";

export type DagSvgNodeProps<T> = {
  node: DAGNode<T>;
  state: NodeRenderState;
  /** Center coordinates and dimensions of the node. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** CSS class for the wrapper `<foreignObject>`. */
  wrapperClass?: string;
  /** Fired on click of the node. */
  onClick?: (id: string) => void;
  /** Consumer-provided render callback for the node body. */
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
};

/**
 * SVG foreignObject node wrapper. Stops pointer-down propagation so node
 * interactions don't trigger the chart's pan handler. Calls `onClick` with
 * the node id when clicked.
 */
export function DagSvgNode<T>(props: DagSvgNodeProps<T>): JSX.Element {
  return (
    <foreignObject
      x={props.x - props.width / 2}
      y={props.y - props.height / 2}
      width={props.width}
      height={props.height}
      class={props.wrapperClass}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => props.onClick?.(props.node.id)}
        style={{ width: "100%", height: "100%", cursor: "pointer" }}
      >
        {props.renderNode(props.node, props.state)}
      </div>
    </foreignObject>
  );
}
