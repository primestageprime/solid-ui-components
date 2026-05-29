import type { DAGNode, DAGEdge, LayoutEdge } from "../DagChart/types";
import type { LayoutResult } from "../DagChart/layout";

export type SwimlaneOptions<T> = {
  /**
   * Returns the column for a node — any signed integer. The center of the
   * chart is computed from the input range as `round((min+max)/2)`. Nodes
   * at `col === centerCol` are the "DOING" / focus column.
   *
   * Backward compatible: passing 0/1/2 still produces a 3-column kanban
   * (center = 1, columns at -gap / 0 / +gap).
   */
  swimlaneFor: (node: DAGNode<T>) => number;
  nodeSize: (node: DAGNode<T>) => [number, number];
  maxDepth: number;
  columnGap: number;
  rowGap: number;
  /**
   * Max nodes shown per column (vertical fit). When a column has more nodes
   * than this, the overflow is collapsed into a per-column summary so the
   * side edge-lozenge can show a "+N" count — the vertical analogue of
   * `maxDepth`'s horizontal collapse. Omit (or 0) for no row cap.
   */
  maxRows?: number;
  /**
   * Which column should sit at the chart's horizontal center (x=0). When
   * omitted, defaults to 0. Set this to a non-zero value to "follow" a
   * different column without rewriting the node data — the falloff anchor
   * AND the horizontal positioning both shift together.
   */
  centerCol?: number;
};

export type SwimlaneSummary = {
  /** Synthetic id, format: `__collapsed_<anchorId>_<column>` */
  id: string;
  anchorId: string;
  column: number;
  collapsedCount: number;
};

/**
 * Per-column VERTICAL overflow: nodes in a column that don't fit the
 * `maxRows` height cap. Rendered as a "+N" placeholder at the BOTTOM of the
 * column (distinct from the side edge lozenges, which absorb HORIZONTAL /
 * depth overflow). `x`/`bottomY` are the column's center-x and the bottom
 * edge of its lowest visible node, so the chart can anchor the placeholder.
 */
export type SwimlaneRowOverflow = {
  column: number;
  count: number;
  x: number;
  bottomY: number;
};

export type SwimlaneLayoutResult = LayoutResult & {
  summaries: SwimlaneSummary[];
  /** Per-column vertical (height) overflow placeholders. */
  rowOverflows: SwimlaneRowOverflow[];
  /** The col value at the chart's horizontal center. */
  centerCol: number;
};

const EMPTY_RESULT: SwimlaneLayoutResult = {
  positions: new Map(),
  edges: [],
  totalWidth: 0,
  totalHeight: 0,
  summaries: [],
  rowOverflows: [],
  centerCol: 0,
};

