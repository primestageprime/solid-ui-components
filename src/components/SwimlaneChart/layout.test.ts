import { describe, it, expect } from "vitest";
import { computeSwimlaneLayout } from "./layout";
import type { DAGNode, DAGEdge } from "../DagChart/types";

type Item = { status: 0 | 1 | 2 };

// Map legacy status (0=todo,1=doing,2=done) → centered col (-1, 0, +1)
// so col=0 is always the chart's center under the new convention.
const swimlaneFor = (n: DAGNode<Item>) => n.data.status - 1;
const nodeSize = () => [180, 60] as [number, number];
const defaults = { swimlaneFor, nodeSize, maxDepth: 2, columnGap: 260, rowGap: 80 };

describe("computeSwimlaneLayout — column bucketing", () => {
  it("places nodes in column X by status (-columnGap, 0, +columnGap)", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "a", data: { status: 0 } },
      { id: "b", data: { status: 1 } },
      { id: "c", data: { status: 2 } },
    ];
    const result = computeSwimlaneLayout(nodes, [], defaults);
    expect(result.positions.get("a")!.x).toBe(-260);
    expect(result.positions.get("b")!.x).toBe(0);
    expect(result.positions.get("c")!.x).toBe(260);
  });

  it("returns empty result for empty input", () => {
    const result = computeSwimlaneLayout([], [], defaults);
    expect(result.positions.size).toBe(0);
    expect(result.edges).toEqual([]);
  });
});

describe("computeSwimlaneLayout — Y coordinates", () => {
  it("stacks nodes in same column vertically, centered as a group around y=0", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "a", data: { status: 1 } },
      { id: "b", data: { status: 1 } },
      { id: "c", data: { status: 1 } },
    ];
    const result = computeSwimlaneLayout(nodes, [], defaults);
    const ys = ["a", "b", "c"].map((id) => result.positions.get(id)!.y).sort((x, y) => x - y);
    expect(ys).toEqual([-80, 0, 80]);
  });

  it("centers a single node at y=0", () => {
    const nodes: DAGNode<Item>[] = [{ id: "a", data: { status: 0 } }];
    const result = computeSwimlaneLayout(nodes, [], defaults);
    expect(result.positions.get("a")!.y).toBe(0);
  });

  it("preserves input order for Y stacking when no edges exist", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "first", data: { status: 0 } },
      { id: "second", data: { status: 0 } },
    ];
    const result = computeSwimlaneLayout(nodes, [], defaults);
    expect(result.positions.get("first")!.y).toBeLessThan(
      result.positions.get("second")!.y,
    );
  });

  it("emits LayoutEdge polylines for valid edges", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "a", data: { status: 0 } },
      { id: "b", data: { status: 2 } },
    ];
    const edges: DAGEdge[] = [{ source: "a", target: "b" }];
    const result = computeSwimlaneLayout(nodes, edges, defaults);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toMatchObject({ sourceId: "a", targetId: "b" });
    expect(result.edges[0].points).toHaveLength(2);
  });
});

describe("computeSwimlaneLayout — barycentric ordering", () => {
  it("reorders so connected nodes end up close in Y (crossing reduction)", () => {
    // Initial input order: TODO=[a,b], DONE=[y,x]
    // Edges: a->x, b->y. After barycentric sweep, x's neighbor a is at higher
    // Y (first in TODO), so x should come BEFORE y in DONE column.
    const nodes: DAGNode<Item>[] = [
      { id: "a", data: { status: 0 } },
      { id: "b", data: { status: 0 } },
      { id: "y", data: { status: 2 } },
      { id: "x", data: { status: 2 } },
    ];
    const edges: DAGEdge[] = [
      { source: "a", target: "x" },
      { source: "b", target: "y" },
    ];
    const result = computeSwimlaneLayout(nodes, edges, defaults);
    expect(result.positions.get("x")!.y).toBeLessThan(
      result.positions.get("y")!.y,
    );
  });

  it("handles backward edges (DONE -> TODO) without error", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "done1", data: { status: 2 } },
      { id: "todo1", data: { status: 0 } },
    ];
    const edges: DAGEdge[] = [{ source: "done1", target: "todo1" }];
    expect(() => computeSwimlaneLayout(nodes, edges, defaults)).not.toThrow();
    const result = computeSwimlaneLayout(nodes, edges, defaults);
    expect(result.edges).toHaveLength(1);
  });
});

