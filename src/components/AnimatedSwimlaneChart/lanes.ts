// src/components/AnimatedSwimlaneChart/lanes.ts
import type { StatusFlowNode } from "../StatusFlowChart";
import { map, pluck } from "../../fn";
import {
  computeColFor,
  resolveParentStatuses,
} from "../StatusFlowChart/columns";

/**
 * How many child rows are VISIBLE right now in this lane's tallest column —
 * i.e. the height (in rows) the lane needs to shrinkwrap its visible cards.
 * Mirrors the trajectory's own visibility test (`snapshotFrame`): children
 * whose |col| exceeds `maxDepth` are collapsed into side-lozenges and don't
 * count. The parent row is excluded. Pure — same lane nodes + maxDepth in,
 * same count out — so the chart's lane-height math and the lane renderer
 * agree without passing extra props.
 */
export function visibleChildRowCount(
  laneNodes: StatusFlowNode[],
  maxDepth: number,
): number {
  const effective = resolveParentStatuses(laneNodes, "DOING");
  const parentIds = new Set<string>();
  for (const n of laneNodes) if (n.parentId) parentIds.add(n.parentId);
  const countByCol = new Map<number, number>();
  for (const n of laneNodes) {
    if (parentIds.has(n.id)) continue;
    const col = computeColFor(n, laneNodes, (id) => effective.get(id));
    if (Math.abs(col) > maxDepth) continue;
    countByCol.set(col, (countByCol.get(col) ?? 0) + 1);
  }
  let max = 0;
  for (const c of countByCol.values()) if (c > max) max = c;
  return max;
}

export interface LaneGroup {
  /** Lane id — the parent's id when grouped, "default" for ungrouped. */
  id: string;
  /** Present when the lane has a parent node at the top. */
  parentId?: string;
  /** Nodes in this lane, parent first (if any), then children in input order. */
  nodes: StatusFlowNode[];
}

/**
 * Split a flat StatusFlowNode list into lanes by parentId.
 *
 *   - Nodes referenced by some child's `parentId` become lane heads.
 *   - Children are grouped under their parent (parent prepended).
 *   - Nodes with neither role, or with a parentId that doesn't resolve
 *     to a known node, fall into a "default" lane.
 *
 * Lane ordering follows first-appearance of each lane's parent in the
 * input array; the "default" lane (when present) keeps its position
 * relative to the first orphan/standalone it contains.
 */
export function groupIntoLanes(nodes: StatusFlowNode[]): LaneGroup[] {
  const ids = new Set(pluck("id")(nodes));
  const parentIds = new Set<string>();
  for (const n of nodes) {
    if (n.parentId && ids.has(n.parentId)) parentIds.add(n.parentId);
  }

  const laneOrder: string[] = [];
  const buckets = new Map<string, StatusFlowNode[]>();

  const ensure = (laneId: string): StatusFlowNode[] => {
    let arr = buckets.get(laneId);
    if (!arr) {
      arr = [];
      buckets.set(laneId, arr);
      laneOrder.push(laneId);
    }
    return arr;
  };

  for (const n of nodes) {
    if (parentIds.has(n.id)) {
      ensure(n.id).unshift(n); // parent first
      continue;
    }
    if (n.parentId && parentIds.has(n.parentId)) {
      ensure(n.parentId).push(n);
      continue;
    }
    ensure("default").push(n);
  }

  return map(
    (laneId) => ({
      id: laneId,
      parentId: laneId === "default" ? undefined : laneId,
      nodes: buckets.get(laneId)!,
    }),
    laneOrder,
  );
}
