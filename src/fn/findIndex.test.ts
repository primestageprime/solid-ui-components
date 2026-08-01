import { describe, it, expect } from "vitest";
import { findIndex } from "./findIndex";

describe("findIndex", () => {
  it("returns the position of the first match", () => {
    expect(findIndex((n: number) => n > 1)([1, 2, 3])).toBe(1);
  });

  it("returns -1 when nothing matches", () => {
    expect(findIndex((n: number) => n > 9)([1, 2, 3])).toBe(-1);
  });

  it("returns -1 on empty input", () => {
    expect(findIndex((n: number) => n > 1)([])).toBe(-1);
  });

  it("returns 0 for a match at the head, not a falsy miss", () => {
    expect(findIndex((n: number) => n === 1)([1, 2, 3])).toBe(0);
  });

  it("passes the index to the predicate", () => {
    expect(findIndex((_v: string, i: number) => i === 2)(["a", "b", "c"])).toBe(
      2,
    );
  });
});

describe("findIndex — direct form", () => {
  it("applies immediately with findIndex(pred, array)", () => {
    expect(findIndex((n: number) => n > 1, [1, 2, 3])).toBe(1);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(findIndex(pred, [1, 2, 3, 4])).toEqual(findIndex(pred)([1, 2, 3, 4]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      findIndex([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
