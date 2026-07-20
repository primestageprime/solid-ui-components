import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { linkedCountCol } from "./linked-count";
import { geo } from "./int";
import type { FieldCol } from "./shared";

afterEach(cleanup);

interface Row {
  flow: number | null;
  asset: string;
}

const detailHref = (row: Row): string =>
  `/detail?asset=${row.asset}&bucket=flow`;

const renderCell = (col: FieldCol<Row>, row: Row) =>
  render(() => <>{(col.accessor as (row: Row) => JSX.Element)(row)}</>);

describe("linkedCountCol", () => {
  it("inherits intCol column shape: id, right-align, int geometry, numeric sortValue", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    expect(col.id).toBe("flow");
    expect(col.align).toBe("right");
    expect(col.width).toBe(geo.css);
    expect(col.sortValue?.({ flow: 7, asset: "B-1" })).toBe(7);
  });

  it("a positive count renders the formatted value inside a drill-down link", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: 22, asset: "B-14" });
    const link = container.querySelector("a.sui-field-link");
    expect(link?.getAttribute("href")).toBe("/detail?asset=B-14&bucket=flow");
    expect(link?.querySelector(".cell-int")?.textContent).toBe("22");
  });

  it("a zero count renders the plain cell — never a dead link", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: 0, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector(".cell-int")?.textContent).toBe("0");
  });

  it("a null count renders blank with no link (inherited intCol ruling)", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: null, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("tone applies inside the link", () => {
    const col = linkedCountCol<Row>("flow", {
      href: detailHref,
      tone: (value) => (value > 0 ? "danger" : "default"),
    });
    const { container } = renderCell(col, { flow: 3, asset: "B-14" });
    const link = container.querySelector("a.sui-field-link");
    expect(link?.querySelector(".sui-field-tone--danger")).not.toBeNull();
  });

  it("derived source names its id and gates on the derived value", () => {
    const col = linkedCountCol<Row>((row) => (row.flow ?? 0) * 2, {
      id: "flow_x2",
      header: "Flow ×2",
      href: detailHref,
    });
    expect(col.id).toBe("flow_x2");
    const { container } = renderCell(col, { flow: 0, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
  });
});
