import { describe, it, expect } from "vitest";
import type { StatusFlowNode } from "../../components/StatusFlowChart";
import {
  buildLaneTrajectory,
  buildLaneTrajectoryFromSnapshots,
  dashednessAt,
  DEFAULT_TIMING,
  lerp,
  lerpRect,
  MS_PHASE_TOTAL,
  PHASE_LEAVE_END,
  PHASE_MOVE_END,
  phasesFor,
  snapshotFrame,
  type LaneTimingConfig,
  type LaneTrajectory,
  type LayoutParams,
  type LozengeRects,
} from "./trajectories";

// Standardised layout/lozenge params used across most tests. The exact
// pixel values are arbitrary — what matters is that the math is
// consistent across snapshots.
const PARAMS: LayoutParams = {
  maxDepth: 1,
  centerX: 500,
  parentRowCenterY: 50,
  childRowCenterY: 200,
  cardWidth: 140,
  cardHeight: 84,
  colCenterGap: 200,
  rowGap: 16,
};
const LOZENGES: LozengeRects = {
  left: { x: 200, y: 200, width: 16, height: 200 },
  right: { x: 800, y: 200, width: 16, height: 200 },
};

// Small ε for floating-point comparison.
const NEAR = (a: number, b: number, eps = 1e-3) =>
  Math.abs(a - b) <= eps;

// ─── math helpers ───────────────────────────────────────────────────────────

describe("math helpers", () => {
  it("lerp interpolates linearly", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(-5, 5, 0.5)).toBe(0);
  });

  it("lerpRect interpolates each axis independently", () => {
    const a = { x: 0, y: 0, width: 10, height: 20 };
    const b = { x: 100, y: 200, width: 50, height: 60 };
    const mid = lerpRect(a, b, 0.5);
    expect(mid).toEqual({ x: 50, y: 100, width: 30, height: 40 });
  });
});

// ─── frame snapshots ────────────────────────────────────────────────────────

describe("snapshotFrame — linear chain", () => {
  // All-TODO chain: a → b → c → d. With maxDepth=1, only a is visible
  // (TODO col +1); b/c/d hidden at +2/+3/+4.
  const chain: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
  ];

  it("places visible nodes with rects and hidden nodes without", () => {
    const snap = snapshotFrame(chain, PARAMS);
    const a = snap.byId.get("a")!;
    const b = snap.byId.get("b")!;
    expect(a.visible).toBe(true);
    expect(a.rect).toBeDefined();
    expect(b.visible).toBe(false);
    expect(b.rect).toBeUndefined();
  });

  it("preserves signed col for hidden nodes (for lozenge resolution)", () => {
    const snap = snapshotFrame(chain, PARAMS);
    const b = snap.byId.get("b")!;
    const c = snap.byId.get("c")!;
    const d = snap.byId.get("d")!;
    expect(b.col).toBeGreaterThan(1);
    expect(c.col).toBeGreaterThan(b.col);
    expect(d.col).toBeGreaterThan(c.col);
  });

  it("after a DONE — visible nodes shift toward the LEFT lozenge", () => {
    const advanced: StatusFlowNode[] = chain.map((n) =>
      n.id === "a" ? { ...n, status: "DONE" } :
      n.id === "b" ? { ...n, status: "DOING" } : n,
    );
    const snap = snapshotFrame(advanced, PARAMS);
    const a = snap.byId.get("a")!;
    const b = snap.byId.get("b")!;
    expect(a.col).toBeLessThan(0); // DONE → left
    expect(b.col).toBe(0); // DOING → center
  });
});

// ─── card trajectories — staying ────────────────────────────────────────────

describe("buildLaneTrajectory — staying cards", () => {
  // A two-step chain where on tick: a goes TODO→DOING, b stays TODO.
  // Both are visible across the tick (just shift cols).
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];

  it("rectAt(0) is the prev rect; rectAt(1) is the next rect", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    const prevSnap = snapshotFrame(prev, PARAMS).byId.get("a")!;
    const nextSnap = snapshotFrame(next, PARAMS).byId.get("a")!;
    expect(a.modeAt(0)).toBe("card");
    expect(a.modeAt(1)).toBe("card");
    expect(a.rectAt(0)).toEqual(prevSnap.rect);
    expect(a.rectAt(1)).toEqual(nextSnap.rect);
  });

  it("stays at prev position before PHASE_LEAVE_END", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    const prevSnap = snapshotFrame(prev, PARAMS).byId.get("a")!;
    expect(a.rectAt(PHASE_LEAVE_END / 2)).toEqual(prevSnap.rect);
  });

  it("is lerping between prev and next during the move window", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    const prevX = snapshotFrame(prev, PARAMS).byId.get("a")!.rect!.x;
    const nextX = snapshotFrame(next, PARAMS).byId.get("a")!.rect!.x;
    const midT = (PHASE_LEAVE_END + PHASE_MOVE_END) / 2;
    const midRect = a.rectAt(midT)!;
    // Mid-window x should be strictly between prev and next.
    const [lo, hi] = prevX < nextX ? [prevX, nextX] : [nextX, prevX];
    expect(midRect.x).toBeGreaterThan(lo);
    expect(midRect.x).toBeLessThan(hi);
  });

  it("settles at next position after PHASE_MOVE_END", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    const nextSnap = snapshotFrame(next, PARAMS).byId.get("a")!;
    expect(a.rectAt(PHASE_MOVE_END + 0.01)).toEqual(nextSnap.rect);
  });
});

