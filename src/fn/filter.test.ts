import { describe, it, expect } from "vitest";
import { filter } from "./filter";

describe("filter", () => {
  it("keeps matching elements", () => {
    expect(filter((n: number) => n > 1)([1, 2, 3])).toEqual([2, 3]);
  });

  it("returns [] on empty input", () => {
    expect(filter((n: number) => n > 1)([])).toEqual([]);
  });

  it("narrows the element type with a type guard", () => {
    const mixed: (string | number)[] = ["a", 1, "b", 2];
    // Assigning to string[] compiles only if the guard overload narrows.
    const strings: string[] = filter(
      (v): v is string => typeof v === "string",
    )(mixed);
    expect(strings).toEqual(["a", "b"]);
  });
});

describe("filter — direct form", () => {
  it("applies immediately with filter(pred, array)", () => {
    expect(filter((n: number) => n > 1, [1, 2, 3])).toEqual([2, 3]);
  });

  it("direct === curried-then-applied", () => {
    const pred = (n: number) => n % 2 === 0;
    expect(filter(pred, [1, 2, 3, 4])).toEqual(filter(pred)([1, 2, 3, 4]));
  });

  it("narrows the element type in the direct form", () => {
    const mixed: (string | number)[] = ["a", 1, "b", 2];
    const strings: string[] = filter(
      (v): v is string => typeof v === "string",
      mixed,
    );
    expect(strings).toEqual(["a", "b"]);
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error predicate must come first, array second.
      filter([1, 2, 3], (n: number) => n > 1);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
