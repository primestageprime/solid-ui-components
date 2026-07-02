// ─── top-level builders ─────────────────────────────────────────────────────
//
// The public entry points that assemble a whole `LaneTrajectory` from
// two frames (or two pre-computed snapshots), plus the arrow-dashedness
// query that reads the assembled card trajectories.

import type { StatusFlowNode } from "../../../components/StatusFlowChart";
import { resolveParentStatuses } from "../../../components/StatusFlowChart/columns";
import type { CardStatus } from "./primitives";
import { DEFAULT_TIMING, type LaneTimingConfig, phasesFor } from "./timing";
import {
  type FrameSnapshot,
  type LayoutParams,
  snapshotFrame,
} from "./layout";
import {
  type ArrowTrajectory,
  buildArrivingTrajectory,
  buildHiddenTrajectory,
  buildLeavingTrajectory,
  buildStayingTrajectory,
  type CardTrajectory,
  type LaneTrajectory,
  type LozengeRects,
  sideAndLoz,
} from "./card-builders";

export interface BuildLaneTrajectoryArgs {
  prevFrame: StatusFlowNode[];
  nextFrame: StatusFlowNode[];
  layoutParams: LayoutParams;
  lozengeRects: LozengeRects;
  /**
   * Optional timing overrides. Defaults to `DEFAULT_TIMING` (matches
   * pre-knob constants, no arrow-settle window) so existing callers
   * keep their old behaviour exactly.
   */
  timing?: LaneTimingConfig;
}

export function buildLaneTrajectory(
  args: BuildLaneTrajectoryArgs,
): LaneTrajectory {
  const prev = snapshotFrame(args.prevFrame, args.layoutParams);
  const next = snapshotFrame(args.nextFrame, args.layoutParams);

  // Per-id status lookups: prev frame's status (worn during phase 1)
  // and next frame's status (worn during phases 2-3). For parents
  // resolveParentStatuses gives the effective status derived from
  // children, which is what the card should show.
  const prevEffective = resolveParentStatuses(args.prevFrame, "DOING");
  const nextEffective = resolveParentStatuses(args.nextFrame, "DOING");
  const parentIds = new Set<string>();
  for (const n of args.nextFrame) if (n.parentId) parentIds.add(n.parentId);
  for (const n of args.prevFrame) if (n.parentId) parentIds.add(n.parentId);

  const statusOf = (
    id: string,
    frame: StatusFlowNode[],
    effective: Map<string, string>,
  ): CardStatus => {
    if (parentIds.has(id)) {
      return (effective.get(id) as CardStatus) ?? "TODO";
    }
    const n = frame.find((x) => x.id === id);
    return (n?.status as CardStatus) ?? "TODO";
  };

  // Edges: union of dep edges referenced in either frame.
  const edgePairs: Array<[string, string]> = [];
  const edgeSeen = new Set<string>();
  const addEdges = (frame: StatusFlowNode[]) => {
    for (const n of frame) {
      for (const depId of n.dependsOn ?? []) {
        const key = `${depId}->${n.id}`;
        if (edgeSeen.has(key)) continue;
        edgeSeen.add(key);
        edgePairs.push([depId, n.id]);
      }
    }
  };
  addEdges(args.prevFrame);
  addEdges(args.nextFrame);

  return buildLaneTrajectoryFromSnapshots({
    prev,
    next,
    lozengeRects: args.lozengeRects,
    isParent: (id) => parentIds.has(id),
    prevStatusOf: (id) => statusOf(id, args.prevFrame, prevEffective),
    nextStatusOf: (id) => statusOf(id, args.nextFrame, nextEffective),
    edges: edgePairs,
    timing: args.timing,
  });
}

/**
 * Generic trajectory builder that works on pre-computed `FrameSnapshot`s.
 *
 * The status-flow flavour (`buildLaneTrajectory` above) constructs its
 * snapshots via `snapshotFrame` + `computeColFor`. The SwimlaneChart
 * flavour (`AnimatedSwimlaneChart`) constructs them from `swimlaneFor`
 * and a `DAGEdge[]` list — neither path is special here. Status is opaque
 * to this function: callers control what string lives in `statusAt(t)`
 * by passing `{prev,next}StatusOf` resolvers. The default resolver
 * returns "TODO" — fine for consumers (like SwimlaneChart) that don't
 * care about per-card status overlays.
 */
