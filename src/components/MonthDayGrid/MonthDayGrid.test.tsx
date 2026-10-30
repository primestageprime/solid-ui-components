import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { MonthDayGrid, MondayMonthDayGrid } from ".";

const heads = (c: HTMLElement) => [
  ...c.querySelectorAll(".sui-month-day-grid__head"),
];

describe("MonthDayGrid", () => {
  it("renders a named group of weekday heads and one button per day, with selection and counts", () => {
    const { getByRole, container } = render(() => (
      <MonthDayGrid
        month="2026-11"
        days={{
          "2026-11-10": { selected: true, count: 3 },
          "2026-11-12": { tone: "accent" },
        }}
      />
    ));
    expect(getByRole("group").getAttribute("aria-label")).toBe("November 2026");
    expect(heads(container).map((h) => h.textContent)).toEqual([
      "S",
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
    ]);
    expect(container.querySelectorAll("[data-day]")).toHaveLength(30);
    const tenth = container.querySelector(
      '[data-day="2026-11-10"]',
    ) as HTMLElement;
    expect(tenth.getAttribute("aria-pressed")).toBe("true");
    expect(tenth.getAttribute("aria-label")).toBe(
      "Tuesday, November 10, 3 picked",
    );
    expect(tenth.tabIndex).toBe(0);
    expect(
      container.querySelector('[data-day="2026-11-12"]')?.className,
    ).toContain("--accent");
  });

  it("disabled and past days ignore clicks; enabled days report their ISO", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <MonthDayGrid
        month="2026-11"
        minDate="2026-11-05"
        days={{ "2026-11-20": { enabled: false } }}
        onDayClick={onDayClick}
      />
    ));
    const day = (iso: string) =>
      container.querySelector(`[data-day="${iso}"]`) as HTMLElement;
    fireEvent.click(day("2026-11-03"));
    fireEvent.click(day("2026-11-20"));
    expect(onDayClick).not.toHaveBeenCalled();
    expect(day("2026-11-03").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(day("2026-11-06"));
    expect(onDayClick).toHaveBeenCalledWith("2026-11-06");
  });

  it("arrows move focus without toggling", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <MonthDayGrid month="2026-11" onDayClick={onDayClick} />
    ));
    const first = container.querySelector(
      '[data-day="2026-11-01"]',
    ) as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-day")).toBe("2026-11-08");
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it("MondayMonthDayGrid starts weeks on Monday", () => {
    const { container } = render(() => <MondayMonthDayGrid month="2026-11" />);
    expect(heads(container)[0].getAttribute("title")).toBe("Monday");
  });
  it("hideWeeksBefore drops weeks that end before the date, and arrows stop at the first visible week", () => {
    const { container } = render(() => <MonthDayGrid month="2026-11" hideWeeksBefore="2026-11-12" />);
    expect(container.querySelector('[data-day="2026-11-07"]')).toBeNull();
    expect(container.querySelector('[data-day="2026-11-08"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-day]")).toHaveLength(23);
    const tenth = container.querySelector('[data-day="2026-11-10"]') as HTMLElement;
    tenth.focus();
    fireEvent.keyDown(tenth, { key: "ArrowUp" });
    expect(document.activeElement).toBe(tenth);
  });
});
