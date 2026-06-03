// ============================================
// DayOfMonthPicker — Atomic (Depth 1)
// Owns CSS (DayOfMonthPicker.css), no component imports.
// Compact calendar-style grid for picking a day of the
// month (1..max). Uniform square-ish cells in a 7-column
// grid; the selected day gets the accent treatment.
//   <DayOfMonthPicker value={9} onChange={(d) => ...} />
// Factory: createDayOfMonthPicker() for curried variants.
// ============================================
import { Component, For, JSX, mergeProps, splitProps } from "solid-js";
import "./DayOfMonthPicker.css";

export interface DayOfMonthPickerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Currently selected day (1..max), or null/undefined for none. */
  value?: number | null;
  /** Called with the day (1..max) when a cell is clicked. */
  onChange: (day: number) => void;
  /** Highest day to render. Default 31. */
  max?: number;
}

export const DayOfMonthPicker: Component<DayOfMonthPickerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "max",
    "class",
  ]);

  const max = () => local.max ?? 31;
  const days = () => Array.from({ length: max() }, (_, i) => i + 1);

  const rootClass = () =>
    local.class ? `sui-dom-picker ${local.class}` : "sui-dom-picker";

  return (
    <div class={rootClass()} role="grid" {...others}>
      <For each={days()}>
        {(day) => {
          const selected = () => local.value === day;
          return (
            <button
              type="button"
              role="gridcell"
              aria-selected={selected()}
              aria-label={String(day)}
              class={
                selected()
                  ? "sui-dom-picker__cell sui-dom-picker__cell--selected"
                  : "sui-dom-picker__cell"
              }
              onClick={() => local.onChange(day)}
            >
              {day}
            </button>
          );
        }}
      </For>
    </div>
  );
};

export function createDayOfMonthPicker(
  defaults: Partial<DayOfMonthPickerProps>,
): Component<DayOfMonthPickerProps> {
  return (props) => <DayOfMonthPicker {...mergeProps(defaults, props)} />;
}
