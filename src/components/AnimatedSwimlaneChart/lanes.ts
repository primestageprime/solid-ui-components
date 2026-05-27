// src/components/AnimatedSwimlaneChart/lanes.ts
import type { StatusFlowNode } from "../StatusFlowChart";

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
  const ids = new Set(nodes.map((n) => n.id));
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

  return laneOrder.map((laneId) => ({
    id: laneId,
    parentId: laneId === "default" ? undefined : laneId,
    nodes: buckets.get(laneId)!,
  }));
}
