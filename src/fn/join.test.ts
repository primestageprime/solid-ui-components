import { describe, it, expect } from "vitest";
import { join } from "./join";

describe("join", () => {
  it("joins with the separator", () => {
    expect(join(", ")(["a", "b", "c"])).toBe("a, b, c");
  });

  it("is empty string for empty input", () => {
    expect(join(", ")([])).toBe("");
  });

  it("stringifies like Array.prototype.join (null/undefined -> '')", () => {
    expect(join("-")([1, null, 2, undefined])).toBe("1--2-");
  });
});

describe("join — direct form", () => {
  it("applies immediately with join(sep, array)", () => {
    expect(join(", ", ["a", "b", "c"])).toBe("a, b, c");
  });

  it("direct === curried-then-applied", () => {
    expect(join("-", [1, 2, 3])).toBe(join("-")([1, 2, 3]));
  });

  it("rejects reversed argument order at compile time", () => {
    const reversed = () =>
      // @ts-expect-error separator must come first, array second.
      join(["a", "b"], ", ");
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
