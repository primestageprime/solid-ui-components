import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CalendarGrid } from "./CalendarGrid";

// March 2026 is the fixture month throughout: 1 March 2026 is a Sunday, which
// is the worst case for the Monday-first offset ((getDay() + 6) % 7 maps Sun
// to 6). A month starting on Monday would let an off-by-one offset pass.
const YEAR = 2026;
const MONTH = 2; // 0-indexed March
const d = (day: number, h = 12) => new Date(YEAR, MONTH, day, h);

type Opts = Partial<{
  rangeStart: Date;
  rangeEnd: Date;
  hoveredDate: Date;
  pendingStart: Date;
  maxRangeDays: number;
  timeZone: string;
}>;

const mount = (opts: Opts = {}) => {
  const onDayClick = vi.fn();
  const onDayHover = vi.fn();
  const onDayHoverEnd = vi.fn();
  const r = render(() => (
    <CalendarGrid
      year={() => YEAR}
      month={() => MONTH}
      rangeStart={() => opts.rangeStart}
      rangeEnd={() => opts.rangeEnd}
      hoveredDate={() => opts.hoveredDate}
      pendingStart={() => opts.pendingStart}
      maxRangeDays={opts.maxRangeDays}
      timeZone={opts.timeZone}
      onDayClick={onDayClick}
      onDayHover={onDayHover}
      onDayHoverEnd={onDayHoverEnd}
    />
  ));
  return { ...r, onDayClick, onDayHover, onDayHoverEnd };
};

const cells = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLButtonElement>(".sui-drp__day"),
];

/** The grid cell showing `day` of the fixture month (not an outside cell). */
const cellFor = (c: HTMLElement, day: number) => {
  const found = cells(c).filter(
    (el) =>
      el.textContent === String(day) &&
      !el.className.includes("sui-drp__day--outside"),
  );
  if (found.length !== 1)
    throw new Error(`expected 1 in-month cell for ${day}, got ${found.length}`);
  return found[0];
};

const classesOn = (c: HTMLElement, day: number) => cellFor(c, day).className;

afterEach(() => vi.useRealTimers());

describe("CalendarGrid — grid shape", () => {
  it("renders a fixed 42-cell six-week grid", () => {
    const { container } = mount();
    expect(cells(container)).toHaveLength(42);
  });

  it("labels weekdays Monday-first", () => {
    const { container } = mount();
    expect(
      [...container.querySelectorAll(".sui-drp__weekday-cell")].map(
        (el) => el.textContent,
      ),
    ).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  // 1 March 2026 falls on a Sunday, so the Monday-first offset must push it to
  // the 7th slot and fill the first six with late February. Getting the
  // Sun→6 mapping wrong shifts the whole month by a row.
  it("offsets a Sunday-starting month to the last column of the first row", () => {
    const { container } = mount();
    const all = cells(container);
    expect(
      all.slice(0, 6).every((el) => el.className.includes("--outside")),
    ).toBe(true);
    expect(all[6].textContent).toBe("1");
    expect(all[6].className).not.toContain("--outside");
  });

  it("marks trailing next-month cells as outside too", () => {
    const { container } = mount();
    const last = cells(container).at(-1);
    expect(last?.className).toContain("sui-drp__day--outside");
  });

  it("marks every cell type=button so it cannot submit a surrounding form", () => {
    const { container } = mount();
    for (const el of cells(container))
      expect(el.getAttribute("type")).toBe("button");
  });
});

describe("CalendarGrid — today marker", () => {
  it("marks exactly one cell as today when the fixture month is current", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(YEAR, MONTH, 17, 9));
    const { container } = mount();
    const marked = cells(container).filter((el) =>
      el.className.includes("sui-drp__day--today"),
    );
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toBe("17");
  });

  it("marks no cell when today falls outside the rendered grid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 6, 4, 9));
    const { container } = mount();
    expect(
      cells(container).some((el) =>
        el.className.includes("sui-drp__day--today"),
      ),
    ).toBe(false);
  });
});

describe("CalendarGrid — committed range", () => {
  it("marks the start and end boundaries distinctly", () => {
    const { container } = mount({ rangeStart: d(10), rangeEnd: d(14) });
    expect(classesOn(container, 10)).toContain("sui-drp__day--range-start");
    expect(classesOn(container, 14)).toContain("sui-drp__day--range-end");
  });

  it("fills the days between the boundaries", () => {
    const { container } = mount({ rangeStart: d(10), rangeEnd: d(14) });
    for (const day of [11, 12, 13])
      expect(classesOn(container, day)).toContain("sui-drp__day--in-range");
  });

  it("leaves days outside the range unmarked", () => {
    const { container } = mount({ rangeStart: d(10), rangeEnd: d(14) });
    for (const day of [9, 15]) {
      expect(classesOn(container, day)).not.toContain("--in-range");
      expect(classesOn(container, day)).not.toContain("--range-start");
      expect(classesOn(container, day)).not.toContain("--range-end");
    }
  });

  it("handles a single-day range as both start and end", () => {
    const { container } = mount({ rangeStart: d(10), rangeEnd: d(10) });
    expect(classesOn(container, 10)).toContain("sui-drp__day--range-start");
    expect(classesOn(container, 10)).toContain("sui-drp__day--range-end");
  });
});

