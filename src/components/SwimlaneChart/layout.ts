import type { DAGNode, DAGEdge, LayoutEdge } from "../DagChart/types";
import type { LayoutResult } from "../DagChart/layout";

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
  edges: DAGEdge[],
  opts: SwimlaneOptions<T>,
): LayoutResult {
  if (nodes.length === 0) return EMPTY_RESULT;

  const columnX = [-opts.columnGap, 0, opts.columnGap] as const;
  const sizeFor = new Map<string, [number, number]>();
  const columnOf = new Map<string, 0 | 1 | 2>();
  const columns: string[][] = [[], [], []];

  for (const node of nodes) {
    const col = opts.swimlaneFor(node);
    columnOf.set(node.id, col);
    columns[col].push(node.id);
    sizeFor.set(node.id, opts.nodeSize(node));
  }

  // Initial rank = input order within each column.
  const rank = new Map<string, number>();
  for (const ids of columns) ids.forEach((id, i) => rank.set(id, i));

  // Undirected adjacency over input edges (skip edges to/from unknown ids).
  const neighbors = new Map<string, string[]>();
  for (const n of nodes) neighbors.set(n.id, []);
  for (const e of edges) {
    if (neighbors.has(e.source) && neighbors.has(e.target)) {
      neighbors.get(e.source)!.push(e.target);
      neighbors.get(e.target)!.push(e.source);
    }
  }

  // Barycentric sweep: for each column, sort by mean rank of cross-column
  // neighbors. Alternate R->L then L->R each sweep so changes propagate in
  // both directions and the first sweep (R->L) uses original input ranks.
  const SWEEPS = 4;
  const sortCol = (col: number) => {
    const ids = columns[col];
    if (ids.length < 2) return;
    const bary = new Map<string, number>();
    for (const id of ids) {
      const ns = neighbors.get(id)!.filter((nid) => columnOf.get(nid) !== col);
      if (ns.length === 0) {
        bary.set(id, rank.get(id)!);
      } else {
        let sum = 0;
        for (const nid of ns) sum += rank.get(nid)!;
        bary.set(id, sum / ns.length);
      }
    }
    ids.sort((a, b) => {
      const da = bary.get(a)!;
      const db = bary.get(b)!;
      if (da !== db) return da - db;
      return rank.get(a)! - rank.get(b)!;
    });
    ids.forEach((id, i) => rank.set(id, i));
  };
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      // R->L: right column sees original/stable left-column ranks first
      sortCol(2); sortCol(1); sortCol(0);
    } else {
      sortCol(0); sortCol(1); sortCol(2);
    }
  }

  // Final Y assignment from post-sweep column order.
  const y = new Map<string, number>();
  for (const ids of columns) {
    if (ids.length === 0) continue;
    const span = (ids.length - 1) * opts.rowGap;
    const start = -span / 2;
    ids.forEach((id, i) => y.set(id, start + i * opts.rowGap));
  }

  const positions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  for (const node of nodes) {
    const col = columnOf.get(node.id)!;
    const [w, h] = sizeFor.get(node.id)!;
    positions.set(node.id, { x: columnX[col], y: y.get(node.id)!, width: w, height: h });
  }

  const layoutEdges: LayoutEdge[] = [];
  for (const e of edges) {
    const a = positions.get(e.source);
    const b = positions.get(e.target);
    if (!a || !b) continue;
    layoutEdges.push({
      sourceId: e.source,
      targetId: e.target,
      points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
    });
  }

  let maxColumnHeight = 0;
  for (const ids of columns) {
    let h = 0;
    for (const id of ids) h += sizeFor.get(id)![1];
    if (ids.length > 1) h += (ids.length - 1) * opts.rowGap;
    if (h > maxColumnHeight) maxColumnHeight = h;
  }

  return {
    positions,
    edges: layoutEdges,
    totalWidth: opts.columnGap * 2 + 180,
    totalHeight: maxColumnHeight,
  };
}
