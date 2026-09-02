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
  // A for-of loop, not forEach (no fn.forEach exists; the mutable
  // current/segments accumulation across the scan isn't expressible as a
  // map/filter).
  for (const [i, cell] of cells.entries()) {
    const v = value(cell, i);
    if (v == null) {
      if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
      continue;
    }
    current.push(`${cellToX(i).toFixed(1)},${yToPlot(v).toFixed(1)}`);
  }
  if (current.length > 0) segments.push(current.join(" "));
  return segments;
};

// ── Y-domain resolution ──────────────────────────────────────────────────
//
// Three props state the y-domain and they do not compose: `yMax`, `yMin` and
// `yPadFraction`. The order they resolve in lived only inside one `createMemo`
// branch and in three prop docs, and the docs drifted — `yMin`'s said tight
// mode beat `yMax` when the code says the reverse, and a consumer blocked real
// work on the constraint that doc invented. So the rule is a named function
// with a test per row, and every doc points here instead of restating it.

/** Which rule decided the y-domain. `"fixed"` = an explicit `yMax` pinned the
 *  top, `"tight"` = padded data extent, `"auto"` = data extent floored at 0. */
export type YDomainMode = "fixed" | "tight" | "auto";

/** The three y-domain props, as the resolver reads them. */
export interface YDomainBounds {
  yMax?: number | null;
  yMin?: number | null;
  yPadFraction?: number;
}

/**
 * Which row of the table applies. `yMax` alone picks the mode:
 *
 *   1. `yMax` set                        → "fixed" (`yPadFraction` ignored,
 *                                          `yMin` applies)
 *   2. `yMax` unset + `yPadFraction` set → "tight" (`yMin` IGNORED)
 *   3. neither                           → "auto"
 *
 * `hasValues` is the fourth input rather than a caller's precondition: tight
 * mode has nothing to pad when no line drew a value, so it falls back to auto
 * rather than returning an infinite extent.
 */
export const chartYDomainMode = (
  bounds: YDomainBounds,
  hasValues: boolean,
): YDomainMode => {
  if (bounds.yMax != null) return "fixed";
  if (bounds.yPadFraction != null && hasValues) return "tight";
  return "auto";
};

/** Lowest and highest of a non-empty series in ONE pass. A named step rather
 *  than a pair of `.reduce`s (function-first convention), and a loop rather
 *  than `Math.min(...values)` — a long range would blow the argument limit. */
export const extentOf = (values: readonly number[]): [number, number] => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
};

/**
 * The y-domain for the drawn balance `values`, in cents.
 *
 * "auto" and "fixed" both floor the data extent at 0 so the zero-line stays
 * visible, and "fixed" then overrides whichever bound was stated. "tight" is
 * the zero-INDEPENDENT row: it frames the values with symmetric padding so a
 * line living in a narrow band uses the full height, and a flat series pads
 * around its own value (or ±1 at zero) rather than collapsing to no height.
 */
export const chartYDomain = (
  values: readonly number[],
  bounds: YDomainBounds,
): [number, number] => {
  if (chartYDomainMode(bounds, values.length > 0) === "tight") {
    const [dataLo, dataHi] = extentOf(values);
    const spread = dataHi - dataLo || Math.abs(dataHi) || 1;
    const pad = spread * (bounds.yPadFraction as number);
    return [dataLo - pad, dataHi + pad];
  }
  const [autoLo, autoHi] = extentOf([0, ...values]);
  return [bounds.yMin ?? autoLo, bounds.yMax ?? autoHi];
};
