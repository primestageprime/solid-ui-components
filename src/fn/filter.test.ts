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
