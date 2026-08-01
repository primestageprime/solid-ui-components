import { describe, it, expect } from "vitest";
import { flatMap } from "./flatMap";

describe("flatMap", () => {
  it("maps every element and flattens one level", () => {
    expect(flatMap((n: number) => [n, n * 10])([1, 2])).toEqual([1, 10, 2, 20]);
  });

  it("passes the index", () => {
    expect(flatMap((n: number, i) => [n + i])([10, 10])).toEqual([10, 11]);
  });

  it("drops elements that map to an empty array", () => {
    expect(flatMap((n: number) => (n % 2 ? [n] : []))([1, 2, 3])).toEqual([1, 3]);
  });

  it("returns a new array on empty input", () => {
    const input: number[] = [];
    const out = flatMap((n: number) => [n])(input);
    expect(out).toEqual([]);
    expect(out).not.toBe(input);
  });
});

describe("flatMap — direct form", () => {
  it("applies immediately with flatMap(fn, array)", () => {
    expect(flatMap((n: number) => [n, n], [1, 2])).toEqual([1, 1, 2, 2]);
  });

  it("direct === curried-then-applied", () => {
    const fn = (n: number) => [n + 1];
    expect(flatMap(fn, [1, 2, 3])).toEqual(flatMap(fn)([1, 2, 3]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error fn must come first, array second.
      flatMap([1, 2, 3], (n: number) => [n]);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
