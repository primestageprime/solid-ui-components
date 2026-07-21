import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { geo, intCol } from "./int";

afterEach(cleanup);

interface Row {
  hours: number;
}

describe("int field", () => {
  it("geo is a content-fit column (min < max, capped css width)", () => {
    expect(geo).toEqual({ minCh: 4, maxCh: 9, padPx: 18, css: "calc(9ch + 18px)" });
    expect(geo.minCh).toBeLessThan(geo.maxCh);
  });

  it("intCol builds a right-aligned, sortValue-carrying column carrying its geometry", () => {
    const col = intCol<Row>("hours");
    expect(col.id).toBe("hours");
    expect(col.align).toBe("right");
    expect(col.width).toBe(geo.css);
    expect(col.sortable).toBeUndefined(); // table-level mode flips it (ruled 2026-07-18)
    expect(typeof col.sortValue).toBe("function");
    // "Hours" (5ch) floors minCh above the 4ch data minimum (ruled 2026-07-21).
    expect(col.geo).toEqual({ ...geo, minCh: 5 });
  });

  it("header is the humanized key, centered", () => {
    const { container } = render(() => (
      <>{intCol<Row>("hours").header}</>
    ));
    const th = container.querySelector(".sui-field-th-center");
    expect(th?.textContent).toBe("Hours");
  });

  it("humanizes snake_case keys", () => {
    const { container } = render(() => (
      <>{intCol<{ csv_rows: number }>("csv_rows").header}</>
    ));
    expect(container.querySelector(".sui-field-th-center")?.textContent).toBe("Csv Rows");
  });

  it("width floors at the header label — a column is never narrower than its own name (ruled 2026-07-21)", () => {
    const col = intCol<Row>("hours", { header: "Postal Code" }); // 11ch > 9ch data cap
    expect(col.width).toBe("calc(11ch + 18px)");
    expect(col.geo?.minCh).toBe(11);
    expect(col.geo?.maxCh).toBe(11);
  });

  it("short labels keep the data-driven geometry", () => {
    expect(intCol<Row>("hours").width).toBe(geo.css);
  });

  it("accessor renders a locale-formatted integer", () => {
    const col = intCol<Row>("hours");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ hours: 9_999_999 })}</>);
    expect(container.querySelector(".cell-int")?.textContent).toBe("9,999,999");
  });
});
