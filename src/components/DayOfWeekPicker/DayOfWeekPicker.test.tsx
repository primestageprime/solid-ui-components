import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DayOfWeekPicker, createDayOfWeekPicker } from "./DayOfWeekPicker";

describe("DayOfWeekPicker", () => {
  it("renders 7 day cells labelled Sun..Sat", () => {
    const { container } = render(() => (
      <DayOfWeekPicker value={null} onChange={() => {}} />
    ));
    const cells = container.querySelectorAll(".sui-dow-picker__cell");
    expect(cells.length).toBe(7);
    expect(cells[0].textContent).toBe("Sun");
    expect(cells[6].textContent).toBe("Sat");
  });

  it("highlights the selected day", () => {
    const { container } = render(() => (
      <DayOfWeekPicker value={1} onChange={() => {}} />
    ));
    const selected = container.querySelectorAll(
      ".sui-dow-picker__cell--selected",
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("Mon");
    expect(selected[0].getAttribute("aria-selected")).toBe("true");
  });

  it("calls onChange with the clicked day index (0=Sun..6=Sat)", () => {
    let got: number | null = null;
    const { container } = render(() => (
      <DayOfWeekPicker value={null} onChange={(d) => (got = d)} />
    ));
    const cells = container.querySelectorAll(".sui-dow-picker__cell");
    fireEvent.click(cells[6]);
    expect(got).toBe(6);
  });

  it("renders cells as focusable buttons in a grid", () => {
    const { container } = render(() => (
      <DayOfWeekPicker value={0} onChange={() => {}} />
    ));
    const root = container.firstElementChild!;
    expect(root.getAttribute("role")).toBe("grid");
    const cell = container.querySelector(".sui-dow-picker__cell")!;
    expect(cell.tagName).toBe("BUTTON");
  });

  it("applies the default fixed cell size via shared CSS var", () => {
    const { container } = render(() => (
      <DayOfWeekPicker value={null} onChange={() => {}} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--dom-cell-size")).toBe("3.5rem");
  });

  it("createDayOfWeekPicker bakes defaults", () => {
    const Picker = createDayOfWeekPicker({ cellSize: "4rem" });
    const { container } = render(() => (
      <Picker value={null} onChange={() => {}} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--dom-cell-size")).toBe("4rem");
  });
});