// ─── card trajectories — leaving / arriving ─────────────────────────────────

describe("buildLaneTrajectory — leaving cards", () => {
  // 5-step chain. Initial: a visible (TODO+1), b/c/d/e hidden.
  // After tick: a DOING (col 0), b TODO (col +1) visible, c/d/e hidden.
  // Nothing LEAVES on this transition — all hidden ids stay hidden, b
  // is the arriving one.
  //
  // To get a leaving case, run a tick on an already-progressed state.
  // Start with a DONE, b DOING, c visible. Advance: b DONE, c DOING,
  // d visible. `a` shifts further left and (if max-depth narrow) falls
  // off the left edge — LEAVING.
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DONE" },
    { id: "b", title: "B", status: "DONE", dependsOn: ["a"] },
    { id: "c", title: "C", status: "DOING", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DONE" },
    { id: "b", title: "B", status: "DONE", dependsOn: ["a"] },
    { id: "c", title: "C", status: "DONE", dependsOn: ["b"] },
    { id: "d", title: "D", status: "DOING", dependsOn: ["c"] },
  ];

  it("a card that disappears off the left edge slurps INTO the left lozenge", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const prevSnap = snapshotFrame(prev, PARAMS);
    const nextSnap = snapshotFrame(next, PARAMS);
    // Find an id that's visible in prev but hidden in next, if any.
    const leavingId = Array.from(prevSnap.byId.keys()).find((id) => {
      return prevSnap.byId.get(id)!.visible && !nextSnap.byId.get(id)!.visible;
    });
    if (leavingId !== undefined) {
      const card = traj.cards.get(leavingId)!;
      expect(card.modeAt(0)).toBe("morph");
      expect(card.modeAt(PHASE_LEAVE_END + 0.01)).toBe("gone");
      expect(card.pathAt(0)).toBeTruthy();
      expect(card.pathAt(PHASE_LEAVE_END + 0.01)).toBeNull();
    }
  });
});

describe("buildLaneTrajectory — arriving cards", () => {
  // a TODO → DOING. b is depth+1 dep, hidden before, visible after.
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
  ];

  it("a card that appears from the right lozenge: morph during slurp-out window", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const prevSnap = snapshotFrame(prev, PARAMS);
    const nextSnap = snapshotFrame(next, PARAMS);
    const arrivingId = Array.from(nextSnap.byId.keys()).find((id) => {
      return nextSnap.byId.get(id)!.visible && !prevSnap.byId.get(id)!.visible;
    });
    expect(arrivingId).toBeDefined();
    const card = traj.cards.get(arrivingId!)!;
    expect(card.modeAt(0)).toBe("gone");
    // Mid-move-phase: leave-end is past, move-end is not. Use the
    // midpoint between the two so changing MS_SLURP_MS / MS_MOVE_MS
    // doesn't shift this assertion across either boundary.
    const midMove = (PHASE_LEAVE_END + PHASE_MOVE_END) / 2;
    expect(card.modeAt(midMove)).toBe("gone");
    expect(card.modeAt(PHASE_MOVE_END + 0.01)).toBe("morph");
    expect(card.modeAt(1)).toBe("card");
    expect(card.rectAt(1)).toEqual(nextSnap.byId.get(arrivingId!)!.rect);
  });

  it("anchorAt during the slurp-out moves OUTWARD from the lozenge", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const nextSnap = snapshotFrame(next, PARAMS);
    const arrivingId = Array.from(nextSnap.byId.keys()).find((id) => {
      return nextSnap.byId.get(id)!.visible && !snapshotFrame(prev, PARAMS).byId.get(id)!.visible;
    })!;
    const card = traj.cards.get(arrivingId)!;
    // Sample within the leading-edge window (local-t in [0, 0.55] of
    // the slurp-out morph). Beyond that, the leading edge is parked
    // at the card's far edge and the trailing edge catches up — so
    // the leading-edge anchor stops sweeping outward.
    const tA = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.1;
    const tB = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.4;
    const ax = card.anchorAt(tA).x;
    const bx = card.anchorAt(tB).x;
    const lozX = LOZENGES.right.x;
    // Anchor at tA should be closer to the lozenge than at tB
    // (it's sweeping OUTWARD as t advances).
    expect(Math.abs(ax - lozX)).toBeLessThan(Math.abs(bx - lozX));
  });
});

