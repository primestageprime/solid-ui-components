// ─── trajectories ───────────────────────────────────────────────────────────
//
// The per-card trajectory types plus one builder function per case
// (staying / leaving / arriving / hidden), and the side/lozenge
// resolution helper they share. The renderer doesn't care which case
// produced a trajectory — it just evaluates it at the current `t`.

import type { CardMode, CardStatus, Rect } from "./primitives";
import type { LanePhases } from "./timing";
import { ease, lerp, lerpRect, windowProgress } from "./math";
import { SLURP_SLIT_H, slurpRectMorph } from "./slurp";

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
const stayingStatusAt =
  (prev: CardStatus, next: CardStatus, leaveEnd: number) =>
  (t: number): CardStatus =>
    t < leaveEnd ? prev : next;

export function buildStayingTrajectory(
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

export function buildLeavingTrajectory(
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
  const innerEdgeX =
    side === "left" ? loz.x - loz.width / 2 : loz.x + loz.width / 2;
  const _lozPixel: Rect = {
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

export function buildArrivingTrajectory(
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
  const innerEdgeX =
    side === "left" ? loz.x - loz.width / 2 : loz.x + loz.width / 2;
  const _lozPixel: Rect = {
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
    modeAt: (t) => (t < slurpStart ? "gone" : t >= 1 - 1e-9 ? "card" : "morph"),
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
      const trailingX =
        side === "left"
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

export function buildHiddenTrajectory(
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

export function sideAndLoz(
  col: number,
  lozRects: LozengeRects,
): { side: "left" | "right"; loz: Rect } {
  return col < 0
    ? { side: "right", loz: lozRects.left }
    : { side: "left", loz: lozRects.right };
}
