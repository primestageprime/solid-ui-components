import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { HeatStream, type HeatStreamItem } from "./HeatStream";

const ITEMS: HeatStreamItem[] = [
  { name: "V1", statuses: { A: "full", B: "missing" } },
  { name: "V2", statuses: { A: "partial" } },
];

const root = (c: HTMLElement) => c.querySelector<HTMLElement>(".jtf-heatstream")!;
const rowCells = (c: HTMLElement) =>
  [
    ...c.querySelectorAll<HTMLElement>(
      ".jtf-heatstream__rows .jtf-heatstream__cell",
    ),
  ];
const rows = (c: HTMLElement) =>
  [...c.querySelectorAll(".jtf-heatstream__rows .jtf-heatstream__row")];

describe("HeatStream", () => {
  it("renders one row per key (default 4) and one cell per item per row", () => {
    const { container } = render(() => <HeatStream items={ITEMS} />);
    expect(rows(container).length).toBe(4); // DEFAULT_KEYS A,B,C,D
    expect(rowCells(container).length).toBe(4 * 2);
  });

  it("respects a custom keys list", () => {
    const { container } = render(() => (
      <HeatStream items={ITEMS} keys={["A", "B"]} />
    ));
    expect(rows(container).length).toBe(2);
    expect(
      [
        ...container.querySelectorAll(
          ".jtf-heatstream__rows .jtf-heatstream__row-label",
        ),
      ].map((l) => l.textContent),
    ).toEqual(["A", "B"]);
  });

  it("labels the item columns with their names", () => {
    const { container } = render(() => <HeatStream items={ITEMS} />);
    expect(
      [...container.querySelectorAll(".jtf-heatstream__col-label")].map(
        (l) => l.textContent,
      ),
    ).toEqual(["V1", "V2"]);
  });

  it("colors each cell by its status, defaulting unset keys to empty", () => {
    const { container } = render(() => (
      <HeatStream items={ITEMS} keys={["A", "B"]} />
    ));
    const cells = rowCells(container); // row A: V1,V2 ; row B: V1,V2
    expect(cells[0].classList.contains("jtf-heatstream__cell--full")).toBe(true);
    expect(cells[1].classList.contains("jtf-heatstream__cell--partial")).toBe(
      true,
    );
    expect(cells[2].classList.contains("jtf-heatstream__cell--missing")).toBe(
      true,
    );
    // V2 has no "B" status → empty.
    expect(cells[3].classList.contains("jtf-heatstream__cell--empty")).toBe(true);
  });

  it("applies the labeled class by default and drops row labels when showLabels is false", () => {
    const labeled = render(() => <HeatStream items={ITEMS} />);
    expect(
      root(labeled.container).classList.contains("jtf-heatstream--labeled"),
    ).toBe(true);

    const bare = render(() => <HeatStream items={ITEMS} showLabels={false} />);
    expect(bare.container.querySelector(".jtf-heatstream__row-label")).toBeNull();
  });

  it("shows the legend only when requested", () => {
    const { container } = render(() => <HeatStream items={ITEMS} showLegend />);
    expect(container.querySelector(".jtf-heatstream__legend")).not.toBeNull();
    const without = render(() => <HeatStream items={ITEMS} />);
    expect(without.container.querySelector(".jtf-heatstream__legend")).toBeNull();
  });

  it("enables fill mode and exposes the max-count CSS variable", () => {
    const { container } = render(() => <HeatStream items={ITEMS} maxItems={9} />);
    const el = root(container);
    expect(el.classList.contains("jtf-heatstream--fill")).toBe(true);
    expect(el.style.getPropertyValue("--jtf-hs-max-count")).toBe("9");
  });

  it("is non-interactive without onItemClick", () => {
    const { container } = render(() => <HeatStream items={ITEMS} />);
    const cell = rowCells(container)[0];
    expect(cell.getAttribute("role")).toBeNull();
    expect(cell.getAttribute("tabindex")).toBeNull();
  });

  it("fires onItemClick with (name, key) on click and Enter", () => {
    const onItemClick = vi.fn();
    const { container } = render(() => (
      <HeatStream items={ITEMS} keys={["A"]} onItemClick={onItemClick} />
    ));
    const cell = rowCells(container)[0]; // row A, V1
    expect(cell.getAttribute("role")).toBe("button");
    fireEvent.click(cell);
    expect(onItemClick).toHaveBeenLastCalledWith("V1", "A");
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(onItemClick).toHaveBeenCalledTimes(2);
  });

  it("renders the compact hover-preview scaffold when there are items", () => {
    const { container } = render(() => (
      <HeatStream items={ITEMS} variant="compact" previewLabel="Berth 3" />
    ));
    expect(root(container).classList.contains("jtf-heatstream--compact")).toBe(
      true,
    );
    const preview = container.querySelector(".jtf-heatstream__preview");
    expect(preview).not.toBeNull();
    expect(preview?.querySelector(".jtf-heatstream__preview-heading")
      ?.textContent).toContain("Berth 3");
    expect(preview?.textContent).toContain("2 vessel calls");
  });
});
