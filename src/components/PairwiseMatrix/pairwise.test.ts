import { describe, it, expect } from "vitest";
import { pairwiseMatrix, pairwiseOutcome } from "./pairwise";

describe("pairwiseMatrix", () => {
  it("counts preferences, ignores ties, ranks unlisted candidates last", () => {
    const p = pairwiseMatrix(
      ["a", "b", "c"],
      [[["a"], ["b", "c"]], [["b"], ["a"]], [["c", "a"]]],
    );
    expect(p.a).toEqual({ a: 0, b: 2, c: 2 });
    expect(p.b).toEqual({ a: 1, b: 0, c: 1 });
    expect(p.c).toEqual({ a: 0, b: 1, c: 0 });
  });
});

describe("pairwiseOutcome", () => {
  const p = { a: { a: 0, b: 2 }, b: { a: 1, b: 0 } };
  it("reads win / loss / tie and null on the diagonal", () => {
    expect(pairwiseOutcome(p, "a", "b")).toBe("win");
    expect(pairwiseOutcome(p, "b", "a")).toBe("loss");
    expect(pairwiseOutcome({ a: { b: 1 }, b: { a: 1 } }, "a", "b")).toBe("tie");
    expect(pairwiseOutcome(p, "a", "a")).toBeNull();
  });
});
