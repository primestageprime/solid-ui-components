// ============================================
// MonthOfYearPicker — Atomic (Depth 1)
// Owns CSS (MonthOfYearPicker.css), no component imports.
// Compact grid for picking a month of the year (1..12) —
// the natural sibling of DayOfMonthPicker, same visual
// language: uniform cells in a 4-column grid, the selected
// month gets the accent treatment.
//   <MonthOfYearPicker value={4} onChange={(m) => ...} />
// Factory: createMonthOfYearPicker() for curried variants.
// ============================================
import { type Component, For, type JSX, mergeProps, splitProps } from "solid-js";
import "./MonthOfYearPicker.css";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface MonthOfYearPickerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Currently selected month (1..12), or null/undefined for none. */
  value?: number | null;
  /** Called with the month (1..12) when a cell is clicked. */
  onChange: (month: number) => void;
  /**
   * Fixed size of each month cell (width and height), as a CSS length.
   * Default "3.5rem". Sets the `--moy-cell-size` CSS var.
   */
  cellSize?: string;
}

export const MonthOfYearPicker: Component<MonthOfYearPickerProps> = (props) => {
  const [local, others] = splitProps(props, ["value", "onChange", "cellSize", "class"]);
  const rootClass = () =>
    local.class ? `sui-moy-picker ${local.class}` : "sui-moy-picker";
  return (
    <div
      class={rootClass()}
      role="grid"
      style={{ "--moy-cell-size": local.cellSize ?? "3.5rem" }}
      {...others}
    >
      <For each={MONTH_ABBR}>
        {(abbr, i) => {
          const month = () => i() + 1;
          const selected = () => local.value === month();
          return (
            <button
              type="button"
              role="gridcell"
              aria-selected={selected()}
              aria-label={abbr}
              class={
                selected()
                  ? "sui-moy-picker__cell sui-moy-picker__cell--selected"
                  : "sui-moy-picker__cell"
              }
              onClick={() => local.onChange(month())}
            >
              {abbr}
            </button>
          );
        }}
      </For>
    </div>
  );
};

export function createMonthOfYearPicker(
  defaults: Partial<MonthOfYearPickerProps>,
): Component<MonthOfYearPickerProps> {
  return (props) => <MonthOfYearPicker {...mergeProps(defaults, props)} />;
}
