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

import type { StatusFlowNode } from "../../components/StatusFlowChart";
import {
  resolveParentStatuses,
  computeColFor,
} from "../../components/StatusFlowChart/columns";

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
//
// The trajectory is parameterised on a `LaneTimingConfig` so callers
// (the workshop in particular) can tune animation speeds without
// rebuilding the module. The exported `MS_*` constants below are kept
// as the DEFAULT values and the matching phase fractions for callers
// that just want the pre-knob defaults — they're equivalent to
// `phasesFor(DEFAULT_TIMING)` with `arrowSettleMs = 0`.

export interface LaneTimingConfig {
  /** ms spent in the slurp morph (in OR out). */
  slurpMs: number;
  /** ms spent moving visible cards between columns. */
  moveMs: number;
  /**
   * NEW: ms spent in the "arrow settle" window between move-end and
   * slurp-out. During this slice cards stay at rest at their next
   * column but arrow endpoints ease from their move-end anchor toward
   * their final attach point (the card's rest edge). Set to 0 to
   * preserve the pre-knob behaviour where arrows snap at move-end.
   *
   * Mechanically: when > 0, the arriving-card anchor lerps from
   * `loz` (its anchor just before move-end) to `nextRect` (its
   * resting anchor) across the settle window, then stays fixed at
   * `nextRect` for the rest of the tick — including throughout the
   * slurp-out morph. This means the visible card emerges from the
   * lozenge but the arrow no longer chases the morph's leading edge.
   */
  arrowSettleMs: number;
  /**
   * CSS `transition: d` duration on rendered arrow paths. NOT used
   * by the trajectory math — purely a render-layer hint, so optional.
   * Smooths the orthogonal router's topology changes (e.g. Z-shape ↔
   * U-shape when an obstacle threshold flips just as a card stops
   * moving) by letting the browser interpolate path commands between
   * successive `d` values. Defaults to 0 (legacy snap behaviour).
   */
  arrowPathMs?: number;
}

/**
 * Default timing for callers that don't pass a `timing` arg. Matches
 * the pre-knob constants exactly so all existing consumers (tests,
 * AnimatedSwimlaneChart, etc.) keep their old behaviour. `arrowSettleMs`
 * defaults to 0 so the regression invariant holds.
 */
export const DEFAULT_TIMING: LaneTimingConfig = {
  slurpMs: 600,
  moveMs: 450,
  arrowSettleMs: 0,
  arrowPathMs: 0,
};

/** Resolved phase boundaries derived from a `LaneTimingConfig`. */
export interface LanePhases {
  /** Total duration in ms — sum of slurp + move + arrowSettle + slurp. */
  total: number;
  /** Fraction of total at which the leave-slurp window ends. */
  leaveEnd: number;
  /** Fraction of total at which the card-move window ends. */
  moveEnd: number;
  /** Fraction of total at which the arrow-settle window ends. */
  settleEnd: number;
}

/** Compute phase fractions for a timing config. */
export function phasesFor(timing: LaneTimingConfig): LanePhases {
  const total = timing.slurpMs + timing.moveMs + timing.arrowSettleMs + timing.slurpMs;
  return {
    total,
    leaveEnd: timing.slurpMs / total,
    moveEnd: (timing.slurpMs + timing.moveMs) / total,
    settleEnd: (timing.slurpMs + timing.moveMs + timing.arrowSettleMs) / total,
  };
}

// Back-compat exports: pre-knob constants for callers that don't take
// a timing arg. These mirror the defaults exactly.
export const MS_SLURP_MS = DEFAULT_TIMING.slurpMs;
export const MS_MOVE_MS = DEFAULT_TIMING.moveMs;
export const MS_PHASE_TOTAL =
  DEFAULT_TIMING.slurpMs + DEFAULT_TIMING.moveMs +
  DEFAULT_TIMING.arrowSettleMs + DEFAULT_TIMING.slurpMs;
export const PHASE_LEAVE_END = DEFAULT_TIMING.slurpMs / MS_PHASE_TOTAL;
export const PHASE_MOVE_END =
  (DEFAULT_TIMING.slurpMs + DEFAULT_TIMING.moveMs) / MS_PHASE_TOTAL;

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

