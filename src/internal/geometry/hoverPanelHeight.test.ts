import { describe, expect, it } from "vitest";
import { hoverPanelHeight } from "./hoverPanelHeight";

// HeatStream's preview metrics — the numbers this helper actually ships with.
const BASE = {
  rowPx: 16,
  chromePx: 46,
  minPx: 200,
  viewportPx: 1000,
  marginPx: 8,
};

describe("hoverPanelHeight", () => {
  it("grows one row at a time so every label keeps its line", () => {
    expect(hoverPanelHeight({ ...BASE, rowCount: 20 })).toBe(20 * 16 + 46);
    expect(hoverPanelHeight({ ...BASE, rowCount: 45 })).toBe(45 * 16 + 46);
    // The regression: 45 rows must not be squeezed into the old 25vh panel.
    expect(hoverPanelHeight({ ...BASE, rowCount: 45 })).toBeGreaterThan(250);
  });

  it("floors short lists so their marks stay big", () => {
    expect(hoverPanelHeight({ ...BASE, rowCount: 4 })).toBe(200);
    expect(hoverPanelHeight({ ...BASE, rowCount: 0 })).toBe(200);
  });

  it("caps at the viewport less both margins", () => {
    expect(hoverPanelHeight({ ...BASE, rowCount: 200 })).toBe(1000 - 16);
  });

  it("lets the viewport beat the floor rather than overflow it", () => {
    // A viewport shorter than minPx: fitting on screen matters more than the
    // floor, so the rows shrink instead of the panel running off the bottom.
    expect(hoverPanelHeight({ ...BASE, rowCount: 4, viewportPx: 120 })).toBe(
      104,
    );
  });

  it("never returns a negative height", () => {
    expect(hoverPanelHeight({ ...BASE, rowCount: 4, viewportPx: 0 })).toBe(0);
  });
});
