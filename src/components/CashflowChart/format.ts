// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// CashflowChart — PURE FORMATTERS + LAYOUT CONSTANTS for the weekly chart.
//
// Everything here is deterministic and DOM-free: given the same inputs it
// always returns the same string/value with no side effects, so it is trivially
// unit-testable in isolation and safe to call from anywhere in the render tree.
//
// Contents:
//   • formatDollars      — compact cents → "$2k" / "-$400" axis + dot labels.
//   • formatDollarsLong  — full cents → "$1,657.99" popover totals.
//   • formatWeekRange    — a week_start (Monday) → a human "Mar 3 – Mar 9, 2026"
//                          span plus the computed week-end date string.
//   • linePath           — points → an SVG "M x y L x y …" polyline (the tiny
//                          inlined stand-in for d3-shape used by the balance line).
//   • MONTH_NAMES        — the abbreviations formatWeekRange indexes into.
//   • PAD                — the chart's inner margins (top/right/bottom/left).
//   • WEEKLY_SEGMENT_LABELS — human labels for each hover segment kind.
//   • MIN_CHART_HEIGHT   — floor so the measured container never collapses.
//
// Extracted verbatim from CashflowChart.tsx; these are internal siblings (not
// part of the public API) that the component re-imports.

import type { WeeklySegmentKind } from "./types";
import { pipe, map, join } from "../../fn";

/** Floor for the measured container height so the chart never collapses to nothing. */
export const MIN_CHART_HEIGHT = 160;

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Compact cents → dollar label: 165799 → "$2k", -40000 → "-$400", 0 → "$0". */
export function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  if (dollars >= 1000) return `${sign}$${(dollars / 1000).toFixed(0)}k`;
  return `${sign}$${Math.round(dollars)}`;
}

/** Full cents → dollar label with cents: 165799 → "$1,657.99". */
export function formatDollarsLong(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format "Mar 3 – Mar 9, 2026" from a week_start YYYY-MM-DD; also returns week end. */
export function formatWeekRange(weekStart: string): {
  label: string;
  end: string;
} {
  const s = new Date(`${weekStart}T00:00:00`);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const sMonth = MONTH_NAMES[s.getMonth()];
  const eMonth = MONTH_NAMES[e.getMonth()];
  const end = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
  if (sMonth === eMonth) {
    return {
      label: `${sMonth} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`,
      end,
    };
  }
  return {
    label: `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`,
    end,
  };
}

/** Build an SVG polyline path "M x y L x y …" from a list of points. */
export function linePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  return pipe(
    points,
    map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    join(" "),
  );
}

/** Chart inner margins. */
export const PAD = { top: 20, right: 20, bottom: 48, left: 64 };

export const WEEKLY_SEGMENT_LABELS: Record<WeeklySegmentKind, string> = {
  revenue: "Revenue",
  expense: "Expenses",
  "exp-recurring": "Recurring Expenses",
  "exp-onetime": "One-Time Expenses",
};
