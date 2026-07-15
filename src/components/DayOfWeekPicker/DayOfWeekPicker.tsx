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
import { Grid } from "../Layout/Grid";
import "./DayOfWeekPicker.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface DayOfWeekPickerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Currently selected day (0=Sun..6=Sat), or null/undefined for none. */
  value?: number | null;
  /** Called with the day index (0=Sun..6=Sat) when a cell is clicked. */
  onChange: (day: number) => void;
}

export const DayOfWeekPicker: Component<DayOfWeekPickerProps> = (props) => {
  const [local, others] = splitProps(props, ["value", "onChange", "class"]);

  const rootClass = () =>
    local.class ? `sui-dow-picker ${local.class}` : "sui-dow-picker";

  // The 7-column grid is composed from the Layout Grid primitive (columns +
  // gap:xs); the cells stay intrinsic (each centers its own day label). Cell
  // size is the frozen --dom-cell-size fallback (3.5rem) shared with
  // DayOfMonthPicker — baked into the columns track and cell CSS.
  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the day-of-week cell layout
    <Grid
      columns="repeat(7, var(--dom-cell-size, 3.5rem))"
      gap="xs"
      class={rootClass()}
      role="grid"
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
    </Grid>
  );
};

export function createDayOfWeekPicker(
  defaults: Partial<DayOfWeekPickerProps>,
): Component<DayOfWeekPickerProps> {
  return (props) => <DayOfWeekPicker {...mergeProps(defaults, props)} />;
}
