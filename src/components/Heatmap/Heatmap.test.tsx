import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  Heatmap,
  HeatmapMulti,
  type HeatmapMultiRow,
  type HeatmapRow,
} from "./Heatmap";

const ROWS: HeatmapRow[] = [
  {
    id: "r1",
    label: "Row 1",
    cells: [
      { id: "c1", value: 1, status: "full" },
      { id: "c2", value: 0, status: "missing" },
    ],
  },
  {
    id: "r2",
    label: "Row 2",
    cells: [{ id: "c3", value: 0.5, status: "partial" }],
  },
];

const cells = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>(".jtf-heatmap__cell")];

describe("Heatmap", () => {
  it("renders a row (with label) per row and a status-classed cell per cell", () => {
    const { container } = render(() => <Heatmap rows={ROWS} />);
    expect(container.querySelectorAll(".jtf-heatmap__row").length).toBe(2);
    expect(
      [...container.querySelectorAll(".jtf-heatmap__row-label")].map(
        (l) => l.textContent,
      ),
    ).toEqual(["Row 1", "Row 2"]);
    expect(cells(container).length).toBe(3);
    expect(cells(container)[0].classList.contains("jtf-heatmap__cell--full")).toBe(
      true,
    );
  });

  it("applies the variant modifier class", () => {
    const { container } = render(() => <Heatmap rows={ROWS} variant="compact" />);
    expect(
      container.querySelector(".jtf-heatmap")?.classList.contains(
        "jtf-heatmap--compact",
      ),
    ).toBe(true);
  });

  it("shows the legend only when requested and not in sparkline variant", () => {
    const withLegend = render(() => <Heatmap rows={ROWS} showLegend />);
    expect(withLegend.container.querySelector(".jtf-heatmap__legend")).not.toBeNull();

    const sparkline = render(() => (
      <Heatmap rows={ROWS} showLegend variant="sparkline" />
    ));
    expect(sparkline.container.querySelector(".jtf-heatmap__legend")).toBeNull();
  });

  it("renders a column header only when columnLabels are given (and not sparkline)", () => {
    const { container } = render(() => (
      <Heatmap rows={ROWS} columnLabels={["Mon", "Tue"]} />
    ));
    expect(
      [...container.querySelectorAll(".jtf-heatmap__header-cell")].map(
        (c) => c.textContent,
      ),
    ).toEqual(["Mon", "Tue"]);
  });

  it("omits row labels in the sparkline variant", () => {
    const { container } = render(() => <Heatmap rows={ROWS} variant="sparkline" />);
    expect(container.querySelector(".jtf-heatmap__row-label")).toBeNull();
  });

  it("adds a title tooltip only when showTooltips is set", () => {
    const withTip = render(() => <Heatmap rows={ROWS} showTooltips />);
    expect(cells(withTip.container)[0].getAttribute("title")).toBe("Row 1: 1");

    const without = render(() => <Heatmap rows={ROWS} />);
    expect(cells(without.container)[0].getAttribute("title")).toBeNull();
  });

  it("is non-interactive without onCellClick", () => {
    const { container } = render(() => <Heatmap rows={ROWS} />);
    const cell = cells(container)[0];
    expect(cell.getAttribute("role")).toBeNull();
    expect(cell.getAttribute("tabindex")).toBeNull();
  });

  it("fires onCellClick on click and on Enter/Space when interactive", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <Heatmap rows={ROWS} onCellClick={onCellClick} />
    ));
    const cell = cells(container)[0];
    expect(cell.getAttribute("role")).toBe("button");
    expect(cell.getAttribute("tabindex")).toBe("0");
    fireEvent.click(cell);
    expect(onCellClick).toHaveBeenLastCalledWith("r1", "c1");
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(onCellClick).toHaveBeenLastCalledWith("r1", "c1");
    fireEvent.keyDown(cell, { key: " " });
    expect(onCellClick).toHaveBeenCalledTimes(3);
  });
});

describe("HeatmapMulti", () => {
  const rows: HeatmapMultiRow[] = [
    {
      id: "vessel-1",
      label: "Vessel 1",
      cells: [{ id: "call-1", categories: { Nav: "full", Cargo: "missing" } }],
    },
  ];

  it("renders one bar per category label", () => {
    const { container } = render(() => (
      <HeatmapMulti rows={rows} categoryLabels={["Nav", "Cargo"]} />
    ));
    expect(container.querySelectorAll(".jtf-heatmap-multi__bar").length).toBe(2);
  });

  it("dims a full bar to 0.4 opacity when a sibling category has errors", () => {
    const { container } = render(() => (
      <HeatmapMulti rows={rows} categoryLabels={["Nav", "Cargo"]} />
    ));
    const bars = container.querySelectorAll<HTMLElement>(
      ".jtf-heatmap-multi__bar",
    );
    // Nav is "full" but Cargo is "missing" (an error) → the full bar dims.
    const navBar = [...bars].find((b) =>
      b.classList.contains("jtf-heatmap-multi__bar--full"),
    )!;
    expect(navBar.style.opacity).toBe("0.4");
  });

  it("fires onCellClick with row and cell ids", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <HeatmapMulti
        rows={rows}
        categoryLabels={["Nav", "Cargo"]}
        onCellClick={onCellClick}
      />
    ));
    fireEvent.click(container.querySelector(".jtf-heatmap-multi__cell")!);
    expect(onCellClick).toHaveBeenCalledWith("vessel-1", "call-1");
  });
});
