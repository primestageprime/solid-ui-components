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
  nodeRank?: (node: DAGNode<T>) => number | undefined,
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

  // `nodeRank` is accepted at the API surface but currently advisory; see
  // commit history for failed attempts to enforce it via d3-dag's
  // `.rank()` (the LP simplex solver throws on intra-rank chains).
  void nodeRank;

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
    console.warn(
      "[DagChart] Sugiyama layout failed; falling back to topological grid placement.",
      err,
    );
    return fallbackGridLayout(
      nodes,
      edges,
      direction,
      sizeMap,
      nodeRank,
    );
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

// Pure-TS fallback used when d3-dag's sugiyama bails (typically its internal
// coord-simplex throwing on graphs it can't solve). Assigns layer indices via
// longest path from sources, places each layer into a grid, and routes edges
// as straight 3-point polylines. Honours `nodeRank` if provided.
function fallbackGridLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  direction: "horizontal" | "vertical",
  sizeMap: Map<string, [number, number]>,
  nodeRank?: (node: DAGNode<T>) => number | undefined,
): LayoutResult {
  const idSet = new Set(nodes.map((n) => n.id));
  const parentMap = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const childMap = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      parentMap.get(e.target)!.push(e.source);
      childMap.get(e.source)!.push(e.target);
    }
  }

  // Topological order via Kahn's algorithm; cycles are tolerated (remaining
  // nodes are appended at the end and get layer = max so far).
  const indeg = new Map<string, number>(
    nodes.map((n) => [n.id, parentMap.get(n.id)!.length]),
  );
  const queue: string[] = [];
  for (const [id, d] of indeg) if (d === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const c of childMap.get(id)!) {
      const d = (indeg.get(c) ?? 0) - 1;
      indeg.set(c, d);
      if (d === 0) queue.push(c);
    }
  }
  for (const n of nodes) if (!order.includes(n.id)) order.push(n.id);

  // Layer assignment: max(parent layer)+1, then bumped to honour nodeRank
  // (a rank hint becomes a *minimum* layer index, never moves a node earlier
  // than its dep chain allows).
  const layer = new Map<string, number>();
  const rankFor = new Map<string, number>();
  if (nodeRank) {
    for (const n of nodes) {
      const r = nodeRank(n);
      if (typeof r === "number") rankFor.set(n.id, r);
    }
  }
  for (const id of order) {
    let l = 0;
    for (const p of parentMap.get(id)!) {
      l = Math.max(l, (layer.get(p) ?? 0) + 1);
    }
    const hint = rankFor.get(id);
    if (typeof hint === "number") l = Math.max(l, hint);
    layer.set(id, l);
  }

  // Bucket nodes per layer.
  const byLayer = new Map<number, string[]>();
  let maxLayer = 0;
  for (const [id, l] of layer) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
    if (l > maxLayer) maxLayer = l;
  }

  // Geometry: each layer is a column (horizontal) / row (vertical).
  // We pick per-layer "depth" from the max node size in that layer and
  // per-row "breadth" from the max breadth across the whole graph.
  const depthDim = direction === "horizontal" ? 0 : 1;
  const breadthDim = direction === "horizontal" ? 1 : 0;
  let maxBreadth = 0;
  for (const [, size] of sizeMap) {
    if (size[breadthDim] > maxBreadth) maxBreadth = size[breadthDim];
  }
  if (maxBreadth === 0) maxBreadth = DEFAULT_NODE_SIZE[breadthDim];
  const breadthGap = DEFAULT_GAP[breadthDim];
  const depthGap = DEFAULT_GAP[depthDim];

  const positions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();

  let cursorDepth = 0;
  let maxLayerBreadthTotal = 0;
  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    let layerDepth = 0;
    for (const id of ids) {
      const size = sizeMap.get(id) ?? DEFAULT_NODE_SIZE;
      if (size[depthDim] > layerDepth) layerDepth = size[depthDim];
    }
    if (layerDepth === 0) layerDepth = DEFAULT_NODE_SIZE[depthDim];
    let cursorBreadth = 0;
    for (const id of ids) {
      const [w, h] = sizeMap.get(id) ?? DEFAULT_NODE_SIZE;
      const depthCenter = cursorDepth + layerDepth / 2;
      const breadthCenter = cursorBreadth + (direction === "horizontal" ? h : w) / 2;
      const x =
        direction === "horizontal"
          ? depthCenter
          : breadthCenter;
      const y =
        direction === "horizontal"
          ? breadthCenter
          : depthCenter;
      positions.set(id, { x, y, width: w, height: h });
      cursorBreadth +=
        (direction === "horizontal" ? h : w) + breadthGap;
    }
    if (cursorBreadth > maxLayerBreadthTotal) {
      maxLayerBreadthTotal = cursorBreadth;
    }
    cursorDepth += layerDepth + depthGap;
  }

  // Center each layer along the breadth axis.
  const layerBreadthSpan = new Map<number, number>();
  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    let span = 0;
    for (const id of ids) {
      const [w, h] = sizeMap.get(id) ?? DEFAULT_NODE_SIZE;
      span += direction === "horizontal" ? h : w;
    }
    if (ids.length > 1) span += (ids.length - 1) * breadthGap;
    layerBreadthSpan.set(l, span);
  }
  for (let l = 0; l <= maxLayer; l++) {
    const ids = byLayer.get(l) ?? [];
    const span = layerBreadthSpan.get(l) ?? 0;
    const offset = (maxLayerBreadthTotal - span) / 2;
    for (const id of ids) {
      const p = positions.get(id)!;
      if (direction === "horizontal") {
        positions.set(id, { ...p, y: p.y + offset });
      } else {
        positions.set(id, { ...p, x: p.x + offset });
      }
    }
  }

  const layoutEdges: LayoutEdge[] = [];
  for (const e of edges) {
    const a = positions.get(e.source);
    const b = positions.get(e.target);
    if (!a || !b) continue;
    layoutEdges.push({
      sourceId: e.source,
      targetId: e.target,
      points: [
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
      ],
    });
  }

  const totalWidth =
    direction === "horizontal" ? cursorDepth : maxLayerBreadthTotal;
  const totalHeight =
    direction === "horizontal" ? maxLayerBreadthTotal : cursorDepth;

  return { positions, edges: layoutEdges, totalWidth, totalHeight };
}
