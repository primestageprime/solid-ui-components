import { describe, it, expect } from "vitest";
import { KINDS, kindColor, kindLabel, kindLegendItems, presentKinds } from "./kinds";
import { computeTreeDiffLayout } from "./layout";
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

// The label fix must hold in EVERY layout mode, not just the one the
// component happens to mount at. `narrow` builds its nodes in narrow.ts and
// the other two in place.ts, so the flag has to be set in both files.
describe("every layout mode marks consumer labels as data", () => {
  const entry = (id: string, label: string) => ({ id, label, hash: id });
  const input = (width: number) => ({
    baseline: { label: "Baseline", hash: "aaa", commit: "c1", ref: "r1" },
    compare: { label: "Foo", hash: "bbb", commit: "c2", ref: "r2" },
    bands: [
      {
        name: "bucket:opex",
        baseline: entry("g_b", "bucket:opex"),
        compare: entry("g_c", "bucket:opex"),
        children: [
          {
            name: "rent",
            baseline: entry("l_r1", "Office rent"),
            compare: entry("l_r2", "Office rent"),
          },
        ],
      },
    ],
    mode: "differences" as const,
    width,
  });

  it.each([
    ["narrow", 600],
    ["compact", 1080],
    ["wide", 1600],
  ])("%s: every consumer entry ellipsizes, no minted label does", (mode, w) => {
    const layout = computeTreeDiffLayout(input(w));
    expect(layout.mode).toBe(mode);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    // Entries the consumer supplied.
    for (const id of ["g_b", "g_c", "l_r1", "l_r2"]) {
      const n = byId.get(id);
      if (n) expect(n.labelFromData).toBe(true);
    }
    // Labels the chart MINTS are a known enumerated set and must stay SVG
    // text. Note `kind: "root"` is not the discriminator: in compact mode
    // that node is the chip, whose label is the consumer's scenario name.
    const MINTED = ["commit", "root tree", "[SAME]"];
    for (const n of layout.nodes) {
      if (MINTED.includes(n.label)) expect(n.labelFromData).toBeFalsy();
      else expect(n.labelFromData).toBe(true);
    }
  });
});
