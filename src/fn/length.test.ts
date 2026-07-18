import { describe, it, expect } from "vitest";
import { length } from "./length";

describe("length", () => {
  it("returns an array's length", () => {
    expect(length([1, 2, 3])).toBe(3);
  });

  it("returns a string's length", () => {
    expect(length("hello")).toBe(5);
  });

  it("is 0 for empty", () => {
    expect(length([])).toBe(0);
    expect(length("")).toBe(0);
  });

  it("rejects a value with no length at compile time", () => {
    const reversed = () =>
      // @ts-expect-error a number has no `length`.
      length(42);
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
