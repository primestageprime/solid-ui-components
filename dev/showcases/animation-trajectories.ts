// Trajectory model for animating a single Mixed-Shapes lane between
// two frames of a status-flow state machine.
//
// The metaphor: every visual element (card, arrow anchor) is a pure
// function of `t ∈ [0, 1]` — the parameter that runs from "the
// previous frame" to "the next frame" during a single tick. A
// `LaneTrajectory` bundles those functions for one lane.
//
// Phasing within a single tick:
//   [0 .. PHASE_LEAVE_END]      cards LEAVING the visible window
//                               slurp into their lozenge
//   [PHASE_LEAVE_END .. PHASE_MOVE_END]
//                               cards that stay visible LERP between
//                               their previous and next rest rects
//   [PHASE_MOVE_END .. 1]       cards ARRIVING into the visible window
//                               slurp out of their lozenge
//
// Each phase boundary is a fraction of MS_PHASE_TOTAL so changing the
// timing budget never requires re-wiring the trajectory math.
//
// This module is pure — no Solid signals, no DOM. Renderers consume
// `evaluateAt(trajectory, t)` and render whatever the trajectory says
// each card/arrow should look like right now.

import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
import { resolveParentStatuses } from "../../src/components/StatusFlowChart";
import { computeColFor } from "./workshop-layout";

// ─── primitives ─────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CardMode = "card" | "morph" | "gone";
export type CardStatus = "TODO" | "DOING" | "DONE";

// ─── timing ─────────────────────────────────────────────────────────────────

export const MS_SLURP_MS = 600;
export const MS_MOVE_MS = 450;
export const MS_PHASE_TOTAL = MS_SLURP_MS + MS_MOVE_MS + MS_SLURP_MS; // 1650
export const PHASE_LEAVE_END = MS_SLURP_MS / MS_PHASE_TOTAL;
export const PHASE_MOVE_END = (MS_SLURP_MS + MS_MOVE_MS) / MS_PHASE_TOTAL;

// ─── math helpers ───────────────────────────────────────────────────────────

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;
export const ease = (t: number): number => 1 - Math.pow(1 - t, 3);
export const windowProgress = (t: number, start: number, end: number): number => {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
};
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});
export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

// ─── slurp morph ────────────────────────────────────────────────────────────
//
// Identical shape to the renderer's existing `slurpRectMorph` but
// parameterised so the trajectory module is self-contained. (Phase 4
// will deduplicate.)
//
// `side` describes which side of the LOZENGE the card sits on:
//   side === "left"  → card is on the LEFT of the lozenge (lozenge is
//                      on the card's right; the slit attaches to the
//                      lozenge's LEFT edge)
//   side === "right" → card is on the RIGHT of the lozenge (slit on
//                      the lozenge's RIGHT edge)
//
// `t` runs 0 → 1:
//   t === 0 → slit at lozenge's inner edge
//   t === 1 → full card at its rest rect

const SLURP_SLIT_H = 16;

export function slurpRectMorph(
  card: Rect,
  loz: Rect,
  side: "left" | "right",
  t: number,
): string {
  const cardLeft = card.x - card.width / 2;
  const cardRight = card.x + card.width / 2;
  const lozLeftEdge = loz.x - loz.width / 2;
  const lozRightEdge = loz.x + loz.width / 2;
  const lozNearEdgeX = side === "left" ? lozLeftEdge : lozRightEdge;
  const leadingFarX = side === "left" ? cardLeft : cardRight;

  const leadingT = windowProgress(t, 0.0, 0.55);
  const trailingHT = windowProgress(t, 0.4, 0.88);

  const leadingX = lerp(lozNearEdgeX, leadingFarX, ease(leadingT));
  const leadingH = lerp(SLURP_SLIT_H, card.height, ease(leadingT));
  const trailingH = lerp(SLURP_SLIT_H, card.height, ease(trailingHT));
  const trailingX = side === "left"
    ? Math.min(lozNearEdgeX, leadingX + card.width)
    : Math.max(lozNearEdgeX, leadingX - card.width);

  const yT = windowProgress(t, 0.0, 0.7);
  const morphCy = lerp(loz.y, card.y, ease(yT));

  const lTop = morphCy - leadingH / 2;
  const lBot = morphCy + leadingH / 2;
  const tTop = morphCy - trailingH / 2;
  const tBot = morphCy + trailingH / 2;
  const ctrlX = (leadingX + trailingX) / 2;
  return [
    `M ${trailingX} ${tTop}`,
    `C ${ctrlX} ${tTop}, ${ctrlX} ${lTop}, ${leadingX} ${lTop}`,
    `L ${leadingX} ${lBot}`,
    `C ${ctrlX} ${lBot}, ${ctrlX} ${tBot}, ${trailingX} ${tBot}`,
    "Z",
  ].join(" ");
}

