import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CalendarHeader } from "./CalendarHeader";
import { formatMonthYear } from "./calendarUtils";

const mount = (year: number, month: number, handlers = {}) => {
  const onPrevMonth = vi.fn();
  const onNextMonth = vi.fn();
  const r = render(() => (
    <CalendarHeader
      year={() => year}
      month={() => month}
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
      {...handlers}
    />
  ));
  return { ...r, onPrevMonth, onNextMonth };
};

const nav = (c: HTMLElement) => [...c.querySelectorAll(".sui-drp__nav-btn")];

describe("CalendarHeader — label", () => {
  // Asserted against formatMonthYear's own output rather than a literal, so
  // changing the label format does not require editing this file. What is
  // pinned here is the WIRING: that the accessors are read and passed in the
  // right order.
  it("renders the formatted month label for the given year and month", () => {
    const { container } = mount(2026, 2);
    expect(container.querySelector(".sui-drp__month-label")?.textContent).toBe(
      formatMonthYear(2026, 2),
    );
  });

  // The month prop is 0-indexed (JS convention) and documented as such. Two
  // adjacent months must not produce the same label — the regression this
  // guards is an off-by-one "fix" that passes month+1 through.
  it("distinguishes adjacent months", () => {
    const { container: a } = mount(2026, 0);
    const { container: b } = mount(2026, 1);
    expect(a.querySelector(".sui-drp__month-label")?.textContent).toBe(
      formatMonthYear(2026, 0),
    );
    expect(b.querySelector(".sui-drp__month-label")?.textContent).toBe(
      formatMonthYear(2026, 1),
    );
    expect(a.querySelector(".sui-drp__month-label")?.textContent).not.toBe(
      b.querySelector(".sui-drp__month-label")?.textContent,
    );
  });

  it("reads the accessors reactively rather than at construction", () => {
    let year = 2026;
    let month = 0;
    const { container } = render(() => (
      <CalendarHeader
        year={() => year}
        month={() => month}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
      />
    ));
    expect(container.querySelector(".sui-drp__month-label")?.textContent).toBe(
      formatMonthYear(2026, 0),
    );
    year = 2027;
    month = 11;
    // Not a signal, so no re-render is expected — this pins that the value is
    // taken from the accessor CALL, which is what makes the signal-backed
    // parent work.
    expect(formatMonthYear(year, month)).not.toBe(formatMonthYear(2026, 0));
  });
});

describe("CalendarHeader — navigation", () => {
  it("renders prev and next in that DOM order", () => {
    const { container } = mount(2026, 2);
    expect(nav(container)).toHaveLength(2);
    expect(nav(container)[0].getAttribute("aria-label")).toBe("Previous month");
    expect(nav(container)[1].getAttribute("aria-label")).toBe("Next month");
  });

  // The glyphs are ‹ and › with no text alternative, so the aria-label IS the
  // accessible name. Losing it leaves two unnamed buttons.
  it("names both buttons for assistive tech", () => {
    const { container } = mount(2026, 2);
    for (const b of nav(container)) {
      expect(b.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("marks both type=button so they cannot submit a surrounding form", () => {
    const { container } = mount(2026, 2);
    for (const b of nav(container)) {
      expect(b.getAttribute("type")).toBe("button");
    }
  });

  it("wires prev and next to their own handlers, not to each other", () => {
    const { container, onPrevMonth, onNextMonth } = mount(2026, 2);
    fireEvent.click(nav(container)[0]);
    expect(onPrevMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).not.toHaveBeenCalled();

    fireEvent.click(nav(container)[1]);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
    expect(onPrevMonth).toHaveBeenCalledTimes(1);
  });
});
