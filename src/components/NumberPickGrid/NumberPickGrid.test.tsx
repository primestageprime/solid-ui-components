import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { NumberPickGrid, createNumberPickGrid } from ".";

describe("NumberPickGrid", () => {
  it("renders one pressed cell, the run and the target; a click picks", () => {
    const onPick = vi.fn();
    const { getAllByRole, getByRole } = render(() => (
      <NumberPickGrid
        from={1}
        to={12}
        value={3}
        target={6}
        onPick={onPick}
        label="Last chapter"
      />
    ));
    expect(getByRole("group").getAttribute("aria-label")).toBe("Last chapter");
    const cells = getAllByRole("button");
    expect(cells).toHaveLength(12);
    expect(cells[2].getAttribute("aria-pressed")).toBe("true");
    expect(cells[5].className).toContain("--target");
    expect(cells[5].getAttribute("aria-label")).toBe("6, end of run");
    expect(cells.filter((c) => c.className.includes("--run"))).toHaveLength(3);
    fireEvent.click(cells[7]);
    expect(onPick).toHaveBeenCalledWith(8);
  });

  it("keeps one tab stop on the picked cell; arrows move focus without picking; Enter picks", () => {
    const onPick = vi.fn();
    const { getAllByRole } = render(() => (
      <NumberPickGrid from={1} to={25} value={3} onPick={onPick} />
    ));
    const cells = getAllByRole("button");
    expect(cells.filter((c) => c.tabIndex === 0)).toEqual([cells[2]]);
    cells[2].focus();
    fireEvent.keyDown(cells[2], { key: "ArrowDown" });
    expect(document.activeElement).toBe(cells[12]);
    expect(cells[12].tabIndex).toBe(0);
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(cells[12], { key: "End" });
    expect(document.activeElement).toBe(cells[24]);
  });

  it("createNumberPickGrid bakes the column count", () => {
    const Five = createNumberPickGrid({ columns: 5 });
    const { container } = render(() => <Five from={1} to={5} />);
    expect(
      container.querySelector(".sui-number-pick-grid--cols-5"),
    ).not.toBeNull();
  });
  it("muteBelow greys earlier cells, keeps them pickable and labels them", () => {
    const onPick = vi.fn();
    const { getAllByRole } = render(() => <NumberPickGrid from={1} to={6} value={4} muteBelow={3} onPick={onPick} />);
    const cells = getAllByRole("button");
    expect(cells[0].className).toContain("--muted");
    expect(cells[2].className).not.toContain("--muted");
    expect(cells[1].getAttribute("aria-label")).toBe("2, before your furthest point");
    fireEvent.click(cells[0]);
    expect(onPick).toHaveBeenCalledWith(1);
  });
});
