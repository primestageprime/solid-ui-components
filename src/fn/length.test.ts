// @vitest-environment node
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
});

// Type-level: rejects a value with no length. Checked by tsc, never run.
const _reversed = () =>
  // @ts-expect-error a number has no `length`.
  length(42);
