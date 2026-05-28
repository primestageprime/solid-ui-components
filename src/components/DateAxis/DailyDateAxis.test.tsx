import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { DailyDateAxis } from "./DailyDateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe("DailyDateAxis", () => {
  it("renders one cell per day in [start, end] using the default day content", () => {
    const { container } = render(() => (
      <DailyDateAxis start={d("2026-05-01")} end={d("2026-05-05")} today={d("2026-05-02")} />
    ));
    const cells = container.querySelectorAll(".sui-date-axis__cell");
    expect(cells).toHaveLength(5);
    // Day labels: 1..5
    const labels = Array.from(container.querySelectorAll(".sui-date-axis__label"))
      .map((n) => n.textContent);
    expect(labels).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("translates selected: Date → cell index for the highlight", () => {
    const { container } = render(() => (
      <DailyDateAxis
        start={d("2026-05-01")}
        end={d("2026-05-05")}
        today={d("2026-05-01")}
        selected={d("2026-05-04")}
      />
    ));
    const cells = Array.from(container.querySelectorAll(".sui-date-axis__cell"));
    expect(cells[3].classList.contains("sui-date-axis__cell--selected")).toBe(true);
  });

  it("translates onCellClick back to onDayClick(day: Date)", () => {
    const onDayClick = vi.fn();
    const { container } = render(() => (
      <DailyDateAxis
        start={d("2026-05-01")}
        end={d("2026-05-03")}
        today={d("2026-05-02")}
        onDayClick={onDayClick}
      />
    ));
    fireEvent.click(container.querySelectorAll(".sui-date-axis__cell")[1]);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    const passed = onDayClick.mock.calls[0][0] as Date;
    expect(passed.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });

  it("passes day-flavored context (isFirstOfMonth / isLastOfMonth) to renderDay", () => {
    const seen: { isFirstOfMonth: boolean; isLastOfMonth: boolean }[] = [];
    render(() => (
      <DailyDateAxis
        start={d("2026-05-31")}
        end={d("2026-06-01")}
        today={d("2026-05-31")}
        renderDay={(_day, ctx) => {
          seen.push({
            isFirstOfMonth: ctx.isFirstOfMonth,
            isLastOfMonth: ctx.isLastOfMonth,
          });
          return <span />;
        }}
      />
    ));
    expect(seen[0]).toEqual({ isFirstOfMonth: false, isLastOfMonth: true });
    expect(seen[1]).toEqual({ isFirstOfMonth: true, isLastOfMonth: false });
  });
});
