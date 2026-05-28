import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateAxis } from "./DateAxis";
import { dailyCells, type Cell } from "./cells";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const noopRender = (cell: Cell) => <span>{cell.start.getUTCDate()}</span>;

describe("DateAxis rendering", () => {
  it("renders one cell per item in `cells`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-07"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    expect(container.querySelectorAll(".sui-date-axis__cell")).toHaveLength(7);
  });

  it("marks the cell whose [start, end) contains `today`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    const todayCells = container.querySelectorAll(".sui-date-axis__cell--today");
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].getAttribute("aria-current")).toBe("date");
  });

  it("provides the right cell context to renderCell", () => {
    const seen: { index: number; isToday: boolean; isSelected: boolean }[] = [];
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    render(() => (
      <DateAxis
        cells={cells}
        today={d("2026-05-02")}
        selected={2}
        renderCell={(_cell, ctx) => {
          seen.push({ index: ctx.index, isToday: ctx.isToday, isSelected: ctx.isSelected });
          return <span />;
        }}
      />
    ));
    expect(seen).toEqual([
      { index: 0, isToday: false, isSelected: false },
      { index: 1, isToday: true, isSelected: false },
      { index: 2, isToday: false, isSelected: true },
    ]);
  });
});

describe("DateAxis interactivity", () => {
  it("is passive (columnheader, not focusable) when onCellClick is omitted", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis cells={cells} renderCell={noopRender} />
    ));
    const cell = container.querySelector(".sui-date-axis__cell")!;
    expect(cell.getAttribute("role")).toBe("columnheader");
    expect(cell.getAttribute("tabindex")).toBeNull();
  });

  it("fires onCellClick with index and cell on click and on Enter / Space", () => {
    const onCellClick = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis cells={cells} renderCell={noopRender} onCellClick={onCellClick} />
    ));
    const firstCell = container.querySelector(".sui-date-axis__cell")!;
    fireEvent.click(firstCell);
    fireEvent.keyDown(firstCell, { key: "Enter" });
    fireEvent.keyDown(firstCell, { key: " " });
    expect(onCellClick).toHaveBeenCalledTimes(3);
    expect(onCellClick.mock.calls[0][0]).toBe(0);
    expect(onCellClick.mock.calls[0][1]).toBe(cells[0]);
  });

  it("marks the selected cell with the --selected modifier", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} selected={3} renderCell={noopRender} />
    ));
    const selected = container.querySelectorAll(".sui-date-axis__cell--selected");
    expect(selected).toHaveLength(1);
    expect(Array.from(container.querySelectorAll(".sui-date-axis__cell")).indexOf(selected[0])).toBe(3);
  });
});

describe("DateAxis with payload-carrying cells", () => {
  it("preserves consumer-attached cell properties through renderCell", () => {
    type Tagged = Cell & { tag: string };
    const cells: Tagged[] = dailyCells(d("2026-05-01"), d("2026-05-03")).map((c, i) => ({
      ...c,
      tag: `t${i}`,
    }));
    const tags: string[] = [];
    render(() => (
      <DateAxis<Tagged>
        cells={cells}
        renderCell={(cell) => {
          tags.push(cell.tag);
          return <span>{cell.tag}</span>;
        }}
      />
    ));
    expect(tags).toEqual(["t0", "t1", "t2"]);
  });
});
