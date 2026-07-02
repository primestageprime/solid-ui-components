import { describe, expect, it } from "vitest";
import { clamp } from "./clamp";

describe("clamp", () => {
  it("returns the value untouched when already inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("pins to the lower bound when below the range", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("pins to the upper bound when above the range", () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it("treats both bounds as inclusive", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("collapses to the bound when min equals max", () => {
    expect(clamp(7, 3, 3)).toBe(3);
  });

  it("handles fractional ranges", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.4, 0, 1)).toBe(1);
  });
});
