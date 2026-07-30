import { describe, it, expect } from "vitest";
import { every } from "./every";

describe("every", () => {
  it("is true when all elements match", () => {
    expect(every((n: number) => n > 0)([1, 2, 3])).toBe(true);
  });

  it("is false when any element fails to match", () => {
    expect(every((n: number) => n > 1)([1, 2, 3])).toBe(false);
  });

  it("is true on empty input (vacuous truth)", () => {
    expect(every((n: number) => n > 1)([])).toBe(true);
  });

  it("short-circuits on the first mismatch", () => {
    const seen: number[] = [];
    every((n: number) => {
      seen.push(n);
      return n !== 2;
    })([1, 2, 3]);
    expect(seen).toEqual([1, 2]);
  });

  it("passes the index to the predicate", () => {
    expect(every((_v: string, i: number) => i < 2)(["a", "b"])).toBe(true);
  });
});

describe("every — direct form", () => {
  it("applies immediately with every(pred, array)", () => {
    expect(every((n: number) => n > 0, [1, 2, 3])).toBe(true);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(every(pred, [2, 4, 6])).toEqual(every(pred)([2, 4, 6]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      every([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
