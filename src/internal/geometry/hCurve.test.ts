import { describe, expect, it } from "vitest";
import { hCurve } from "./hCurve";

describe("hCurve", () => {
  it("gives both ends HORIZONTAL tangents — the whole Sankey look", () => {
    expect(hCurve(0, 10, 20, 30)).toBe("C 10 10, 10 30, 20 30");
  });

  it("is symmetric, so an edge can be walked backwards to close a band", () => {
    expect(hCurve(20, 30, 0, 10)).toBe("C 10 30, 10 10, 0 10");
  });

  it("rounds to 3dp, so a path string stays readable in a test", () => {
    expect(hCurve(0, 0, 1 / 3, 2 / 3)).toBe("C 0.167 0, 0.167 0.667, 0.333 0.667");
  });
});
