import type { JSX } from "solid-js";

export type DAGNode<T = unknown> = {
  id: string;
  data: T;
};

export type DAGEdge = {
  source: string;
  target: string;
  /**
   * Optional label rendered as small text at the edge midpoint.
   * Useful for counters (e.g. "↶ 3" on backward edges to show how
   * many times the transition has fired) or short hints. Empty
   * string and undefined are treated the same: no label drawn.
   */
  label?: string;
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
  /**
   * Optional per-node rank hint. Returning a number pins that node to a
   * specific layer position (lower rank = earlier layer; 0 = leftmost in
   * horizontal / topmost in vertical). Same-rank nodes are forced to share a
   * layer. Unranked nodes (`undefined`) are placed freely by the layout
   * optimiser. Useful for kanban-style DAGs that want fixed columns
   * (e.g. DONE / DOING / TODO) regardless of dep depth. Internally wired to
   * d3-dag's `layeringSimplex().rank().group()`.
   */
  nodeRank?: (node: DAGNode<T>) => number | undefined;
  /**
   * Spacing budgeted around each node, in screen axes: `[xGap, yGap]`
   * (same orientation as `nodeSize`'s `[width, height]`). `xGap` is the
   * horizontal gap between neighbouring nodes, `yGap` the vertical gap.
   * In a horizontal-flow DAG the inter-column corridor is `xGap`, so raise
   * it when edges carry labels wide enough to collide with the node boxes.
   * Defaults to `[40, 40]`.
   */
  gap?: [xGap: number, yGap: number];
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
  /**
   * Optional handler for edge deletion. When provided, edges render a wider
   * transparent hit area and show a small × badge at the midpoint on hover;
   * clicking the badge (or anywhere along the edge) calls
   * `onEdgeClick(source, target)`. Omit to keep edges purely decorative.
   */
  onEdgeClick?: (source: string, target: string) => void;
  /**
   * Set of edges to highlight. Each entry is the string `${source}|${target}`.
   * Highlighted edges receive the `sui-dag__edge--highlighted` CSS class.
   */
  highlightedEdges?: ReadonlySet<string>;
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
  /**
   * True for layout-only edges that were not in the input DAGEdges
   * (e.g. SwimlaneChart's anchor→summary scaffolding). Consumers
   * should skip these when rendering data-flow lines.
   */
  synthetic?: boolean;
};
