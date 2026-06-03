import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import {
  DayOfMonthPicker,
  createDayOfMonthPicker,
} from "./DayOfMonthPicker";

describe("DayOfMonthPicker", () => {
  it("renders 31 day cells by default", () => {
    const { container } = render(() => (
      <DayOfMonthPicker value={null} onChange={() => {}} />
    ));
    const cells = container.querySelectorAll(".sui-dom-picker__cell");
    expect(cells.length).toBe(31);
    expect(cells[0].textContent).toBe("1");
    expect(cells[30].textContent).toBe("31");
  });

  it("respects the max prop", () => {
    const { container } = render(() => (
      <DayOfMonthPicker value={null} max={28} onChange={() => {}} />
    ));
    expect(container.querySelectorAll(".sui-dom-picker__cell").length).toBe(28);
  });

  it("highlights the selected day", () => {
    const { container } = render(() => (
      <DayOfMonthPicker value={9} onChange={() => {}} />
    ));
    const selected = container.querySelectorAll(
      ".sui-dom-picker__cell--selected",
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("9");
    expect(selected[0].getAttribute("aria-selected")).toBe("true");
  });

  it("calls onChange with the clicked day", () => {
    let got: number | null = null;
    const { container } = render(() => (
      <DayOfMonthPicker value={null} onChange={(d) => (got = d)} />
    ));
    const cells = container.querySelectorAll(".sui-dom-picker__cell");
    fireEvent.click(cells[14]);
    expect(got).toBe(15);
  });

  it("renders cells as focusable buttons in a grid", () => {
    const { container } = render(() => (
      <DayOfMonthPicker value={1} onChange={() => {}} />
    ));
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/sui-dom-picker/);
    const cell = container.querySelector(".sui-dom-picker__cell")!;
    expect(cell.tagName).toBe("BUTTON");
  });

  it("createDayOfMonthPicker bakes defaults", () => {
    const Picker = createDayOfMonthPicker({ max: 7 });
    const { container } = render(() => (
      <Picker value={null} onChange={() => {}} />
    ));
    expect(container.querySelectorAll(".sui-dom-picker__cell").length).toBe(7);
  });
});
