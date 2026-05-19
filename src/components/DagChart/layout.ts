import { graphStratify, sugiyama } from "d3-dag";
import type { DAGNode, DAGEdge, LayoutEdge } from "./types";

/**
 * Custom layering that places every source node (no incoming edges) at layer 0
 * and assigns every other node the longest path distance from any root.
 *
 * The built-in `layeringLongestPath` (and `layeringSimplex`) minimise total
 * layout height by pushing roots forward when their only descendants sit deep
 * in the graph — that means a root with a short outgoing path can end up in
 * the middle (or rightmost) column instead of flush against the left edge,
 * which is rarely what callers want for a DAG view.
 */
function layeringSourcesFirst(
  graph: { topological(): Iterable<{ y: number; parents(): Iterable<unknown> }> },
  sep: (a: unknown, b: unknown) => number,
): number {
  let max = 0;
  for (const node of graph.topological()) {
    const parents = [...node.parents()] as { y: number }[];
    let y: number;
    if (parents.length === 0) {
      y = sep(undefined, node);
    } else {
      y = 0;
      for (const p of parents) {
        const candidate = p.y + sep(p, node);
        if (candidate > y) y = candidate;
      }
    }
    node.y = y;
    const bottom = y + sep(node, undefined);
    if (bottom > max) max = bottom;
  }
  return max;
}

export type LayoutResult = {
  positions: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>;
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
};

const DEFAULT_NODE_SIZE: [number, number] = [180, 60];
const DEFAULT_GAP: [number, number] = [40, 40];
const EMPTY_RESULT: LayoutResult = { positions: new Map(), edges: [], totalWidth: 0, totalHeight: 0 };

export function computeLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  direction: "horizontal" | "vertical",
  nodeSize?: (node: DAGNode<T>) => [width: number, height: number],
): LayoutResult {
  if (nodes.length === 0) return EMPTY_RESULT;

  const sizeMap = new Map<string, [number, number]>(
    nodes.map((n) => [n.id, nodeSize ? nodeSize(n) : DEFAULT_NODE_SIZE]),
  );

  const nodeIds = new Set(nodes.map((n) => n.id));
  const parentMap = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      parentMap.get(edge.target)!.push(edge.source);
    }
  }

  const stratifyData = nodes.map((n) => ({
    id: n.id,
    parentIds: parentMap.get(n.id) ?? [],
  }));

  let dag;
  try {
    dag = graphStratify()(stratifyData);
  } catch (err) {
    console.error("[DagChart] graphStratify failed — graph may contain a cycle or duplicate IDs.", err);
    return EMPTY_RESULT;
  }

  const layout = sugiyama()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .layering(layeringSourcesFirst as any)
    .nodeSize((dagNode: { data: { id: string } }) => {
      const [w, h] = sizeMap.get(dagNode.data.id) ?? DEFAULT_NODE_SIZE;
      return direction === "horizontal" ? [h, w] : [w, h];
    })
    .gap(DEFAULT_GAP);

  let layoutWidth: number;
  let layoutHeight: number;
  try {
    const result = layout(dag);
    layoutWidth = result.width;
    layoutHeight = result.height;
  } catch (err) {
    console.error("[DagChart] Sugiyama layout failed.", err);
    return EMPTY_RESULT;
  }

  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const dagNode of dag.nodes()) {
    const id = (dagNode.data as { id: string }).id;
    const size = sizeMap.get(id) ?? DEFAULT_NODE_SIZE;
    const [w, h] = size;
    if (direction === "horizontal") {
      positions.set(id, { x: dagNode.y, y: dagNode.x, width: w, height: h });
    } else {
      positions.set(id, { x: dagNode.x, y: dagNode.y, width: w, height: h });
    }
  }

  const layoutEdges: LayoutEdge[] = [...dag.links()].map((link) => {
    const sourceId = (link.source.data as { id: string }).id;
    const targetId = (link.target.data as { id: string }).id;
    const points = (link.points as [number, number][]).map(([px, py]) =>
      direction === "horizontal" ? { x: py, y: px } : { x: px, y: py },
    );
    return { sourceId, targetId, points };
  });

  const totalWidth = direction === "horizontal" ? layoutHeight : layoutWidth;
  const totalHeight = direction === "horizontal" ? layoutWidth : layoutHeight;

  return { positions, edges: layoutEdges, totalWidth, totalHeight };
}
