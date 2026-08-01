import { describe, it, expect } from "vitest";
import { mean } from "./mean";

describe("mean", () => {
  it("averages the array", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("is NaN for empty input (callers guard on length)", () => {
    expect(Number.isNaN(mean([]))).toBe(true);
  });

  it("handles a single element", () => {
    expect(mean([7])).toBe(7);
  });
});
