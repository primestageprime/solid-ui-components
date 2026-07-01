import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  MonthOfYearPicker,
  createMonthOfYearPicker,
} from "./MonthOfYearPicker";

describe("MonthOfYearPicker", () => {
  it("renders the 12 month cells Jan–Dec", () => {
    const { container } = render(() => (
      <MonthOfYearPicker value={null} onChange={() => {}} />
    ));
    const cells = container.querySelectorAll(".sui-moy-picker__cell");
    expect(cells.length).toBe(12);
    expect(cells[0].textContent).toBe("Jan");
    expect(cells[11].textContent).toBe("Dec");
  });

  it("highlights the selected month", () => {
    const { container } = render(() => (
      <MonthOfYearPicker value={4} onChange={() => {}} />
    ));
    const selected = container.querySelectorAll(
      ".sui-moy-picker__cell--selected",
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("Apr");
    expect(selected[0].getAttribute("aria-selected")).toBe("true");
  });

  it("calls onChange with the 1-based month", () => {
    let got: number | null = null;
    const { container } = render(() => (
      <MonthOfYearPicker value={null} onChange={(m) => (got = m)} />
    ));
    fireEvent.click(container.querySelectorAll(".sui-moy-picker__cell")[1]);
    expect(got).toBe(2); // Feb
  });

  it("createMonthOfYearPicker bakes defaults", () => {
    const Picker = createMonthOfYearPicker({ cellSize: "2rem" });
    const { container } = render(() => (
      <Picker value={null} onChange={() => {}} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--moy-cell-size")).toBe("2rem");
  });
});
