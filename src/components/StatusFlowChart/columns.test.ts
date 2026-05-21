import { describe, it, expect } from "vitest";
import {
  pickVisibleCols,
  assignColumns,
  resolveParentStatuses,
  type StatusFlowColumn,
  type StatusFlowNode,
} from "./columns";

const COLUMNS: StatusFlowColumn[] = [
  { label: "Done", statuses: ["DONE"] },
  { label: "Doing", statuses: ["DOING"] },
  { label: "Todo", statuses: ["TODO"] },
];

describe("pickVisibleCols", () => {
  const bp = [
    { minWidth: 0, visibleCols: 1 },
    { minWidth: 600, visibleCols: 3 },
    { minWidth: 1200, visibleCols: 5 },
  ];

  it("picks highest matching breakpoint", () => {
    expect(pickVisibleCols(0, bp)).toBe(1);
    expect(pickVisibleCols(599, bp)).toBe(1);
    expect(pickVisibleCols(600, bp)).toBe(3);
    expect(pickVisibleCols(1199, bp)).toBe(3);
    expect(pickVisibleCols(1200, bp)).toBe(5);
    expect(pickVisibleCols(99999, bp)).toBe(5);
  });

  it("falls back to smallest visibleCols below all breakpoints", () => {
    const high = [{ minWidth: 500, visibleCols: 3 }, { minWidth: 1000, visibleCols: 5 }];
    expect(pickVisibleCols(100, high)).toBe(3);
  });

  it("returns 1 when no breakpoints", () => {
    expect(pickVisibleCols(800, [])).toBe(1);
  });

  it("tolerates unsorted input", () => {
    const unsorted = [
      { minWidth: 1200, visibleCols: 5 },
      { minWidth: 0, visibleCols: 1 },
      { minWidth: 600, visibleCols: 3 },
    ];
    expect(pickVisibleCols(700, unsorted)).toBe(3);
  });
});

describe("assignColumns", () => {
  const nodes: StatusFlowNode[] = [
    { id: "a", title: "A", status: "DONE" },
    { id: "b", title: "B", status: "DOING" },
    { id: "c", title: "C", status: "TODO" },
  ];

  it("centers on DOING and signs cols", () => {
    const r = assignColumns(nodes, COLUMNS, "DOING", 3);
    expect(r.get("a")?.col).toBe(-1);
    expect(r.get("b")?.col).toBe(0);
    expect(r.get("c")?.col).toBe(1);
  });

  it("tags side correctly", () => {
    const r = assignColumns(nodes, COLUMNS, "DOING", 3);
    expect(r.get("a")?.side).toBe("left");
    expect(r.get("b")?.side).toBe("center");
    expect(r.get("c")?.side).toBe("right");
  });

  it("marks all visible when window covers all cols", () => {
    const r = assignColumns(nodes, COLUMNS, "DOING", 3);
    expect(r.get("a")?.visible).toBe(true);
    expect(r.get("b")?.visible).toBe(true);
    expect(r.get("c")?.visible).toBe(true);
  });

  it("collapses outside the visible window", () => {
    // visibleCols=1 → only center is visible
    const r = assignColumns(nodes, COLUMNS, "DOING", 1);
    expect(r.get("a")?.visible).toBe(false); // col -1 → collapsed left
    expect(r.get("b")?.visible).toBe(true);
    expect(r.get("c")?.visible).toBe(false); // col +1 → collapsed right
  });

  it("transitions a node from visible to collapsed as window shrinks", () => {
    const wide = assignColumns(nodes, COLUMNS, "DOING", 3);
    const narrow = assignColumns(nodes, COLUMNS, "DOING", 1);
    expect(wide.get("a")?.visible).toBe(true);
    expect(narrow.get("a")?.visible).toBe(false);
    expect(narrow.get("a")?.side).toBe("left"); // side preserved when collapsed
  });

  it("supports multi-status columns", () => {
    const cols: StatusFlowColumn[] = [
      { label: "Done", statuses: ["DONE", "ARCHIVED"] },
      { label: "Doing", statuses: ["DOING"] },
      { label: "Todo", statuses: ["TODO", "BLOCKED"] },
    ];
    const ns: StatusFlowNode[] = [
      { id: "x", title: "X", status: "ARCHIVED" },
      { id: "y", title: "Y", status: "BLOCKED" },
    ];
    const r = assignColumns(ns, cols, "DOING", 3);
    expect(r.get("x")?.col).toBe(-1);
    expect(r.get("y")?.col).toBe(1);
  });

  it("throws when a status is in two columns", () => {
    const dup: StatusFlowColumn[] = [
      { label: "A", statuses: ["X"] },
      { label: "B", statuses: ["X"] },
    ];
    expect(() => assignColumns([], dup, "X", 1)).toThrow(/two columns/);
  });

  it("throws on unknown centerStatus", () => {
    expect(() => assignColumns([], COLUMNS, "GHOST", 1)).toThrow(/centerStatus/);
  });

  it("throws on unknown node status", () => {
    const bad: StatusFlowNode[] = [{ id: "z", title: "Z", status: "MYSTERY" }];
    expect(() => assignColumns(bad, COLUMNS, "DOING", 1)).toThrow(/not in any column/);
  });
});

describe("resolveParentStatuses", () => {
  it("passes through nodes with no children", () => {
    const ns: StatusFlowNode[] = [
      { id: "a", title: "A", status: "DOING" },
      { id: "b", title: "B", status: "TODO" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    expect(r.get("a")).toBe("DOING");
    expect(r.get("b")).toBe("TODO");
  });

  it("flips parent to centerStatus if ANY child is in centerStatus", () => {
    const ns: StatusFlowNode[] = [
      { id: "p", title: "P", status: "TODO" },
      { id: "c1", title: "C1", status: "DONE", parentId: "p" },
      { id: "c2", title: "C2", status: "DOING", parentId: "p" },
      { id: "c3", title: "C3", status: "TODO", parentId: "p" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    expect(r.get("p")).toBe("DOING");
  });

  it("flips parent to DONE when all children are DONE", () => {
    const ns: StatusFlowNode[] = [
      { id: "p", title: "P", status: "DOING" },
      { id: "c1", title: "C1", status: "DONE", parentId: "p" },
      { id: "c2", title: "C2", status: "DONE", parentId: "p" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    expect(r.get("p")).toBe("DONE");
  });

  it("flips parent to TODO when all children are TODO", () => {
    const ns: StatusFlowNode[] = [
      { id: "p", title: "P", status: "DOING" },
      { id: "c1", title: "C1", status: "TODO", parentId: "p" },
      { id: "c2", title: "C2", status: "TODO", parentId: "p" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    expect(r.get("p")).toBe("TODO");
  });

  it("falls back to parent's input status on mixed terminal/initial (no DOING)", () => {
    const ns: StatusFlowNode[] = [
      { id: "p", title: "P", status: "DOING" },
      { id: "c1", title: "C1", status: "DONE", parentId: "p" },
      { id: "c2", title: "C2", status: "TODO", parentId: "p" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    // No child is in centerStatus, and statuses aren't uniform → fallback.
    expect(r.get("p")).toBe("DOING");
  });

  it("treats a parent with zero children as a normal node", () => {
    const ns: StatusFlowNode[] = [
      { id: "p", title: "P", status: "TODO" },
      { id: "lonely", title: "L", status: "DONE" },
    ];
    const r = resolveParentStatuses(ns, "DOING");
    expect(r.get("p")).toBe("TODO");
  });
});
