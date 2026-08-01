import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { HeatStack, type HeatStackItem } from "./HeatStack";

const items: HeatStackItem[] = [
  { name: "First", statuses: { A: "full", B: "partial" } },
  { name: "Second", statuses: { A: "missing", B: "unknown" } },
];

describe("HeatStack", () => {
  it("renders a header cell per key and a row per item", () => {
    const { container } = render(() => (
      <HeatStack items={items} keys={["A", "B"]} />
    ));
    const root = container.querySelector(".jtf-heatstack")!;
    expect(root.querySelectorAll(".jtf-heatstack__key-label").length).toBe(2);
    expect(root.querySelectorAll(".jtf-heatstack__row").length).toBe(2);
  });

  it("renders each cell with its status modifier class", () => {
    const { container } = render(() => (
      <HeatStack items={items} keys={["A", "B"]} />
    ));
    expect(
      container.querySelectorAll(".jtf-heatstack__cell--full").length,
    ).toBe(1);
    expect(
      container.querySelectorAll(".jtf-heatstack__cell--unknown").length,
    ).toBe(1);
    // Unset keys fall back to "missing".
    expect(
      container.querySelectorAll(".jtf-heatstack__cell--missing").length,
    ).toBe(1);
  });

  it("renders the legend only when showLegend is set", () => {
    const { container: withLegend } = render(() => (
      <HeatStack items={items} showLegend />
    ));
    expect(withLegend.querySelector(".jtf-heatstack__legend")).toBeTruthy();
    const { container: without } = render(() => <HeatStack items={items} />);
    expect(without.querySelector(".jtf-heatstack__legend")).toBeNull();
  });

  it("fires onItemClick with the item name and key", () => {
    const onItemClick = vi.fn();
    const { container } = render(() => (
      <HeatStack items={items} keys={["A"]} onItemClick={onItemClick} />
    ));
    const cell = container.querySelector(".jtf-heatstack__cell")!;
    fireEvent.click(cell);
    expect(onItemClick).toHaveBeenCalledOnce();
    // Rows render in input order — the first rendered cell is the first item.
    expect(onItemClick).toHaveBeenCalledWith("First", "A");
  });

  it("applies the variant modifier class", () => {
    const { container } = render(() => (
      <HeatStack items={items} variant="compact" />
    ));
    expect(
      container
        .querySelector(".jtf-heatstack")!
        .classList.contains("jtf-heatstack--compact"),
    ).toBe(true);
  });
});
