// Pure layout helpers for the workshop's StatusFlowChart demos.
// Extracted into a separate module so they can be unit-tested in
// isolation from Solid components.

import type { StatusFlowNode } from "../../src/components/StatusFlowChart";

export const STATUS_TO_COL: Record<string, number> = {
  DONE: -1,
  DOING: 0,
  TODO: 1,
};

/**
 * Topological sort of a leaf set with alphabetical id as a tiebreaker
 * when multiple nodes become ready simultaneously. Ignores `dependsOn`
 * entries that reference ids outside the leaf set.
 *
 * For a strict linear chain (c1→c2→…) returns [c1, c2, …].
 * For a broom (b1, b2, b3 roots; b4 depends on b1+b2; …) returns
 * [b1, b2, b3, b4, …] — alpha-sorted within each "ready bucket".
 */
export function topoSortAlpha(leaves: StatusFlowNode[]): string[] {
  const byId = new Map(leaves.map((n) => [n.id, n]));
  const remainingDeps = new Map<string, Set<string>>();
  for (const n of leaves) {
    const deps = new Set<string>();
    for (const d of n.dependsOn ?? []) if (byId.has(d)) deps.add(d);
    remainingDeps.set(n.id, deps);
  }

  const result: string[] = [];
  const inResult = new Set<string>();
  while (inResult.size < leaves.length) {
    const ready: string[] = [];
    for (const n of leaves) {
      if (inResult.has(n.id)) continue;
      if ((remainingDeps.get(n.id)?.size ?? 0) === 0) ready.push(n.id);
    }
    if (ready.length === 0) break; // cycle / unreachable — stop
    ready.sort();
    for (const id of ready) {
      result.push(id);
      inResult.add(id);
      for (const [, deps] of remainingDeps) deps.delete(id);
    }
  }
  return result;
}

/** Compute each leaf's topological depth via memoized recursion. */
function topoDepths(leaves: StatusFlowNode[]): Map<string, number> {
  const byId = new Map(leaves.map((n) => [n.id, n]));
  const cache = new Map<string, number>();
  const visit = (id: string): number => {
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const n = byId.get(id);
    if (!n) return 0;
    const deps = (n.dependsOn ?? []).filter((d) => byId.has(d));
    const d = deps.length === 0 ? 0 : Math.max(...deps.map(visit)) + 1;
    cache.set(id, d);
    return d;
  };
  for (const l of leaves) visit(l.id);
  return cache;
}

/**
 * Compute the column for a single node within `nodes`.
 *
 * Rules (uniform — same logic handles linear chain, broom, and chores):
 *  - **Parents** use status-based col (DONE → -1, DOING → 0, TODO → +1)
 *    via effective status from `effectiveStatusFor`.
 *  - **Leaves**: col depends on STATUS and (depth, status) ranking among
 *    siblings:
 *      - `status === DOING` → col **0** (always; multiple DOING stack).
 *      - `status === DONE` → cols **-1, -2, …** assigned by rank of the
 *        leaf's topo DEPTH among DONE leaves, **sorted descending**
 *        (higher depth → col closer to center).
 *      - `status === TODO` → cols **+1, +2, …** assigned by rank of the
 *        leaf's topo depth among TODO leaves, sorted ascending (lower
 *        depth → col closer to center).
 *
 * Same (depth, status) → same col → siblings STACK vertically. Different
 * (depth, status) → different cols → no two dependent nodes ever share
 * a col, because deps imply a depth difference.
 *
 * Falls through cleanly for chores (no deps): every leaf is at depth 0,
 * so all DONE chores stack at col -1, all DOING at col 0, etc.
 */
