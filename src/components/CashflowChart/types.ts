// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// CashflowChart — DATA SHAPES for the weekly cashflow chart.
//
// This module is the single source of truth for the domain types the weekly
// chart speaks in: the per-week bar record the caller supplies, the wrapping
// chart-data container, the component's public props, and the two internal
// state shapes (segment kind + hover state) the interactive popover threads
// through. Extracted verbatim from CashflowChart.tsx so the component file can
// focus on rendering; the public types (BarLineItem, WeeklyChartBar,
// WeeklyCashflowChartData, WeeklyCashflowChartProps) are re-exported unchanged
// from CashflowChart.tsx and the folder barrel, so this split is invisible to
// consumers.
//
// Nothing here has runtime behavior — these are pure type declarations. The
// segment kinds are a closed union so the popover switch stays exhaustive.

/** A single named line item (revenue or expense) inside a week's bar. */
export interface BarLineItem {
  name: string;
  amount_cents: number;
}

/** One week's worth of stacked revenue/expense bars plus running balance. */
export interface WeeklyChartBar {
  week_start: string; // YYYY-MM-DD (Monday)
  month_label: string; // e.g. "Mar '26" on first week of month, "" otherwise
  revenue_cents: number;
  recurring_revenue_cents: number;
  project_revenue_cents: number;
  product_revenue_cents: number;
  expense_cents: number;
  recurring_expense_cents: number;
  onetime_expense_cents: number;
  balance_cents: number;
  revenue_items: BarLineItem[];
  expense_items: BarLineItem[];
  recurring_expense_items: BarLineItem[];
  onetime_expense_items: BarLineItem[];
  isProjected: boolean;
}

/** The full dataset the weekly chart renders: bars plus optional annotations. */
export interface WeeklyCashflowChartData {
  bars: WeeklyChartBar[];
  todayWeek?: string | null;
  bankruptcyWeek?: string | null;
  bankruptcyDate?: string | null;
}

export interface WeeklyCashflowChartProps {
  data: WeeklyCashflowChartData;
  /**
   * Explicit viewBox height in px. When omitted (the common case), the chart
   * measures its container via a ResizeObserver and renders to that height, so
   * it fills the vertical space its layout box allots it. Pass a number only to
   * pin a fixed height regardless of the container.
   */
  height?: number;
  yMax?: number | null;
}

/** Which stacked segment a hover popover is describing. */
export type WeeklySegmentKind =
  | "revenue"
  | "expense"
  | "exp-recurring"
  | "exp-onetime";

/** Live hover-popover state: which segment, its items, and screen position. */
export interface WeeklyHoverState {
  kind: WeeklySegmentKind;
  items: BarLineItem[];
  total_cents: number;
  week_start: string;
  week_end: string;
  x: number;
  y: number;
}
