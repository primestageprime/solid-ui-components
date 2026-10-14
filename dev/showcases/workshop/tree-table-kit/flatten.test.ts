/**
 * Tree Table flatten — the one piece of logic the bench owns. The table only
 * ever sees the flat rows this returns, so the visible order, the depth that
 * drives the indent, and which rows carry a chevron are all asserted here.
 */
import { describe, expect, it } from "vitest";
import { flattenTree } from "./flatten";

interface Node {
  readonly id: string;
  readonly kids?: readonly Node[];
}

const tree: readonly Node[] = [
  { id: "a", kids: [{ id: "a1" }, { id: "a2", kids: [{ id: "a2x" }] }] },
  { id: "b" },
  { id: "c", kids: [] },
];

const flat = (expanded: ReadonlySet<string>) =>
  flattenTree(tree, {
    childrenOf: (n) => n.kids,
    getRowId: (n) => n.id,
    expanded,
  });

const ids = (expanded: ReadonlySet<string>) => flat(expanded).map((r) => r.id);

describe("flattenTree", () => {
  it("shows only the roots when nothing is expanded", () => {
    expect(ids(new Set())).toEqual(["a", "b", "c"]);
  });

  it("puts an expanded parent's children directly under it, in order", () => {
    expect(ids(new Set(["a"]))).toEqual(["a", "a1", "a2", "b", "c"]);
  });

  it("hides a grandchild while its parent is collapsed, even if the grandparent is open", () => {
    expect(ids(new Set(["a", "a2x"]))).toEqual(["a", "a1", "a2", "b", "c"]);
  });

  it("hides a whole subtree when an ancestor collapses, keeping the inner key for later", () => {
    expect(ids(new Set(["a2"]))).toEqual(["a", "b", "c"]);
    expect(ids(new Set(["a", "a2"]))).toEqual([
      "a",
      "a1",
      "a2",
      "a2x",
      "b",
      "c",
    ]);
  });

  it("stamps a 0-based depth per row", () => {
    expect(flat(new Set(["a", "a2"])).map((r) => r.depth)).toEqual([
      0, 1, 1, 2, 0, 0,
    ]);
  });

  it("treats undefined and an empty child list both as a leaf", () => {
    const byId = new Map(flat(new Set(["a"])).map((r) => [r.id, r]));
    expect(byId.get("a")?.hasChildren).toBe(true);
    expect(byId.get("a2")?.hasChildren).toBe(true);
    expect(byId.get("b")?.hasChildren).toBe(false);
    expect(byId.get("c")?.hasChildren).toBe(false);
  });

  it("marks expanded only on a parent that is open", () => {
    const rows = flat(new Set(["a", "b"]));
    expect(rows.filter((r) => r.expanded).map((r) => r.id)).toEqual(["a"]);
  });

  it("carries the original row object through untouched", () => {
    expect(flat(new Set())[0]?.row).toBe(tree[0]);
  });
});
