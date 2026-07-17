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
    expect(geo).toEqual({ minCh: 8, maxCh: 14, css: "14ch" });
    expect(geo.minCh).toBeLessThan(geo.maxCh);
  });

  it("intCol builds a right-aligned, sortable column carrying its geometry", () => {
    const col = intCol<Row>("hours");
    expect(col.id).toBe("hours");
    expect(col.align).toBe("right");
    expect(col.width).toBe(geo.css);
    expect(col.sortable).toBe(true);
    expect(col.geo).toBe(geo);
  });

  it("header is the humanized key, centered", () => {
    const { container } = render(() => (
      <>{intCol<Row>("hours").header}</>
    ));
    const th = container.querySelector(".sui-field-th-center");
    expect(th?.textContent).toBe("Hours");
  });

  it("accessor renders a locale-formatted integer", () => {
    const col = intCol<Row>("hours");
    const { container } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)({ hours: 9_999_999 })}</>);
    expect(container.querySelector(".cell-int")?.textContent).toBe("9,999,999");
  });
});
