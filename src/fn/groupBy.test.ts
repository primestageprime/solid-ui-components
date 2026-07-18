import { describe, it, expect } from "vitest";
import { groupBy } from "./groupBy";

describe("groupBy", () => {
  it("buckets by key, preserving input order within a bucket", () => {
    const rows = [
      { g: "x", n: 1 },
      { g: "y", n: 2 },
      { g: "x", n: 3 },
    ];
    const out = groupBy((r: { g: string; n: number }) => r.g)(rows);
    expect(out.get("x")).toEqual([
      { g: "x", n: 1 },
      { g: "x", n: 3 },
    ]);
    expect(out.get("y")).toEqual([{ g: "y", n: 2 }]);
  });

  it("keeps first-seen key order", () => {
    const out = groupBy((n: number) => n % 2)([2, 1, 4, 3]);
    expect([...out.keys()]).toEqual([0, 1]);
  });

  it("returns an empty Map for empty input", () => {
    expect(groupBy((n: number) => n)([]).size).toBe(0);
  });

  it("supports non-string keys", () => {
    const out = groupBy((n: number) => n > 0)([-1, 2, -3]);
    expect(out.get(true)).toEqual([2]);
    expect(out.get(false)).toEqual([-1, -3]);
  });
});

describe("groupBy — direct form", () => {
  it("applies immediately with groupBy(keyFn, array)", () => {
    const out = groupBy((n) => n % 2, [2, 1, 4, 3]);
    expect(out.get(0)).toEqual([2, 4]);
    expect(out.get(1)).toEqual([1, 3]);
  });

  it("direct === curried-then-applied", () => {
    const nums = [1, 2, 3, 4];
    const key = (n: number) => n % 2;
    expect([...groupBy(key, nums).entries()]).toEqual([
      ...groupBy(key)(nums).entries(),
    ]);
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error key fn must come first, array second.
      groupBy([1, 2, 3], (n: number) => n);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
