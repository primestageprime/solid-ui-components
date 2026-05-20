import { describe, it, expect } from "vitest";
import { computeSwimlaneLayout } from "./layout";
import type { DAGNode, DAGEdge } from "../DagChart/types";

type Item = { status: 0 | 1 | 2 };

const swimlaneFor = (n: DAGNode<Item>) => n.data.status;
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
