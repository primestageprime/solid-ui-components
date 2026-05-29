import type { Accessor } from "solid-js";

/** Named preset relative to "now": selects `[now - days, now]`. */
export interface DateRangePreset {
  readonly label: string;
  readonly days: number;
}

/** Committed date range — inclusive of both ends. */
export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

export interface DateRangePickerProps {
  /** Reactive accessor of the current range. */
  value: Accessor<DateRange>;
  /** Called with the new range when the user commits a selection. */
  onChange: (range: DateRange) => void;
  /** Optional quick-select presets rendered above the calendar. */
  presets?: DateRangePreset[];
  /**
   * Optional hard cap on the range span (in calendar days). When set, the
   * calendar disables days outside the cap once the first end is selected
   * and preset selections are clamped to the same bound.
   */
  maxRangeDays?: number;
  /**
   * Optional absolute hard cap on the latest selectable day. Days *after* the
   * calendar day containing `maxDate` are disabled and cannot be selected;
   * the day containing `maxDate` itself stays selectable (comparison is at
   * day granularity, so a mid-day `maxDate` still allows picking that day).
   * Independent of and complementary to `maxRangeDays` (which caps span).
   * Presets are clamped so their end never exceeds this cap.
   */
  maxDate?: Date;
  /**
   * Tooltip text shown when hovering a day disabled *because* it is beyond
   * `maxDate`. Has no effect unless `maxDate` is set. Defaults to a generic
   * message when omitted.
   */
  maxDateTooltip?: string;
  /** Placeholder shown in the trigger when `value` is absent (unusual). */
  placeholder?: string;
  /** Additional class applied to the trigger button. */
  class?: string;
  /**
   * Optional IANA timezone identifier (e.g. `"America/Los_Angeles"`, `"UTC"`).
   * When set, the trigger label, month header, calendar-day highlighting, and
   * committed time-of-day selections are all resolved in this TZ — preventing
   * off-by-one mismatches between the picker and the rest of an app that
   * pins display to a non-local TZ. When omitted, the component falls back
   * to the browser's local TZ.
   */
  timeZone?: string;
}
