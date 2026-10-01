// ============================================
// DayOfMonthPicker curried variants — Depth 1 (zero CSS)
// ============================================
import { createDayOfMonthPicker } from "./DayOfMonthPicker";

/** The 1..28 grid in 2rem cells (seven fit a 360px phone column and a
 *  popover), where the default 3.5rem cells run 392px wide. The cell size is
 *  the picker's own `--dom-cell-size` var, baked here once. */
export const CompactDayOfMonthPicker = createDayOfMonthPicker({
  style: { "--dom-cell-size": "2rem" },
});
