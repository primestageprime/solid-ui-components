/**
 * Recurrence pickers — DayOfWeekPicker, DayOfMonthPicker, MonthOfYearPicker.
 *
 * Three compact grid pickers that share one visual language: uniform cell
 * buttons in a fixed-column grid, one selected at a time. Controlled via
 * value/onChange. The grid container composes the Layout `Grid` primitive; the
 * cells stay intrinsic (each centers its own label).
 */
import { type Component, createSignal } from "solid-js";
import { DayOfWeekPicker } from "../../src/components/DayOfWeekPicker";
import { DayOfMonthPicker } from "../../src/components/DayOfMonthPicker";
import { MonthOfYearPicker } from "../../src/components/MonthOfYearPicker";

export const PickersShowcase: Component = () => {
  const [dow, setDow] = createSignal<number | null>(1);
  const [dom, setDom] = createSignal<number | "last" | null>(9);
  const [moy, setMoy] = createSignal<number | null>(4);

  return (
    <div class="component-section">
      <h2>Recurrence pickers</h2>
      <p class="text-meta">
        Compact grid pickers (day-of-week, day-of-month, month-of-year). Uniform
        cell buttons in a fixed-column grid; controlled via value/onChange. The
        grid container composes the Layout Grid primitive; cells stay intrinsic.
      </p>

      <div class="example-group">
        <h3>DayOfWeekPicker (7 cells)</h3>
        <DayOfWeekPicker value={dow()} onChange={setDow} />
        <div class="text-meta" style={{ "margin-top": "8px" }}>
          selected: {String(dow())}
        </div>
      </div>

      <div class="example-group">
        <h3>DayOfMonthPicker (1..31 + last)</h3>
        <DayOfMonthPicker
          value={dom()}
          onChange={setDom}
          onSelectLast={() => setDom("last")}
        />
        <div class="text-meta" style={{ "margin-top": "8px" }}>
          selected: {String(dom())}
        </div>
      </div>

      <div class="example-group">
        <h3>MonthOfYearPicker (12 cells, 4 columns)</h3>
        <MonthOfYearPicker value={moy()} onChange={setMoy} />
        <div class="text-meta" style={{ "margin-top": "8px" }}>
          selected: {String(moy())}
        </div>
      </div>
    </div>
  );
};
