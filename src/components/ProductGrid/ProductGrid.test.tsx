import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  ProductGrid,
  type ProductGridItem,
  type ProductGridSelection,
  isSolutionSatisfied,
} from "./ProductGrid";

describe("isSolutionSatisfied", () => {
  it("is true only when there is done work and nothing outstanding", () => {
    expect(isSolutionSatisfied({ todo: 0, doing: 0, done: 3 })).toBe(true);
  });

  it("is false with any todo or doing remaining", () => {
    expect(isSolutionSatisfied({ todo: 1, doing: 0, done: 3 })).toBe(false);
    expect(isSolutionSatisfied({ todo: 0, doing: 2, done: 3 })).toBe(false);
  });

  it("is false with no done work, or when undefined", () => {
    expect(isSolutionSatisfied({ todo: 0, doing: 0, done: 0 })).toBe(false);
    expect(isSolutionSatisfied(undefined)).toBe(false);
  });
});

// A minimal grid: one area "A", one focus "F", a solution above the line and
// a need below it that the solution satisfies.
const items: ProductGridItem[] = [
  {
    id: "sol1",
    area: "A",
    focus: "F",
    position: "above",
    shortName: "Solution One",
    description: "the solution",
    work: { todo: 0, doing: 0, done: 5 }, // satisfied
  },
  {
    id: "need1",
    area: "A",
    focus: "F",
    position: "below",
    shortName: "Need One",
    description: "the need",
    solvedBy: ["sol1"],
  },
];
const areaOrder = ["A"];

const cardByText = (text: string) =>
  [...document.querySelectorAll<HTMLElement>(".sui-product-grid-card")].find(
    (c) => c.textContent?.includes(text),
  )!;

describe("ProductGrid", () => {
  it("renders a card per item using its shortName", () => {
    render(() => <ProductGrid items={items} areaOrder={areaOrder} />);
    expect(cardByText("Solution One")).toBeTruthy();
    expect(cardByText("Need One")).toBeTruthy();
  });

  it("marks a below need as met when its solving solution is satisfied", () => {
    render(() => <ProductGrid items={items} areaOrder={areaOrder} />);
    // need1.solvedBy = [sol1], and sol1 is satisfied (done>0, none outstanding).
    expect(cardByText("Need One").hasAttribute("data-met")).toBe(true);
  });

  it("does not mark the need met when the solution still has outstanding work", () => {
    const unfinished = items.map((it) =>
      it.id === "sol1" ? { ...it, work: { todo: 2, doing: 0, done: 1 } } : it,
    );
    render(() => <ProductGrid items={unfinished} areaOrder={areaOrder} />);
    expect(cardByText("Need One").hasAttribute("data-met")).toBe(false);
  });

  it("emits a controlled selection change when a card is clicked", () => {
    const onSelectionChange = vi.fn();
    render(() => (
      <ProductGrid
        items={items}
        areaOrder={areaOrder}
        selection={null}
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(cardByText("Solution One"));
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: "item", id: "sol1" });
  });

  it("toggles a controlled selection back off on a second click", () => {
    const onSelectionChange = vi.fn();
    render(() => (
      <ProductGrid
        items={items}
        areaOrder={areaOrder}
        selection={{ kind: "item", id: "sol1" }}
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(cardByText("Solution One"));
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it("selecting a solution also highlights the needs it solves", () => {
    const [sel, setSel] = createSignal<ProductGridSelection>(null);
    render(() => (
      <ProductGrid
        items={items}
        areaOrder={areaOrder}
        selection={sel()}
        onSelectionChange={setSel}
      />
    ));
    fireEvent.click(cardByText("Solution One"));
    // Both the solution and the need referencing it get selected.
    expect(cardByText("Solution One").hasAttribute("data-selected")).toBe(true);
    expect(cardByText("Need One").hasAttribute("data-selected")).toBe(true);
  });

  it("uncontrolled mode tracks its own selection", () => {
    render(() => <ProductGrid items={items} areaOrder={areaOrder} />);
    expect(cardByText("Solution One").hasAttribute("data-selected")).toBe(false);
    fireEvent.click(cardByText("Solution One"));
    expect(cardByText("Solution One").hasAttribute("data-selected")).toBe(true);
  });
});
