// ============================================
// CashflowScrubChart — pure formatting + geometry helpers.
//
// The deterministic, DOM-free logic behind the cashflow ribbon: how a signed
// cent amount reads as a label, how a magnitude maps to a bar-fill fraction,
// and how a balance accessor becomes SVG polyline point strings. Splitting
// these out keeps the component module focused on the reactive render tree,
// and keeps the "same input → same output" arithmetic unit-testable in
// isolation (no Solid, no ScrubChart context).
//
// Nothing here is exported from the folder barrel — these are INTERNAL siblings
// consumed only by `CashflowScrubChart.tsx`. Every function is pure: given the
// same arguments it returns the same value and mutates nothing the caller owns.
// ============================================

import {
  formatCompactNumber,
  formatGroupedNumber,
} from "../../internal/format/number";
import type { CashflowCell } from "./types";

/** Signed dollar label — `+$1,234` / `−$1,234` — for the per-day amount row. */
export const fmtDollars = (cents: number): string => {
  const sign = cents < 0 ? "−" : "+";
  return `${sign}$${formatGroupedNumber(Math.abs(cents) / 100)}`;
};

// Y-axis labels — unsigned compact dollars ("$3.4k" / "$1.2M") with a `−`
// prefix for negatives (the minus the compact core emits is swapped for the
// typographic one used across the ribbon).
export const fmtAxisDollars = (cents: number): string => {
  const dollars = cents / 100;
  const compact = formatCompactNumber(dollars);
  return dollars < 0 ? `−$${compact.replace(/^-/, "")}` : `$${compact}`;
};

export const formatCornerLabel = (cell: CashflowCell): string => {
  const day = cell.start.getUTCDate();
  // First / last day of month gets a "Jun 30" / "Jul 1" style label so the
  // ribbon stays scannable across month boundaries.
  const isFirstOfMonth = day === 1;
  const next = new Date(cell.start.getTime() + 24 * 60 * 60 * 1000);
  const isLastOfMonth = next.getUTCMonth() !== cell.start.getUTCMonth();
  if (isFirstOfMonth || isLastOfMonth) {
    return `${cell.start.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    })} ${day}`;
  }
  return String(day);
};

// Magnitude → bar fill fraction (0..1), LINEAR against the largest |cashflow|
// across the strip so bar heights are proportionate to their amounts (a fixed
// clamp made a $1.7k bar read as 80% of an $8.4k bar). Tiny non-zero days keep
// a 4% floor so they stay distinguishable from true-zero (bar-less) days.
export const BAR_MIN_FRACTION = 0.04;
export const barFraction = (cents: number, maxAbsCents: number): number => {
  if (cents === 0 || maxAbsCents <= 0) return 0;
  return Math.max(BAR_MIN_FRACTION, Math.abs(cents) / maxAbsCents);
};

// Map a balance accessor over the cells into one or more polyline point
// strings, splitting on every `null` so a gap breaks the line rather than
// connecting across it. Pure: same cells + accessor → same segments.
export const buildLineSegments = (
  cells: CashflowCell[],
  cellToX: (i: number) => number,
  yToPlot: (cents: number) => number,
  value: (cell: CashflowCell, index: number) => number | null,
): string[] => {
  const segments: string[] = [];
  let current: string[] = [];
  cells.forEach((cell, i) => {
    const v = value(cell, i);
    if (v == null) {
      if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
      return;
    }
    current.push(`${cellToX(i).toFixed(1)},${yToPlot(v).toFixed(1)}`);
  });
  if (current.length > 0) segments.push(current.join(" "));
  return segments;
};
