import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BaseTable } from "./BaseTable";
import type { TableColumn, TableRowSpan } from "./types";

interface Row {
  week: string;
  calls: number;
  a: number;
  b: number;
  c: number;
  partial?: boolean;
}

const COLUMNS: TableColumn<Row>[] = [
  { id: "week", header: "Week", accessor: "week" },
  { id: "calls", header: "Calls", accessor: "calls" },
  { id: "a", header: "A", accessor: "a" },
  { id: "b", header: "B", accessor: "b" },
  { id: "c", header: "C", accessor: "c" },
];

const DATA: Row[] = [
  { week: "W1", calls: 3, a: 1, b: 2, c: 3 },
  { week: "W2", calls: 5, a: 4, b: 5, c: 6, partial: true },
];

const bodyRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".hud-table__body .hud-table__row"));

describe("BaseTable spanRow (tail-collapse)", () => {
  it("renders all cells normally when spanRow is absent", () => {
    const { container } = render(() => (
      <BaseTable data={DATA} columns={COLUMNS} />
    ));
    const rows = bodyRows(container);
    expect(rows[0].querySelectorAll("td").length).toBe(5);
    expect(container.querySelector(".hud-table__cell--span")).toBeNull();
  });

  it("collapses the tail from fromColumnId into one spanning cell", () => {
    const spanRow = (row: Row): TableRowSpan | null =>
      row.partial
        ? { fromColumnId: "a", content: <span>2 of 5 evaluated</span> }
        : null;

    const { container, getByText } = render(() => (
      <BaseTable data={DATA} columns={COLUMNS} spanRow={spanRow} />
    ));
    const rows = bodyRows(container);

    // Normal row: 5 cells, no span.
    expect(rows[0].querySelectorAll("td").length).toBe(5);
    expect(rows[0].querySelector(".hud-table__cell--span")).toBeNull();

    // Partial row: 2 leading cells + 1 spanning cell = 3 <td>.
    const tds = rows[1].querySelectorAll("td");
    expect(tds.length).toBe(3);
    const span = rows[1].querySelector(
      ".hud-table__cell--span",
    ) as HTMLTableCellElement;
    expect(span).not.toBeNull();
    expect(span.colSpan).toBe(3); // columns.length(5) - fromIndex(2)
    expect(getByText("2 of 5 evaluated")).toBeTruthy();
    // Leading cells are the first two columns' values.
    expect(tds[0].textContent).toBe("W2");
    expect(tds[1].textContent).toBe("5");
  });

  it("includes the rowActions column in the span colspan", () => {
    const spanRow = (row: Row): TableRowSpan | null =>
      row.partial ? { fromColumnId: "a", content: <span>partial</span> } : null;

    const { container } = render(() => (
      <BaseTable
        data={DATA}
        columns={COLUMNS}
        spanRow={spanRow}
        rowActions={() => <button>Run</button>}
      />
    ));
    const rows = bodyRows(container);

    // Normal row gains a trailing actions cell → 6 cells.
    expect(rows[0].querySelectorAll("td").length).toBe(6);

    // Partial row: 2 leading + 1 span (no separate actions cell); colspan = 3 + 1.
    const tds = rows[1].querySelectorAll("td");
    expect(tds.length).toBe(3);
    expect(rows[1].querySelector(".hud-table__actions-cell")).toBeNull();
    const span = rows[1].querySelector(
      ".hud-table__cell--span",
    ) as HTMLTableCellElement;
    expect(span.colSpan).toBe(4);
  });

  it("falls back to normal rendering when fromColumnId is unknown", () => {
    const spanRow = (): TableRowSpan => ({
      fromColumnId: "nope",
      content: <span>x</span>,
    });
    const { container } = render(() => (
      <BaseTable data={DATA} columns={COLUMNS} spanRow={spanRow} />
    ));
    const rows = bodyRows(container);
    expect(rows[1].querySelectorAll("td").length).toBe(5);
    expect(container.querySelector(".hud-table__cell--span")).toBeNull();
  });
});
