// Pure layout logic for StatusFlowChart.
//
// The chart's data model is status-based: a node says "I'm in status TODO"
// and the chart figures out where to draw it. No positional hints in the
// data. These three functions encapsulate that math and are unit-tested
// in isolation so the rendering layer can stay thin.
import { sortBy, filter, map } from "../../fn";

export type StatusFlowNode = {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  /** Who claimed the task, shown top-left on the default card (e.g. a name or initials). */
  claimedBy?: string;
  /** Pre-formatted estimate, shown bottom-left on the default card (e.g. "3d", "8h"). */
  estimate?: string;
  /** Pre-formatted actual, shown bottom-right on the default card (e.g. "4d", "10h"). */
  actual?: string;
  /** Optional visual grouping — children stack under this parent in their own lane. */
  parentId?: string;
  /** Optional dependency edges (one→many). Purely informational; not used for layout. */
  dependsOn?: string[];
};

export type StatusFlowColumn = {
  label: string;
  /** All statuses that map to this column. Typical: one each, but a "TODO + BLOCKED"
   *  bucket is allowed. The same status cannot appear in two columns. */
  statuses: string[];
};

export type StatusFlowBreakpoint = {
  /** Container width (px) at which this breakpoint activates. Largest matching wins. */
  minWidth: number;
  /** Number of columns visible at this width. Should be odd so DOING stays centered. */
  visibleCols: number;
};

export type ColAssignment = {
  /** Signed column index relative to centerStatus's column. 0 = center (DOING). */
  col: number;
  /** False when |col| exceeds the visible window — the node renders as a side summary. */
  visible: boolean;
  side: "left" | "right" | "center";
};

/**
 * Pick the visible-col count for the current container width by selecting
 * the highest-matching breakpoint. If no breakpoint matches (width below
 * all), returns the smallest breakpoint's visibleCols.
 *
 * Pure: same input → same output.
 */
export function pickVisibleCols(
  containerWidth: number,
  breakpoints: StatusFlowBreakpoint[],
): number {
  if (breakpoints.length === 0) return 1;
  const sorted = sortBy((b: StatusFlowBreakpoint) => b.minWidth)(breakpoints);
  let chosen = sorted[0].visibleCols;
  for (const bp of sorted) {
    if (containerWidth >= bp.minWidth) chosen = bp.visibleCols;
    else break;
  }
  return chosen;
}

/** Build a status → column-index map. Throws if a status appears in 2+ columns. */
function indexStatuses(columns: StatusFlowColumn[]): Map<string, number> {
  const out = new Map<string, number>();
  columns.forEach((c, i) => {
    for (const s of c.statuses) {
      if (out.has(s)) {
        throw new Error(
          `Status "${s}" appears in two columns (${out.get(s)} and ${i}). ` +
            `Each status must map to exactly one column.`,
        );
      }
      out.set(s, i);
    }
  });
  return out;
}

/**
 * For each node, compute its signed column (relative to the centerStatus's
 * column) and whether it falls inside the visible window.
 *
 * Visible window = `floor(visibleCols / 2)` on each side of center, plus
 * the center column itself. Nodes outside this window get `visible: false`
 * so the renderer can collapse them into a side-summary badge.
 *
 * Pure: same input → same output. No node ordering assumptions.
 */
export function assignColumns(
  nodes: StatusFlowNode[],
  columns: StatusFlowColumn[],
  centerStatus: string,
  visibleCols: number,
): Map<string, ColAssignment> {
  const idx = indexStatuses(columns);
  const centerIdx = idx.get(centerStatus);
  if (centerIdx === undefined) {
    throw new Error(`centerStatus "${centerStatus}" is not in any column.`);
  }
  const halfWindow = Math.floor(visibleCols / 2);
  const out = new Map<string, ColAssignment>();
  for (const n of nodes) {
    const statusIdx = idx.get(n.status);
    if (statusIdx === undefined) {
      throw new Error(
        `Node ${n.id} has status "${n.status}" not in any column.`,
      );
    }
    const col = statusIdx - centerIdx;
    const visible = Math.abs(col) <= halfWindow;
    const side: ColAssignment["side"] =
      col < 0 ? "left" : col > 0 ? "right" : "center";
    out.set(n.id, { col, visible, side });
  }
  return out;
}

/**
 * Derive each node's *effective* status from its children.
 *
 * Rules (apply in priority order):
 *   1. ANY child in `centerStatus` → parent is `centerStatus`.
 *   2. ALL children share the same status → parent takes that status.
 *   3. Mixed without any `centerStatus` (e.g. some DONE + some TODO with
 *      no DOING) → parent keeps its own input status as a fallback.
 *
 * Parents without children pass through unchanged. Non-parents pass
 * through unchanged. Single-level only — does not recurse through
 * grandchildren. If nested grouping is needed, run to a fixed point.
 */
export function resolveParentStatuses(
  nodes: StatusFlowNode[],
  centerStatus: string,
): Map<string, string> {
  const childrenByParent = new Map<string, StatusFlowNode[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const list = childrenByParent.get(n.parentId) ?? [];
      list.push(n);
      childrenByParent.set(n.parentId, list);
    }
  }
  const out = new Map<string, string>();
  for (const n of nodes) {
    const children = childrenByParent.get(n.id);
    if (children && children.length > 0) {
      const statuses = children.map((c) => c.status);
      if (statuses.some((s) => s === centerStatus)) {
        out.set(n.id, centerStatus);
      } else if (statuses.every((s) => s === statuses[0])) {
        out.set(n.id, statuses[0]);
      } else {
        out.set(n.id, n.status);
      }
    } else {
      out.set(n.id, n.status);
    }
  }
  return out;
}

// ─── topological / col helpers (used by animated layouts) ───────────────────
//
// Moved here from `dev/showcases/workshop-layout.ts` so that production
// code in `src/` can compute the same status-based column placements
// without crossing the dev/src boundary. `workshop-layout.ts` re-exports
// these as the canonical source.

/**
 * Status → signed column. Convention matches StatusFlowChart's default
 * three-column layout:  DONE → -1, DOING → 0, TODO → +1.
 */
export const STATUS_TO_COL: Record<string, number> = {
  DONE: -1,
  DOING: 0,
  TODO: 1,
};

/**
 * Topological sort of a leaf set with alphabetical id as a tiebreaker
 * when multiple nodes become ready simultaneously. Ignores `dependsOn`
 * entries that reference ids outside the leaf set.
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
    const deps = filter((d) => byId.has(d), n.dependsOn ?? []);
    const d = deps.length === 0 ? 0 : Math.max(...map(visit, deps)) + 1;
    cache.set(id, d);
    return d;
  };
  for (const l of leaves) visit(l.id);
  return cache;
}

/**
 * Compute the column for a single node within `nodes`. See the workshop
 * docs for the detailed depth-and-status ranking rules.
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
