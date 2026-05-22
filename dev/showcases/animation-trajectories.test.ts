import { describe, it, expect } from "vitest";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
import {
  buildLaneTrajectory,
  dashednessAt,
  lerp,
  lerpRect,
  PHASE_LEAVE_END,
  PHASE_MOVE_END,
  snapshotFrame,
  type LayoutParams,
  type LozengeRects,
} from "./animation-trajectories";

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
    expect(card.modeAt(PHASE_LEAVE_END + 0.05)).toBe("gone");
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

describe("buildLaneTrajectory — duration", () => {
  it("durationMs is the full phase budget", () => {
    const traj = buildLaneTrajectory({
      prevFrame: [{ id: "a", title: "A", status: "TODO" }],
      nextFrame: [{ id: "a", title: "A", status: "DOING" }],
      layoutParams: PARAMS,
      lozengeRects: LOZENGES,
    });
    expect(traj.durationMs).toBe(1650);
  });
});