// ─── stays-hidden ───────────────────────────────────────────────────────────

describe("buildLaneTrajectory — stays-hidden cards", () => {
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
  ];

  it("stays-hidden card has mode=gone everywhere and anchor at lozenge", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // d is hidden in both prev and next.
    const card = traj.cards.get("d")!;
    expect(card.modeAt(0)).toBe("gone");
    expect(card.modeAt(0.5)).toBe("gone");
    expect(card.modeAt(1)).toBe("gone");
    // Anchor for d (TODO, hidden right) is at the right lozenge.
    expect(card.anchorAt(0)).toEqual(LOZENGES.right);
    expect(card.anchorAt(1)).toEqual(LOZENGES.right);
  });
});

// ─── arrows ─────────────────────────────────────────────────────────────────

describe("buildLaneTrajectory — arrows and dashedness", () => {
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];

  it("collects all unique dep edges across both frames", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    expect(traj.arrows).toEqual([{ fromId: "a", toId: "b" }]);
  });

  it("a→b is DASHED when b is hidden (t=0, b stays-hidden? no — arriving)", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // b is arriving (gone at t=0, becomes card at t=1).
    // a is staying (card at all t).
    // Dashed at t=0 because b is "gone"; solid at t=1 because both are "card".
    expect(dashednessAt(traj.arrows[0], traj.cards, 0)).toBe(1);
    expect(dashednessAt(traj.arrows[0], traj.cards, 1)).toBe(0);
  });
});

// ─── duration ───────────────────────────────────────────────────────────────

describe("buildLaneTrajectory — hiddennessAt + dashedness fade", () => {
  // a TODO → DOING. b is the arriving card (hidden in prev, visible in next).
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];

  it("staying cards have hiddenness 0 always", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    expect(a.hiddennessAt(0)).toBe(0);
    expect(a.hiddennessAt(0.5)).toBe(0);
    expect(a.hiddennessAt(1)).toBe(0);
  });

  it("arriving card hiddenness is 1 before the morph and 0 after", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    expect(b.hiddennessAt(0)).toBe(1);
    expect(b.hiddennessAt(PHASE_MOVE_END - 0.001)).toBe(1);
    expect(b.hiddennessAt(1)).toBe(0);
  });

  it("arriving card hiddenness decreases monotonically during slurp-out", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const tEarly = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.1;
    const tMid = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.5;
    const tLate = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.9;
    expect(b.hiddennessAt(tEarly)).toBeGreaterThan(b.hiddennessAt(tMid));
    expect(b.hiddennessAt(tMid)).toBeGreaterThan(b.hiddennessAt(tLate));
  });

  it("arrow dashedness fades smoothly as arriving target slurps out", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const arrow = traj.arrows[0]; // a → b
    // Before the slurp-out window, b is hidden → dashed.
    expect(dashednessAt(arrow, traj.cards, 0)).toBe(1);
    // After it settles, both endpoints rest → solid.
    expect(dashednessAt(arrow, traj.cards, 1)).toBe(0);
    // Midway through the slurp-out, dashedness is strictly between.
    const tMid = PHASE_MOVE_END + (1 - PHASE_MOVE_END) * 0.5;
    const midDash = dashednessAt(arrow, traj.cards, tMid);
    expect(midDash).toBeGreaterThan(0);
    expect(midDash).toBeLessThan(1);
  });
});

describe("buildLaneTrajectory — statusAt", () => {
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];

  it("staying card wears prev status until PHASE_LEAVE_END, then next", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const a = traj.cards.get("a")!;
    expect(a.statusAt(0)).toBe("TODO");
    expect(a.statusAt(PHASE_LEAVE_END - 0.001)).toBe("TODO");
    expect(a.statusAt(PHASE_LEAVE_END + 0.001)).toBe("DOING");
    expect(a.statusAt(1)).toBe("DOING");
  });

  it("arriving card always wears next status", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    expect(b.statusAt(0)).toBe("TODO");
    expect(b.statusAt(1)).toBe("TODO");
  });
});

