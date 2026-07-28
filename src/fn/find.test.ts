import { describe, it, expect } from "vitest";
import { find } from "./find";

describe("find", () => {
  it("returns the first matching element", () => {
    expect(find((n: number) => n > 1)([1, 2, 3])).toBe(2);
  });

  it("returns undefined when nothing matches", () => {
    expect(find((n: number) => n > 9)([1, 2, 3])).toBeUndefined();
  });

  it("returns undefined on empty input", () => {
    expect(find((n: number) => n > 1)([])).toBeUndefined();
  });

  it("passes the index to the predicate", () => {
    expect(find((_v: string, i: number) => i === 2)(["a", "b", "c"])).toBe("c");
  });

  it("narrows the element type with a type guard", () => {
    const mixed: (string | number)[] = [1, "a", 2];
    // Assigning to string | undefined compiles only if the guard overload narrows.
    const first: string | undefined = find(
      (v): v is string => typeof v === "string",
    )(mixed);
    expect(first).toBe("a");
  });
});

describe("find — direct form", () => {
  it("applies immediately with find(pred, array)", () => {
    expect(find((n: number) => n > 1, [1, 2, 3])).toBe(2);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(find(pred, [1, 2, 3, 4])).toEqual(find(pred)([1, 2, 3, 4]));
  });

  it("narrows the element type in the direct form", () => {
    const mixed: (string | number)[] = [1, "a", 2];
    const first: string | undefined = find(
      (v): v is string => typeof v === "string",
      mixed,
    );
    expect(first).toBe("a");
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      find([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
