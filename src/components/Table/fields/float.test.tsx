import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { floatCol, geo } from "./float";

afterEach(cleanup);

// Guards the float field factory: geometry contract, column shape, and that
// the accessor renders a FloatCell honoring the requested precision.

interface Row {
  ratio: number;
}

describe("float field", () => {
  it("geo is a content-fit column capped at 16ch", () => {
    expect(geo).toEqual({ minCh: 6, maxCh: 12, padPx: 18, css: "calc(12ch + 18px)" });
  });

  it("floatCol builds a right-aligned, sortValue-carrying, geometry-carrying column", () => {
    const col = floatCol<Row>("ratio");
    expect(col.id).toBe("ratio");
    expect(col.align).toBe("right");
    expect(col.width).toBe("calc(12ch + 18px)");
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
    expect(col.geo).toBe(geo);
  });

  it("humanizes and centers the header label", () => {
    const col = floatCol<Row>("ratio");
    const { container } = render(() => <>{col.header}</>);
    const th = container.querySelector(".sui-field-th-center");
    expect(th?.textContent).toBe("Ratio");
  });

  it("accessor renders a FloatCell at the default precision of 2", () => {
    const col = floatCol<Row>("ratio");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ ratio: 12.5 })}</>);
    // Display AS GIVEN (ruled 2026-07-22): the value is rendered unchanged, not
    // forced to 2 fraction digits.
    expect(container.querySelector(".cell-float")?.textContent).toBe("12.5");
  });

  it("displays the value AS GIVEN — never rounds, only groups thousands", () => {
    const col = floatCol<Row>("ratio");
    const render1 = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ ratio: 3.14159 })}</>);
    expect(render1.container.querySelector(".cell-float")?.textContent).toBe("3.14159");
    const render2 = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ ratio: 1234567.8 })}</>);
    expect(render2.container.querySelector(".cell-float")?.textContent).toBe("1,234,567.8");
  });
});

// Wave 1 (ruled 2026-07-18): derived source, in-cell suffix, blank nulls.
describe("floatCol — derived source + suffix + blank", () => {
  interface DRow {
    a: number;
    b: number | null;
  }
  const rows: DRow = { a: 3, b: null };

  it("derived fn source shares ONE reader between accessor and sortValue", () => {
    const col = floatCol<DRow>((r) => r.a * 2, { id: "double_a", header: "Double A" });
    expect(col.id).toBe("double_a");
    expect(col.sortValue?.(rows)).toBe(6);
  });

  it("throws without an explicit id on a derived source", () => {
    expect(() => floatCol<DRow>((r) => r.a)).toThrow(/explicit id/);
  });

  it("renders the suffix in muted ink and widens the geometry", () => {
    const col = floatCol<DRow>("a", { suffix: "ppm" });
    expect(col.geo.maxCh).toBe(16); // 12 + "ppm".length + 1
    expect(col.geo.css).toBe("calc(16ch + 18px)");
    const { container } = render(() =>
      (col.accessor as (r: DRow) => never)(rows),
    );
    expect(container.querySelector(".sui-field-suffix")?.textContent).toBe(" ppm");
  });

  it("renders blank for null (ruled 2026-07-18: empty value → empty cell)", () => {
    const col = floatCol<DRow>("b");
    const { container } = render(() =>
      (col.accessor as (r: DRow) => never)(rows),
    );
    expect(container.textContent).toBe("");
  });
});