// ─── layout & frame snapshot ────────────────────────────────────────────────
//
// A "frame snapshot" is the per-node geometry for ONE moment in time,
// computed by the shared layout rules (`computeColFor`). The trajectory
// builder takes TWO frame snapshots (prev + next) and interpolates.

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
  childRowCenterY: number;
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

  // Visible children — placed in their stack, vertically centered.
  for (const [col, group] of visibleByCol) {
    const totalH =
      group.length * params.cardHeight + (group.length - 1) * params.rowGap;
    const startY = params.childRowCenterY - totalH / 2 + params.cardHeight / 2;
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

// ─── trajectories ───────────────────────────────────────────────────────────

export interface CardTrajectory {
  id: string;
  isParent: boolean;
  modeAt: (t: number) => CardMode;
  /** Card rect for TaskCard rendering — valid when mode === "card". */
  rectAt: (t: number) => Rect | null;
  /** SVG path d-string for slurp rendering — valid when mode === "morph". */
  pathAt: (t: number) => string | null;
  /** Where arrows should anchor at time `t`. Always defined. */
  anchorAt: (t: number) => Rect;
  /** Status the card displays at time `t`. For staying cards the
   *  status flips at PHASE_LEAVE_END so the card moves with its NEW
   *  status visible — matching the existing renderer's shadow-state
   *  behaviour where the status update lands together with the col
   *  change. */
  statusAt: (t: number) => CardStatus;
  /** "How much is this card inside a lozenge right now?" ∈ [0, 1].
   *  0 = fully resting (card mode), 1 = fully gone, intermediate
   *  during a slurp morph (tracks the morph's progress: arriving
   *  cards 1 → 0, leaving cards 0 → 1). Arrows touching this card
   *  use this value to compute their dashedness. */
  hiddennessAt: (t: number) => number;
}

export interface ArrowTrajectory {
  /** Dep edge: target depends on source. */
  fromId: string;
  toId: string;
}

export interface LaneTrajectory {
  cards: Map<string, CardTrajectory>;
  arrows: ArrowTrajectory[];
  durationMs: number;
}

export interface LozengeRects {
  left: Rect;
  right: Rect;
}

// ── per-card trajectory builders ────────────────────────────────────────────
//
// One function per case. Each takes the data it needs and returns a
// `CardTrajectory`. The renderer doesn't care which case produced a
// trajectory — it just evaluates it at the current `t`.

/** Shared status interpolation: prev until PHASE_LEAVE_END, then next. */
const stayingStatusAt = (prev: CardStatus, next: CardStatus) =>
  (t: number): CardStatus => (t < PHASE_LEAVE_END ? prev : next);

function buildStayingTrajectory(
  id: string,
  prevStatus: CardStatus,
  nextStatus: CardStatus,
  isParent: boolean,
  prevRect: Rect,
  nextRect: Rect,
): CardTrajectory {
  const rectAt = (t: number): Rect => {
    if (t <= PHASE_LEAVE_END) return prevRect;
    if (t >= PHASE_MOVE_END) return nextRect;
    const local = (t - PHASE_LEAVE_END) / (PHASE_MOVE_END - PHASE_LEAVE_END);
    return lerpRect(prevRect, nextRect, ease(local));
  };
  return {
    id,
    isParent,
    modeAt: () => "card",
    rectAt,
    pathAt: () => null,
    anchorAt: rectAt,
    statusAt: stayingStatusAt(prevStatus, nextStatus),
    hiddennessAt: () => 0,
  };
}

function buildLeavingTrajectory(
  id: string,
  prevStatus: CardStatus,
  isParent: boolean,
  prevRect: Rect,
  loz: Rect,
  side: "left" | "right",
): CardTrajectory {
  return {
    id,
    isParent,
    modeAt: (t) => (t <= PHASE_LEAVE_END ? "morph" : "gone"),
    rectAt: () => null,
    pathAt: (t) => {
      if (t > PHASE_LEAVE_END) return null;
      const local = t / PHASE_LEAVE_END;
      return slurpRectMorph(prevRect, loz, side, 1 - ease(local));
    },
    // Arrow anchor: a rect that smoothly interpolates from the card's
    // rest rect at t=0 to the lozenge rect at t=PHASE_LEAVE_END. The
    // router clips arrows to this rect's edge, so the arrow tip moves
    // continuously throughout the entire slurp window — no "snap
    // partway through" from the leading-edge anchor's double-easing.
    anchorAt: (t) => {
      if (t <= 0) return prevRect;
      if (t >= PHASE_LEAVE_END) return loz;
      const local = t / PHASE_LEAVE_END;
      return lerpRect(prevRect, loz, local);
    },
    // Leaving cards are visible only during their morph — keep their
    // prev status throughout.
    statusAt: () => prevStatus,
    // Leaving: 0 at start of morph (fully out), 1 after (fully gone).
    hiddennessAt: (t) => {
      if (t <= 0) return 0;
      if (t >= PHASE_LEAVE_END) return 1;
      return ease(t / PHASE_LEAVE_END);
    },
  };
}

function buildArrivingTrajectory(
  id: string,
  nextStatus: CardStatus,
  isParent: boolean,
  nextRect: Rect,
  loz: Rect,
  side: "left" | "right",
): CardTrajectory {
  return {
    id,
    isParent,
    modeAt: (t) =>
      t < PHASE_MOVE_END
        ? "gone"
        : t >= 1 - 1e-9
          ? "card"
          : "morph",
    rectAt: (t) => (t >= 1 - 1e-9 ? nextRect : null),
    pathAt: (t) => {
      if (t < PHASE_MOVE_END || t >= 1 - 1e-9) return null;
      const local = (t - PHASE_MOVE_END) / (1 - PHASE_MOVE_END);
      return slurpRectMorph(nextRect, loz, side, ease(local));
    },
    // Arrow anchor: a rect that smoothly interpolates from the
    // lozenge at t=PHASE_MOVE_END to the card's rest rect at t=1.
    // The router clips arrows to this rect's edge, so the arrow tip
    // moves continuously throughout the entire slurp window — no
    // "snap to card position partway through" from the leading-edge
    // anchor's double-easing.
    anchorAt: (t) => {
      if (t < PHASE_MOVE_END) return loz;
      if (t >= 1 - 1e-9) return nextRect;
      const local = (t - PHASE_MOVE_END) / (1 - PHASE_MOVE_END);
      return lerpRect(loz, nextRect, local);
    },
    // Arriving cards are only visible during the slurp-out and after;
    // they wear their NEW status the whole time.
    statusAt: () => nextStatus,
    // Arriving: 1 until the slurp-out window starts, then 1 → 0
    // tracking the morph progress, 0 once at rest.
    hiddennessAt: (t) => {
      if (t < PHASE_MOVE_END) return 1;
      if (t >= 1) return 0;
      const local = (t - PHASE_MOVE_END) / (1 - PHASE_MOVE_END);
      return 1 - ease(local);
    },
  };
}

function buildHiddenTrajectory(
  id: string,
  nextStatus: CardStatus,
  isParent: boolean,
  loz: Rect,
): CardTrajectory {
  return {
    id,
    isParent,
    modeAt: () => "gone",
    rectAt: () => null,
    pathAt: () => null,
    anchorAt: () => loz,
    statusAt: () => nextStatus,
    hiddennessAt: () => 1,
  };
}

// ── side / lozenge resolution ───────────────────────────────────────────────
//
// Maps a signed col → (which lozenge, which side of the lozenge the
// card lives on). Matches the renderer's `sideAndLoz` helper.

function sideAndLoz(
  col: number,
  lozRects: LozengeRects,
): { side: "left" | "right"; loz: Rect } {
  return col < 0
    ? { side: "right", loz: lozRects.left }
    : { side: "left", loz: lozRects.right };
}

// ── top-level builder ───────────────────────────────────────────────────────

export interface BuildLaneTrajectoryArgs {
  prevFrame: StatusFlowNode[];
  nextFrame: StatusFlowNode[];
  layoutParams: LayoutParams;
  lozengeRects: LozengeRects;
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
    return ((n?.status as CardStatus) ?? "TODO");
  };

  const ids = new Set<string>([...prev.byId.keys(), ...next.byId.keys()]);
  const cards = new Map<string, CardTrajectory>();
  for (const id of ids) {
    const pp = prev.byId.get(id);
    const np = next.byId.get(id);
    const prevStatus = statusOf(id, args.prevFrame, prevEffective);
    const nextStatus = statusOf(id, args.nextFrame, nextEffective);
    const isParent = parentIds.has(id);

    if (pp?.visible && np?.visible) {
      cards.set(
        id,
        buildStayingTrajectory(
          id,
          prevStatus,
          nextStatus,
          isParent,
          pp.rect!,
          np.rect!,
        ),
      );
    } else if (pp?.visible && !np?.visible) {
      const { side, loz } = sideAndLoz(np?.col ?? pp.col, args.lozengeRects);
      cards.set(
        id,
        buildLeavingTrajectory(id, prevStatus, isParent, pp.rect!, loz, side),
      );
    } else if (!pp?.visible && np?.visible) {
      const { side, loz } = sideAndLoz(pp?.col ?? np.col, args.lozengeRects);
      cards.set(
        id,
        buildArrivingTrajectory(id, nextStatus, isParent, np.rect!, loz, side),
      );
    } else {
      // Stays hidden — but we still need its anchor so arrows
      // pointing at it can resolve.
      const col = np?.col ?? pp?.col ?? 0;
      const { loz } = sideAndLoz(col, args.lozengeRects);
      cards.set(id, buildHiddenTrajectory(id, nextStatus, isParent, loz));
    }
  }

  // Arrows: union of dep edges referenced in either frame.
  const arrowsByKey = new Map<string, ArrowTrajectory>();
  const seen = new Set<string>();
  const addEdges = (frame: StatusFlowNode[]) => {
    for (const n of frame) {
      for (const depId of n.dependsOn ?? []) {
        const key = `${depId}->${n.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        arrowsByKey.set(key, { fromId: depId, toId: n.id });
      }
    }
  };
  addEdges(args.prevFrame);
  addEdges(args.nextFrame);

  return {
    cards,
    arrows: Array.from(arrowsByKey.values()),
    durationMs: MS_PHASE_TOTAL,
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
