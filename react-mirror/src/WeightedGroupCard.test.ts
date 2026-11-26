import { describe, expect, it } from "vitest";
import { footnoteOf } from "./WeightedGroupCard.tsx";

const thousands = (value: number): string => `$${Math.round(value / 1_000)}K`;

describe("footnoteOf", () => {
  it("writes the count and the total", () => {
    expect(footnoteOf(3, 188_000, thousands)).toBe("×3 = $188K");
  });
  it("writes a dash when there is nothing to total", () => {
    expect(footnoteOf(0, null, thousands)).toBe("×0 = —");
  });
});
