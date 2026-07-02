import { describe, expect, it } from "vitest";
import { insetSpan } from "./insetSpan";

describe("insetSpan", () => {
  it("computes start/end/size from a total and two insets", () => {
    expect(insetSpan(100, 10, 20)).toEqual({ start: 10, end: 80, size: 70 });
  });

  it("spans the whole total when both insets are zero", () => {
    expect(insetSpan(50, 0, 0)).toEqual({ start: 0, end: 50, size: 50 });
  });

  it("supports one-sided insets", () => {
    expect(insetSpan(200, 0, 22)).toEqual({ start: 0, end: 178, size: 178 });
    expect(insetSpan(200, 36, 0)).toEqual({ start: 36, end: 200, size: 164 });
  });

  it("clamps size to zero when insets exceed the total, keeping raw edges", () => {
    expect(insetSpan(10, 8, 8)).toEqual({ start: 8, end: 2, size: 0 });
  });

  it("handles fractional values", () => {
    expect(insetSpan(100.5, 10.25, 0.25)).toEqual({
      start: 10.25,
      end: 100.25,
      size: 90,
    });
  });
});