export interface BuildFromSnapshotsArgs {
  prev: FrameSnapshot;
  next: FrameSnapshot;
  lozengeRects: LozengeRects;
  /** Returns true if the given id should be treated as a "parent" card
   *  (lives on the parent row rather than the child grid). Defaults to
   *  reading `isParent` off the matching FramePosition.  */
  isParent?: (id: string) => boolean;
  /** Status string the card displays in the prev frame. */
  prevStatusOf?: (id: string) => CardStatus;
  /** Status string the card displays in the next frame. */
  nextStatusOf?: (id: string) => CardStatus;
  /** Dep edges as [sourceId, targetId] pairs. Caller dedupes. */
  edges: Array<[string, string]>;
  /**
   * Optional timing overrides. Defaults to `DEFAULT_TIMING` so existing
   * callers (AnimatedSwimlaneChart, tests) keep their old behaviour.
   */
  timing?: LaneTimingConfig;
}

export function buildLaneTrajectoryFromSnapshots(
  args: BuildFromSnapshotsArgs,
): LaneTrajectory {
  const isParent =
    args.isParent ??
    ((id) =>
      !!(args.prev.byId.get(id)?.isParent || args.next.byId.get(id)?.isParent));
  const prevStatusOf = args.prevStatusOf ?? (() => "TODO" as CardStatus);
  const nextStatusOf = args.nextStatusOf ?? (() => "TODO" as CardStatus);
  const timing = args.timing ?? DEFAULT_TIMING;
  const phases = phasesFor(timing);

  const ids = new Set<string>([
    ...args.prev.byId.keys(),
    ...args.next.byId.keys(),
  ]);
  const cards = new Map<string, CardTrajectory>();
  for (const id of ids) {
    const pp = args.prev.byId.get(id);
    const np = args.next.byId.get(id);
    const prevStatus = prevStatusOf(id);
    const nextStatus = nextStatusOf(id);
    const parentFlag = isParent(id);

    if (pp?.visible && np?.visible) {
      cards.set(
        id,
        buildStayingTrajectory(
          id,
          prevStatus,
          nextStatus,
          parentFlag,
          pp.rect!,
          np.rect!,
          phases,
        ),
      );
    } else if (pp?.visible && !np?.visible) {
      const { side, loz } = sideAndLoz(np?.col ?? pp.col, args.lozengeRects);
      cards.set(
        id,
        buildLeavingTrajectory(
          id,
          prevStatus,
          parentFlag,
          pp.rect!,
          loz,
          side,
          phases,
        ),
      );
    } else if (!pp?.visible && np?.visible) {
      const { side, loz } = sideAndLoz(pp?.col ?? np.col, args.lozengeRects);
      cards.set(
        id,
        buildArrivingTrajectory(
          id,
          nextStatus,
          parentFlag,
          np.rect!,
          loz,
          side,
          phases,
        ),
      );
    } else {
      const col = np?.col ?? pp?.col ?? 0;
      const { loz } = sideAndLoz(col, args.lozengeRects);
      cards.set(id, buildHiddenTrajectory(id, nextStatus, parentFlag, loz));
    }
  }

  const arrowsByKey = new Map<string, ArrowTrajectory>();
  for (const [fromId, toId] of args.edges) {
    const key = `${fromId}->${toId}`;
    if (arrowsByKey.has(key)) continue;
    arrowsByKey.set(key, { fromId, toId });
  }

  return {
    cards,
    arrows: Array.from(arrowsByKey.values()),
    durationMs: phases.total,
  };
}

// ── arrow dashedness ────────────────────────────────────────────────────────
//
// Dashedness ∈ [0, 1]: 0 = solid, 1 = fully dashed. Defined as the
// maximum of the two endpoints' `hiddennessAt(t)` — an arrow is "as
// hidden as its most-hidden endpoint." This produces the continuous
// fade callers want:
//
//   - Both endpoints resting → both hiddenness 0 → dashedness 0 → solid
//   - One endpoint slurping out (1 → 0) → arrow morphs dashed → solid
//   - One endpoint slurping in  (0 → 1) → arrow morphs solid → dashed
//   - Either endpoint fully gone → dashedness 1 → fully dashed
//
// Missing endpoint (shouldn't happen, but guard) is treated as fully
// hidden so the arrow renders dashed rather than snapping to an
// invalid solid state.

export function dashednessAt(
  arrow: ArrowTrajectory,
  cards: Map<string, CardTrajectory>,
  t: number,
): number {
  const from = cards.get(arrow.fromId);
  const to = cards.get(arrow.toId);
  if (!from || !to) return 1;
  return Math.max(from.hiddennessAt(t), to.hiddennessAt(t));
}
