// ============================================
// DateRangePicker/TimeInputs — Internal (not exported from library root).
// Native `type="time"` inputs — browser supplies hh:mm UI and validation.
// ============================================
import type { Accessor, Component } from "solid-js";

export interface TimeInputsProps {
  /** `HH:mm` 24-hour time string. */
  startTime: Accessor<string>;
  endTime: Accessor<string>;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export const TimeInputs: Component<TimeInputsProps> = (props) => (
  <div class="sui-drp__time-inputs">
    <input
      type="time"
      class="sui-drp__time-input"
      value={props.startTime()}
      onInput={(e) => props.onStartTimeChange(e.currentTarget.value)}
    />
    <span class="sui-drp__time-separator">to</span>
    <input
      type="time"
      class="sui-drp__time-input"
      value={props.endTime()}
      onInput={(e) => props.onEndTimeChange(e.currentTarget.value)}
    />
  </div>
);
