// src/components/AnimatedSwimlaneChart/lanes.test.ts
import { describe, it, expect } from "vitest";
import { groupIntoLanes } from "./lanes";
import type { StatusFlowNode } from "../StatusFlowChart";

describe("groupIntoLanes", () => {
  it("returns a single lane with id 'default' when no parentId is used", () => {
    const nodes: StatusFlowNode[] = [
      { id: "a", title: "A", status: "TODO" },
      { id: "b", title: "B", status: "DOING" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].id).toBe("default");
    expect(lanes[0].parentId).toBeUndefined();
    expect(lanes[0].nodes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("splits children into lanes by parentId; parent node is prepended", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c1", title: "Child 1", status: "TODO", parentId: "p1" },
      { id: "c2", title: "Child 2", status: "DOING", parentId: "p1" },
      { id: "c3", title: "Child 3", status: "DOING", parentId: "p2" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes.map((l) => l.id)).toEqual(["p1", "p2"]);
    expect(lanes[0].parentId).toBe("p1");
    expect(lanes[0].nodes.map((n) => n.id)).toEqual(["p1", "c1", "c2"]);
    expect(lanes[1].nodes.map((n) => n.id)).toEqual(["p2", "c3"]);
  });

  it("children with a missing parentId fall into the default lane", () => {
    const nodes: StatusFlowNode[] = [
      { id: "orphan", title: "Orphan", status: "TODO", parentId: "ghost" },
      { id: "p1", title: "Parent", status: "TODO" },
      { id: "c1", title: "Child", status: "TODO", parentId: "p1" },
    ];
    const lanes = groupIntoLanes(nodes);
    const def = lanes.find((l) => l.id === "default");
    expect(def).toBeDefined();
    expect(def!.nodes.map((n) => n.id)).toContain("orphan");
  });

  it("preserves input order across lanes", () => {
    const nodes: StatusFlowNode[] = [
      { id: "p2", title: "Parent 2", status: "TODO" },
      { id: "c2", title: "Child 2", status: "TODO", parentId: "p2" },
      { id: "p1", title: "Parent 1", status: "TODO" },
      { id: "c1", title: "Child 1", status: "TODO", parentId: "p1" },
    ];
    const lanes = groupIntoLanes(nodes);
    expect(lanes.map((l) => l.id)).toEqual(["p2", "p1"]);
  });
});
