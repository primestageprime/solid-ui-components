import { describe, it, expect } from "vitest";
import { edgePath, routeRun, trunkPath } from "./route";

const box = (x: number, y: number, width = 100, height = 40) => ({
  x,
  y,
  width,
  height,
});

describe("routeRun", () => {
  it("turns down in the corridor next to the source, not at the midpoint", () => {
    const d = routeRun(0, 0, 230, 60, 1);
    expect(d.startsWith("M 0 0 L 4 0 Q 20 0 20 16 L 20 44 Q 20 60 36 60")).toBe(
      true,
    );
    expect(d.endsWith(" L 230 60")).toBe(true);
  });

  it("turns at the midpoint of a run shorter than two reaches", () => {
    const d = routeRun(0, 0, 30, 60, 1);
    expect(d).toContain(" L 15 ");
    expect(d.endsWith(" L 30 60")).toBe(true);
  });

  it("mirrors the elbow for a leftward run", () => {
    const d = routeRun(230, 0, 0, 60, -1);
    expect(d.startsWith("M 230 0 L 226 0 Q 210 0 210 16")).toBe(true);
    expect(d.endsWith(" L 0 60")).toBe(true);
  });

  it("degenerates to a straight line for a level run", () => {
    expect(routeRun(0, 0, 100, 0, 1)).toBe("M 0 0 L 20 0 L 20 0 L 100 0");
  });

  it("falls back to square corners when there is no room for a radius", () => {
    expect(routeRun(0, 0, 4, 300, 1)).toBe("M 0 0 L 2 0 L 2 300 L 4 300");
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

  it("joins stacked boxes bottom to top with a short vertical curve", () => {
    const d = edgePath(box(100, 0), box(100, 200));
    expect(d).toBe("M 100 20 C 100 42 100 158 100 180");
  });
});

describe("trunkPath", () => {
  it("drops along the trunk and turns level into the target's near edge", () => {
    const d = trunkPath(50, 74, box(150, 200, 100, 40), 1);
    expect(d).toBe("M 50 74 L 50 184 Q 50 200 66 200 L 100 200");
  });

  it("mirrors for a target left of the trunk", () => {
    const d = trunkPath(1030, 74, box(930, 200, 100, 40), -1);
    expect(d).toBe("M 1030 74 L 1030 184 Q 1030 200 1014 200 L 980 200");
  });

  it("uses square corners when the branch is too short for a radius", () => {
    expect(trunkPath(98, 0, box(150, 200, 100, 40), 1)).toBe(
      "M 98 0 L 98 200 L 100 200",
    );
  });
});
