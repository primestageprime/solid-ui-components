import { describe, it, expect } from "vitest";
import { sortBy } from "./sortBy";

describe("sortBy", () => {
  it("sorts ascending by the projected key", () => {
    const rows = [{ w: 3 }, { w: 1 }, { w: 2 }];
    expect(sortBy((r: { w: number }) => r.w)(rows)).toEqual([
      { w: 1 },
      { w: 2 },
      { w: 3 },
    ]);
  });

  it("does not mutate the input (copies first)", () => {
    const input = [3, 1, 2];
    const out = sortBy((n: number) => n)(input);
    expect(out).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]); // original untouched
    expect(out).not.toBe(input);
  });

  it("is stable — equal keys keep input order", () => {
    const rows: { k: number; tag: string }[] = [
      { k: 1, tag: "a" },
      { k: 1, tag: "b" },
      { k: 0, tag: "c" },
      { k: 1, tag: "d" },
    ];
    expect(
      sortBy((r: { k: number; tag: string }) => r.k)(rows).map((r) => r.tag),
    ).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("sorts strings lexicographically", () => {
    expect(sortBy((s: string) => s)(["banana", "apple", "cherry"])).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);
  });

  it("descends when the numeric key is negated", () => {
    expect(sortBy((n: number) => -n)([1, 3, 2])).toEqual([3, 2, 1]);
  });

  it("returns a fresh copy for empty and singleton inputs", () => {
    const empty: number[] = [];
    expect(sortBy((n: number) => n)(empty)).toEqual([]);
    expect(sortBy((n: number) => n)(empty)).not.toBe(empty);
    expect(sortBy((n: number) => n)([5])).toEqual([5]);
  });
});
