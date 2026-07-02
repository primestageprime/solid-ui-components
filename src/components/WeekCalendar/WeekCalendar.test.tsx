import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
  WeekCalendar,
  type WeekCalendarBlock,
  createWeekCalendar,
  parseWeekCalendarTime,
} from "./WeekCalendar";

describe("parseWeekCalendarTime (dside 1–8 = PM convention)", () => {
  it("keeps 9–12 as AM/noon hours", () => {
    expect(parseWeekCalendarTime("9")).toBe(9);
    expect(parseWeekCalendarTime("12")).toBe(12);
  });

  it("shifts 1–8 into the afternoon", () => {
    expect(parseWeekCalendarTime("1")).toBe(13);
    expect(parseWeekCalendarTime("8")).toBe(20);
  });

  it("parses fractional minutes", () => {
    expect(parseWeekCalendarTime("9:30")).toBe(9.5);
    expect(parseWeekCalendarTime("4:15")).toBe(16.25); // 4 → 16 (PM) + 0.25
  });

  it("defaults missing minutes to zero", () => {
    expect(parseWeekCalendarTime("10")).toBe(10);
  });
});

describe("WeekCalendar", () => {
  const days = ["Mon", "Tue"];
  const blocks: WeekCalendarBlock[] = [
    { day: "Mon", startAt: "10", durationInHrs: 2 },
    { day: "Tue", startAt: "1", durationInHrs: 1 }, // 1 PM
  ];
  const renderBlock = (b: WeekCalendarBlock) => <span>{b.startAt}</span>;

  it("renders a header per day", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={days}
        startHour={8}
        endHour={18}
        blocks={[]}
        renderBlock={renderBlock}
      />
    ));
    expect(
      [...container.querySelectorAll(".sui-week-calendar__day-header")].map(
        (h) => h.textContent,
      ),
    ).toEqual(["Mon", "Tue"]);
  });

  it("uses a custom dayLabel callback when provided", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={days}
        startHour={8}
        endHour={18}
        blocks={[]}
        renderBlock={renderBlock}
        dayLabel={(d, i) => `${d}#${i}`}
      />
    ));
    expect(
      [...container.querySelectorAll(".sui-week-calendar__day-header")].map(
        (h) => h.textContent,
      ),
    ).toEqual(["Mon#0", "Tue#1"]);
  });

  it("renders one column per day and places blocks in their day's column", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={days}
        startHour={8}
        endHour={18}
        blocks={blocks}
        renderBlock={renderBlock}
      />
    ));
    const columns = container.querySelectorAll(".sui-week-calendar__column");
    expect(columns.length).toBe(2);
    // Each day has exactly one block.
    expect(container.querySelectorAll(".sui-week-calendar__block").length).toBe(2);
  });

  it("positions a block by parsed start time and duration (px = hours × pxPerHour + inset)", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={["Mon"]}
        startHour={8}
        endHour={18}
        pxPerHour={60}
        blocks={[{ day: "Mon", startAt: "10", durationInHrs: 2 }]}
        renderBlock={renderBlock}
      />
    ));
    const block = container.querySelector<HTMLElement>(
      ".sui-week-calendar__block",
    )!;
    // top = (10 - 8) * 60 + TOP_INSET(8) = 128; height = 2 * 60 = 120.
    expect(block.style.top).toBe("128px");
    expect(block.style.height).toBe("120px");
  });

  it("marks the highlighted block", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={["Mon"]}
        startHour={8}
        endHour={18}
        blocks={[{ day: "Mon", startAt: "10", durationInHrs: 1 }]}
        renderBlock={renderBlock}
        highlight={{ day: "Mon", startAt: "10" }}
      />
    ));
    expect(
      container
        .querySelector(".sui-week-calendar__block")
        ?.classList.contains("sui-week-calendar__block--highlight"),
    ).toBe(true);
  });

  it("renders an hour mark for each hour from startHour to endHour inclusive", () => {
    const { container } = render(() => (
      <WeekCalendar
        days={["Mon"]}
        startHour={9}
        endHour={12}
        blocks={[]}
        renderBlock={renderBlock}
      />
    ));
    // 9,10,11,12 → 4 gutter marks.
    expect(
      container.querySelectorAll(".sui-week-calendar__gutter-mark").length,
    ).toBe(4);
  });

  it("createWeekCalendar bakes defaults into the merged props", () => {
    // Bake a non-default pxPerHour; the block position proves it was applied.
    const Baked = createWeekCalendar({ pxPerHour: 100 });
    const { container } = render(() => (
      <Baked
        days={["Mon"]}
        startHour={8}
        endHour={10}
        blocks={[{ day: "Mon", startAt: "9", durationInHrs: 1 }]}
        renderBlock={renderBlock}
      />
    ));
    const block = container.querySelector<HTMLElement>(
      ".sui-week-calendar__block",
    )!;
    // top = (9 - 8) * 100 + TOP_INSET(8) = 108 (would be 68 at the default 60).
    expect(block.style.top).toBe("108px");
    expect(block.style.height).toBe("100px");
  });
});
