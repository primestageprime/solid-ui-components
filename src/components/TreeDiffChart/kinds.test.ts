import { describe, it, expect } from "vitest";
import { KINDS, kindColor, kindLabel, kindLegendItems, presentKinds } from "./kinds";
import type { LayoutNode } from "./layout-types";
import type { TreeDiffKind } from "./types";

const n = (id: string, changeKind?: TreeDiffKind): LayoutNode => ({
  id,
  label: id,
  hash: id,
  kind: "leaf",
  side: "shared",
  x: 0,
  y: 0,
  width: 100,
  height: 44,
  changeKind,
});

describe("TreeDiffChart kinds", () => {
  it("keys every kind to a --sui tone token, never a literal colour", () => {
    for (const k of KINDS) expect(kindColor(k)).toMatch(/^var\(--sui-[a-z-]+\)$/);
  });

  it("holds the semantics fixed in the 2026-09-11 prototype spec", () => {
    expect(kindColor("unchanged")).toBe("var(--sui-text-muted)");
    expect(kindColor("changed")).toBe("var(--sui-accent)");
    expect(kindColor("added")).toBe("var(--sui-success)");
    expect(kindColor("removed")).toBe("var(--sui-danger)");
    expect(KINDS.map(kindLabel)).toEqual([
      "Unchanged",
      "Changed",
      "Added",
      "Removed",
    ]);
  });

  it("reports only the kinds the drawn nodes actually carry, in KINDS order", () => {
    const nodes = [n("a", "removed"), n("b", "added"), n("c", "removed")];
    expect(presentKinds(nodes)).toEqual(["added", "removed"]);
  });

  it("ignores nodes with no kind, and reports none when nothing is kinded", () => {
    expect(presentKinds([n("a"), n("b")])).toEqual([]);
    expect(presentKinds([n("a"), n("b", "changed")])).toEqual(["changed"]);
  });

  it("builds legend rows whose swatch matches the paint for that kind", () => {
    expect(kindLegendItems([n("a", "added"), n("b")])).toEqual([
      { color: kindColor("added"), label: "Added" },
    ]);
  });
});
