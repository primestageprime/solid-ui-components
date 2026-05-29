import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CalendarGrid } from "./CalendarGrid";

const noop = () => {};

// Render the grid for May 2026 (month index 4). maxDate is mid-day on the 15th.
const renderGrid = (maxDate?: Date, maxRangeDays?: number, pendingStart?: Date) =>
  render(() => (
    <CalendarGrid
      year={() => 2026}
      month={() => 4}
      rangeStart={() => undefined}
      rangeEnd={() => undefined}
      hoveredDate={() => undefined}
      pendingStart={() => pendingStart}
      maxRangeDays={maxRangeDays}
      maxDate={maxDate}
      onDayClick={noop}
      onDayHover={noop}
      onDayHoverEnd={noop}
    />
  ));

// Find the in-month day cell (not an --outside padding cell) whose text is `n`.
const dayCell = (container: HTMLElement, n: number): HTMLElement | undefined =>
  [...container.querySelectorAll<HTMLElement>(".sui-drp__day")].find(
    (el) =>
      el.textContent?.trim() === String(n) &&
      !el.className.includes("sui-drp__day--outside"),
  );

describe("CalendarGrid maxDate", () => {
  const maxDate = new Date(2026, 4, 15, 13, 30);

  it("disables a day after maxDate", () => {
    const { container } = renderGrid(maxDate);
    const cell = dayCell(container, 16)!;
    expect(cell.className).toMatch(/sui-drp__day--disabled/);
    expect(cell.getAttribute("aria-disabled")).toBe("true");
  });

  it("leaves the calendar day containing maxDate selectable", () => {
    const { container } = renderGrid(maxDate);
    const cell = dayCell(container, 15)!;
    expect(cell.className).not.toMatch(/sui-drp__day--disabled/);
    expect(cell.getAttribute("aria-disabled")).toBeNull();
  });

  it("wraps maxDate-blocked cells in a tooltip trigger but not earlier cells", () => {
    const { container } = renderGrid(maxDate);
    // Beyond-maxDate cell is the Kobalte tooltip trigger.
    expect(dayCell(container, 16)!.className).toMatch(/sui-tooltip__trigger/);
    // A day before the cap is a plain day button (no tooltip trigger).
    expect(dayCell(container, 10)!.className).not.toMatch(/sui-tooltip__trigger/);
  });

  it("maxRangeDays disabling is unchanged and uses a plain disabled button", () => {
    // pendingStart on the 10th, span cap 2 days → the 20th is out of range.
    const { container } = renderGrid(undefined, 2, new Date(2026, 4, 10));
    const cell = dayCell(container, 20)!;
    expect(cell.className).toMatch(/sui-drp__day--disabled/);
    expect(cell.className).not.toMatch(/sui-tooltip__trigger/);
    expect((cell as HTMLButtonElement).disabled).toBe(true);
  });
});
