import type { DAGNode, DAGEdge, LayoutEdge } from "./types";
import type { LayoutResult } from "./layout";

export type SwimlaneOptions<T> = {
  swimlaneFor: (node: DAGNode<T>) => 0 | 1 | 2;
  nodeSize: (node: DAGNode<T>) => [number, number];
  maxDepth: number;
  columnGap: number;
  rowGap: number;
};

const EMPTY_RESULT: LayoutResult = {
  positions: new Map(),
  edges: [],
  totalWidth: 0,
  totalHeight: 0,
};

export function computeSwimlaneLayout<T>(
  nodes: DAGNode<T>[],
  _edges: DAGEdge[],
  opts: SwimlaneOptions<T>,
): LayoutResult {
  if (nodes.length === 0) return EMPTY_RESULT;

  const columnX = [-opts.columnGap, 0, opts.columnGap] as const;
  const positions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();

  for (const node of nodes) {
    const col = opts.swimlaneFor(node);
    const [w, h] = opts.nodeSize(node);
    positions.set(node.id, { x: columnX[col], y: 0, width: w, height: h });
  }

  const layoutEdges: LayoutEdge[] = [];
  return {
    positions,
    edges: layoutEdges,
    totalWidth: opts.columnGap * 2 + 180,
    totalHeight: 60,
  };
}
