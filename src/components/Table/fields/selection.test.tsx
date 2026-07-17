import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { selectionCol, geo } from "./selection";

afterEach(cleanup);

interface Row {
  name: string;
}
const ROWS: Row[] = [{ name: "a" }, { name: "b" }];

const renderCell = (col: ReturnType<typeof selectionCol<Row>>, row: Row) =>
  render(() => (col.accessor as (r: Row) => JSX.Element)(row));

describe("selection field", () => {
  it("factory returns the fixed geometry and an empty header", () => {
    const col = selectionCol<Row>(
      () => false,
      () => {},
    );
    expect(col.geo).toBe(geo);
    expect(geo).toEqual({ minCh: 4.75, maxCh: 4.75, css: "2.125rem" });
    expect(col.id).toBe("selected");
    expect(col.header).toBe("");
  });

  it("renders a checkbox reflecting isSelected", () => {
    const col = selectionCol<Row>(
      (r) => r.name === "a",
      () => {},
    );
    const { container } = renderCell(col, ROWS[0]);
    const box = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(box).toBeTruthy();
    expect(box!.checked).toBe(true);
  });

  it("fires toggle with the row on change", () => {
    let toggled: Row | null = null;
    const col = selectionCol<Row>(
      () => false,
      (r) => {
        toggled = r;
      },
    );
    const { container } = renderCell(col, ROWS[1]);
    const box = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    fireEvent.click(box!);
    expect(toggled).toBe(ROWS[1]);
  });
});
