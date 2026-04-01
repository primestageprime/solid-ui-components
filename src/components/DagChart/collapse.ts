import type { DAGNode, DAGEdge, NodeRenderState } from "./types";

export type CollapseResult<T> = {
  visibleNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }>;
  visibleEdges: DAGEdge[];
};

/** Builds an undirected adjacency map from a set of directed edges. */
function buildAdjacency(edges: DAGEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  const ensureSet = (id: string): Set<string> => {
    if (!adj.has(id)) adj.set(id, new Set());
    return adj.get(id)!;
  };

  for (const e of edges) {
    ensureSet(e.source).add(e.target);
    ensureSet(e.target).add(e.source);
  }

  return adj;
}

/**
 * BFS from `start`, treating `excluded` as a boundary that stops traversal.
 * Returns all reachable node ids (not including nodes in `excluded`).
 */
function reachableFrom(
  start: string,
  adj: Map<string, Set<string>>,
  excluded: Set<string>,
): Set<string> {
  const visited = new Set<string>();
  const queue = [start];

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (visited.has(id) || excluded.has(id)) continue;
    visited.add(id);

    for (const neighbor of adj.get(id) ?? []) {
      if (!excluded.has(neighbor) && !visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

/**
 * Collapses the graph around a focused node.
 *
 * When `focusedNodeId` is provided:
 * - The focused node and its immediate neighbors remain visible.
 * - Sub-graphs beyond those neighbors are replaced by a single collapsed summary node
 *   attached to the neighbor that connects to them.
 * - Summary nodes carry `state.collapsed = true` and `state.collapsedCount`.
 *
 * When `focusedNodeId` is absent, all nodes and edges are returned unmodified.
 *
 * @param nodes         - All nodes in the graph.
 * @param edges         - All directed edges (source → target).
 * @param focusedNodeId - The node to focus on, or `undefined` for no focus.
 * @returns Visible nodes with render states, and the edges that connect them.
 */
export function collapseGraph<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  focusedNodeId: string | undefined,
): CollapseResult<T> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (!focusedNodeId || !nodeMap.has(focusedNodeId)) {
    return {
      visibleNodes: nodes.map((n) => ({
        node: n,
        state: { collapsed: false, collapsedCount: 0, focused: false, adjacent: false },
      })),
      visibleEdges: edges,
    };
  }

  const adj = buildAdjacency(edges);
  const neighbors = adj.get(focusedNodeId) ?? new Set<string>();
  const visibleIds = new Set([focusedNodeId, ...neighbors]);

  const summaryNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }> = [];
  const summaryEdges: DAGEdge[] = [];
  const processedBeyond = new Set<string>();

  for (const neighborId of neighbors) {
    const neighborAdj = adj.get(neighborId) ?? new Set<string>();

    for (const beyondId of neighborAdj) {
      if (visibleIds.has(beyondId) || processedBeyond.has(beyondId)) continue;

      // BFS the sub-graph beyond this entry point, excluding already-visible nodes
      const reachable = reachableFrom(beyondId, adj, visibleIds);
      if (reachable.size === 0) continue;

      const summaryId = `__collapsed_${beyondId}`;
      const firstHidden = nodeMap.get(beyondId);

      summaryNodes.push({
        node: { id: summaryId, data: (firstHidden?.data ?? {}) as T },
        state: { collapsed: true, collapsedCount: reachable.size, focused: false, adjacent: false },
      });
      summaryEdges.push({ source: neighborId, target: summaryId });

      // Mark all reachable nodes as processed so they are not double-summarised
      for (const rid of reachable) processedBeyond.add(rid);
    }
  }

  const primaryNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }> = [...visibleIds]
    .flatMap((id) => {
      const node = nodeMap.get(id);
      return node
        ? [
            {
              node,
              state: {
                collapsed: false,
                collapsedCount: 0,
                focused: id === focusedNodeId,
                adjacent: id !== focusedNodeId,
              },
            },
          ]
        : [];
    });

  const visibleNodes = [...primaryNodes, ...summaryNodes];
  const allVisibleIds = new Set(visibleNodes.map((v) => v.node.id));

  const visibleEdges = [
    ...edges.filter((e) => allVisibleIds.has(e.source) && allVisibleIds.has(e.target)),
    ...summaryEdges,
  ];

  return { visibleNodes, visibleEdges };
}
