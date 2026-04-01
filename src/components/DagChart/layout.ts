import { graphStratify, sugiyama } from "d3-dag";
import type { DAGNode, DAGEdge, LayoutEdge } from "./types";

export type LayoutResult<T> = {
  positions: Map<string, { x: number; y: number; width: number; height: number }>;
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
};

const DEFAULT_NODE_SIZE: [number, number] = [180, 60];
const DEFAULT_GAP: [number, number] = [40, 40];

/**
 * Converts a flat nodes+edges structure into Sugiyama layout positions and edge paths.
 *
 * Sugiyama always lays out top-to-bottom internally. For `"horizontal"` direction the
 * x and y coordinates are swapped after layout so the graph flows left-to-right.
 *
 * @param nodes   - All nodes in the graph.
 * @param edges   - All directed edges (source → target).
 * @param direction - `"vertical"` (top→bottom) or `"horizontal"` (left→right).
 * @param nodeSize  - Optional per-node size callback; defaults to 180×60.
 * @returns Positioned node map, edge paths, and total canvas dimensions.
 */
export function computeLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  direction: "horizontal" | "vertical",
  nodeSize?: (node: DAGNode<T>) => [width: number, height: number],
): LayoutResult<T> {
  if (nodes.length === 0) {
    return { positions: new Map(), edges: [], totalWidth: 0, totalHeight: 0 };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const sizeMap = new Map<string, [number, number]>(
    nodes.map((n) => [n.id, nodeSize ? nodeSize(n) : DEFAULT_NODE_SIZE]),
  );

  // Build parent-id lists for graphStratify
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

  const dag = graphStratify()(stratifyData);

  // nodeSize callback receives a dag node with a `.data` property holding stratifyData items.
  // Sugiyama nodeSize is [across-layer, along-layer]. In vertical mode (top→bottom),
  // across=width, along=height. In horizontal mode we swap x/y after layout, so we must
  // also swap nodeSize: across=height, along=width.
  const layout = sugiyama()
    .nodeSize((dagNode: { data: { id: string } }) => {
      const [w, h] = sizeMap.get(dagNode.data.id) ?? DEFAULT_NODE_SIZE;
      return direction === "horizontal" ? [h, w] : [w, h];
    })
    .gap(DEFAULT_GAP);

  const { width: layoutWidth, height: layoutHeight } = layout(dag);

  // After layout, each dag node has .x and .y properties
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const dagNode of dag.nodes()) {
    const id = (dagNode.data as { id: string }).id;
    const size = sizeMap.get(id) ?? DEFAULT_NODE_SIZE;
    const [w, h] = size;
    // Sugiyama gives top-to-bottom: x=column, y=row. Swap for horizontal.
    if (direction === "horizontal") {
      positions.set(id, { x: dagNode.y, y: dagNode.x, width: w, height: h });
    } else {
      positions.set(id, { x: dagNode.x, y: dagNode.y, width: w, height: h });
    }
  }

  // Link points are [x, y] tuples (column, row in Sugiyama space)
  const layoutEdges: LayoutEdge[] = [...dag.links()].map((link) => {
    const sourceId = (link.source.data as { id: string }).id;
    const targetId = (link.target.data as { id: string }).id;
    const points = (link.points as [number, number][]).map(([px, py]) =>
      direction === "horizontal" ? { x: py, y: px } : { x: px, y: py },
    );
    return { sourceId, targetId, points };
  });

  // Swap width/height totals for horizontal direction
  const totalWidth = direction === "horizontal" ? layoutHeight : layoutWidth;
  const totalHeight = direction === "horizontal" ? layoutWidth : layoutHeight;

  return { positions, edges: layoutEdges, totalWidth, totalHeight };
}
