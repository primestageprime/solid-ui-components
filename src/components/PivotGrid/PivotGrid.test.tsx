import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { PivotGrid } from "./PivotGrid";
import { HeatPivotGrid } from "./HeatPivotGrid";
import { LinkPivotGrid } from "./LinkPivotGrid";

type RowId = "rA" | "rB";
type ColId = "cA" | "cB";

interface Cell {
  value: number;
}

const baseProps = {
  rows: ["rA", "rB"] as const,
  columns: ["cA", "cB"] as const,
  rowLabel: (r: RowId) => `Row ${r}`,
  colLabel: (c: ColId) => `Col ${c}`,
  cell: (r: RowId, c: ColId): Cell | null => ({
    value: r.charCodeAt(1) + c.charCodeAt(1),
  }),
  renderCell: (cell: Cell) => <span>{cell.value}</span>,
};

describe("PivotGrid rendering", () => {
  it("renders a table with the row + column labels in thead/tbody", () => {
    const { container } = render(() => <PivotGrid {...baseProps} />);
    const table = container.querySelector("table");
    expect(table).toBeTruthy();
    // 2 columns + corner cell = 3 thead cells
    expect(container.querySelectorAll("thead th").length).toBe(3);
    // 2 rows × (1 row-header + 2 body cells) = 2 row-header + 4 body cells
    expect(container.querySelectorAll("tbody th").length).toBe(2);
    expect(container.querySelectorAll("tbody td").length).toBe(4);
  });

  it("calls colLabel + rowLabel + cell + renderCell for each axis", () => {
    const rowLabel = vi.fn((r: RowId) => `R-${r}`);
    const colLabel = vi.fn((c: ColId) => `C-${c}`);
    const cell = vi.fn((_r: RowId, _c: ColId): Cell | null => ({ value: 1 }));
    const renderCell = vi.fn((c: Cell) => <span>{c.value}</span>);

    render(() => (
      <PivotGrid
        {...baseProps}
        rowLabel={rowLabel}
        colLabel={colLabel}
        cell={cell}
        renderCell={renderCell}
      />
    ));

    expect(rowLabel).toHaveBeenCalledTimes(2);
    expect(colLabel).toHaveBeenCalledTimes(2);
    // 2 rows × 2 cols = 4 cell lookups
    expect(cell).toHaveBeenCalledTimes(4);
    expect(renderCell).toHaveBeenCalledTimes(4);
  });

  it("renders JSX from rowLabel/colLabel as elements, not stringified", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        rowLabel={(r: RowId) => <strong class="row-label">{r}</strong>}
        colLabel={(c: ColId) => <em class="col-label">{c}</em>}
      />
    ));
    expect(container.querySelectorAll("strong.row-label").length).toBe(2);
    expect(container.querySelectorAll("em.col-label").length).toBe(2);
  });

  it("renders the emptyCell placeholder for null cells", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} cell={() => null} />
    ));
    const bodyCells = container.querySelectorAll("tbody td");
    bodyCells.forEach((td) => {
      expect(td.textContent).toBe("—");
    });
  });

  it("uses a custom emptyCell when provided", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} cell={() => null} emptyCell={<i>n/a</i>} />
    ));
    const bodyCells = container.querySelectorAll("tbody td");
    bodyCells.forEach((td) => {
      expect(td.textContent).toBe("n/a");
    });
  });

  it("renders the cornerLabel (default empty string)", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} cornerLabel="↓ rows / cols →" />
    ));
    const corner = container.querySelector("thead th:first-child");
    expect(corner?.textContent).toBe("↓ rows / cols →");
  });
});

