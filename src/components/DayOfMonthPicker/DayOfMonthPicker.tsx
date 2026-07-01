// ============================================
// DayOfMonthPicker — Atomic (Depth 1)
// Owns CSS (DayOfMonthPicker.css), no component imports.
// Compact calendar-style grid for picking a day of the
// month (1..max). Uniform square-ish cells in a 7-column
// grid; the selected day gets the accent treatment.
//   <DayOfMonthPicker value={9} onChange={(d) => ...} />
// Factory: createDayOfMonthPicker() for curried variants.
// ============================================
import {
  type Component,
  For,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
import "./DayOfMonthPicker.css";

export interface DayOfMonthPickerProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Currently selected day (1..max), `"last"` for the last-of-month cell
   *  (lastOfMonth mode), or null/undefined for none. */
  value?: number | "last" | null;
  /** Called with the day (1..max) when a numeric cell is clicked. */
  onChange: (day: number) => void;
  /** Highest day to render. Default 31 (28 in lastOfMonth mode). */
  max?: number;
  /**
   * Months differ in length, so scheduling on day 29–31 is a trap. When set,
   * render days 1..28 plus ONE wide "Last of month" cell (spanning the
   * 29/30/31 slots) that selects the actual last calendar day of each month.
   * Clicking it calls `onSelectLast`; it shows selected when `value === "last"`.
   */
  lastOfMonth?: boolean;
  /** Called when the "Last of month" cell is clicked (lastOfMonth mode). */
  onSelectLast?: () => void;
  /**
   * Fixed size of each day cell (width and height), as a CSS length.
   * Default "3.5rem". Sets the `--dom-cell-size` CSS var.
   */
  cellSize?: string;
}

export const DayOfMonthPicker: Component<DayOfMonthPickerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "max",
    "lastOfMonth",
    "onSelectLast",
    "cellSize",
    "class",
  ]);

  // lastOfMonth mode caps the numeric grid at 28 — the 29/30/31 slots are
  // replaced by the single wide "Last of month" cell.
  const max = () =>
    local.lastOfMonth ? Math.min(local.max ?? 28, 28) : (local.max ?? 31);
  const days = () => Array.from({ length: max() }, (_, i) => i + 1);

  const rootClass = () =>
    local.class ? `sui-dom-picker ${local.class}` : "sui-dom-picker";

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the calendar cell layout
    <div
      class={rootClass()}
      role="grid"
      style={{ "--dom-cell-size": local.cellSize ?? "3.5rem" }}
      {...others}
    >
      <For each={days()}>
        {(day) => {
          const selected = () => local.value === day;
          return (
            // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the calendar cell layout
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
      {local.lastOfMonth && (
        // biome-ignore lint/a11y/useSemanticElements: intentional ARIA grid pattern; native <table> would break the calendar cell layout
        <button
          type="button"
          role="gridcell"
          aria-selected={local.value === "last"}
          aria-label="Last of month"
          class={
            local.value === "last"
              ? "sui-dom-picker__cell sui-dom-picker__cell--last sui-dom-picker__cell--selected"
              : "sui-dom-picker__cell sui-dom-picker__cell--last"
          }
          onClick={() => local.onSelectLast?.()}
        >
          Last of month
        </button>
      )}
    </div>
  );
};

export function createDayOfMonthPicker(
  defaults: Partial<DayOfMonthPickerProps>,
): Component<DayOfMonthPickerProps> {
  return (props) => <DayOfMonthPicker {...mergeProps(defaults, props)} />;
}
