import { describe, it, expect } from "vitest";
import { edgePath, routeRun } from "./route";

const box = (x: number, y: number, width = 100, height = 40) => ({
  x,
  y,
  width,
  height,
});

describe("routeRun", () => {
  it("draws one cubic S-curve for a shallow run", () => {
    const d = routeRun(0, 0, 200, 50, 1);
    expect(d.startsWith("M 0 0 C ")).toBe(true);
    expect(d.endsWith(" 200 50")).toBe(true);
    expect(d).not.toContain("Q");
  });

  it("switches to a rounded elbow once the drop outweighs the run", () => {
    const d = routeRun(0, 0, 100, 300, 1);
    expect(d).toContain("Q");
    // The last segment runs level into the target.
    expect(d.endsWith(" L 100 300")).toBe(true);
  });

  it("mirrors the elbow for a leftward run", () => {
    const d = routeRun(100, 0, 0, 300, -1);
    expect(d.startsWith("M 100 0 L 66 0")).toBe(true);
    expect(d.endsWith(" L 0 300")).toBe(true);
  });

  it("falls back to square corners when there is no room for a radius", () => {
    const d = routeRun(0, 0, 4, 300, 1);
    expect(d).toBe("M 0 0 L 2 0 L 2 300 L 4 300");
  });
});

describe("edgePath", () => {
  it("leaves the right edge of the source and enters the left edge of the target", () => {
    const d = edgePath(box(0, 0), box(400, 0));
    expect(d.startsWith("M 50 0")).toBe(true);
    expect(d.endsWith(" 350 0")).toBe(true);
  });

  it("leaves the left edge when the target sits to the left", () => {
    const d = edgePath(box(400, 0), box(0, 0));
    expect(d.startsWith("M 350 0")).toBe(true);
    expect(d.endsWith(" 50 0")).toBe(true);
  });

  it("drops straight from a wide source when the target's center sits inside its span", () => {
    const d = edgePath(box(122, 0, 216), box(95, 200, 150));
    expect(d).toBe("M 95 20 C 95 42 95 158 95 180");
  });

  it("joins stacked boxes bottom to top with a short vertical curve", () => {
    const d = edgePath(box(100, 0), box(100, 200));
    expect(d).toBe("M 100 20 C 100 42 100 158 100 180");
  });
});
