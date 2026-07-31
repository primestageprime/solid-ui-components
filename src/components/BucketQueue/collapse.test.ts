import { describe, it, expect } from "vitest";
import { collapsedFlags, toggleCollapse, type CollapseOverrides } from "./collapse";

const NONE: CollapseOverrides = new Map();

describe("collapsedFlags — which buckets are MANUALLY collapsed", () => {
  it("collapses a populated collapsedByDefault bucket the user has not touched", () => {
    const buckets = [
      { key: "todo" },
      { key: "discard", collapsible: true, collapsedByDefault: true },
    ];
    expect(collapsedFlags({ buckets, counts: [3, 2], overrides: NONE })).toEqual([false, true]);
  });

  it("leaves a collapsible bucket open when it does not declare collapsedByDefault", () => {
    const buckets = [{ key: "discard", collapsible: true }];
    expect(collapsedFlags({ buckets, counts: [2], overrides: NONE })).toEqual([false]);
  });

  it("IGNORES collapsedByDefault without collapsible — it would strand the items", () => {
    const buckets = [{ key: "discard", collapsedByDefault: true }];
    expect(collapsedFlags({ buckets, counts: [2], overrides: NONE })).toEqual([false]);
  });

  it("reports an EMPTY bucket as not manually collapsed — the empty path owns that render", () => {
    // Both size identically (see ./layout), but an empty bucket shows its
    // emptyLabel and has no chevron, so the two must not be merged here.
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    expect(collapsedFlags({ buckets, counts: [0], overrides: NONE })).toEqual([false]);
  });

  it("lets the user's choice win over collapsedByDefault", () => {
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    const overrides = new Map([["discard", false]]);
    expect(collapsedFlags({ buckets, counts: [2], overrides })).toEqual([false]);
  });

  it("keeps the user's choice across the bucket draining and refilling", () => {
    // Sticky: if the user expanded the pile, they wanted it expanded. The
    // override survives the count going to 0 and back.
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    const overrides = new Map([["discard", false]]);
    expect(collapsedFlags({ buckets, counts: [0], overrides })).toEqual([false]);
    expect(collapsedFlags({ buckets, counts: [5], overrides })).toEqual([false]);
  });
});

describe("toggleCollapse", () => {
  it("pins the opposite of the current state without mutating the input", () => {
    const before: CollapseOverrides = new Map();
    const after = toggleCollapse(before, "discard", true);
    expect(after.get("discard")).toBe(false);
    expect(before.size).toBe(0);
  });

  it("flips an already-pinned bucket back", () => {
    const after = toggleCollapse(new Map([["discard", false]]), "discard", false);
    expect(after.get("discard")).toBe(true);
  });
});