/** Shared status interpolation: prev until leaveEnd, then next. */
const stayingStatusAt = (prev: CardStatus, next: CardStatus, leaveEnd: number) =>
  (t: number): CardStatus => (t < leaveEnd ? prev : next);

function buildStayingTrajectory(
  id: string,
  prevStatus: CardStatus,
  nextStatus: CardStatus,
  isParent: boolean,
  prevRect: Rect,
  nextRect: Rect,
  phases: LanePhases,
): CardTrajectory {
  const { leaveEnd, moveEnd } = phases;
  const rectAt = (t: number): Rect => {
    if (t <= leaveEnd) return prevRect;
    if (t >= moveEnd) return nextRect;
    const local = (t - leaveEnd) / (moveEnd - leaveEnd);
    return lerpRect(prevRect, nextRect, ease(local));
  };
  return {
    id,
    isParent,
    modeAt: () => "card",
    rectAt,
    pathAt: () => null,
    anchorAt: rectAt,
    statusAt: stayingStatusAt(prevStatus, nextStatus, leaveEnd),
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
  phases: LanePhases,
): CardTrajectory {
  const { leaveEnd } = phases;
  // Single-pixel anchor at the lozenge's inner edge (where the morph
  // converges to). The arrow tip will track the morph's leading edge
  // throughout the slurp and land here.
  const innerEdgeX = side === "left"
    ? loz.x - loz.width / 2
    : loz.x + loz.width / 2;
  const lozPixel: Rect = {
    x: innerEdgeX,
    y: loz.y,
    width: 0,
    height: 0,
  };
  const cardLeft = prevRect.x - prevRect.width / 2;
  const cardRight = prevRect.x + prevRect.width / 2;
  const leadingFarX = side === "left" ? cardLeft : cardRight;
  return {
    id,
    isParent,
    modeAt: (t) => (t <= leaveEnd ? "morph" : "gone"),
    rectAt: () => null,
    pathAt: (t) => {
      if (t > leaveEnd) return null;
      const local = t / leaveEnd;
      return slurpRectMorph(prevRect, loz, side, 1 - ease(local));
    },
    // Vertical-line anchor at the morph's leading edge — width=0,
    // height interpolating from the card's height to the lozenge's.
    // Arrows from any y in the morph's vertical extent attach at
    // that source's y, staying horizontal. Post-leave: full lozenge
    // rect (same semantics for stays-hidden cards).
    anchorAt: (t) => {
      if (t <= 0) return prevRect;
      if (t >= leaveEnd) return loz;
      const local = t / leaveEnd;
      const tPrime = 1 - ease(local);
      const leadingT = windowProgress(tPrime, 0, 0.55);
      const leadingX = lerp(innerEdgeX, leadingFarX, ease(leadingT));
      const yT = windowProgress(tPrime, 0, 0.7);
      const morphCy = lerp(loz.y, prevRect.y, ease(yT));
      const morphH = lerp(loz.height, prevRect.height, tPrime);
      return { x: leadingX, y: morphCy, width: 0, height: morphH };
    },
    // Leaving cards are visible only during their morph — keep their
    // prev status throughout.
    statusAt: () => prevStatus,
    // Leaving: 0 at start of morph (fully out), 1 after (fully gone).
    hiddennessAt: (t) => {
      if (t <= 0) return 0;
      if (t >= leaveEnd) return 1;
      return ease(t / leaveEnd);
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
  phases: LanePhases,
): CardTrajectory {
  const { moveEnd, settleEnd } = phases;
  // When the arrow-settle window is enabled, arrow anchors are
  // detached from the morph's leading edge during the slurp-out:
  // they finish landing on `nextRect` BEFORE slurp-out begins, and
  // stay there. When `arrowSettleMs === 0` (default), we keep the
  // pre-knob behaviour — anchors track the morph bbox through
  // slurp-out so arrow tips visibly chase the card's leading edge.
  const hasSettle = settleEnd > moveEnd + 1e-9;
  // Single-pixel anchor at the lozenge's inner edge (the edge facing
  // the visible cards). This is where the arrow attaches BEFORE the
  // slurp begins and where the morph's leading edge starts.
  const innerEdgeX = side === "left"
    ? loz.x - loz.width / 2
    : loz.x + loz.width / 2;
  const lozPixel: Rect = {
    x: innerEdgeX,
    y: loz.y,
    width: 0,
    height: 0,
  };
  const cardLeft = nextRect.x - nextRect.width / 2;
  const cardRight = nextRect.x + nextRect.width / 2;
  const leadingFarX = side === "left" ? cardLeft : cardRight;
  // Slurp-out morph window starts at settleEnd (= moveEnd when
  // arrowSettleMs === 0).
  const slurpStart = settleEnd;
  return {
    id,
    isParent,
    modeAt: (t) =>
      t < slurpStart
        ? "gone"
        : t >= 1 - 1e-9
          ? "card"
          : "morph",
    rectAt: (t) => (t >= 1 - 1e-9 ? nextRect : null),
    pathAt: (t) => {
      if (t < slurpStart || t >= 1 - 1e-9) return null;
      const local = (t - slurpStart) / (1 - slurpStart);
      return slurpRectMorph(nextRect, loz, side, ease(local));
    },
    // Anchor behaviour:
    //
    //   t ∈ [0, moveEnd)         — full lozenge rect (arrow attaches
    //                              to the lozenge).
    //   t ∈ [moveEnd, settleEnd) — NEW arrow-settle window. Cards
    //                              are at rest at nextRect; arrow
    //                              anchor lerps loz → nextRect so the
    //                              arrow visibly migrates from the
    //                              lozenge to the card's edge before
    //                              the slurp-out begins.
    //   t ∈ [settleEnd, 1)       — slurp-out phase. If settle is
    //                              enabled, anchor is fixed at
    //                              nextRect (the arrow's already
    //                              landed; the visible morph paints
    //                              over it). If settle is zero, fall
    //                              back to pre-knob behaviour where
    //                              anchor tracks the morph bbox.
    //   t = 1                    — nextRect (router uses full rect).
    anchorAt: (t) => {
      if (t < moveEnd) return loz;
      if (t >= 1 - 1e-9) return nextRect;
      if (t < settleEnd) {
        // Arrow-settle window: lerp loz → nextRect.
        const local = (t - moveEnd) / (settleEnd - moveEnd);
        return lerpRect(loz, nextRect, ease(local));
      }
      if (hasSettle) {
        // Slurp-out with settle enabled: anchor is parked at the
        // card's rest rect. The slurp morph still animates the
        // visible shape, but the arrow no longer chases it.
        return nextRect;
      }
      // Pre-knob behaviour: anchor tracks the morph bbox during
      // slurp-out so the arrow's tip clips to the morph's leading
      // edge.
      const local = (t - slurpStart) / (1 - slurpStart);
      const easedT = ease(local);
      // leading + trailing X — same calculations as slurpRectMorph
      const leadingT = windowProgress(easedT, 0, 0.55);
      const leadingX = lerp(innerEdgeX, leadingFarX, ease(leadingT));
      const trailingX = side === "left"
        ? Math.min(innerEdgeX, leadingX + nextRect.width)
        : Math.max(innerEdgeX, leadingX - nextRect.width);
      // vertical extent — max of leading + trailing heights
      const leadingH = lerp(SLURP_SLIT_H, nextRect.height, ease(leadingT));
      const trailingHT = windowProgress(easedT, 0.4, 0.88);
      const trailingH = lerp(SLURP_SLIT_H, nextRect.height, ease(trailingHT));
      const yT = windowProgress(easedT, 0, 0.7);
      const morphCy = lerp(loz.y, nextRect.y, ease(yT));
      const left = Math.min(leadingX, trailingX);
      const right = Math.max(leadingX, trailingX);
      return {
        x: (left + right) / 2,
        y: morphCy,
        width: right - left,
        height: Math.max(leadingH, trailingH),
      };
    },
    // Arriving cards are only visible during the slurp-out and after;
    // they wear their NEW status the whole time.
    statusAt: () => nextStatus,
    // Arriving: 1 until the slurp-out morph window starts, then 1 → 0
    // tracking the morph progress, 0 once at rest. (Note: hiddenness
    // tracks the visible morph, not the anchor — so dashedness still
    // fades to solid as the card emerges, even when the arrow's
    // anchor has already settled.)
    hiddennessAt: (t) => {
      if (t < slurpStart) return 1;
      if (t >= 1) return 0;
      const local = (t - slurpStart) / (1 - slurpStart);
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
    return ((n?.status as CardStatus) ?? "TODO");
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
  const isParent = args.isParent ?? ((id) =>
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
