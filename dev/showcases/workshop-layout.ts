// Pure layout helpers for the workshop's StatusFlowChart demos.
// Extracted into a separate module so they can be unit-tested in
// isolation from Solid components.
//
// `computeColFor` / `topoSortAlpha` / `STATUS_TO_COL` were promoted into
// `src/components/StatusFlowChart/columns.ts` so the production trajectory
// engine (used by `AnimatedSwimlaneChart`) can share the same column math.
// Re-exported here so existing workshop call sites keep working.

import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
export {
  STATUS_TO_COL,
  topoSortAlpha,
  computeColFor,
} from "../../src/components/StatusFlowChart/columns";

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

/**
 * Advance a status-flow state by one tick. Finishes one currently-DOING
 * leaf (chosen alphabetically for stable ordering) and promotes TODO
 * leaves whose `dependsOn` set is now satisfied. Parent nodes (referenced
 * by another node's `parentId`) are left untouched — their effective
 * status is derived from their children at render time.
 *
 * `maxConcurrent` models a fixed worker pool (e.g. 5 concurrent agents):
 * no more than this many leaves may be DOING at once, so ready TODOs only
 * start when a slot frees up. Defaults to Infinity (no cap).
 *
 * Returns a NEW array — does not mutate `prev`.
 *
 * If every leaf is already DONE, returns the input unchanged. (Callers
 * that want a cycle should detect this externally and re-init themselves;
 * historically this helper called `init()` here, but stop-when-done is
 * the more common UX so we now leave that decision to the caller.)
 */
export function advanceChildren(
  prev: StatusFlowNode[],
  maxConcurrent = Infinity,
): StatusFlowNode[] {
  const parentIds = new Set<string>();
  for (const n of prev) if (n.parentId) parentIds.add(n.parentId);
  const isLeaf = (n: StatusFlowNode) => !parentIds.has(n.id);

  if (prev.filter(isLeaf).every((n) => n.status === "DONE")) {
    return prev;
  }

  const next = prev.map((n) => ({ ...n }));
  const doing = next.filter((n) => isLeaf(n) && n.status === "DOING");
  doing.sort((a, b) => a.id.localeCompare(b.id));
  if (doing[0]) doing[0].status = "DONE";

  // Promote ready TODOs (alphabetical, stable) only while a worker slot is
  // free — i.e. fewer than maxConcurrent leaves are currently DOING.
  let doingCount = next.filter((n) => isLeaf(n) && n.status === "DOING").length;
  const ready = next
    .filter(
      (n) =>
        isLeaf(n) &&
        n.status === "TODO" &&
        (n.dependsOn ?? []).every(
          (d) => next.find((x) => x.id === d)?.status === "DONE",
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const n of ready) {
    if (doingCount >= maxConcurrent) break;
    n.status = "DOING";
    doingCount++;
  }
  return next;
}

/**
 * Promote every TODO leaf whose `dependsOn` set is satisfied to DOING.
 * Used to derive the canonical "initial state" from an all-TODO graph:
 * any independent root (no deps) becomes DOING immediately.
 */
export function promoteReady(prev: StatusFlowNode[]): StatusFlowNode[] {
  const parentIds = new Set<string>();
  for (const n of prev) if (n.parentId) parentIds.add(n.parentId);
  const isLeaf = (n: StatusFlowNode) => !parentIds.has(n.id);
  const next = prev.map((n) => ({ ...n }));
  for (const n of next) {
    if (!isLeaf(n) || n.status !== "TODO") continue;
    const ready = (n.dependsOn ?? []).every((d) =>
      next.find((x) => x.id === d)?.status === "DONE",
    );
    if (ready) n.status = "DOING";
  }
  return next;
}

/** Returns true when every leaf node has reached the DONE status. */
export function isAllDone(state: StatusFlowNode[]): boolean {
  const parentIds = new Set<string>();
  for (const n of state) if (n.parentId) parentIds.add(n.parentId);
  return state
    .filter((n) => !parentIds.has(n.id))
    .every((n) => n.status === "DONE");
}
