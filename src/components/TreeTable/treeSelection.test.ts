// @vitest-environment node
/**
 * TreeTable checkbox selection. The selection holds LEAF ids only; a parent's
 * box is derived from its leaves, so a parent can never disagree with them.
 */
import { describe, expect, it } from "vitest";
import {
  allLocked,
  checkState,
  leafIds,
  leafIdsOf,
  setChecked,
  toggleLeaves,
} from "./treeSelection";

interface Node {
  readonly id: string;
  readonly kids?: readonly Node[];
}

const a: Node = {
  id: "a",
  kids: [{ id: "a1" }, { id: "a2", kids: [{ id: "x" }, { id: "y" }] }],
};
const shape = { childrenOf: (n: Node) => n.kids, getRowId: (n: Node) => n.id };

describe("leafIds", () => {
  it("lists every leaf under a node, at any depth", () => {
    expect(leafIds(a, shape)).toEqual(["a1", "x", "y"]);
  });
  it("is the node itself for a leaf, and for an empty child list", () => {
    expect(leafIds({ id: "z" }, shape)).toEqual(["z"]);
    expect(leafIds({ id: "e", kids: [] }, shape)).toEqual(["e"]);
  });
  it("collects over a list of roots", () => {
    expect(leafIdsOf([a, { id: "b" }], shape)).toEqual(["a1", "x", "y", "b"]);
  });
});

describe("checkState", () => {
  const leaves = ["a1", "x", "y"];
  it("is unchecked with no leaves selected", () => {
    expect(checkState(leaves, new Set())).toBe("unchecked");
  });
  it("is indeterminate with some leaves selected", () => {
    expect(checkState(leaves, new Set(["x"]))).toBe("indeterminate");
  });
  it("is checked with every leaf selected", () => {
    expect(checkState(leaves, new Set(["a1", "x", "y"]))).toBe("checked");
  });
  it("is unchecked for an empty leaf list (an empty table's select-all)", () => {
    expect(checkState([], new Set(["x"]))).toBe("unchecked");
  });
});

describe("setChecked", () => {
  it("adds every leaf when checked", () => {
    expect([...setChecked(["a1", "x"], true, new Set())].sort()).toEqual([
      "a1",
      "x",
    ]);
  });
  it("removes only the given leaves when unchecked", () => {
    expect([
      ...setChecked(["a1", "x", "y"], false, new Set(["a1", "x", "other"])),
    ]).toEqual(["other"]);
  });
  it("does not duplicate a leaf that was already in", () => {
    expect([...setChecked(["x"], true, new Set(["x"]))]).toEqual(["x"]);
  });
  it("returns a new set and leaves the input alone", () => {
    const before = new Set<string>();
    expect(setChecked(["x"], true, before)).not.toBe(before);
    expect(before.size).toBe(0);
  });
});

describe("locked leaves", () => {
  const locked = new Set(["b"]);
  it("a click changes only the unlocked leaves", () => {
    expect([...toggleLeaves(["a", "b", "c"], true, new Set(), locked)].sort()).toEqual(["a", "c"]);
    expect([...toggleLeaves(["a", "b", "c"], false, new Set(["a", "b", "c"]), locked)]).toEqual(["b"]);
  });

  it("a click that would change nothing flips the unlocked leaves instead", () => {
    // a and c are in, the locked b is out: the parent shows indeterminate,
    // and its click turns checked. Checking a and c again changes nothing.
    expect([...toggleLeaves(["a", "b", "c"], true, new Set(["a", "c"]), locked)]).toEqual([]);
  });

  it("a box is locked only when every leaf under it is", () => {
    expect(allLocked(["b"], locked)).toBe(true);
    expect(allLocked(["a", "b"], locked)).toBe(false);
    expect(allLocked([], locked)).toBe(false);
  });
});
