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

describe("map — direct form", () => {
  it("applies immediately with map(fn, array)", () => {
    expect(map((n: number) => n * 2, [1, 2, 3])).toEqual([2, 4, 6]);
  });

  it("direct === curried-then-applied", () => {
    const fn = (n: number) => n + 1;
    expect(map(fn, [1, 2, 3])).toEqual(map(fn)([1, 2, 3]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error fn must come first, array second.
      map([1, 2, 3], (n: number) => n * 2);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
