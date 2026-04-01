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
