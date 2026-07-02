// ─── layout & frame snapshot ────────────────────────────────────────────────
//
// A "frame snapshot" is the per-node geometry for ONE moment in time,
// computed by the shared layout rules (`computeColFor`). The trajectory
// builder takes TWO frame snapshots (prev + next) and interpolates.

import type { StatusFlowNode } from "../../../components/StatusFlowChart";
import {
  resolveParentStatuses,
  computeColFor,
} from "../../../components/StatusFlowChart/columns";
import type { Rect } from "./primitives";

export interface FramePosition {
  id: string;
  col: number;
  visible: boolean;
  isParent: boolean;
  rect?: Rect; // present iff visible
}

export interface FrameSnapshot {
  byId: Map<string, FramePosition>;
}

export interface LayoutParams {
  maxDepth: number;
  centerX: number;
  parentRowCenterY: number;
  /** Center Y of the FIRST child row. Children stack downward from here with
   *  `rowGap` between rows (top-aligned just under the parent), rather than
   *  being centered in the reserved child block. */
  childStackTopY: number;
  cardWidth: number;
  cardHeight: number;
  colCenterGap: number;
  rowGap: number;
}

/**
 * Compute a frame snapshot from a status-flow state. Position math
 * mirrors the existing `computeLaneLayout` so trajectories stay in
 * lockstep with the renderer's current layout — but this version
 * returns positions for hidden nodes too (with rect undefined) so
 * arrow endpoints can resolve their hidden-side anchors.
 */
export function snapshotFrame(
  nodes: StatusFlowNode[],
  params: LayoutParams,
): FrameSnapshot {
  const effective = resolveParentStatuses(nodes, "DOING");
  const parentIds = new Set<string>();
  for (const n of nodes) if (n.parentId) parentIds.add(n.parentId);

  const cols = new Map<string, number>();
  for (const n of nodes) {
    const col = computeColFor(n, nodes, (id) => effective.get(id));
    cols.set(n.id, col);
  }

  // Bucket VISIBLE children by col so we can stack them vertically.
  const visibleByCol = new Map<number, StatusFlowNode[]>();
  for (const n of nodes) {
    if (parentIds.has(n.id)) continue;
    const col = cols.get(n.id)!;
    if (Math.abs(col) > params.maxDepth) continue;
    const list = visibleByCol.get(col) ?? [];
    list.push(n);
    visibleByCol.set(col, list);
  }

  const byId = new Map<string, FramePosition>();
  const colToX = (col: number) => params.centerX + col * params.colCenterGap;

  // Visible children — stacked top-down from the first row, so the topmost
  // child sits one rowGap below the parent and successive rows are rowGap
  // apart (no extra centering gap when fewer than the reserved rows show).
  for (const [col, group] of visibleByCol) {
    const startY = params.childStackTopY;
    group.forEach((n, i) => {
      byId.set(n.id, {
        id: n.id,
        col,
        visible: true,
        isParent: false,
        rect: {
          x: colToX(col),
          y: startY + i * (params.cardHeight + params.rowGap),
          width: params.cardWidth,
          height: params.cardHeight,
        },
      });
    });
  }
  // Hidden children — no rect, but we still record their col so the
  // trajectory builder knows which lozenge they map to.
  for (const n of nodes) {
    if (parentIds.has(n.id)) continue;
    if (byId.has(n.id)) continue;
    byId.set(n.id, {
      id: n.id,
      col: cols.get(n.id)!,
      visible: false,
      isParent: false,
    });
  }
  // Parents — top row.
  for (const n of nodes) {
    if (!parentIds.has(n.id)) continue;
    const col = cols.get(n.id) ?? 0;
    const visible = Math.abs(col) <= params.maxDepth;
    byId.set(n.id, {
      id: n.id,
      col,
      visible,
      isParent: true,
      rect: visible
        ? {
            x: colToX(col),
            y: params.parentRowCenterY,
            width: params.cardWidth,
            height: params.cardHeight,
          }
        : undefined,
    });
  }

  return { byId };
}
