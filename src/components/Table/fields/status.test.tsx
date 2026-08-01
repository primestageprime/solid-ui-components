import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { statusCol, geo } from "./status";

afterEach(cleanup);

interface Row {
  operator_kind: string | null;
}

const MAP = {
  operator: { label: "Operator", tone: "accent" as const },
  agent: { label: "Agent", tone: "success" as const },
};

const renderCell = (row: Row) =>
  render(() => (
    <>
      {(statusCol<Row>("operator_kind", MAP).accessor as (
        r: Row,
      ) => JSX.Element)(row)}
    </>
  ));

describe("status field", () => {
  it("derives content-fit geometry from the mapping labels + badge chrome, floored at the label", () => {
    const col = statusCol<Row>("operator_kind", MAP);
    // The static geo stays the col() fallback for custom status-typed cells.
    expect(geo).toEqual({ minCh: 9, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" });
    // Longest mapping label "Operator" (8ch) sets the base; the header
    // "Operator Kind" (13 glyphs × 1.17 tracking → 16ch) floors it. padPx =
    // 18 cell + 18 badge chrome (padding/border/letter-spacing — 2026-07-21).
    expect(col.geo).toEqual({ minCh: 16, maxCh: 16, padPx: 36, css: "calc(16ch + 36px)" });
    expect(col.width).toBe("calc(16ch + 36px)");
    expect(col.align).toBe("right");
  });

  it("width floors at a long header label (ruled 2026-07-21)", () => {
    const col = statusCol<Row>("operator_kind", MAP, {
      header: "% of At-Band Time", // 17ch > the 8ch longest badge label
    });
    expect(col.width).toBe("calc(20ch + 36px)"); // 17 glyphs × 1.17 tracking
    expect(col.geo?.maxCh).toBe(20);
  });

  it("maps a valid value to its badge label and tone variant", () => {
    const { container } = renderCell({ operator_kind: "operator" });
    const badge = container.querySelector(".status-badge--info");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain("Operator");
  });

  it("renders blank for null (no empty markers)", () => {
    const { container } = renderCell({ operator_kind: null });
    expect(container.textContent).toBe("");
  });

  it("renders an unmapped value as quiet muted text, not a badge", () => {
    const { container } = renderCell({ operator_kind: "mystery" });
    expect(container.querySelector(".status-badge")).toBeNull();
    expect(container.querySelector(".sui-field-tone--muted")?.textContent).toBe(
      "mystery",
    );
  });
});
