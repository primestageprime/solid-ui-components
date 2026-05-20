import { describe, it, expect } from "vitest";
import { computeSwimlaneLayout } from "./swimlane-layout";
import type { DAGNode } from "./types";

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
