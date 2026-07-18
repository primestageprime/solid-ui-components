import { describe, it, expect } from "vitest";
import { sum } from "./sum";

describe("sum", () => {
  it("totals the array", () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
  });

  it("is 0 for an empty array", () => {
    expect(sum([])).toBe(0);
  });

  it("handles negatives and floats", () => {
    expect(sum([-1, 1.5, 0.5])).toBe(1);
  });
});
