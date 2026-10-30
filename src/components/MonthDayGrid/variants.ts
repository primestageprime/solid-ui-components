// ============================================
// MonthDayGrid Curried Variants — Depth 1 (zero CSS)
// ============================================
import type { Component } from "solid-js";
import { createMonthDayGrid, type MonthDayGridDataProps } from "./MonthDayGrid";

/** One weekday-aligned month (Sunday first), multi-select days with counts. */
export const MonthDayGrid: Component<MonthDayGridDataProps> =
  createMonthDayGrid({ weekStart: 0 });

/** The same month with Monday as the first column. */
export const MondayMonthDayGrid: Component<MonthDayGridDataProps> =
  createMonthDayGrid({ weekStart: 1 });