// ─── broom topology integration ─────────────────────────────────────────────
//
// The broom is the most interesting layout case: three independent
// roots stack at the same col, and as they finish, deeper dependents
// fan in. Verify the trajectory produces the right MIX of staying /
// leaving / arriving / staying-hidden for one tick of the broom.

describe("buildLaneTrajectory — anchor progresses with the morph", () => {
  // The arrow anchor uses the SAME ease curve as the morph shape so
  // the arrow tip and the box visually progress together. Invariants:
  //
  //   1. Monotonic — anchor.x moves away from loz toward card as t
  //      advances through the slurp window.
  //   2. Front-loaded — most of the distance is covered in the first
  //      half of the window (because ease(t)=1-(1-t)^3 is steep early
  //      and shallow late, matching the morph shape's ease).
  //   3. Endpoints — anchor is at loz at t=PHASE_MOVE_END and at
  //      card at t=1.
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const tAt = (local: number) =>
    PHASE_MOVE_END + (1 - PHASE_MOVE_END) * local;

  it("arriving card anchor moves monotonically toward the card", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((l) => b.anchorAt(tAt(l)).x);
    // Non-increasing: anchor moves left (toward the card) and then
    // stays there once it reaches the card. With the morph-synced
    // ease, the anchor "completes" by local≈0.5 and parks there for
    // the rest of the window.
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThanOrEqual(xs[i - 1]);
    }
  });

  it("arriving card anchor's LEFT edge tracks the morph's leading edge", () => {
    // Anchor is the morph SHAPE's bbox (left = leading edge x for
    // side="left"). Arrows from cards left of the morph clip to the
    // bbox's left edge, which equals leadingX.
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const nextSnap = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    const cardFarEdge = nextSnap.x - nextSnap.width / 2;
    const leftEdge = (t: number) => {
      const r = b.anchorAt(t);
      return r.x - r.width / 2;
    };
    // By local=0.234 (ease≈0.55, leading-edge window cap), leading
    // edge has reached the card's far edge.
    expect(leftEdge(tAt(0.234))).toBeCloseTo(cardFarEdge, 0);
    expect(leftEdge(tAt(0.5))).toBeCloseTo(cardFarEdge, 0);
    expect(leftEdge(tAt(0.9))).toBeCloseTo(cardFarEdge, 0);
  });

  it("arriving card anchor's RIGHT edge tracks the morph's trailing edge", () => {
    // Arrows FROM this morphing card (e.g. b → loz) start at the
    // bbox's right edge = trailingX. So they don't traverse THROUGH
    // the morph shape on their way to the lozenge.
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const lozInnerEdge = LOZENGES.right.x - LOZENGES.right.width / 2;
    const nextSnap = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    const cardNearEdge = nextSnap.x + nextSnap.width / 2;
    const rightEdge = (t: number) => {
      const r = b.anchorAt(t);
      return r.x + r.width / 2;
    };
    // At slurp-start, trailing edge is at the lozenge's inner edge.
    expect(rightEdge(tAt(0))).toBeCloseTo(lozInnerEdge, 1);
    // As morph completes, trailing edge reaches card's near edge.
    expect(rightEdge(tAt(0.5))).toBeCloseTo(cardNearEdge, 0);
  });

  it("anchor settles at card.rect at t=1 (full rect for router clipping)", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const nextSnap = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    expect(b.anchorAt(1)).toEqual(nextSnap);
  });
});

