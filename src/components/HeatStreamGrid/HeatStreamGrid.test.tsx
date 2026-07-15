import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { HeatStreamGrid } from "./HeatStreamGrid";
import type { HeatStreamItem } from "../HeatStream";
import type { SelectionStore } from "../Table/types";

const rows = ["asset-1", "asset-2"];
const columns = ["morning", "evening"];
const keys = ["A", "B"];

// A cell has items only for asset-1/morning, so we can assert empty vs. filled.
const data = (row: string, col: string): HeatStreamItem[] =>
  row === "asset-1" && col === "morning"
    ? [{ name: "x", statuses: { A: "full" } }]
    : [];

const makeStore = (): SelectionStore<string> => {
  const [selected, setSelected] = createSignal(new Set<string>());
  return { selected, setSelected };
};

describe("HeatStreamGrid", () => {
  it("renders a table with a header per column and a row per row key", () => {
    const { container } = render(() => (
      <HeatStreamGrid rows={rows} columns={columns} keys={keys} data={data} />
    ));
    const root = container.querySelector(".jtf-heatstream-grid")!;
    expect(root.querySelector("table")).toBeTruthy();
    // Column headers carry text; the leading corner header is blank.
    expect(root.textContent).toContain("morning");
    expect(root.textContent).toContain("evening");
    expect(root.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("renders row labels", () => {
    const { container } = render(() => (
      <HeatStreamGrid rows={rows} columns={columns} keys={keys} data={data} />
    ));
    expect(container.textContent).toContain("asset-1");
    expect(container.textContent).toContain("asset-2");
  });

  it("fires onCellClick for a non-empty cell", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <HeatStreamGrid
        rows={rows}
        columns={columns}
        keys={keys}
        data={data}
        onCellClick={onCellClick}
      />
    ));
    // The only populated cell renders a HeatStream inside it.
    const filledCell = container
      .querySelector(".jtf-heatstream")!
      .closest("td")!;
    fireEvent.click(filledCell);
    expect(onCellClick).toHaveBeenCalledWith("asset-1", "morning");
  });

  it("adds the selectable modifier class when a selection store is passed", () => {
    const store = makeStore();
    const { container } = render(() => (
      <HeatStreamGrid
        rows={rows}
        columns={columns}
        keys={keys}
        data={data}
        selectionStore={store}
      />
    ));
    expect(
      container
        .querySelector(".jtf-heatstream-grid")!
        .classList.contains("jtf-heatstream-grid--selectable"),
    ).toBe(true);
  });

  it("selecting a cell writes its key into the selection store", () => {
    const store = makeStore();
    const { container } = render(() => (
      <HeatStreamGrid
        rows={rows}
        columns={columns}
        keys={keys}
        data={data}
        selectionStore={store}
      />
    ));
    const filledCell = container
      .querySelector(".jtf-heatstream")!
      .closest("td")!;
    fireEvent.click(filledCell);
    expect(store.selected().has("asset-1:morning")).toBe(true);
  });
});
