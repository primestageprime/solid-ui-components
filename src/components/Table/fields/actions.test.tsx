import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { actionCol, clusterCol, geoFor, ACTION_ICONS } from "./actions";

afterEach(cleanup);

interface Row {
  name: string;
}

describe("actions field module", () => {
  it("ACTION_ICONS maps the known ids to real icons", () => {
    expect(ACTION_ICONS.edit).toBe("edit");
    expect(ACTION_ICONS.delete).toBe("trash");
  });

  it("geoFor derives width from button metrics: geoFor(2) = 5.3rem / 8.6ch", () => {
    expect(geoFor(2)).toEqual({ minCh: 8.6, maxCh: 8.6, css: "4.3rem" });
  });

  it("geoFor(n) is a fixed column scaling with the action count", () => {
    const g = geoFor(3);
    expect(g.css).toBe("6.2rem"); // 3 × 1.4 + 2 × 0.5 + 1
    expect(g.minCh).toBe(g.maxCh); // fixed
    expect(g.minCh).toBe(12.4);
  });

  it("actionCol renders an accessible icon button that fires run(row)", () => {
    const seen: Row[] = [];
    const col = actionCol<Row>("edit", (row) => seen.push(row));
    const row: Row = { name: "Adlai Arnold" };
    const { getByRole } = render(() => <>{(col.accessor as (row: Row) => JSX.Element)(row)}</>);

    const button = getByRole("button", { name: "Edit" });
    expect(button.getAttribute("title")).toBe("Edit");

    fireEvent.click(button);
    expect(seen).toEqual([row]);
  });

  it("clusterCol renders one cell holding n action buttons at cluster geometry", () => {
    const col = clusterCol<Row>([
      actionCol("edit", () => {}),
      actionCol("delete", () => {}),
    ]);
    expect(col.id).toBe("edit+delete");
    expect(col.header).toBe("");
    expect(col.align).toBe("right");
    expect(col.width).toBe("4.3rem");
    expect(col.geo).toEqual(geoFor(2));

    const { getAllByRole } = render(() => (
      <>{(col.accessor as (row: Row) => JSX.Element)({ name: "Bea" })}</>
    ));
    expect(getAllByRole("button")).toHaveLength(2);
  });
});
