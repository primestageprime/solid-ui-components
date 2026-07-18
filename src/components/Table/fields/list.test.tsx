import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { listCol } from "./list";
import { geo as textGeo } from "./text";

afterEach(cleanup);

interface Row {
  affected_vessels: string[];
}

const renderCell = (items: string[], max?: number) =>
  render(() => (
    <>
      {(listCol<Row>("affected_vessels", { max }).accessor as (
        r: Row,
      ) => JSX.Element)({ affected_vessels: items })}
    </>
  ));

describe("list field", () => {
  it("uses flowing text geometry and the humanized header", () => {
    const col = listCol<Row>("affected_vessels");
    expect(col.geo).toBe(textGeo);
    expect(col.ellipsis).toBe(true);
  });

  it("joins up to max items with commas, no overflow chrome", () => {
    const { container } = renderCell(["Alpha", "Beta"]);
    expect(container.textContent).toBe("Alpha, Beta");
    expect(container.textContent).not.toContain("more");
  });

  it("collapses overflow into a muted +N more with a full-list tooltip", () => {
    const { container } = renderCell(["A", "B", "C", "D", "E"], 3);
    expect(container.textContent).toContain("A, B, C");
    expect(container.querySelector(".sui-field-tone--muted")?.textContent).toBe(
      " +2 more",
    );
    // Tooltip trigger wraps the cell (full list revealed on hover).
    expect(container.querySelector(".cell-longtext--tooltip")).toBeTruthy();
  });

  it("renders blank for an empty list (no empty markers)", () => {
    const { container } = renderCell([]);
    expect(container.textContent).toBe("");
  });
});
