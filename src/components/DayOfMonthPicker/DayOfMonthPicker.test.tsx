import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DayOfMonthPicker, createDayOfMonthPicker } from "./DayOfMonthPicker";

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

  it("emits no inline cell-size style (frozen to the CSS var fallback)", () => {
    const { container } = render(() => (
      <DayOfMonthPicker value={null} onChange={() => {}} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--dom-cell-size")).toBe("");
  });

  it("createDayOfMonthPicker bakes defaults", () => {
    const Picker = createDayOfMonthPicker({ max: 7 });
    const { container } = render(() => (
      <Picker value={null} onChange={() => {}} />
    ));
    expect(container.querySelectorAll(".sui-dom-picker__cell").length).toBe(7);
  });

  describe("lastOfMonth mode", () => {
    it("renders days 1..28 plus one wide Last of month cell", () => {
      const { container } = render(() => (
        <DayOfMonthPicker value={null} lastOfMonth onChange={() => {}} />
      ));
      const cells = container.querySelectorAll(".sui-dom-picker__cell");
      expect(cells.length).toBe(29); // 28 days + the last-of-month cell
      expect(cells[27].textContent).toBe("28");
      const last = container.querySelector(".sui-dom-picker__cell--last")!;
      expect(last.textContent).toBe("Last of month");
      expect(last.getAttribute("aria-label")).toBe("Last of month");
    });

    it("selects via onSelectLast and highlights when value is 'last'", () => {
      let gotLast = false;
      const { container } = render(() => (
        <DayOfMonthPicker
          value={"last"}
          lastOfMonth
          onChange={() => {}}
          onSelectLast={() => (gotLast = true)}
        />
      ));
      const last = container.querySelector(".sui-dom-picker__cell--last")!;
      expect(last.className).toMatch(/--selected/);
      expect(last.getAttribute("aria-selected")).toBe("true");
      fireEvent.click(last);
      expect(gotLast).toBe(true);
    });

    it("numeric cells still call onChange and no day exceeds 28", () => {
      let got: number | null = null;
      const { container } = render(() => (
        <DayOfMonthPicker
          value={null}
          lastOfMonth
          onChange={(d) => (got = d)}
        />
      ));
      const cells = container.querySelectorAll(".sui-dom-picker__cell");
      fireEvent.click(cells[27]);
      expect(got).toBe(28);
    });
  });
});