describe("buildLaneTrajectory — hidden→hidden arrow suppression", () => {
  // 5-deep chain: only `a` is visible (col +1); b/c/d/e hidden in +S.
  // Edges b→c, c→d, d→e all have BOTH endpoints in the lozenge.
  // Renderer should suppress these via mode-based check.
  const chain: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
    { id: "e", title: "E", status: "TODO", dependsOn: ["d"] },
  ];

  it("hidden→hidden edges still appear in trajectory.arrows", () => {
    // The trajectory keeps these edges — suppression is a renderer
    // concern, not a data concern. (Other consumers may want to
    // know about them for debugging / inspection.)
    const traj = buildLaneTrajectory({
      prevFrame: chain, nextFrame: chain,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    expect(traj.arrows.length).toBe(4);
  });

  it("both endpoints are mode='gone' for hidden→hidden edges", () => {
    // The renderer's suppression check (bothHidden) reads modeAt(t).
    // Verify the trajectory reports both endpoints as "gone" at any t
    // for a stays-hidden→stays-hidden edge (the suppression criterion).
    const traj = buildLaneTrajectory({
      prevFrame: chain, nextFrame: chain,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const bToC = traj.arrows.find((a) => a.fromId === "b" && a.toId === "c")!;
    const from = traj.cards.get(bToC.fromId)!;
    const to = traj.cards.get(bToC.toId)!;
    for (const t of [0, 0.5, 1]) {
      expect(from.modeAt(t)).toBe("gone");
      expect(to.modeAt(t)).toBe("gone");
    }
  });
});

describe("buildLaneTrajectory — broom topology", () => {
  // Matches the workshop's MS_PARENT_B_CHILDREN (without the parent).
  const broom: StatusFlowNode[] = [
    { id: "b1", title: "B1", status: "DOING" },
    { id: "b2", title: "B2", status: "DOING" },
    { id: "b3", title: "B3", status: "DOING" },
    { id: "b4", title: "B4", status: "TODO", dependsOn: ["b1", "b2"] },
    { id: "b5", title: "B5", status: "TODO", dependsOn: ["b4"] },
    { id: "b6", title: "B6", status: "TODO", dependsOn: ["b3", "b5"] },
    { id: "b7", title: "B7", status: "TODO", dependsOn: ["b6"] },
    { id: "b8", title: "B8", status: "TODO", dependsOn: ["b6"] },
  ];

  it("tick where b1 finishes: b1 stays visible (just shifts col)", () => {
    const next = broom.map((n) =>
      n.id === "b1" ? { ...n, status: "DONE" } : n,
    );
    const traj = buildLaneTrajectory({
      prevFrame: broom,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    const b1 = traj.cards.get("b1")!;
    // b1 was DOING (col 0), becomes DONE (col -1). Both within
    // maxDepth=1 → staying card across the tick.
    expect(b1.modeAt(0)).toBe("card");
    expect(b1.modeAt(1)).toBe("card");
    // Status flips at the leave-end boundary, not at tick start.
    expect(b1.statusAt(0)).toBe("DOING");
    expect(b1.statusAt(1)).toBe("DONE");
  });

  it("b4-b8 stay hidden in the right lozenge across the tick", () => {
    const next = broom.map((n) =>
      n.id === "b1" ? { ...n, status: "DONE" } : n,
    );
    const traj = buildLaneTrajectory({
      prevFrame: broom,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    for (const id of ["b5", "b6", "b7", "b8"]) {
      const c = traj.cards.get(id)!;
      expect(c.modeAt(0)).toBe("gone");
      expect(c.modeAt(1)).toBe("gone");
      // Anchor is the right lozenge (hidden TODO, deeper than b4).
      expect(c.anchorAt(0)).toEqual(LOZENGES.right);
    }
  });

  it("collects all 7 broom dep edges", () => {
    const next = broom;
    const traj = buildLaneTrajectory({
      prevFrame: broom,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // b4←b1, b4←b2, b5←b4, b6←b3, b6←b5, b7←b6, b8←b6 = 7 edges
    expect(traj.arrows.length).toBe(7);
  });
});

// ─── lozenge count derivation ───────────────────────────────────────────────

describe("buildLaneTrajectory — lozenge counts (mode === \"gone\")", () => {
  // 4-node chain: at all-TODO, only a is visible (col +1); b/c/d are
  // hidden at +2/+3/+4. Lozenge count should be 3 at every t.
  const allTodo: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
    { id: "d", title: "D", status: "TODO", dependsOn: ["c"] },
  ];

  const countGoneAt = (traj: LaneTrajectory, t: number) => {
    let n = 0;
    for (const c of traj.cards.values()) if (c.modeAt(t) === "gone") n++;
    return n;
  };

  it("stays-hidden cards count as gone at every t", () => {
    const traj = buildLaneTrajectory({
      prevFrame: allTodo,
      nextFrame: allTodo,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    expect(countGoneAt(traj, 0)).toBe(3);
    expect(countGoneAt(traj, 0.5)).toBe(3);
    expect(countGoneAt(traj, 1)).toBe(3);
  });

  it("arriving card drops out of the lozenge count at PHASE_MOVE_END", () => {
    // Advance a: TODO → DOING. b becomes visible (arriving from +S).
    const next: StatusFlowNode[] = allTodo.map((n) =>
      n.id === "a" ? { ...n, status: "DOING" } : n,
    );
    const traj = buildLaneTrajectory({
      prevFrame: allTodo,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // Before MOVE_END: 3 gone (b, c, d — b not yet morphing out).
    expect(countGoneAt(traj, PHASE_MOVE_END - 0.001)).toBe(3);
    // After MOVE_END (b is now "morph"): only c and d are gone.
    expect(countGoneAt(traj, PHASE_MOVE_END + 0.001)).toBe(2);
    expect(countGoneAt(traj, 1)).toBe(2);
  });
});

// ─── mid-flight stability ───────────────────────────────────────────────────
//
// If the renderer's createEffect fires a NEW props.nodes while the
// current trajectory hasn't finished, the trajectory rebuild uses
// prevFrameRef (= the previous "incoming") as the new prev — NOT
// where cards are visually right now. There's a known small snap
// when this happens. For an explicit polish step, we could expose a
// "snapshot at t" helper and feed those rects into the new build as
// prev-position overrides. For now: document and verify that
// rebuilding mid-flight doesn't crash and produces a valid
// trajectory.

describe("buildLaneTrajectory — mid-flight rebuild (stability)", () => {
  const initial: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const tick1: StatusFlowNode[] = initial.map((n) =>
    n.id === "a" ? { ...n, status: "DOING" } : n,
  );
  const tick2: StatusFlowNode[] = tick1.map((n) =>
    n.id === "a" ? { ...n, status: "DONE" } :
    n.id === "b" ? { ...n, status: "DOING" } : n,
  );

  it("can rebuild a fresh trajectory from a partially-elapsed one", () => {
    const traj1 = buildLaneTrajectory({
      prevFrame: initial,
      nextFrame: tick1,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // Imagine we're mid-flight at t=0.3 when tick2 arrives.
    const traj2 = buildLaneTrajectory({
      prevFrame: tick1,
      nextFrame: tick2,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    // Both trajectories should produce valid card states.
    expect(traj1.cards.size).toBeGreaterThan(0);
    expect(traj2.cards.size).toBeGreaterThan(0);
    expect(traj2.durationMs).toBe(traj1.durationMs);
  });
});

describe("buildLaneTrajectory — duration", () => {
  it("durationMs is the full phase budget", () => {
    const traj = buildLaneTrajectory({
      prevFrame: [{ id: "a", title: "A", status: "TODO" }],
      nextFrame: [{ id: "a", title: "A", status: "DOING" }],
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    expect(traj.durationMs).toBe(MS_PHASE_TOTAL);
  });
});

// ─── generic snapshot builder (used by AnimatedSwimlaneChart) ───────────────
//
// `buildLaneTrajectoryFromSnapshots` is the status-agnostic entry point
// that AnimatedSwimlaneChart uses — it accepts pre-computed FrameSnapshots
// + an explicit edges list, with no StatusFlowNode dependency. The
// SwimlaneChart-style consumer doesn't care about per-card status, so
// the default statusOf resolver returns "TODO" and the test confirms
// the trajectory is still well-formed in that mode.

describe("buildLaneTrajectoryFromSnapshots — generic frame input", () => {
  // Two visible cards (a, b) at cols -1 and +1; one hidden card (c) at
  // col +3 outside the visible window. After "tick": positions stay the
  // same — pure parity test that the builder runs end-to-end and
  // produces card trajectories for every id, including the hidden one.
  const rect = (x: number, y = 0): { x: number; y: number; width: number; height: number } => ({
    x, y, width: 140, height: 60,
  });
  const prev = {
    byId: new Map([
      ["a", { id: "a", col: -1, visible: true, isParent: false, rect: rect(-200) }],
      ["b", { id: "b", col: 1, visible: true, isParent: false, rect: rect(200) }],
      ["c", { id: "c", col: 3, visible: false, isParent: false }],
    ]),
  };
  const next = prev;

  it("produces a trajectory entry for every id (visible + hidden)", () => {
    const traj = buildLaneTrajectoryFromSnapshots({
      prev,
      next,
      lozengeRects: LOZENGES,
      edges: [["a", "b"], ["b", "c"]],
    });
    expect(traj.cards.get("a")).toBeDefined();
    expect(traj.cards.get("b")).toBeDefined();
    expect(traj.cards.get("c")).toBeDefined();
  });

  it("hidden card anchors at the appropriate-side lozenge", () => {
    const traj = buildLaneTrajectoryFromSnapshots({
      prev,
      next,
      lozengeRects: LOZENGES,
      edges: [["b", "c"]],
    });
    const c = traj.cards.get("c")!;
    // c is at col +3 (right side) — anchors at the right lozenge.
    expect(c.anchorAt(0)).toEqual(LOZENGES.right);
    expect(c.modeAt(0.5)).toBe("gone");
  });

  it("default statusOf resolver returns TODO when none is supplied", () => {
    const traj = buildLaneTrajectoryFromSnapshots({
      prev,
      next,
      lozengeRects: LOZENGES,
      edges: [],
    });
    const a = traj.cards.get("a")!;
    expect(a.statusAt(0)).toBe("TODO");
    expect(a.statusAt(1)).toBe("TODO");
  });

  it("dedupes edges supplied multiple times", () => {
    const traj = buildLaneTrajectoryFromSnapshots({
      prev,
      next,
      lozengeRects: LOZENGES,
      edges: [["a", "b"], ["a", "b"], ["b", "c"]],
    });
    expect(traj.arrows.length).toBe(2);
  });
});

// ─── tunable timing config ─────────────────────────────────────────────────
//
// `LaneTimingConfig` lets the workshop (and any other consumer) tune
// the animation duration without rebuilding the module. Defaults match
// the pre-knob constants so existing callers keep their behaviour.

describe("LaneTimingConfig — phases derive from timing", () => {
  it("DEFAULT_TIMING matches the back-compat constants exactly", () => {
    expect(DEFAULT_TIMING.slurpMs).toBe(600);
    expect(DEFAULT_TIMING.moveMs).toBe(450);
    expect(DEFAULT_TIMING.arrowSettleMs).toBe(0);
    const p = phasesFor(DEFAULT_TIMING);
    expect(p.total).toBe(MS_PHASE_TOTAL);
    expect(p.leaveEnd).toBe(PHASE_LEAVE_END);
    expect(p.moveEnd).toBe(PHASE_MOVE_END);
    // With arrowSettleMs=0 the settle window has zero width.
    expect(p.settleEnd).toBe(p.moveEnd);
  });

  it("phasesFor doubles the total when every knob is doubled", () => {
    const p1 = phasesFor({ slurpMs: 600, moveMs: 450, arrowSettleMs: 200 });
    const p2 = phasesFor({ slurpMs: 1200, moveMs: 900, arrowSettleMs: 400 });
    expect(p2.total).toBe(p1.total * 2);
    // Phase FRACTIONS stay the same when all knobs scale together.
    expect(p2.leaveEnd).toBeCloseTo(p1.leaveEnd);
    expect(p2.moveEnd).toBeCloseTo(p1.moveEnd);
    expect(p2.settleEnd).toBeCloseTo(p1.settleEnd);
  });
});

describe("buildLaneTrajectory — durationMs updates when timing knobs change", () => {
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
  ];

  const dur = (timing: LaneTimingConfig) =>
    buildLaneTrajectory({
      prevFrame: prev,
      nextFrame: next,
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
      timing,
    }).durationMs;

  it("durationMs is slurp + move + settle + slurp", () => {
    expect(dur({ slurpMs: 600, moveMs: 450, arrowSettleMs: 0 }))
      .toBe(600 + 450 + 0 + 600);
    expect(dur({ slurpMs: 600, moveMs: 450, arrowSettleMs: 200 }))
      .toBe(600 + 450 + 200 + 600);
    expect(dur({ slurpMs: 1000, moveMs: 800, arrowSettleMs: 300 }))
      .toBe(1000 + 800 + 300 + 1000);
  });

  it("durationMs responds independently to each knob", () => {
    const base = dur({ slurpMs: 600, moveMs: 450, arrowSettleMs: 200 });
    expect(dur({ slurpMs: 700, moveMs: 450, arrowSettleMs: 200 }))
      .toBe(base + 200); // slurp adds to both ends
    expect(dur({ slurpMs: 600, moveMs: 500, arrowSettleMs: 200 }))
      .toBe(base + 50);
    expect(dur({ slurpMs: 600, moveMs: 450, arrowSettleMs: 350 }))
      .toBe(base + 150);
  });
});

describe("buildLaneTrajectory — arrow-settle window placement", () => {
  // a TODO → DOING; b arrives from the right lozenge.
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "TODO" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DOING" },
    { id: "b", title: "B", status: "TODO", dependsOn: ["a"] },
  ];
  const timing: LaneTimingConfig = {
    slurpMs: 600,
    moveMs: 450,
    arrowSettleMs: 200,
  };
  const phases = phasesFor(timing);

  it("settle window sits between move-end and the slurp-out start", () => {
    // Sanity: ordered correctly with a positive-width settle window.
    expect(phases.leaveEnd).toBeLessThan(phases.moveEnd);
    expect(phases.moveEnd).toBeLessThan(phases.settleEnd);
    expect(phases.settleEnd).toBeLessThan(1);
    // settle width matches the configured fraction.
    expect(phases.settleEnd - phases.moveEnd)
      .toBeCloseTo(200 / phases.total);
  });

  it("arriving card stays gone (no morph) until settleEnd", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
      timing,
    });
    const b = traj.cards.get("b")!;
    // During the settle window the card is still "gone" — only its
    // arrow anchor is moving; the visible slurp morph hasn't started.
    const midSettle = (phases.moveEnd + phases.settleEnd) / 2;
    expect(b.modeAt(midSettle)).toBe("gone");
    expect(b.pathAt(midSettle)).toBeNull();
    // Slurp-out starts at settleEnd.
    expect(b.modeAt(phases.settleEnd + 0.001)).toBe("morph");
  });

  it("arriving card anchor lerps from lozenge to next rect across the settle window", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
      timing,
    });
    const b = traj.cards.get("b")!;
    const nextRect = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    // Just before move-end: anchored at the lozenge.
    expect(b.anchorAt(phases.moveEnd - 0.001)).toEqual(LOZENGES.right);
    // Midway through settle: anchor x is strictly between loz and card.
    const mid = (phases.moveEnd + phases.settleEnd) / 2;
    const midX = b.anchorAt(mid).x;
    const lozX = LOZENGES.right.x;
    const [lo, hi] = lozX < nextRect.x ? [lozX, nextRect.x] : [nextRect.x, lozX];
    expect(midX).toBeGreaterThan(lo);
    expect(midX).toBeLessThan(hi);
  });

  it("arriving card anchor is parked at next rect during slurp-out (settle enabled)", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
      timing,
    });
    const b = traj.cards.get("b")!;
    const nextRect = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    // Anywhere inside the slurp-out window: anchor is the card's rest
    // rect (the arrow has already landed; the morph plays over it).
    const slurpMid = phases.settleEnd + (1 - phases.settleEnd) * 0.5;
    expect(b.anchorAt(slurpMid)).toEqual(nextRect);
    expect(b.anchorAt(1)).toEqual(nextRect);
  });

  it("with arrowSettleMs=0, anchor still tracks the morph bbox (regression)", () => {
    // Default config: no settle window. Arrow anchor reverts to
    // pre-knob behaviour — tracks the morph bbox throughout slurp-out.
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const b = traj.cards.get("b")!;
    const nextRect = snapshotFrame(next, PARAMS).byId.get("b")!.rect!;
    // Just past PHASE_MOVE_END, anchor is NOT yet at nextRect — it's
    // tracking the morph bbox (which is still very narrow / near the
    // lozenge).
    const justAfterMove = PHASE_MOVE_END + 0.005;
    const anchor = b.anchorAt(justAfterMove);
    expect(anchor).not.toEqual(nextRect);
    // By t=1 it does settle at nextRect.
    expect(b.anchorAt(1)).toEqual(nextRect);
  });
});

describe("buildLaneTrajectory — default behaviour matches pre-knob system", () => {
  // Regression invariant: a trajectory built WITHOUT a timing override
  // must produce byte-identical durationMs, phase fractions, and
  // mode/anchor sequences to one built with the explicit DEFAULT_TIMING.
  // Both must equal the pre-knob exported constants.
  const prev: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DONE" },
    { id: "b", title: "B", status: "DOING", dependsOn: ["a"] },
    { id: "c", title: "C", status: "TODO", dependsOn: ["b"] },
  ];
  const next: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DONE" },
    { id: "b", title: "B", status: "DONE", dependsOn: ["a"] },
    { id: "c", title: "C", status: "DOING", dependsOn: ["b"] },
  ];

  it("durationMs equals MS_PHASE_TOTAL with no timing arg", () => {
    const traj = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    expect(traj.durationMs).toBe(MS_PHASE_TOTAL);
  });

  it("explicit DEFAULT_TIMING produces same anchor + mode sequence as no arg", () => {
    const trajA = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
    });
    const trajB = buildLaneTrajectory({
      prevFrame: prev, nextFrame: next,
      layoutParams: PARAMS, lozengeRects: LOZENGES,
      timing: DEFAULT_TIMING,
    });
    expect(trajB.durationMs).toBe(trajA.durationMs);
    for (const id of trajA.cards.keys()) {
      const ca = trajA.cards.get(id)!;
      const cb = trajB.cards.get(id)!;
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        expect(cb.modeAt(t)).toBe(ca.modeAt(t));
        expect(cb.anchorAt(t)).toEqual(ca.anchorAt(t));
        expect(cb.hiddennessAt(t)).toBe(ca.hiddennessAt(t));
        expect(cb.statusAt(t)).toBe(ca.statusAt(t));
      }
    }
  });
});
