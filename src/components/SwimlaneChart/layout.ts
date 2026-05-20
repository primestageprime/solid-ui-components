import type { DAGNode, DAGEdge, LayoutEdge } from "../DagChart/types";
import type { LayoutResult } from "../DagChart/layout";

export type SwimlaneOptions<T> = {
  swimlaneFor: (node: DAGNode<T>) => 0 | 1 | 2;
  nodeSize: (node: DAGNode<T>) => [number, number];
  maxDepth: number;
  columnGap: number;
  rowGap: number;
};

export type SwimlaneSummary = {
  /** Synthetic id, format: `__collapsed_<anchorId>_<column>` */
  id: string;
  anchorId: string;
  column: 0 | 1 | 2;
  collapsedCount: number;
};

export type SwimlaneLayoutResult = LayoutResult & {
  summaries: SwimlaneSummary[];
};

const EMPTY_RESULT: SwimlaneLayoutResult = {
  positions: new Map(),
  edges: [],
  totalWidth: 0,
  totalHeight: 0,
  summaries: [],
};

export function computeSwimlaneLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  opts: SwimlaneOptions<T>,
): SwimlaneLayoutResult {
  if (nodes.length === 0) return EMPTY_RESULT;

  const columnX = [-opts.columnGap, 0, opts.columnGap] as const;
  const sizeFor = new Map<string, [number, number]>();
  const columnOf = new Map<string, 0 | 1 | 2>();
  const columns: string[][] = [[], [], []];

  // 1. Bucket nodes by column
  const doingIds: string[] = [];
  for (const node of nodes) {
    const col = opts.swimlaneFor(node);
    columnOf.set(node.id, col);
    columns[col].push(node.id);
    sizeFor.set(node.id, opts.nodeSize(node));
    if (col === 1) doingIds.push(node.id);
  }

  // 2. Build undirected neighbors over input edges
  const neighbors = new Map<string, string[]>();
  for (const n of nodes) neighbors.set(n.id, []);
  for (const e of edges) {
    if (neighbors.has(e.source) && neighbors.has(e.target)) {
      neighbors.get(e.source)!.push(e.target);
      neighbors.get(e.target)!.push(e.source);
    }
  }

  // 3. Falloff: BFS from all DOING nodes to compute distance map
  const distance = new Map<string, number>();
  if (doingIds.length > 0) {
    const queue: string[] = [];
    for (const id of doingIds) {
      distance.set(id, 0);
      queue.push(id);
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const d = distance.get(cur)!;
      for (const nb of neighbors.get(cur)!) {
        if (!distance.has(nb)) {
          distance.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
  }

  // A node is hidden only if it is reachable from some DOING node but lies
  // beyond maxDepth. Nodes in components with no DOING node remain visible —
  // they have no anchor for falloff.
  const isVisible = (id: string) =>
    doingIds.length === 0 ||
    !distance.has(id) ||
    distance.get(id)! <= opts.maxDepth;

  // 4. Anchor BFS: multi-source from visible nodes outward
  const anchorOf = new Map<string, string>();
  {
    const queue: string[] = [];
    for (const n of nodes) {
      if (isVisible(n.id)) {
        anchorOf.set(n.id, n.id);
        queue.push(n.id);
      }
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curHidden = !isVisible(cur);
      // only propagate from hidden nodes (and from visible seeds)
      if (cur !== anchorOf.get(cur) && !curHidden) continue;
      for (const nb of neighbors.get(cur)!) {
        if (!anchorOf.has(nb)) {
          anchorOf.set(nb, anchorOf.get(cur)!);
          queue.push(nb);
        }
      }
    }
  }

  // 5. Trim columns to visible-only IDs
  for (let c = 0; c < 3; c++) {
    columns[c] = columns[c].filter((id) => isVisible(id));
  }

  // 6. Build summaries: group hidden nodes by (anchor, hiddenColumn)
  const summaryMap = new Map<string, SwimlaneSummary>();
  for (const n of nodes) {
    if (isVisible(n.id)) continue;
    const anchor = anchorOf.get(n.id);
    if (!anchor) continue; // unreachable from any visible — drop
    const col = columnOf.get(n.id)!;
    const key = `__collapsed_${anchor}_${col}`;
    const existing = summaryMap.get(key);
    if (existing) {
      existing.collapsedCount++;
    } else {
      summaryMap.set(key, {
        id: key,
        anchorId: anchor,
        column: col,
        collapsedCount: 1,
      });
    }
  }
  const summaries = Array.from(summaryMap.values());

  // 7. Insert summaries into columns and register their metadata
  for (const s of summaries) {
    columns[s.column].push(s.id);
    columnOf.set(s.id, s.column);
    sizeFor.set(s.id, [120, 40]);
    if (!neighbors.has(s.id)) neighbors.set(s.id, []);
    neighbors.get(s.id)!.push(s.anchorId);
    neighbors.get(s.anchorId)!.push(s.id);
  }

  // 8. Init rank from final column contents
  const rank = new Map<string, number>();
  for (const ids of columns) ids.forEach((id, i) => rank.set(id, i));

  // 9. Barycentric sweep (unchanged)
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
      sortCol(2); sortCol(1); sortCol(0);
    } else {
      sortCol(0); sortCol(1); sortCol(2);
    }
  }

  // 10. Y assignment
  const y = new Map<string, number>();
  for (const ids of columns) {
    if (ids.length === 0) continue;
    const span = (ids.length - 1) * opts.rowGap;
    const start = -span / 2;
    ids.forEach((id, i) => y.set(id, start + i * opts.rowGap));
  }

  // 11. Positions map: from columns (includes summaries)
  const positions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  for (let c = 0; c < 3; c++) {
    for (const id of columns[c]) {
      const [w, h] = sizeFor.get(id)!;
      positions.set(id, { x: columnX[c], y: y.get(id)!, width: w, height: h });
    }
  }

  // Helper: which summary covers a hidden id?
  const summaryIdFor = (hiddenId: string): string | undefined => {
    const anchor = anchorOf.get(hiddenId);
    if (!anchor) return undefined;
    const col = columnOf.get(hiddenId);
    if (col === undefined) return undefined;
    const sid = `__collapsed_${anchor}_${col}`;
    return summaryMap.has(sid) ? sid : undefined;
  };

  // 12. Edges: rewrite hidden endpoints to their summary; drop self-loops
  const layoutEdges: LayoutEdge[] = [];
  for (const e of edges) {
    let src = e.source;
    let tgt = e.target;
    if (!positions.has(src)) {
      const sid = summaryIdFor(src);
      if (!sid) continue;
      src = sid;
    }
    if (!positions.has(tgt)) {
      const sid = summaryIdFor(tgt);
      if (!sid) continue;
      tgt = sid;
    }
    if (src === tgt) continue;
    const a = positions.get(src);
    const b = positions.get(tgt);
    if (!a || !b) continue;
    layoutEdges.push({
      sourceId: src,
      targetId: tgt,
      points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
    });
  }

  // Synthetic edges: summary <-> anchor
  for (const s of summaries) {
    const a = positions.get(s.anchorId);
    const b = positions.get(s.id);
    if (!a || !b) continue;
    layoutEdges.push({
      sourceId: s.anchorId,
      targetId: s.id,
      points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
    });
  }

  // 13. maxColumnHeight from final contents
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
    summaries,
  };
}
