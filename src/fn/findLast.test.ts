import { describe, it, expect } from "vitest";
import { findLast } from "./findLast";

describe("findLast", () => {
  it("returns the LAST matching element, not the first", () => {
    expect(findLast((n: number) => n > 1)([1, 2, 3])).toBe(3);
  });

  it("returns undefined when nothing matches", () => {
    expect(findLast((n: number) => n > 9)([1, 2, 3])).toBeUndefined();
  });

  it("returns undefined on empty input", () => {
    expect(findLast((n: number) => n > 1)([])).toBeUndefined();
  });

  it("passes the original index to the predicate", () => {
    expect(findLast((_v: string, i: number) => i === 0)(["a", "b"])).toBe("a");
  });

  it("does not mutate its input", () => {
    const xs = [1, 2, 3];
    findLast((n: number) => n > 1)(xs);
    expect(xs).toEqual([1, 2, 3]);
  });

  it("narrows the element type with a type guard", () => {
    const mixed: (string | number)[] = ["a", 1, "b", 2];
    const last: string | undefined = findLast(
      (v): v is string => typeof v === "string",
    )(mixed);
    expect(last).toBe("b");
  });
});

describe("findLast — direct form", () => {
  it("applies immediately with findLast(pred, array)", () => {
    expect(findLast((n: number) => n > 1, [1, 2, 3])).toBe(3);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(findLast(pred, [1, 2, 3, 4])).toEqual(findLast(pred)([1, 2, 3, 4]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      findLast([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