describe("computeSwimlaneLayout — falloff and collapse", () => {
  it("applies maxDepth even when centerCol is not in the data", () => {
    // Nodes at cols 0 and 2; centerCol = 1 (no node there). The virtual
    // centerCol slot in ordinalFor still defines a well-formed ordinal
    // axis (cols 0 → ordinal -1; col 2 → ordinal +1 with centerCol
    // inserted between them). With maxDepth=0, ONLY centerCol would be
    // visible — both real nodes fall outside the window and collapse.
    type Pos = { col: number };
    const sw = (n: DAGNode<Pos>) => n.data.col;
    const nodes: DAGNode<Pos>[] = [
      { id: "a", data: { col: 0 } },
      { id: "b", data: { col: 2 } },
    ];
    const result = computeSwimlaneLayout(nodes, [], {
      ...defaults,
      swimlaneFor: sw,
      maxDepth: 0,
      centerCol: 1,
    });
    expect(result.positions.has("a")).toBe(false);
    expect(result.positions.has("b")).toBe(false);
  });

  it("hides nodes whose |col - center| > maxDepth", () => {
    // chain at cols -2,-1,0,+1,+2. With maxDepth=1, only cols within
    // distance 1 of center (col 0) stay visible. Cols -2 and +2 collapse.
    type Pos = { col: number };
    const sw = (n: DAGNode<Pos>) => n.data.col;
    const opts = { ...defaults, swimlaneFor: sw, maxDepth: 1 };
    const nodes: DAGNode<Pos>[] = [
      { id: "a", data: { col: -2 } },
      { id: "b", data: { col: -1 } },
      { id: "c", data: { col: 0 } },
      { id: "d", data: { col: 1 } },
      { id: "e", data: { col: 2 } },
    ];
    const edges: DAGEdge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
      { source: "d", target: "e" },
    ];
    const result = computeSwimlaneLayout(nodes, edges, opts);
    expect(result.positions.has("b")).toBe(true);
    expect(result.positions.has("c")).toBe(true);
    expect(result.positions.has("d")).toBe(true);
    expect(result.positions.has("a")).toBe(false);
    expect(result.positions.has("e")).toBe(false);
    const summaryDescriptors = result.summaries.map((s) => ({
      anchor: s.anchorId,
      col: s.column,
      count: s.collapsedCount,
    }));
    expect(summaryDescriptors).toEqual(
      expect.arrayContaining([
        { anchor: "b", col: -2, count: 1 },
        { anchor: "d", col: 2, count: 1 },
      ]),
    );
  });

  it("groups multiple hidden nodes sharing an anchor and column into ONE summary", () => {
    // center=0 (DOING). a1, a2 at col -1 (visible). x1, x2 at col -2
    // (hidden, anchored on a1 and a2 respectively). Two summaries on the
    // left, each count=1.
    type Pos = { col: number };
    const sw = (n: DAGNode<Pos>) => n.data.col;
    const opts = { ...defaults, swimlaneFor: sw, maxDepth: 1 };
    const nodes: DAGNode<Pos>[] = [
      { id: "b", data: { col: 0 } },
      { id: "a1", data: { col: -1 } },
      { id: "a2", data: { col: -1 } },
      { id: "x1", data: { col: -2 } },
      { id: "x2", data: { col: -2 } },
    ];
    const edges: DAGEdge[] = [
      { source: "a1", target: "b" },
      { source: "a2", target: "b" },
      { source: "x1", target: "a1" },
      { source: "x2", target: "a2" },
    ];
    const result = computeSwimlaneLayout(nodes, edges, opts);
    expect(result.summaries).toHaveLength(2);
    expect(result.summaries.every((s) => s.column === -2 && s.collapsedCount === 1)).toBe(true);
  });
});

describe("computeSwimlaneLayout — orphan summaries (anchorless hidden nodes)", () => {
  // When NOTHING is visible (no node at the center col, everything beyond
  // maxDepth), every hidden node must still surface as an orphan summary so
  // the chart can render edge lozenges. Regression: previously these were
  // dropped (no visible anchor to seed the BFS), leaving a blank chart.
  it("summarizes hidden nodes per-column when there are no visible nodes", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "a", data: { status: 0 } }, // col -1
      { id: "c", data: { status: 2 } }, // col +1
    ];
    const result = computeSwimlaneLayout(nodes, [], { ...defaults, maxDepth: 0 });
    expect(result.positions.size).toBe(0); // nothing visible
    const left = result.summaries.find((s) => s.column === -1);
    const right = result.summaries.find((s) => s.column === 1);
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(left!.collapsedCount).toBe(1);
    expect(right!.collapsedCount).toBe(1);
    // Orphan summaries carry no visible anchor.
    expect(left!.anchorId).toBe("");
    expect(right!.anchorId).toBe("");
  });

  // A hidden node disconnected from the visible set (no edge path to any
  // visible node — e.g. a completed standalone subtree) must still be
  // summarized, not silently dropped.
  it("summarizes a disconnected hidden node as an orphan even when a node is visible", () => {
    const nodes: DAGNode<Item>[] = [
      { id: "b", data: { status: 1 } }, // col 0, visible
      { id: "c", data: { status: 2 } }, // col +1, hidden, no edge to b
    ];
    const result = computeSwimlaneLayout(nodes, [], { ...defaults, maxDepth: 0 });
    expect(result.positions.has("b")).toBe(true);
    const orphan = result.summaries.find((s) => s.column === 1);
    expect(orphan).toBeDefined();
    expect(orphan!.anchorId).toBe("");
    expect(orphan!.collapsedCount).toBe(1);
  });
});
