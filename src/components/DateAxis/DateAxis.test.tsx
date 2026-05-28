import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateAxis, eachDayOfRange, isSameCalendarDay } from "./index";

// All fixture dates are anchored at UTC midnight so day-keying is unambiguous
// regardless of the host timezone the test runs in.
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("eachDayOfRange", () => {
  it("is inclusive of both endpoints", () => {
    const days = eachDayOfRange(d("2026-05-01"), d("2026-05-05"));
    expect(days).toHaveLength(5);
  });

  it("returns a single day when start === end", () => {
    const days = eachDayOfRange(d("2026-05-10"), d("2026-05-10"));
    expect(days).toHaveLength(1);
    expect(isSameCalendarDay(days[0], d("2026-05-10"))).toBe(true);
  });

  it("returns empty when start > end", () => {
    expect(eachDayOfRange(d("2026-05-05"), d("2026-05-01"))).toEqual([]);
  });

  it("spans month boundaries with the correct count", () => {
    // 2026-05-30 .. 2026-06-02 inclusive = 4 days
    const days = eachDayOfRange(d("2026-05-30"), d("2026-06-02"));
    expect(days).toHaveLength(4);
  });
});

describe("isSameCalendarDay", () => {
  it("is true for two times on the same calendar day", () => {
    expect(
      isSameCalendarDay(
        new Date("2026-05-27T01:00:00.000Z"),
        new Date("2026-05-27T23:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("is false for adjacent calendar days", () => {
    expect(isSameCalendarDay(d("2026-05-27"), d("2026-05-28"))).toBe(false);
  });
});

describe("DateAxis rendering", () => {
  it("renders one cell per day in the range", () => {
    const { container } = render(() => (
      <DateAxis start={d("2026-05-01")} end={d("2026-05-07")} today={d("2026-05-03")} />
    ));
    expect(container.querySelectorAll(".sui-date-axis__cell")).toHaveLength(7);
  });

  it("marks the today cell with the --today modifier and a pip", () => {
    const { container } = render(() => (
      <DateAxis start={d("2026-05-01")} end={d("2026-05-05")} today={d("2026-05-03")} />
    ));
    const todayCells = container.querySelectorAll(".sui-date-axis__cell--today");
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].querySelector(".sui-date-axis__today-pip")).toBeTruthy();
    expect(todayCells[0].getAttribute("aria-current")).toBe("date");
  });

  it("shows a month label on the first and last day of a month but not mid-month", () => {
    // Range crosses a month edge: 2026-05-30 .. 2026-06-02.
    //   May 30 — interior (next day is still May) → NO label
    //   May 31 — last of May                      → "May"
    //   Jun 1  — first of June                     → "Jun"
    //   Jun 2  — interior                          → NO label
    const { container } = render(() => (
      <DateAxis start={d("2026-05-30")} end={d("2026-06-02")} today={d("2026-05-30")} />
    ));
    const cells = Array.from(container.querySelectorAll(".sui-date-axis__cell"));
    const monthText = (cell: Element): string =>
      cell.querySelector(".sui-date-axis__month")?.textContent ?? "";
    expect(monthText(cells[0])).toBe(""); // May 30 — mid-month, no label
    expect(monthText(cells[1])).toBe("May"); // May 31 — last of month
    expect(monthText(cells[2])).toBe("Jun"); // Jun 1 — first of month
    expect(monthText(cells[3])).toBe(""); // Jun 2 — mid-month, no label
  });
});

describe("DateAxis interactivity", () => {
  it("is passive (columnheader, not focusable) when onDayClick is omitted", () => {
    const { container } = render(() => (
      <DateAxis start={d("2026-05-01")} end={d("2026-05-03")} today={d("2026-05-02")} />
    ));
    const cell = container.querySelector(".sui-date-axis__cell")!;
    expect(cell.getAttribute("role")).toBe("columnheader");
    expect(cell.getAttribute("tabindex")).toBeNull();
    expect(container.querySelector(".sui-date-axis__cell--clickable")).toBeNull();
  });

  it("makes cells role=button and focusable when onDayClick is provided", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <DateAxis
        start={d("2026-05-01")}
        end={d("2026-05-03")}
        today={d("2026-05-02")}
        onDayClick={onDayClick}
      />
    ));
    const cell = container.querySelector(".sui-date-axis__cell")!;
    expect(cell.getAttribute("role")).toBe("button");
    expect(cell.getAttribute("tabindex")).toBe("0");
    expect(cell.classList.contains("sui-date-axis__cell--clickable")).toBe(true);
  });

  it("fires onDayClick on click and on Enter / Space", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <DateAxis
        start={d("2026-05-01")}
        end={d("2026-05-03")}
        today={d("2026-05-02")}
        onDayClick={onDayClick}
      />
    ));
    const firstCell = container.querySelector(".sui-date-axis__cell")!;
    fireEvent.click(firstCell);
    fireEvent.keyDown(firstCell, { key: "Enter" });
    fireEvent.keyDown(firstCell, { key: " " });
    expect(onDayClick).toHaveBeenCalledTimes(3);
    // The day passed back is the first day of the range.
    expect(isSameCalendarDay(onDayClick.mock.calls[0][0], d("2026-05-01"))).toBe(true);
  });

  it("adds the --selected modifier to the selected cell", () => {
    const { container } = render(() => (
      <DateAxis
        start={d("2026-05-01")}
        end={d("2026-05-05")}
        today={d("2026-05-01")}
        selected={d("2026-05-04")}
      />
    ));
    const selected = container.querySelectorAll(".sui-date-axis__cell--selected");
    expect(selected).toHaveLength(1);
  });
});

describe("DateAxis custom renderDay", () => {
  it("renders custom content, adds --custom, and suppresses the default label", () => {
    const { container } = render(() => (
      <DateAxis
        start={d("2026-05-01")}
        end={d("2026-05-03")}
        today={d("2026-05-02")}
        renderDay={(day) => (
          <span class="my-custom-cell">cell-{day.getUTCDate()}</span>
        )}
      />
    ));
    const cells = container.querySelectorAll(".sui-date-axis__cell--custom");
    expect(cells).toHaveLength(3);
    // Custom content is present...
    expect(container.querySelectorAll(".my-custom-cell")).toHaveLength(3);
    // ...and the default day-number label is NOT rendered.
    expect(container.querySelector(".sui-date-axis__label")).toBeNull();
  });

  it("passes a context with the right edge flags and index", () => {
    const seen: { index: number; isFirstOfMonth: boolean; isLastOfMonth: boolean }[] = [];
    render(() => (
      <DateAxis
        start={d("2026-05-31")}
        end={d("2026-06-01")}
        today={d("2026-05-31")}
        renderDay={(_day, ctx) => {
          seen.push({
            index: ctx.index,
            isFirstOfMonth: ctx.isFirstOfMonth,
            isLastOfMonth: ctx.isLastOfMonth,
          });
          return <span />;
        }}
      />
    ));
    expect(seen[0]).toEqual({ index: 0, isFirstOfMonth: false, isLastOfMonth: true }); // May 31
    expect(seen[1]).toEqual({ index: 1, isFirstOfMonth: true, isLastOfMonth: false }); // Jun 1
  });
});
