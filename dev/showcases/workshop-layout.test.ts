import { describe, it, expect } from "vitest";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
import { resolveParentStatuses } from "../../src/components/StatusFlowChart";
import {
  computeColFor,
  computeChartHeight,
  labelForCol,
  topoSortAlpha,
  advanceChildren,
  promoteReady,
  isAllDone,
} from "./workshop-layout";

// Helper to wire effective-status into computeColFor for tests.
const colsFor = (nodes: StatusFlowNode[]): Record<string, number> => {
  const effective = resolveParentStatuses(nodes, "DOING");
  const out: Record<string, number> = {};
  for (const n of nodes) {
    out[n.id] = computeColFor(n, nodes, (id) => effective.get(id));
  }
  return out;
};

// ─── Fixtures ────────────────────────────────────────────────────────────

const linearChain = (statuses: Record<string, string>): StatusFlowNode[] =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`,
    title: `Child ${i + 1}`,
    status: statuses[`c${i + 1}`] ?? "TODO",
    parentId: "p",
    dependsOn: i === 0 ? undefined : [`c${i}`],
  })).concat([
    { id: "p", title: "Parent", status: "TODO" } as StatusFlowNode,
  ]);

const broom = (statuses: Record<string, string>): StatusFlowNode[] => {
  const set = (id: string, deps?: string[]): StatusFlowNode => ({
    id,
    title: id.toUpperCase(),
    status: statuses[id] ?? "TODO",
    parentId: "pB",
    dependsOn: deps,
  });
  return [
    { id: "pB", title: "Parent B", status: "TODO" },
    set("b1"),
    set("b2"),
    set("b3"),
    set("b4", ["b1", "b2"]),
    set("b5", ["b4"]),
    set("b6", ["b3", "b5"]),
    set("b7", ["b6"]),
    set("b8", ["b6"]),
  ];
};

const chores = (statuses: Record<string, string>): StatusFlowNode[] => [
  { id: "ch1", title: "Chore 1", status: statuses["ch1"] ?? "TODO" },
  { id: "ch2", title: "Chore 2", status: statuses["ch2"] ?? "TODO" },
  { id: "ch3", title: "Chore 3", status: statuses["ch3"] ?? "TODO" },
];

// ─── topoSortAlpha ───────────────────────────────────────────────────────

describe("topoSortAlpha", () => {
  it("returns a strict linear chain in chain order", () => {
    const nodes = linearChain({}).filter((n) => n.parentId);
    expect(topoSortAlpha(nodes)).toEqual([
      "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8",
    ]);
  });

  it("sorts broom with alpha tiebreaker among same-ready siblings", () => {
    const nodes = broom({}).filter((n) => n.parentId);
    expect(topoSortAlpha(nodes)).toEqual([
      "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8",
    ]);
  });

  it("orders by alpha when there are no deps at all", () => {
    const nodes: StatusFlowNode[] = [
      { id: "z", title: "Z", status: "TODO" },
      { id: "a", title: "A", status: "TODO" },
      { id: "m", title: "M", status: "TODO" },
    ];
    expect(topoSortAlpha(nodes)).toEqual(["a", "m", "z"]);
  });
});

// ─── computeColFor: linear chain (deps) ──────────────────────────────────

describe("computeColFor — linear chain", () => {
  it("initial all-TODO: c1 at +1, ranked ascending by depth (no stacking — each chain step is its own depth)", () => {
    const r = colsFor(linearChain({}));
    expect(r.c1).toBe(1);
    expect(r.c2).toBe(2);
    expect(r.c3).toBe(3);
    expect(r.c8).toBe(8);
    expect(r.p).toBe(1); // parent is TODO (effective) → col +1
  });

  it("c5 DOING: DONE ranks left, DOING centered, TODO ranks right", () => {
    const r = colsFor(
      linearChain({
        c1: "DONE", c2: "DONE", c3: "DONE", c4: "DONE",
        c5: "DOING",
      }),
    );
    // DONE depths [0,1,2,3] sorted desc → [3,2,1,0]
    expect(r.c4).toBe(-1); // depth 3 → rank 1
    expect(r.c3).toBe(-2);
    expect(r.c2).toBe(-3);
    expect(r.c1).toBe(-4);
    expect(r.c5).toBe(0);
    // TODO depths [5,6,7] sorted asc → [5,6,7]
    expect(r.c6).toBe(1);
    expect(r.c7).toBe(2);
    expect(r.c8).toBe(3);
    expect(r.p).toBe(0); // parent DOING (any child DOING)
  });
});

// ─── computeColFor: broom (siblings stack at same depth) ─────────────────

describe("computeColFor — broom", () => {
  it("b8 DOING, b1..b7 DONE: DONE ranks by depth, siblings stack", () => {
    const r = colsFor(
      broom({
        b1: "DONE", b2: "DONE", b3: "DONE",
        b4: "DONE", b5: "DONE", b6: "DONE", b7: "DONE",
        b8: "DOING",
      }),
    );
    expect(r.b8).toBe(0);
    // DONE unique depths [0,1,2,3,4] sorted desc → [4,3,2,1,0]
    expect(r.b7).toBe(-1); // depth 4 → rank 1
    expect(r.b6).toBe(-2); // depth 3 → rank 2
    expect(r.b5).toBe(-3); // depth 2 → rank 3 (-S)
    expect(r.b4).toBe(-4); // depth 1 → rank 4 (-S)
    // Three roots at depth 0 STACK at the same col (rank 5).
    expect(r.b1).toBe(-5);
    expect(r.b2).toBe(-5);
    expect(r.b3).toBe(-5);
  });

  it("initial all-TODO: siblings stack at depth 0", () => {
    const r = colsFor(broom({}));
    // TODO unique depths [0,1,2,3,4] sorted asc.
    expect(r.b1).toBe(1); // depth 0 → rank 1, stacked with b2, b3
    expect(r.b2).toBe(1);
    expect(r.b3).toBe(1);
    expect(r.b4).toBe(2); // depth 1 → rank 2
    expect(r.b5).toBe(3); // depth 2
    expect(r.b6).toBe(4); // depth 3
    expect(r.b7).toBe(5); // depth 4
    expect(r.b8).toBe(5); // depth 4 → stacked with b7
  });

  it("siblings DOING simultaneously all stack at col 0", () => {
    const r = colsFor(
      broom({ b1: "DOING", b2: "DOING", b3: "DOING" }),
    );
    expect(r.b1).toBe(0);
    expect(r.b2).toBe(0);
    expect(r.b3).toBe(0);
    // TODO siblings further out keep their depth rank.
    expect(r.b4).toBe(1);
    expect(r.b5).toBe(2);
  });
});

// ─── computeColFor: chores (no deps) ─────────────────────────────────────

describe("computeColFor — chores (no deps)", () => {
  it("all DONE: all three stack at col -1 (status-based)", () => {
    const r = colsFor(chores({ ch1: "DONE", ch2: "DONE", ch3: "DONE" }));
    expect(r.ch1).toBe(-1);
    expect(r.ch2).toBe(-1);
    expect(r.ch3).toBe(-1);
  });

  it("ch1+ch2 DONE, ch3 DOING: 2 stacked at -1, ch3 at 0", () => {
    const r = colsFor(chores({ ch1: "DONE", ch2: "DONE", ch3: "DOING" }));
    expect(r.ch1).toBe(-1);
    expect(r.ch2).toBe(-1);
    expect(r.ch3).toBe(0);
  });

  it("all TODO: all stack at +1 (no spread)", () => {
    const r = colsFor(chores({}));
    expect(r.ch1).toBe(1);
    expect(r.ch2).toBe(1);
    expect(r.ch3).toBe(1);
  });

  it("all DOING: all stack at 0", () => {
    const r = colsFor(chores({ ch1: "DOING", ch2: "DOING", ch3: "DOING" }));
    expect(r.ch1).toBe(0);
    expect(r.ch2).toBe(0);
    expect(r.ch3).toBe(0);
  });
});

// ─── labelForCol ─────────────────────────────────────────────────────────

describe("labelForCol", () => {
  it("formats visible cols with sign, and beyond as ±S", () => {
    expect(labelForCol(-3, 2)).toBe("-S");
    expect(labelForCol(-2, 2)).toBe("-2");
    expect(labelForCol(-1, 2)).toBe("-1");
    expect(labelForCol(0, 2)).toBe("0");
    expect(labelForCol(1, 2)).toBe("+1");
    expect(labelForCol(2, 2)).toBe("+2");
    expect(labelForCol(3, 2)).toBe("+S");
  });
});

// ─── computeChartHeight ──────────────────────────────────────────────────

describe("computeChartHeight", () => {
  const cfg = {
    nodeHeight: 56,
    rowGap: 64,
    parentHeader: 56,
    padding: 16,
    visibleHalfWindow: 2,
  };

  it("shrinks to parent header + padding when parent's children are collapsed", () => {
    // Caller has filtered the collapsed children out; nothing left to
    // render in the chart area. Parent header still takes its slot.
    const h = computeChartHeight([], () => 0, cfg, true);
    expect(h).toBe(0 + 16 + 56); // padding + parentHeader = 72
  });

  it("returns just padding when no parent and no visible leaves", () => {
    const h = computeChartHeight([], () => 0, cfg, false);
    expect(h).toBe(16);
  });

  it("includes parent header + 1-row chart when 1 child visible", () => {
    const leaves: StatusFlowNode[] = [
      { id: "c1", title: "C1", status: "DOING", parentId: "p" },
    ];
    const h = computeChartHeight(leaves, () => 0, cfg, true);
    // hasParent: yes. maxStack=1 → chartContent=56. total = 56+16+56 = 128
    expect(h).toBe(128);
  });

  it("grows for 3 stacked at one col (chores DOING)", () => {
    const leaves: StatusFlowNode[] = [
      { id: "ch1", title: "C1", status: "DOING" },
      { id: "ch2", title: "C2", status: "DOING" },
      { id: "ch3", title: "C3", status: "DOING" },
    ];
    const h = computeChartHeight(leaves, () => 0, cfg, false);
    // no parent. maxStack=3 → chartContent = 2*64+56 = 184. total = 184+16 = 200.
    expect(h).toBe(200);
  });

  it("adds parentChartGap only when parent + visible children both present", () => {
    const c1: StatusFlowNode = { id: "c1", title: "C1", status: "DOING", parentId: "p" };
    // cfg.padding=16, parentHeader=56, nodeHeight=56, gap=16:
    //   parent + child: 56 + 16 + 16 + 56 = 144
    expect(computeChartHeight([c1], () => 0, { ...cfg, parentChartGap: 16 }, true)).toBe(144);
    //   parent only (children collapsed): 16 + 56 = 72 (no gap, no chart row)
    expect(computeChartHeight([], () => 0, { ...cfg, parentChartGap: 16 }, true)).toBe(72);
    //   no parent, with child: 16 + 56 = 72 (no parent header, no gap)
    expect(computeChartHeight([c1], () => 0, { ...cfg, parentChartGap: 16 }, false)).toBe(72);
  });

  it("ignores leaves whose col is beyond the visible window", () => {
    const leaves: StatusFlowNode[] = [
      { id: "a", title: "A", status: "DONE" },
      { id: "b", title: "B", status: "DOING" },
      { id: "c", title: "C", status: "TODO" }, // pretend this lands at +99
    ];
    const colFor = (n: StatusFlowNode) =>
      n.id === "a" ? -1 : n.id === "b" ? 0 : 99;
    const h = computeChartHeight(leaves, colFor, cfg, false);
    // 2 cols visible (-1, 0), each stack of 1. maxStack=1. chartContent=56.
    expect(h).toBe(56 + 16);
  });
});

describe("advanceChildren / promoteReady / isAllDone", () => {
  type N = StatusFlowNode;
  const chain = (): N[] => [
    { id: "c1", title: "C1", status: "TODO" },
    { id: "c2", title: "C2", status: "TODO", dependsOn: ["c1"] },
    { id: "c3", title: "C3", status: "TODO", dependsOn: ["c2"] },
  ];

  it("promoteReady flips independent roots TODO → DOING", () => {
    const start = chain();
    const promoted = promoteReady(start);
    expect(promoted.map((n) => n.status)).toEqual(["DOING", "TODO", "TODO"]);
  });

  it("advanceChildren finishes one DOING then cascades the next", () => {
    let s = promoteReady(chain());
    s = advanceChildren(s);
    // c1 DONE, c2 promoted to DOING.
    expect(s.map((n) => n.status)).toEqual(["DONE", "DOING", "TODO"]);
    s = advanceChildren(s);
    expect(s.map((n) => n.status)).toEqual(["DONE", "DONE", "DOING"]);
    s = advanceChildren(s);
    expect(s.map((n) => n.status)).toEqual(["DONE", "DONE", "DONE"]);
  });

  it("advanceChildren is a no-op when everything is DONE", () => {
    const done: N[] = [
      { id: "x1", title: "X1", status: "DONE" },
      { id: "x2", title: "X2", status: "DONE" },
    ];
    expect(advanceChildren(done)).toEqual(done);
  });

  it("broom: alphabetically lowest DOING finishes first; ready promotes", () => {
    const broom: N[] = [
      { id: "b1", title: "B1", status: "DOING" },
      { id: "b2", title: "B2", status: "DOING" },
      { id: "b3", title: "B3", status: "DOING" },
      { id: "b4", title: "B4", status: "TODO", dependsOn: ["b1", "b2"] },
    ];
    const s = advanceChildren(broom);
    // b1 finishes; b4 still waits on b2.
    expect(s.find((n) => n.id === "b1")?.status).toBe("DONE");
    expect(s.find((n) => n.id === "b2")?.status).toBe("DOING");
    expect(s.find((n) => n.id === "b4")?.status).toBe("TODO");
    const s2 = advanceChildren(s);
    // b2 finishes; b4 now ready → DOING.
    expect(s2.find((n) => n.id === "b2")?.status).toBe("DONE");
    expect(s2.find((n) => n.id === "b4")?.status).toBe("DOING");
  });

  it("isAllDone returns true only when every leaf is DONE", () => {
    const mixed: N[] = [
      { id: "a", title: "A", status: "DONE" },
      { id: "b", title: "B", status: "DOING" },
    ];
    expect(isAllDone(mixed)).toBe(false);
    expect(isAllDone(mixed.map((n) => ({ ...n, status: "DONE" })))).toBe(true);
  });

  it("ignores parent nodes when checking all-DONE", () => {
    const withParent: N[] = [
      { id: "p", title: "P", status: "TODO" },
      { id: "c1", title: "C1", status: "DONE", parentId: "p" },
      { id: "c2", title: "C2", status: "DONE", parentId: "p" },
    ];
    expect(isAllDone(withParent)).toBe(true);
  });
});
