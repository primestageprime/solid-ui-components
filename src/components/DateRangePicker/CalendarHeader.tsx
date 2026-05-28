// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DateRangePicker/CalendarHeader — Internal (not exported from library root).
// Month label + prev/next month nav buttons.
// ============================================
import type { Accessor, Component } from "solid-js";
import { formatMonthYear } from "./calendarUtils";

export interface CalendarHeaderProps {
  year: Accessor<number>;
  /** 0-indexed month (JS convention: 0 = January). */
  month: Accessor<number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: Component<CalendarHeaderProps> = (props) => (
  <div class="sui-drp__calendar-header">
    <button
      type="button"
      class="sui-drp__nav-btn"
      aria-label="Previous month"
      onClick={props.onPrevMonth}
    >
      {"\u2039"}
    </button>
    <span class="sui-drp__month-label">
      {formatMonthYear(props.year(), props.month())}
    </span>
    <button
      type="button"
      class="sui-drp__nav-btn"
      aria-label="Next month"
      onClick={props.onNextMonth}
    >
      {"\u203A"}
    </button>
  </div>
);
