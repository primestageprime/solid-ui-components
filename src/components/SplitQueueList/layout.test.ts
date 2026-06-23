import { describe, it, expect } from "vitest";
import { computeSplitLayout } from "./layout";

/* The layout calc is total and pure, so exact-equality assertions hold.
 * Fixed rowHeight=40, topMinRows=3 => top floor = 120px unless overridden. */

const base = { rowHeight: 40, topMinRows: 3, seamHeight: 0 } as const;

describe("computeSplitLayout — bottom priority", () => {
  it("gives the bottom all the rows it needs when there is room", () => {
    // 5 unresolved rows want 200px; total 400 leaves 200 for top (>= floor).
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 2,
      unresolvedCount: 5,
    });
    expect(r.bottomHeight).toBe(200);
    expect(r.topHeight).toBe(200);
    expect(r.bottomCollapsed).toBe(false);
  });

  it("caps the bottom so the top keeps its 3-row floor", () => {
    // 10 unresolved want 400px but total is 400; top floor 120 caps bottom 280.
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 8,
      unresolvedCount: 10,
    });
    expect(r.bottomHeight).toBe(280);
    expect(r.topHeight).toBe(120); // exactly the 3-row floor
  });
});

describe("computeSplitLayout — slack absorption", () => {
  it("lets the top grow past 3 rows when the bottom is short", () => {
    // 2 unresolved want 80px; total 400 => top absorbs 320 (8 rows).
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 12,
      unresolvedCount: 2,
    });
    expect(r.bottomHeight).toBe(80);
    expect(r.topHeight).toBe(320);
    expect(r.topVisibleRows).toBe(8); // 320 / 40
    expect(r.topScrolls).toBe(true); // 12 resolved > 8 visible
  });

  it("reports topScrolls=false when all resolved rows fit", () => {
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 3,
      unresolvedCount: 2,
    });
    expect(r.topScrolls).toBe(false);
    expect(r.topVisibleRows).toBe(3);
  });
});

describe("computeSplitLayout — collapse", () => {
  it("collapses the bottom to a thin strip when nothing is unresolved", () => {
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 6,
      unresolvedCount: 0,
      clearStripHeight: 32,
    });
    expect(r.bottomCollapsed).toBe(true);
    expect(r.bottomHeight).toBe(32);
    expect(r.topHeight).toBe(368);
  });

  it("defaults the clear strip to one row height", () => {
    const r = computeSplitLayout({
      ...base,
      totalHeight: 400,
      resolvedCount: 6,
      unresolvedCount: 0,
    });
    expect(r.bottomHeight).toBe(40);
  });
});

describe("computeSplitLayout — seam + degenerate inputs", () => {
  it("subtracts the seam height from the usable area", () => {
    const r = computeSplitLayout({
      rowHeight: 40,
      topMinRows: 3,
      seamHeight: 2,
      totalHeight: 402,
      resolvedCount: 2,
      unresolvedCount: 5,
    });
    // usable 400, bottom wants 200, top gets 200.
    expect(r.topHeight + r.bottomHeight).toBe(400);
    expect(r.bottomHeight).toBe(200);
  });

  it("never returns negative regions for a zero-height container", () => {
    const r = computeSplitLayout({
      ...base,
      totalHeight: 0,
      resolvedCount: 3,
      unresolvedCount: 3,
    });
    expect(r.topHeight).toBeGreaterThanOrEqual(0);
    expect(r.bottomHeight).toBeGreaterThanOrEqual(0);
  });

  it("clamps bottom to usable when the floor exceeds the container", () => {
    // total 80 < floor 120; bottomCap = max(0, 80-120) = 0 => bottom 0.
    const r = computeSplitLayout({
      ...base,
      totalHeight: 80,
      resolvedCount: 3,
      unresolvedCount: 4,
    });
    expect(r.bottomHeight).toBe(0);
    expect(r.topHeight).toBe(80);
  });
});