export function computeSwimlaneLayout<T>(
  nodes: DAGNode<T>[],
  edges: DAGEdge[],
  opts: SwimlaneOptions<T>,
): SwimlaneLayoutResult {
  if (nodes.length === 0) return EMPTY_RESULT;

  // 1. Bucket nodes by their col integer. No restriction to 0|1|2.
  const sizeFor = new Map<string, [number, number]>();
  const colOf = new Map<string, number>();
  const nodesByCol = new Map<number, string[]>();

  for (const node of nodes) {
    const col = opts.swimlaneFor(node);
    colOf.set(node.id, col);
    if (!nodesByCol.has(col)) nodesByCol.set(col, []);
    nodesByCol.get(col)!.push(node.id);
    sizeFor.set(node.id, opts.nodeSize(node));
  }

  // Center column defaults to 0; can be overridden by opts.centerCol so
  // a consumer can "follow" a different column (e.g. wherever the DOING
  // nodes currently sit) without rewriting node data.
  const uniqueCols = Array.from(nodesByCol.keys()).sort((a, b) => a - b);
  const minCol = uniqueCols[0];
  const maxCol = uniqueCols[uniqueCols.length - 1];
  const centerCol = opts.centerCol ?? 0;
  // Compact positioning: place each occupied col at consecutive ordinal
  // positions (skipping empty cols between them). This way a single
  // far-out col doesn't reserve horizontal space for the empty cols it
  // jumps over — important for fitting more depth in a narrow viewport
  // without dropping the outer ring into a badge.
  const centerOrdinal = uniqueCols.indexOf(centerCol);
  // Number of unique cols strictly below centerCol (used when centerCol
  // is NOT present in the data — we insert a "virtual" slot for it so
  // cols above the center don't collapse onto the center.
  const colsBelowCenter = uniqueCols.filter((c) => c < centerCol).length;
  const ordinalFor = (col: number): number => {
    const idx = uniqueCols.indexOf(col);
    if (idx >= 0) {
      if (centerOrdinal >= 0) return idx - centerOrdinal;
      // centerCol not in data: insert a virtual slot at position
      // `colsBelowCenter`. Cols below it keep their negative ordinals
      // (idx - colsBelowCenter, all negative), cols at-or-above shift
      // by +1 to account for the reserved center slot.
      return idx < colsBelowCenter ? idx - colsBelowCenter : idx + 1 - colsBelowCenter;
    }
    // Off-graph col (shouldn't normally happen): fall back to natural distance.
    return col - centerCol;
  };
  const xForCol = (col: number) => ordinalFor(col) * opts.columnGap;

  const centerNodeIds = nodesByCol.get(centerCol) ?? [];

  // 2. Undirected adjacency
  const neighbors = new Map<string, string[]>();
  for (const n of nodes) neighbors.set(n.id, []);
  for (const e of edges) {
    if (neighbors.has(e.source) && neighbors.has(e.target)) {
      neighbors.get(e.source)!.push(e.target);
      neighbors.get(e.target)!.push(e.source);
    }
  }

  // 3. Falloff: |ordinal(col)| > maxDepth -> hidden.
  // Ordinal distance matches the compact visual positioning above — i.e.
  // empty cols between the center and an outer col don't count as a
  // "ring", so an isolated far-out col can stay visible at modest depth.
  // The earlier "no nodes at centerCol → visible" bypass is gone: with
  // the virtual centerCol-slot logic in `ordinalFor`, ordinals are
  // well-defined even when centerCol isn't in the data (every node is
  // just laid out relative to where centerCol *would* sit).
  const isVisible = (id: string): boolean => {
    const c = colOf.get(id);
    if (c === undefined) return true;
    return Math.abs(ordinalFor(c)) <= opts.maxDepth;
  };

  // 4. Anchor BFS: for each hidden node, find the nearest visible
  // neighbor via graph distance. Visible seeds anchor to themselves;
  // hidden nodes propagate the anchor of the visible node they were
  // first reached from.
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
      if (cur !== anchorOf.get(cur) && !curHidden) continue;
      for (const nb of neighbors.get(cur)!) {
        if (!anchorOf.has(nb)) {
          anchorOf.set(nb, anchorOf.get(cur)!);
          queue.push(nb);
        }
      }
    }
  }

  // 5. Initial columns map keyed by col value — visible-only.
  const visibleCols = new Map<number, string[]>();
  for (const [col, ids] of nodesByCol) {
    const filtered = ids.filter(isVisible);
    if (filtered.length > 0) visibleCols.set(col, filtered);
  }
  // The center column always exists in the visible map if any center-col
  // nodes were given, even if maxDepth=0.
  if (!visibleCols.has(centerCol) && centerNodeIds.length > 0) {
    visibleCols.set(centerCol, [...centerNodeIds]);
  }

  // 6. Summaries: group hidden nodes. Nodes with a visible anchor group by
  // (anchor, hiddenCol) so the badge can attach a dashed connector to that
  // neighbor. Nodes WITHOUT a visible anchor — a disconnected/completed
  // subtree, or any hidden node when NOTHING is visible at all — still need
  // representation, else whole columns vanish silently. They group per-column
  // into an "orphan" summary (anchorId === "") which the chart renders as an
  // edge lozenge pinned to the viewport boundary (no connector, count only).
  const summaryMap = new Map<string, SwimlaneSummary>();
  for (const n of nodes) {
    if (isVisible(n.id)) continue;
    const col = colOf.get(n.id)!;
    const anchor = anchorOf.get(n.id);
    const key = anchor
      ? `__collapsed_${anchor}_${col}`
      : `__collapsed_orphan_${col}`;
    const existing = summaryMap.get(key);
    if (existing) {
      existing.collapsedCount++;
    } else {
      summaryMap.set(key, {
        id: key,
        anchorId: anchor ?? "",
        column: col,
        collapsedCount: 1,
      });
    }
  }
  const summaries = Array.from(summaryMap.values());

  // 7. Insert summary placeholders so barycentric ordering sees them.
  // (They aren't rendered as boxes — SwimlaneChart renders boundary
  //  badges instead — but the synthetic edge to the anchor still helps
  //  the consumer detect "collapsed neighbor" relationships.)
  for (const s of summaries) {
    // Orphan summaries (no visible anchor) aren't positioned in the column
    // grid — they're count-only and render as viewport-edge lozenges. Skip
    // placeholder/neighbor wiring (anchorId "" has no node to attach to).
    if (!s.anchorId) continue;
    sizeFor.set(s.id, [120, 40]);
    colOf.set(s.id, s.column);
    if (!visibleCols.has(s.column)) visibleCols.set(s.column, []);
    visibleCols.get(s.column)!.push(s.id);
    if (!neighbors.has(s.id)) neighbors.set(s.id, []);
    neighbors.get(s.id)!.push(s.anchorId);
    neighbors.get(s.anchorId)!.push(s.id);
  }

  // 8. Stable column order for sweeps + Y assignment.
  const orderedCols = Array.from(visibleCols.keys()).sort((a, b) => a - b);

  // 9. Initial rank = current order within each col.
  const rank = new Map<string, number>();
  for (const col of orderedCols) {
    visibleCols.get(col)!.forEach((id, i) => rank.set(id, i));
  }

  // 10. Barycentric sweep. Alternate L→R and R→L per pass.
  const SWEEPS = 4;
  const sortCol = (col: number) => {
    const ids = visibleCols.get(col);
    if (!ids || ids.length < 2) return;
    const bary = new Map<string, number>();
    for (const id of ids) {
      const ns = neighbors.get(id)!.filter((nid) => colOf.get(nid) !== col);
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
    const order = sweep % 2 === 0 ? [...orderedCols].reverse() : orderedCols;
    for (const col of order) sortCol(col);
  }

  // 10.5 Vertical fit: cap each column to `maxRows` real nodes. The overflow
  // is recorded per-column and surfaced as a BOTTOM "+N" placeholder (see
  // step 12.5) — the vertical analogue of the horizontal `maxDepth` collapse,
  // but kept SEPARATE from the side edge lozenges (which absorb depth
  // overflow). The kept rows are re-centered by the Y pass below.
  const rowOverflowByCol = new Map<number, number>();
  if (opts.maxRows && opts.maxRows > 0) {
    for (const col of orderedCols) {
      const ids = visibleCols.get(col)!;
      const realIds = ids.filter((id) => !id.startsWith("__collapsed_"));
      if (realIds.length <= opts.maxRows) continue;
      const keepReal = realIds.slice(0, opts.maxRows);
      const overflowCount = realIds.length - keepReal.length;
      const placeholders = ids.filter((id) => id.startsWith("__collapsed_"));
      visibleCols.set(col, [...keepReal, ...placeholders]);
      rowOverflowByCol.set(col, (rowOverflowByCol.get(col) ?? 0) + overflowCount);
    }
  }

  // 11. Y per column, centered around y=0.
  const y = new Map<string, number>();
  for (const col of orderedCols) {
    const ids = visibleCols.get(col)!;
    if (ids.length === 0) continue;
    const span = (ids.length - 1) * opts.rowGap;
    const start = -span / 2;
    ids.forEach((id, i) => y.set(id, start + i * opts.rowGap));
  }

  // 12. Positions map.
  const positions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  for (const col of orderedCols) {
    const cx = xForCol(col);
    for (const id of visibleCols.get(col)!) {
      const [w, h] = sizeFor.get(id)!;
      positions.set(id, { x: cx, y: y.get(id)!, width: w, height: h });
    }
  }

  // Helper: which summary covers a hidden id?
  const summaryIdFor = (hiddenId: string): string | undefined => {
    const anchor = anchorOf.get(hiddenId);
    if (!anchor) return undefined;
    const col = colOf.get(hiddenId);
    if (col === undefined) return undefined;
    const sid = `__collapsed_${anchor}_${col}`;
    return summaryMap.has(sid) ? sid : undefined;
  };

  // 13. Edges: rewrite hidden endpoints to their summary; drop self-loops.
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
  for (const s of summaries) {
    const a = positions.get(s.anchorId);
    const b = positions.get(s.id);
    if (!a || !b) continue;
    layoutEdges.push({
      sourceId: s.anchorId,
      targetId: s.id,
      points: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
      synthetic: true,
    });
  }

  // 14. Bounding height.
  let maxColumnHeight = 0;
  for (const col of orderedCols) {
    const ids = visibleCols.get(col)!;
    let h = 0;
    for (const id of ids) h += sizeFor.get(id)![1];
    if (ids.length > 1) h += (ids.length - 1) * opts.rowGap;
    if (h > maxColumnHeight) maxColumnHeight = h;
  }

  const colSpan = (maxCol - minCol) * opts.columnGap;
  const totalWidth = colSpan + 180; // approximate; not strictly used

  // 12.5 Bottom row-overflow placeholders: anchor each to its column's
  // center-x and the bottom edge of its lowest visible (real) node.
  const rowOverflows: SwimlaneRowOverflow[] = [];
  for (const [col, count] of rowOverflowByCol) {
    if (count <= 0) continue;
    let bottomY = -Infinity;
    for (const id of visibleCols.get(col) ?? []) {
      if (id.startsWith("__collapsed_")) continue;
      const p = positions.get(id);
      if (p) bottomY = Math.max(bottomY, p.y + p.height / 2);
    }
    rowOverflows.push({
      column: col,
      count,
      x: xForCol(col),
      bottomY: bottomY === -Infinity ? 0 : bottomY,
    });
  }

  return {
    positions,
    edges: layoutEdges,
    totalWidth,
    totalHeight: maxColumnHeight,
    summaries,
    rowOverflows,
    centerCol,
  };
}
