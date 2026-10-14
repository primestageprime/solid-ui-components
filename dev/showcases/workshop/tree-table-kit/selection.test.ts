/**
 * Tree Table checkbox selection. The selection holds LEAF ids only; a parent's
 * box is derived from its leaves, so a parent can never disagree with them.
 */
import { describe, expect, it } from "vitest";
import { checkState, leafIds, toggleChecked } from "./selection";

interface Node {
  readonly id: string;
  readonly kids?: readonly Node[];
}

const a: Node = {
  id: "a",
  kids: [{ id: "a1" }, { id: "a2", kids: [{ id: "x" }, { id: "y" }] }],
};
const opts = { childrenOf: (n: Node) => n.kids, getRowId: (n: Node) => n.id };

describe("leafIds", () => {
  it("lists every leaf under a node, at any depth", () => {
    expect(leafIds(a, opts)).toEqual(["a1", "x", "y"]);
  });
  it("is the node itself for a leaf", () => {
    expect(leafIds({ id: "z" }, opts)).toEqual(["z"]);
  });
});

describe("checkState", () => {
  it("is unchecked with no leaves selected", () => {
    expect(checkState(a, new Set(), opts)).toBe("unchecked");
  });
  it("is indeterminate with some leaves selected", () => {
    expect(checkState(a, new Set(["x"]), opts)).toBe("indeterminate");
  });
  it("is checked with every leaf selected", () => {
    expect(checkState(a, new Set(["a1", "x", "y"]), opts)).toBe("checked");
  });
});

describe("toggleChecked", () => {
  it("checks every descendant leaf when a parent is checked", () => {
    expect([...toggleChecked(a, true, new Set(), opts)].sort()).toEqual([
      "a1",
      "x",
      "y",
    ]);
  });
  it("unchecks every descendant leaf when a parent is unchecked, and leaves other rows alone", () => {
    expect([
      ...toggleChecked(a, false, new Set(["a1", "x", "other"]), opts),
    ]).toEqual(["other"]);
  });
  it("checks one leaf without touching its siblings", () => {
    expect(
      [...toggleChecked({ id: "y" }, true, new Set(["a1"]), opts)].sort(),
    ).toEqual(["a1", "y"]);
  });
  it("returns a new set", () => {
    const before = new Set<string>();
    expect(toggleChecked(a, true, before, opts)).not.toBe(before);
    expect(before.size).toBe(0);
  });
});
