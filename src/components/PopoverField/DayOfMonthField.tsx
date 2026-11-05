// ============================================
// DayOfMonthField — Composite (Depth 2)
// Tags: shows:field, shows:date, does:pick, data:enum, role:control
// Composes PopoverField and CompactDayOfMonthPicker.
// A compact field reading "5th" (or "Last day") that opens the day grid
// 1 to 28 plus Last day in a popover and closes on pick.
//   <DayOfMonthField value={5} onChange={(d) => save(d)} />
// ============================================
import type { Component } from "solid-js";
import { CompactDayOfMonthPicker } from "../DayOfMonthPicker";
import { PopoverField } from "./PopoverField";

export type DayOfMonth = number | "last";

export interface DayOfMonthFieldProps {
  /** 1 to 28, or `"last"`. */
  value: DayOfMonth;
  onChange: (day: DayOfMonth) => void;
  /** Accessible name. Default "Day of month". */
  label?: string;
}

/** 1 becomes "1st", 12 "12th", 23 "23rd"; `"last"` becomes "Last day". */
export const dayOfMonthText = (day: DayOfMonth): string => {
  if (day === "last") return "Last day";
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

export const DayOfMonthField: Component<DayOfMonthFieldProps> = (props) => (
  <PopoverField label={props.label ?? "Day of month"} value={dayOfMonthText(props.value)}>
    {(close) => (
      <CompactDayOfMonthPicker
        value={props.value}
        lastOfMonth
        onChange={(d) => {
          props.onChange(d);
          close();
        }}
        onSelectLast={() => {
          props.onChange("last");
          close();
        }}
      />
    )}
  </PopoverField>
);
