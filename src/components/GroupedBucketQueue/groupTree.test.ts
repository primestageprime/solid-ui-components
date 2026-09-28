import { describe, expect, it } from "vitest";
import {
  collectLeafBucketKeys,
  countOf,
  flattenGroupHeaders,
  toggleGroupCollapse,
  type GroupNode,
} from "./groupTree";

// A small fixture tree: Direction -> Category -> Type, mirroring thorcasting's
// Configure sidebar shape without depending on it.
const tree: GroupNode[] = [
  {
    key: "revenue",
    label: "Revenue",
    children: [
      {
        key: "revenue:license",
        label: "License",
        children: [
          {
            key: "revenue:license:monthly",
            label: "Monthly fixed",
            bucketKey: "rev-lic-monthly",
          },
          {
            key: "revenue:license:annual",
            label: "Annual fixed",
            bucketKey: "rev-lic-annual",
          },
        ],
      },
    ],
  },
  {
    key: "expense",
    label: "Expense",
    children: [
      {
        key: "expense:office",
        label: "Office",
        children: [
          {
            key: "expense:office:monthly",
            label: "Monthly fixed",
            bucketKey: "exp-office-monthly",
          },
        ],
      },
    ],
  },
];

const countFor =
  (counts: Record<string, number>) =>
  (bucketKey: string): number =>
    counts[bucketKey] ?? 0;

describe("collectLeafBucketKeys", () => {
  it("lists every leaf's bucketKey, depth-first, in render order", () => {
    expect(collectLeafBucketKeys(tree)).toEqual([
      "rev-lic-monthly",
      "rev-lic-annual",
      "exp-office-monthly",
    ]);
  });
});

describe("countOf", () => {
  it("returns a leaf's own bucket count", () => {
    expect(
      countOf(
        tree[0].children![0].children![0],
        countFor({ "rev-lic-monthly": 3 }),
      ),
    ).toBe(3);
  });

  it("rolls a branch's count up from its children", () => {
    const counts = countFor({ "rev-lic-monthly": 2, "rev-lic-annual": 1 });
    expect(countOf(tree[0].children![0], counts)).toBe(3); // License
    expect(countOf(tree[0], counts)).toBe(3); // Revenue
  });
});

describe("flattenGroupHeaders", () => {
  it("emits every node depth-first with depth and rolled-up counts, all expanded", () => {
    const counts = countFor({
      "rev-lic-monthly": 2,
      "rev-lic-annual": 1,
      "exp-office-monthly": 5,
    });
    const flat = flattenGroupHeaders(tree, counts, new Map());
    expect(flat.map((h) => [h.key, h.depth, h.count, h.isLeaf])).toEqual([
      ["revenue", 0, 3, false],
      ["revenue:license", 1, 3, false],
      ["revenue:license:monthly", 2, 2, true],
      ["revenue:license:annual", 2, 1, true],
      ["expense", 0, 5, false],
      ["expense:office", 1, 5, false],
      ["expense:office:monthly", 2, 5, true],
    ]);
  });

  it("omits nothing for a zero-count leaf, but marks it non-toggleable", () => {
    const counts = countFor({
      "rev-lic-monthly": 0,
      "rev-lic-annual": 0,
      "exp-office-monthly": 0,
    });
    const flat = flattenGroupHeaders(tree, counts, new Map());
    const leaves = flat.filter((h) => h.isLeaf);
    expect(leaves.every((h) => h.toggleable === false)).toBe(true);
    expect(leaves.every((h) => h.collapsed === false)).toBe(true);
  });

  it("prunes descent into a collapsed branch — its children never appear", () => {
    const counts = countFor({
      "rev-lic-monthly": 2,
      "rev-lic-annual": 1,
      "exp-office-monthly": 5,
    });
    const overrides = new Map([["revenue:license", true]]);
    const flat = flattenGroupHeaders(tree, counts, overrides);
    expect(flat.map((h) => h.key)).toEqual([
      "revenue",
      "revenue:license",
      "expense",
      "expense:office",
      "expense:office:monthly",
    ]);
    const license = flat.find((h) => h.key === "revenue:license")!;
    expect(license.collapsed).toBe(true);
    expect(license.count).toBe(3); // still rolled up even though collapsed
  });

  it("a collapsed leaf is flagged but the caller decides whether to render its rows", () => {
    const counts = countFor({
      "rev-lic-monthly": 2,
      "rev-lic-annual": 1,
      "exp-office-monthly": 5,
    });
    const overrides = new Map([["revenue:license:monthly", true]]);
    const flat = flattenGroupHeaders(tree, counts, overrides);
    const monthly = flat.find((h) => h.key === "revenue:license:monthly")!;
    expect(monthly.collapsed).toBe(true);
    expect(monthly.isLeaf).toBe(true);
  });

  it("collapsedByDefault applies until an override says otherwise", () => {
    const withDefault: GroupNode[] = [
      {
        key: "a",
        label: "A",
        collapsedByDefault: true,
        children: [{ key: "a:x", label: "X", bucketKey: "bx" }],
      },
    ];
    const counts = countFor({ bx: 4 });
    expect(
      flattenGroupHeaders(withDefault, counts, new Map())[0].collapsed,
    ).toBe(true);
    expect(
      flattenGroupHeaders(withDefault, counts, new Map([["a", false]]))[0]
        .collapsed,
    ).toBe(false);
  });

  it("collapsible: false is never toggleable regardless of overrides", () => {
    const fixed: GroupNode[] = [
      {
        key: "a",
        label: "A",
        collapsible: false,
        children: [{ key: "a:x", label: "X", bucketKey: "bx" }],
      },
    ];
    const counts = countFor({ bx: 4 });
    const flat = flattenGroupHeaders(fixed, counts, new Map([["a", true]]));
    expect(flat[0].toggleable).toBe(false);
    expect(flat[0].collapsed).toBe(false);
  });
});

describe("toggleGroupCollapse", () => {
  it("flips a node's current state", () => {
    const next = toggleGroupCollapse(new Map(), "a", false);
    expect(next.get("a")).toBe(true);
    const next2 = toggleGroupCollapse(next, "a", true);
    expect(next2.get("a")).toBe(false);
  });

  it("never mutates the input map", () => {
    const overrides = new Map([["a", false]]);
    toggleGroupCollapse(overrides, "a", false);
    expect(overrides.get("a")).toBe(false);
  });
});
