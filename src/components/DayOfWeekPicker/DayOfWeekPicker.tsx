// ============================================
// DayOfWeekPicker — Atomic (Depth 1)
// Owns CSS (DayOfWeekPicker.css), no component imports.
// A 7-cell single-select row for Sun..Sat. Sibling of
// DayOfMonthPicker; shares its fixed-size `--dom-cell-size`
// sizing approach so the two read as a family.
//   <DayOfWeekPicker value={1} onChange={(d) => ...} />
// value/d is 0=Sun .. 6=Sat. Factory:
// createDayOfWeekPicker() for curried variants.
// ============================================
import {
  type Component,
  For,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
import "./DayOfWeekPicker.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface DayOfWeekPickerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Currently selected day (0=Sun..6=Sat), or null/undefined for none. */
  value?: number | null;
  /** Called with the day index (0=Sun..6=Sat) when a cell is clicked. */
  onChange: (day: number) => void;
  /**
   * Fixed size of each day cell (width and height), as a CSS length.
   * Default "3.5rem". Sets the shared `--dom-cell-size` CSS var so the
   * cells match DayOfMonthPicker.
   */
  cellSize?: string;
}

export const DayOfWeekPicker: Component<DayOfWeekPickerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "cellSize",
    "class",
  ]);

  const rootClass = () =>
    local.class ? `sui-dow-picker ${local.class}` : "sui-dow-picker";

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the day-of-week cell layout
    <div
      class={rootClass()}
      role="grid"
      style={{ "--dom-cell-size": local.cellSize ?? "3.5rem" }}
      {...others}
    >
      <For each={DAY_LABELS}>
        {(label, index) => {
          const day = index();
          const selected = () => local.value === day;
          return (
            // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the day-of-week cell layout
            <button
              type="button"
              role="gridcell"
              aria-selected={selected()}
              aria-label={label}
              class={
                selected()
                  ? "sui-dow-picker__cell sui-dow-picker__cell--selected"
                  : "sui-dow-picker__cell"
              }
              onClick={() => local.onChange(day)}
            >
              {label}
            </button>
          );
        }}
      </For>
    </div>
  );
};

export function createDayOfWeekPicker(
  defaults: Partial<DayOfWeekPickerProps>,
): Component<DayOfWeekPickerProps> {
  return (props) => <DayOfWeekPicker {...mergeProps(defaults, props)} />;
}
