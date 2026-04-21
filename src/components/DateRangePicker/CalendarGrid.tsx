// ============================================
// DateRangePicker/CalendarGrid — Internal (not exported from library root).
// 42-cell (6-week) day grid with Monday-first week; handles range highlight,
// pending-start hover preview, today marker, and max-range disabled state.
// ============================================
import { type Accessor, type Component, For, createMemo } from "solid-js";
import {
  clampToMaxRange,
  getCalendarDays,
  isInRange,
  isOutOfMaxRange,
  isSameDay,
} from "./calendarUtils";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export interface CalendarGridProps {
  year: Accessor<number>;
  /** 0-indexed month. */
  month: Accessor<number>;
  rangeStart: Accessor<Date | undefined>;
  rangeEnd: Accessor<Date | undefined>;
  hoveredDate: Accessor<Date | undefined>;
  pendingStart: Accessor<Date | undefined>;
  maxRangeDays?: number;
  onDayClick: (day: Date) => void;
  onDayHover: (day: Date) => void;
  onDayHoverEnd: () => void;
}

const buildDayClass = (
  day: Date,
  today: Date,
  currentMonth: number,
  rangeStart: Date | undefined,
  rangeEnd: Date | undefined,
  hovered: Date | undefined,
  pendingStart: Date | undefined,
  maxRangeDays: number | undefined,
  disabled: boolean,
): string => {
  const classes: string[] = ["sui-drp__day"];
  if (day.getMonth() !== currentMonth) classes.push("sui-drp__day--outside");
  if (disabled) classes.push("sui-drp__day--disabled");

  const clampedHover =
    hovered && pendingStart && maxRangeDays !== undefined
      ? clampToMaxRange(hovered, pendingStart, maxRangeDays)
      : hovered;

  if (rangeStart && isSameDay(day, rangeStart))
    classes.push("sui-drp__day--range-start");
  if (rangeEnd && isSameDay(day, rangeEnd))
    classes.push("sui-drp__day--range-end");

  if (rangeStart && !rangeEnd && clampedHover && isSameDay(day, clampedHover))
    classes.push("sui-drp__day--range-end");

  const effectiveEnd = rangeEnd ?? clampedHover;
  if (rangeStart && effectiveEnd && isInRange(day, rangeStart, effectiveEnd))
    classes.push("sui-drp__day--in-range");

  if (isSameDay(day, today)) classes.push("sui-drp__day--today");
  return classes.join(" ");
};

export const CalendarGrid: Component<CalendarGridProps> = (props) => {
  const days = createMemo(() => getCalendarDays(props.year(), props.month()));
  const today = new Date();

  const isDayDisabled = (day: Date): boolean => {
    const anchor = props.pendingStart();
    return (
      anchor !== undefined &&
      props.maxRangeDays !== undefined &&
      isOutOfMaxRange(day, anchor, props.maxRangeDays)
    );
  };

  return (
    <div class="sui-drp__calendar-grid">
      <div class="sui-drp__weekday-row">
        <For each={[...WEEKDAY_LABELS]}>
          {(label) => <div class="sui-drp__weekday-cell">{label}</div>}
        </For>
      </div>
      <div class="sui-drp__days-grid">
        <For each={days()}>
          {(day) => (
            <button
              type="button"
              class={buildDayClass(
                day,
                today,
                props.month(),
                props.rangeStart(),
                props.rangeEnd(),
                props.hoveredDate(),
                props.pendingStart(),
                props.maxRangeDays,
                isDayDisabled(day),
              )}
              disabled={isDayDisabled(day)}
              onClick={() => props.onDayClick(day)}
              onMouseEnter={() => props.onDayHover(day)}
              onMouseLeave={() => props.onDayHoverEnd()}
            >
              {day.getDate()}
            </button>
          )}
        </For>
      </div>
    </div>
  );
};