describe("PivotGrid interactivity", () => {
  it("wraps cells in <a> when cellHref returns a string", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={(r, c) => `/explore?row=${r}&col=${c}`}
      />
    ));
    const links = container.querySelectorAll("tbody td a");
    expect(links.length).toBe(4);
    expect(links[0]?.getAttribute("href")).toBe("/explore?row=rA&col=cA");
  });

  it("renders a non-interactive td when cellHref returns undefined for that cell", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={(r) => (r === "rA" ? "/x" : undefined)}
      />
    ));
    const rows = container.querySelectorAll("tbody tr");
    // rA row: 2 cells with <a>
    expect(rows[0]?.querySelectorAll("a").length).toBe(2);
    // rB row: 0 cells with <a>, 0 with <button>
    expect(rows[1]?.querySelectorAll("a").length).toBe(0);
    expect(rows[1]?.querySelectorAll("button").length).toBe(0);
  });

  it("wraps cells in <button> when onCellClick is set and no href", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <PivotGrid {...baseProps} onCellClick={onCellClick} />
    ));
    const buttons = container.querySelectorAll("tbody td button");
    expect(buttons.length).toBe(4);

    fireEvent.click(buttons[0]!);
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(onCellClick).toHaveBeenCalledWith("rA", "cA", { value: 130 });
  });

  it("prefers cellHref over onCellClick when both are set and href returns a string", () => {
    const onCellClick = vi.fn();
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        // Hash href: this test clicks the anchor, and jsdom throws
        // "Not implemented: navigation" for non-hash hrefs it tries to follow.
        // A hash href exercises the same <a>-precedence path without navigating.
        cellHref={() => "#/x"}
        onCellClick={onCellClick}
      />
    ));
    expect(container.querySelectorAll("tbody td a").length).toBe(4);
    expect(container.querySelectorAll("tbody td button").length).toBe(0);
    fireEvent.click(container.querySelector("tbody td a")!);
    // <a> default-prevented or not — onCellClick must not fire for href cells
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("renders the cellTitle as the native title attribute on interactive cells", () => {
    const { container } = render(() => (
      <PivotGrid
        {...baseProps}
        cellHref={() => "/x"}
        cellTitle={(r, c) => `${r}/${c}`}
      />
    ));
    const a = container.querySelector("tbody td a");
    expect(a?.getAttribute("title")).toBe("rA/cA");
  });
});

describe("PivotGrid heat coloring", () => {
  it("applies background-color when getCellHeat returns a non-null number", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 1.0} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toMatch(/background-color/);
  });

  it("does not apply background-color when getCellHeat returns null", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => null} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).not.toMatch(/background-color/);
  });

  it("uses sqrt ramp by default — heat 0.25 maps to alpha 0.35 (midway)", () => {
    // sqrt(0.25) = 0.5 → alpha = 0.1 + 0.5 * 0.5 = 0.35
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 0.25} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("0.35");
  });

  it("uses a linear ramp when heatRamp={(v) => v} is passed (heat 0.5 → alpha 0.35)", () => {
    // linear(0.5) = 0.5 → alpha = 0.1 + 0.5 * 0.5 = 0.35
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 0.5} heatRamp={(v) => v} />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("0.35");
  });

  it("respects the custom heatRgb prop in the rgba() string", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} getCellHeat={() => 1.0} heatRgb="0, 128, 255" />
    ));
    const td = container.querySelector("tbody td");
    const inline = td?.getAttribute("style") ?? "";
    expect(inline).toContain("rgba(0, 128, 255");
  });
});

describe("PivotGrid layout modifiers", () => {
  it("adds the compact class when compact={true}", () => {
    const { container } = render(() => <PivotGrid {...baseProps} compact />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toMatch(/sui-pivot-grid/);
    expect(wrapper?.className).toMatch(/sui-pivot-grid--compact/);
  });

  it("merges the consumer class with the base class", () => {
    const { container } = render(() => (
      <PivotGrid {...baseProps} class="my-grid" />
    ));
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toMatch(/sui-pivot-grid/);
    expect(wrapper?.className).toMatch(/my-grid/);
  });
});

describe("HeatPivotGrid (curried variant)", () => {
  it("forwards props to PivotGrid and renders with heat applied", () => {
    const { container } = render(() => (
      <HeatPivotGrid {...baseProps} getCellHeat={() => 1.0} />
    ));
    expect(container.querySelector("table")).toBeTruthy();
    const td = container.querySelector("tbody td");
    expect(td?.getAttribute("style") ?? "").toMatch(/background-color/);
  });
});

describe("LinkPivotGrid (curried variant)", () => {
  it("forwards props to PivotGrid and renders cells as links", () => {
    const { container } = render(() => (
      <LinkPivotGrid {...baseProps} cellHref={() => "/x"} />
    ));
    expect(container.querySelectorAll("tbody td a").length).toBe(4);
  });
});
