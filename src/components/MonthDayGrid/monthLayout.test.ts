import { describe, it, expect } from "vitest";
import { addDays, dayMove, daysInMonth, firstWeekday, monthLayout, visibleWeeks, weekdayLabels } from "./monthLayout";

describe("monthLayout", () => {
  it("aligns November 2026 (starts on a Sunday) to Sunday-first weeks", () => {
    expect(firstWeekday("2026-11")).toBe(0);
    expect(daysInMonth("2026-11")).toBe(30);
    const w = monthLayout("2026-11", 0);
    expect(w[0][0]).toBe("2026-11-01");
    expect(w).toHaveLength(5);
    expect(w[4]).toEqual([
      "2026-11-29",
      "2026-11-30",
      null,
      null,
      null,
      null,
      null,
    ]);
  });
  it("leads with blanks for Monday-first and handles leap February", () => {
    const w = monthLayout("2026-11", 1);
    expect(w[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(weekdayLabels(1)[0]).toEqual({ short: "M", long: "Monday" });
  });
  it("addDays crosses months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("dayMove", () => {
  it("moves by day and week, clamps to the month, Home/End within the week row", () => {
    expect(dayMove("2026-11-04", "ArrowRight", "2026-11")).toBe("2026-11-05");
    expect(dayMove("2026-11-30", "ArrowRight", "2026-11")).toBe("2026-11-30");
    expect(dayMove("2026-11-04", "ArrowDown", "2026-11")).toBe("2026-11-11");
    expect(dayMove("2026-11-28", "ArrowDown", "2026-11")).toBe("2026-11-28");
    expect(dayMove("2026-11-04", "ArrowUp", "2026-11")).toBe("2026-11-04");
    expect(dayMove("2026-11-04", "Home", "2026-11")).toBe("2026-11-01");
    expect(dayMove("2026-11-04", "End", "2026-11")).toBe("2026-11-07");
    expect(dayMove("2026-11-04", "Enter", "2026-11")).toBeNull();
  });
});

describe("visibleWeeks", () => {
  it("keeps weeks with any day on or after the date; undefined keeps all", () => {
    const w = monthLayout("2026-11", 0);
    expect(visibleWeeks(w, "2026-11-12")).toHaveLength(4);
    expect(visibleWeeks(w, "2026-11-12")[0][0]).toBe("2026-11-08");
    expect(visibleWeeks(w, "2026-12-01")).toEqual([]);
    expect(visibleWeeks(w)).toHaveLength(5);
  });
});
