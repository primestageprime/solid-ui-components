// Pure layout logic for StatusFlowChart.
//
// The chart's data model is status-based: a node says "I'm in status TODO"
// and the chart figures out where to draw it. No positional hints in the
// data. These three functions encapsulate that math and are unit-tested
// in isolation so the rendering layer can stay thin.

export type StatusFlowNode = {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
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
  const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
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
      throw new Error(`Node ${n.id} has status "${n.status}" not in any column.`);
    }
    const col = statusIdx - centerIdx;
    const visible = Math.abs(col) <= halfWindow;
    const side: ColAssignment["side"] = col < 0 ? "left" : col > 0 ? "right" : "center";
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
