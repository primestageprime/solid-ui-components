import type { DAGNode, DAGEdge, NodeRenderState } from "./types";

export type CollapseResult<T> = {
  visibleNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }>;
  visibleEdges: DAGEdge[];
};

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
      if (!excluded.has(neighbor) && !visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited;
}

export function collapseGraph<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  focusedNodeId: string | undefined,
): CollapseResult<T> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const knownIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => knownIds.has(e.source) && knownIds.has(e.target));

  const fullGraph = {
    visibleNodes: nodes.map((n) => ({ node: n, state: { kind: "normal" as const } })),
    visibleEdges: validEdges,
  };

  if (!focusedNodeId) return fullGraph;

  if (!nodeMap.has(focusedNodeId)) {
    console.warn("[DagChart] focusedNodeId not found in nodes — showing full graph.", { focusedNodeId });
    return fullGraph;
  }

  const adj = buildAdjacency(validEdges);
  const neighbors = adj.get(focusedNodeId) ?? new Set<string>();
  const visibleIds = new Set([focusedNodeId, ...neighbors]);

  const summaryNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }> = [];
  const summaryEdges: DAGEdge[] = [];
  // Maps hidden node ID → the summary node ID that represents its subtree
  const hiddenToSummary = new Map<string, string>();

  for (const neighborId of neighbors) {
    const neighborAdj = adj.get(neighborId) ?? new Set<string>();
    for (const beyondId of neighborAdj) {
      if (visibleIds.has(beyondId)) continue;

      // If this hidden node's subtree already has a summary, add an edge (if not duplicate)
      const existingSummary = hiddenToSummary.get(beyondId);
      if (existingSummary) {
        if (!summaryEdges.some((se) => se.source === neighborId && se.target === existingSummary)) {
          summaryEdges.push({ source: neighborId, target: existingSummary });
        }
        continue;
      }

      const reachable = reachableFrom(beyondId, adj, visibleIds);
      if (reachable.size === 0) continue;

      const summaryId = `__collapsed_${beyondId}`;
      const firstHidden = nodeMap.get(beyondId);

      summaryNodes.push({
        node: { id: summaryId, data: (firstHidden?.data ?? {}) as T },
        state: { kind: "collapsed", collapsedCount: reachable.size },
      });
      summaryEdges.push({ source: neighborId, target: summaryId });

      for (const rid of reachable) hiddenToSummary.set(rid, summaryId);
    }
  }

  const primaryNodes: Array<{ node: DAGNode<T>; state: NodeRenderState }> = [...visibleIds]
    .flatMap((id) => {
      const node = nodeMap.get(id);
      if (!node) return [];
      const state: NodeRenderState = id === focusedNodeId
        ? { kind: "focused" }
        : { kind: "adjacent" };
      return [{ node, state }];
    });

  const visibleNodes = [...primaryNodes, ...summaryNodes];
  const allVisibleIds = new Set(visibleNodes.map((v) => v.node.id));

  const visibleEdges = [
    ...validEdges.filter((e) => allVisibleIds.has(e.source) && allVisibleIds.has(e.target)),
    ...summaryEdges,
  ];

  return { visibleNodes, visibleEdges };
}
