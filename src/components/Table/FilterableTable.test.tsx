// ============================================
// FilterableTable is 8 lines of wiring, and every one of its decisions is about
// WHERE a prop lands — which is exactly what a render-and-look test cannot see:
//
//   • `filterPlaceholder` is split OUT, so it reaches TableQuickFilter and must
//     NOT reach BaseTable.
//   • `fill` is deliberately NOT split out, so it reaches BOTH — the wrapper
//     flex-fills so the table has a concrete height to scroll within, and the
//     table fills too. Splitting it would silently break scrolling.
//   • the children callback is called ONCE with the filtered ACCESSOR, so
//     typing updates the table's data instead of remounting it.
//
// This suite therefore asserts the wiring, not the markup. FilterableTable owns
// no DOM of its own — asserting on rendered structure would mostly be testing
// BaseTable and TableQuickFilter, which have their own suites.
// ============================================
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { FilterableTable } from "./FilterableTable";
import type { TableColumn } from "./types";

interface Row {
  name: string;
  region: string;
}

const COLUMNS: TableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "region", header: "Region", accessor: "region" },
];

const DATA: Row[] = [
  { name: "Engine-1", region: "north" },
  { name: "Engine-2", region: "south" },
  { name: "Generator-A", region: "north" },
];

const filterInput = (container: HTMLElement) =>
  container.querySelector(".hud-table-quickfilter__input") as HTMLInputElement;

const bodyRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".hud-table__body .hud-table__row"));

describe("FilterableTable composition", () => {
  it("renders the filter toolbar above the table", () => {
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    expect(filterInput(container)).not.toBeNull();
    expect(bodyRows(container).length).toBe(3);
  });

  it("typing filters the table's rows", () => {
    // End-to-end proof that `data` reaches the filter and `filtered()` reaches
    // the table. Wiring either side to the wrong source renders all three rows
    // regardless, which looks correct until someone types.
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    fireEvent.input(filterInput(container), { target: { value: "south" } });
    const rows = bodyRows(container);
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain("Engine-2");
  });

  it("clearing the filter restores every row", () => {
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    const input = filterInput(container);
    fireEvent.input(input, { target: { value: "south" } });
    expect(bodyRows(container).length).toBe(1);
    fireEvent.input(input, { target: { value: "" } });
    expect(bodyRows(container).length).toBe(3);
  });

  it("keeps the table mounted across a filter change", () => {
    // TableQuickFilter's contract is that children are called ONCE with an
    // accessor. If FilterableTable ever passed `filtered()` instead of
    // `filtered`, the table would remount on every keystroke — invisible in a
    // snapshot, but it would drop scroll position and any internal state.
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    const before = container.querySelector(".hud-table");
    fireEvent.input(filterInput(container), { target: { value: "north" } });
    const after = container.querySelector(".hud-table");
    expect(after).toBe(before);
    expect(bodyRows(container).length).toBe(2);
  });
});

describe("FilterableTable prop routing", () => {
  it("filterPlaceholder reaches the filter input", () => {
    const { container } = render(() => (
      <FilterableTable
        data={DATA}
        columns={COLUMNS}
        filterPlaceholder="Filter assets…"
      />
    ));
    expect(filterInput(container).placeholder).toBe("Filter assets…");
  });

  it("falls back to the filter's own default placeholder", () => {
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    expect(filterInput(container).placeholder).toBe("Filter...");
  });

  it("filterPlaceholder does NOT leak through to the table", () => {
    // splitProps consumes it. Leaking it would put an unknown attribute on the
    // table element — harmless-looking, and the kind of thing that only
    // surfaces as a console warning nobody reads.
    const { container } = render(() => (
      <FilterableTable
        data={DATA}
        columns={COLUMNS}
        filterPlaceholder="Filter assets…"
      />
    ));
    const table = container.querySelector(".hud-table");
    expect(table?.hasAttribute("filterPlaceholder")).toBe(false);
    expect(table?.hasAttribute("placeholder")).toBe(false);
  });

  it("fill reaches BOTH the filter wrapper and the table", () => {
    // The one prop deliberately left in `tableProps` as well as read directly.
    // The wrapper needs it to flex-fill so the table has a concrete height to
    // scroll within; the table needs it to fill that height. Wire only one and
    // the table either never scrolls or has no bounded height to scroll in —
    // neither is visible in jsdom layout, so assert the plumbing.
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} fill />
    ));
    expect(
      container.querySelector(".hud-table-quickfilter--fill"),
    ).not.toBeNull();
    expect(container.querySelector(".hud-table--fill")).not.toBeNull();
  });

  it("without fill, neither side is in fill mode", () => {
    const { container } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    expect(container.querySelector(".hud-table-quickfilter--fill")).toBeNull();
    expect(container.querySelector(".hud-table--fill")).toBeNull();
  });

  it("forwards ordinary table props through to BaseTable", () => {
    const { getByText } = render(() => (
      <FilterableTable data={DATA} columns={COLUMNS} />
    ));
    expect(getByText("Region")).toBeTruthy();
  });
});
