import { describe, it, expect } from "vitest";
import { map } from "./map";

describe("map", () => {
  it("maps every element", () => {
    expect(map((n: number) => n * 2)([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it("passes the index", () => {
    expect(map((n: number, i) => n + i)([10, 10, 10])).toEqual([10, 11, 12]);
  });

  it("returns a new array on empty input", () => {
    const input: number[] = [];
    const out = map((n: number) => n)(input);
    expect(out).toEqual([]);
    expect(out).not.toBe(input);
  });
});
