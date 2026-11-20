import { describe, expect, it } from "vitest";
import { atBound } from "./NumberInput.tsx";

describe("atBound", () => {
  it("is true when the low side has reached the high side", () => {
    expect(atBound(1, 1)).toBe(true);
    expect(atBound(2, 1)).toBe(true);
  });
  it("is false with room to step", () => {
    expect(atBound(1, 2)).toBe(false);
  });
  it("is false when either side is unknown", () => {
    expect(atBound(undefined, 1)).toBe(false);
    expect(atBound(1, undefined)).toBe(false);
  });
});
