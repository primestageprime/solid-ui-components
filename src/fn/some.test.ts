import { describe, it, expect } from "vitest";
import { some } from "./some";

describe("some", () => {
  it("is true when any element matches", () => {
    expect(some((n: number) => n > 2)([1, 2, 3])).toBe(true);
  });

  it("is false when none match", () => {
    expect(some((n: number) => n > 9)([1, 2, 3])).toBe(false);
  });

  it("is false on empty input", () => {
    expect(some((n: number) => n > 1)([])).toBe(false);
  });

  it("short-circuits on the first match", () => {
    const seen: number[] = [];
    some((n: number) => {
      seen.push(n);
      return n === 2;
    })([1, 2, 3]);
    expect(seen).toEqual([1, 2]);
  });

  it("passes the index to the predicate", () => {
    expect(some((_v: string, i: number) => i === 1)(["a", "b"])).toBe(true);
  });
});

describe("some — direct form", () => {
  it("applies immediately with some(pred, array)", () => {
    expect(some((n: number) => n > 2, [1, 2, 3])).toBe(true);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(some(pred, [1, 2, 3])).toEqual(some(pred)([1, 2, 3]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      some([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