export function computeColFor(
  n: StatusFlowNode,
  nodes: StatusFlowNode[],
  effectiveStatusFor: (id: string) => string | undefined,
): number {
  const parentIds = new Set<string>();
  for (const node of nodes) if (node.parentId) parentIds.add(node.parentId);

  if (parentIds.has(n.id)) {
    const eff = effectiveStatusFor(n.id) ?? n.status;
    return STATUS_TO_COL[eff] ?? 0;
  }

  if (n.status === "DOING") return 0;

  const leaves =
    parentIds.size > 0 ? nodes.filter((node) => node.parentId) : nodes;
  const depths = topoDepths(leaves);
  const myDepth = depths.get(n.id) ?? 0;

  const sameStatus = leaves.filter((l) => l.status === n.status);
  const uniqueDepths = Array.from(
    new Set(sameStatus.map((l) => depths.get(l.id) ?? 0)),
  );
  uniqueDepths.sort((a, b) => (n.status === "DONE" ? b - a : a - b));
  const rank = uniqueDepths.indexOf(myDepth) + 1; // 1-indexed

  return n.status === "DONE" ? -rank : rank;
}

/**
 * Render the column as a label per the convention `-S, -2, -1, 0, +1, +2, +S`.
 * `maxDepth` is the half-window; cols outside ±maxDepth become S badges.
 */
export function labelForCol(col: number, maxDepth: number): string {
  if (col < -maxDepth) return "-S";
  if (col > maxDepth) return "+S";
  if (col === 0) return "0";
  return col > 0 ? `+${col}` : `${col}`;
}

/**
 * Compute the ChartBox height needed for the current state.
 *
 * `visibleLeaves` is the set of non-parent nodes that WILL render in
 * the chart area (caller must pre-filter children of a collapsed
 * parent). `hasParent` tells the function to add the parent-header
 * slot's height — set by the caller, not derived from the data.
 *
 * The function counts visible-leaf nodes per col, finds the tallest
 * stack, and returns `chartContent + padding (+ parentHeader)`. When
 * `visibleLeaves` is empty, chartContent collapses to zero so the box
 * shrinks down to just the parent header + padding.
 */
export function computeChartHeight(
  visibleLeaves: StatusFlowNode[],
  colFor: (n: StatusFlowNode) => number,
  cfg: {
    nodeHeight: number;
    rowGap: number;
    parentHeader: number;
    padding: number;
    visibleHalfWindow: number;
    /** Vertical gap between parent header and the chart inside the
     *  lane box. Only added when BOTH a parent header is present
     *  AND there's at least one visible leaf below it. */
    parentChartGap?: number;
    /** Total vertical border thickness of the lane box (top + bottom).
     *  With `box-sizing: border-box` on the lane, the border eats into
     *  the inside height — add it back here so the chart area gets its
     *  full nodeHeight and doesn't clip 1px off each side. */
    borderTotal?: number;
    /** Extra vertical room SwimlaneChart reserves above the topmost
     *  row and below the bottommost row (combined top+bottom) so that
     *  corridor-routed edges above/below the visible nodes don't get
     *  clipped at the SVG view-box edge. */
    edgeGutterTotal?: number;
  },
  hasParent: boolean,
): number {
  const byCol = new Map<number, number>();
  for (const n of visibleLeaves) {
    const col = colFor(n);
    if (Math.abs(col) > cfg.visibleHalfWindow) continue;
    byCol.set(col, (byCol.get(col) ?? 0) + 1);
  }
  const hasVisibleChildren = byCol.size > 0;
  const maxStack = hasVisibleChildren
    ? Math.max(1, ...byCol.values())
    : 0;
  const chartContent =
    maxStack > 0 ? (maxStack - 1) * cfg.rowGap + cfg.nodeHeight : 0;
  let total = chartContent + cfg.padding;
  if (hasParent) total += cfg.parentHeader;
  if (hasParent && hasVisibleChildren) total += cfg.parentChartGap ?? 0;
  if (hasParent) total += cfg.borderTotal ?? 0;
  if (hasVisibleChildren) total += cfg.edgeGutterTotal ?? 0;
  return total;
}
