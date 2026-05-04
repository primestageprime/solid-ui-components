import type { JSX } from "solid-js";

export type DAGNode<T = unknown> = {
  id: string;
  data: T;
};

export type DAGEdge = {
  source: string;
  target: string;
};

export type NodeRenderState =
  | { kind: "focused" }
  | { kind: "adjacent" }
  | { kind: "normal" }
  | { kind: "collapsed"; collapsedCount: number };

export type DAGProps<T = unknown> = {
  nodes: DAGNode<T>[];
  edges: DAGEdge[];
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
  nodeSize?: (node: DAGNode<T>) => [width: number, height: number];
  direction?: "horizontal" | "vertical";
  onNodeClick?: (nodeId: string) => void;
  focusedNodeId?: string;
  /**
   * Render arrowheads at the end of each edge. Defaults to `true` —
   * a DAG is directed and most consumers want the direction visible.
   * Set `false` for an undirected look.
   */
  arrows?: boolean;
  /**
   * Enable pan (drag) and zoom (wheel) on the SVG. Defaults to `true`.
   * Set `false` for static diagrams (e.g. embedded specs / read-only
   * status displays) where the chart should fit-to-view and stay put.
   */
  interactive?: boolean;
};

/** Internal: positioned node after layout + collapse. */
export type PositionedNode<T = unknown> = {
  node: DAGNode<T>;
  x: number;
  y: number;
  width: number;
  height: number;
  state: NodeRenderState;
};

/** Internal: edge path after layout. */
export type LayoutEdge = {
  sourceId: string;
  targetId: string;
  points: Array<{ x: number; y: number }>;
};