describe("CalendarGrid — hover preview before the range is committed", () => {
  // With a start but no end, the hovered day stands in as the end so the user
  // sees the range they are about to pick. This only applies while rangeEnd is
  // undefined — once committed, hover must not repaint the range.
  it("previews the hovered day as the end while the end is unset", () => {
    const { container } = mount({ rangeStart: d(10), hoveredDate: d(13) });
    expect(classesOn(container, 13)).toContain("sui-drp__day--range-end");
    for (const day of [11, 12])
      expect(classesOn(container, day)).toContain("sui-drp__day--in-range");
  });

  it("ignores hover once the range has a committed end", () => {
    const { container } = mount({
      rangeStart: d(10),
      rangeEnd: d(12),
      hoveredDate: d(20),
    });
    expect(classesOn(container, 20)).not.toContain("--range-end");
    expect(classesOn(container, 20)).not.toContain("--in-range");
  });

  it("previews nothing without a range start", () => {
    const { container } = mount({ hoveredDate: d(13) });
    expect(classesOn(container, 13)).not.toContain("--range-end");
    expect(classesOn(container, 13)).not.toContain("--in-range");
  });

  // The preview is clamped to maxRangeDays, so hovering past the limit paints
  // the range only as far as the limit allows rather than following the cursor.
  it("clamps the previewed end to maxRangeDays", () => {
    const { container } = mount({
      rangeStart: d(10),
      pendingStart: d(10),
      hoveredDate: d(25),
      maxRangeDays: 3,
    });
    expect(classesOn(container, 13)).toContain("sui-drp__day--range-end");
    expect(classesOn(container, 25)).not.toContain("--range-end");
  });
});

describe("CalendarGrid — max-range disabling", () => {
  it("disables days beyond maxRangeDays from the pending start", () => {
    const { container } = mount({ pendingStart: d(10), maxRangeDays: 3 });
    expect(cellFor(container, 13).disabled).toBe(false);
    expect(cellFor(container, 14).disabled).toBe(true);
    expect(classesOn(container, 14)).toContain("sui-drp__day--disabled");
  });

  // The limit is symmetric — a range can be drawn backwards from the anchor.
  it("disables symmetrically on both sides of the anchor", () => {
    const { container } = mount({ pendingStart: d(10), maxRangeDays: 3 });
    expect(cellFor(container, 7).disabled).toBe(false);
    expect(cellFor(container, 6).disabled).toBe(true);
  });

  it("disables nothing while there is no pending start", () => {
    const { container } = mount({ maxRangeDays: 3 });
    expect(cells(container).some((el) => el.disabled)).toBe(false);
  });

  it("disables nothing when maxRangeDays is unset", () => {
    const { container } = mount({ pendingStart: d(10) });
    expect(cells(container).some((el) => el.disabled)).toBe(false);
  });
});

describe("CalendarGrid — interaction", () => {
  it("reports the clicked day as a Date", () => {
    const { container, onDayClick } = mount();
    fireEvent.click(cellFor(container, 12));
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const arg = onDayClick.mock.calls[0][0] as Date;
    expect(arg.getFullYear()).toBe(YEAR);
    expect(arg.getMonth()).toBe(MONTH);
    expect(arg.getDate()).toBe(12);
  });

  // Outside cells are real, clickable days of the neighbouring month — the
  // picker navigates on them rather than ignoring them.
  it("reports clicks on outside cells with their own month", () => {
    const { container, onDayClick } = mount();
    fireEvent.click(cells(container)[0]);
    const arg = onDayClick.mock.calls[0][0] as Date;
    expect(arg.getMonth()).not.toBe(MONTH);
  });

  it("reports hover enter and leave", () => {
    const { container, onDayHover, onDayHoverEnd } = mount();
    const cell = cellFor(container, 12);
    fireEvent.mouseEnter(cell);
    expect((onDayHover.mock.calls[0][0] as Date).getDate()).toBe(12);
    fireEvent.mouseLeave(cell);
    expect(onDayHoverEnd).toHaveBeenCalledTimes(1);
  });

  it("does not fire a click from a disabled day", () => {
    const { container, onDayClick } = mount({
      pendingStart: d(10),
      maxRangeDays: 3,
    });
    fireEvent.click(cellFor(container, 20));
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
