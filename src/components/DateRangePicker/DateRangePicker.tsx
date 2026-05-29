// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DateRangePicker — Atomic Primitive (Depth 1).
// Owns `DateRangePicker.css`; wraps `@kobalte/core/popover` (same shape as
// Combobox/Select/Tooltip/Toast/ThemedNumberInput — see CONTEXT.md's
// "Kobalte-wrapping Primitive" pattern). Internal sub-components
// (CalendarGrid, CalendarHeader, PresetButtons, TimeInputs) live in
// sibling files but are NOT re-exported from the library root — the
// Primitive is the only public API, and it has no sibling-component imports.
//
// Date math is vanilla `Date` + `Intl.DateTimeFormat`: no Luxon/date-fns
// dependency, no bundle cost beyond the browser's built-in i18n.
// ============================================
import { Popover } from "@kobalte/core/popover";
import {
  type Component,
  Show,
  batch,
  createMemo,
  createSignal,
} from "solid-js";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { PresetButtons } from "./PresetButtons";
import { TimeInputs } from "./TimeInputs";
import {
  addMonths,
  applyTimeToDate,
  clampEndToMaxDate,
  clampRange,
  clampToMaxRange,
  formatRangeLabel,
  getDateParts,
  orderDates,
  sanitizeMaxRangeDays,
} from "./calendarUtils";
import type { DateRange, DateRangePickerProps, DateRangePreset } from "./types";
import "./DateRangePicker.css";

const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME = "23:59";

export const DateRangePicker: Component<DateRangePickerProps> = (props) => {
  const maxRangeDays = createMemo(() =>
    sanitizeMaxRangeDays(props.maxRangeDays),
  );

  // View state: which month is displayed. Derived from the committed range
  // start as observed in the caller's TZ, so a pinned-TZ picker opens on the
  // same calendar month the label advertises.
  const initialParts = getDateParts(props.value().start, props.timeZone);
  const [viewYear, setViewYear] = createSignal(initialParts.year);
  const [viewMonth, setViewMonth] = createSignal(initialParts.month);

  // Selection state machine: picking start, then end.
  const [pendingStart, setPendingStart] = createSignal<Date | undefined>(
    undefined,
  );
  const [hoveredDate, setHoveredDate] = createSignal<Date | undefined>(
    undefined,
  );

  // Optional time-of-day controls.
  const [showTime, setShowTime] = createSignal(false);
  const [startTime, setStartTime] = createSignal(DEFAULT_START_TIME);
  const [endTime, setEndTime] = createSignal(DEFAULT_END_TIME);

  const [open, setOpen] = createSignal(false);

  const triggerLabel = createMemo(() => {
    const range = props.value();
    if (props.placeholder && !range) return props.placeholder;
    return formatRangeLabel(range.start, range.end, props.timeZone);
  });

  const navigateMonth = (delta: number) => {
    const next = addMonths(viewYear(), viewMonth(), delta);
    batch(() => {
      setViewYear(next.year);
      setViewMonth(next.month);
    });
  };

  const applyPreset = (preset: DateRangePreset) => {
    const now = new Date();
    // End at the cap when it is in the past, so a preset becomes "N days
    // ending at maxDate" rather than spilling past it.
    const cap = props.maxDate;
    const end = cap !== undefined && cap.getTime() < now.getTime() ? cap : now;
    const start = new Date(end.getTime() - preset.days * 86_400_000);
    const range = clampRange(start, end, maxRangeDays());
    props.onChange(range);
    setPendingStart(undefined);
    setOpen(false);
  };

  const commitRange = (start: Date, end: Date) => {
    const s = showTime() ? applyTimeToDate(start, startTime(), props.timeZone) : start;
    const e = showTime() ? applyTimeToDate(end, endTime(), props.timeZone) : end;
    const ordered = orderDates(s, e);
    // Defensive: the disabled cells should already prevent picking beyond the
    // cap, but clamp the end at day granularity as a safety net.
    const cappedEnd = clampEndToMaxDate(ordered.end, props.maxDate, props.timeZone);
    props.onChange(clampRange(ordered.start, cappedEnd, maxRangeDays()));
  };

  const handleDayClick = (day: Date) => {
    const pending = pendingStart();
    if (!pending) {
      setPendingStart(day);
      return;
    }
    // Second click: clamp clicked date to max range from anchor.
    const clamped = clampToMaxRange(day, pending, maxRangeDays());
    const ordered = orderDates(pending, clamped);
    commitRange(ordered.start, ordered.end);
    setPendingStart(undefined);
    if (!showTime()) setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) return;
    const parts = getDateParts(props.value().start, props.timeZone);
    batch(() => {
      setViewYear(parts.year);
      setViewMonth(parts.month);
      setPendingStart(undefined);
      setHoveredDate(undefined);
    });
  };

  // Displayed range: committed range, or the pending single-end selection.
  const displayStart = createMemo<Date | undefined>(
    () => pendingStart() ?? props.value().start,
  );
  const displayEnd = createMemo<Date | undefined>(() =>
    pendingStart() ? undefined : props.value().end,
  );

  const triggerClass = () =>
    ["sui-drp__trigger", props.class].filter(Boolean).join(" ");

  return (
    <Popover open={open()} onOpenChange={handleOpenChange} gutter={8}>
      <Popover.Trigger class={triggerClass()}>
        {triggerLabel()}
        <span class="sui-drp__trigger-icon">{"\u25BE"}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="sui-drp__popover-content">
          <PresetButtons presets={props.presets} onSelect={applyPreset} />
          <CalendarHeader
            year={viewYear}
            month={viewMonth}
            onPrevMonth={() => navigateMonth(-1)}
            onNextMonth={() => navigateMonth(1)}
          />
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            rangeStart={displayStart}
            rangeEnd={displayEnd}
            hoveredDate={hoveredDate}
            pendingStart={pendingStart}
            maxRangeDays={maxRangeDays()}
            maxDate={props.maxDate}
            maxDateTooltip={props.maxDateTooltip}
            timeZone={props.timeZone}
            onDayClick={handleDayClick}
            onDayHover={setHoveredDate}
            onDayHoverEnd={() => setHoveredDate(undefined)}
          />
          <label class="sui-drp__time-toggle">
            <input
              type="checkbox"
              checked={showTime()}
              onChange={(e) => setShowTime(e.currentTarget.checked)}
            />
            Set time
          </label>
          <Show when={showTime()}>
            <TimeInputs
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
            />
          </Show>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
};

export type { DateRange, DateRangePreset, DateRangePickerProps };
