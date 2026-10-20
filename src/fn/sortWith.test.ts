import { describe, expect, it } from "vitest";
import { sortWith } from "./sortWith";

describe("sortWith", () => {
  it("sorts by a comparator without mutating the input", () => {
    const xs = [3, 1, 2];
    expect(sortWith((a, b) => b - a, xs)).toEqual([3, 2, 1]);
    expect(xs).toEqual([3, 1, 2]);
  });
  it("curries for pipe and is stable", () => {
    const rows = [{ k: 1, n: "a" }, { k: 0, n: "b" }, { k: 1, n: "c" }];
    expect(sortWith<(typeof rows)[number]>((a, b) => a.k - b.k)(rows).map((r) => r.n)).toEqual(["b", "a", "c"]);
  });
});
