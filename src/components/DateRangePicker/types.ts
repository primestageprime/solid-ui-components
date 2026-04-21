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
  /** Placeholder shown in the trigger when `value` is absent (unusual). */
  placeholder?: string;
  /** Additional class applied to the trigger button. */
  class?: string;
}
