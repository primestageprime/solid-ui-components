import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { BaseTable } from "./BaseTable";
import { SectionTable } from "./SectionTable";

type Row = { id: string; name: string };
const data: Row[] = [{ id: "a", name: "first" }, { id: "b", name: "second" }];
const columns = [{ id: "name", header: "Name", accessor: "name" as const }];

describe("BaseTable selected row", () => {
  it("marks the selected row, distinct from highlighted, and follows the id", () => {
    const [sel, setSel] = createSignal<string | null>("a");
    const { container } = render(() => (
      <BaseTable data={data} columns={columns} selectedId={sel()} onSelect={setSel} highlighted={(r) => r.id === "b"} />
    ));
    const rows = () => container.querySelectorAll("tbody tr");
    expect(rows()[0].classList.contains("hud-table__row--selected")).toBe(true);
    expect(rows()[0].getAttribute("aria-selected")).toBe("true");
    expect(rows()[1].classList.contains("hud-table__row--selected")).toBe(false);
    expect(rows()[1].classList.contains("hud-table__row--highlighted")).toBe(true);
    fireEvent.click(rows()[1]);
    expect(sel()).toBe("b");
    expect(rows()[1].classList.contains("hud-table__row--selected")).toBe(true);
  });

  it("uses rowId when rows have no id field, and SectionTable passes it through", () => {
    const rows = [{ key: "x", name: "one" }];
    const { container } = render(() => (
      <SectionTable title="T" data={rows} columns={columns} selectedId="x" rowId={(r) => r.key} />
    ));
    expect(container.querySelector("tr.hud-table__row--selected")).not.toBeNull();
  });

  it("leaves aria-selected off a table with no selection model", () => {
    const { container } = render(() => <BaseTable data={data} columns={columns} />);
    expect(container.querySelector("tbody tr")?.hasAttribute("aria-selected")).toBe(false);
  });
});
