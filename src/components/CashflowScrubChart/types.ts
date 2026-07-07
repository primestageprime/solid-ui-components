// ============================================
// CashflowScrubChart — public type surface.
//
// The prop/payload vocabulary for the CashflowScrubChart domain composite,
// split out from the component module so the shapes can be read (and imported)
// without pulling in the Solid render tree. Everything here is re-exported by
// the folder barrel (`index.ts`) — these are the PUBLIC names consumers depend
// on, so their identifiers and doc comments must not drift.
//
// The vocabulary layers from the atom outward:
//
//   • CashflowCell — one day's payload (net flow + running balance, in cents).
//   • CashflowSeriesFill — how to shade the variance between an overlay series
//     and a reference line (surplus green / shortfall red, split at crossings).
//   • CashflowBalanceSeries — an extra balance line overlaid on the chart, with
//     an optional `fill` band.
//   • CashflowChartMarker — one plotline marker pinned to a cell index.
//   • CashflowScrubChartProps — the component's full call-site contract.
//
// Kept as a leaf module: it imports only the `Cell` base type from DateAxis and
// has no runtime side effects, so importing it is cheap and cycle-free.
// ============================================

import type { JSX } from "solid-js";
import type { Cell } from "../DateAxis";

/**
 * Payload shape for each day-cell. `cashflowCents` is the day's net flow
 * (negative for an expense day); `balanceCents` is the cumulative running
 * balance through that day.
 */
export type CashflowCell = Cell & {
  cashflowCents: number;
  balanceCents: number;
};

/**
 * Draws a deviation band between this series and a reference line (the primary
 * running-balance line by default), coloured by the sign of the deviation:
 * `positiveClass` where this series runs ABOVE the reference, `negativeClass`
 * where it dips below. Defaults read as a surplus/shortfall chart — green
 * where the series exceeds the reference, red where it falls short. The band
 * is split at every crossing so the colour flips exactly where the lines meet.
 */
export interface CashflowSeriesFill {
  /** Reference line the deviation is measured against. Defaults to the primary
   *  running-balance line (`cell.balanceCents`). Return `null` to break the
   *  band over a cell. */
  baseline?: (cell: CashflowCell, index: number) => number | null;
  /** CSS class for the region where the series is above the reference
   *  (positive deviation). Falls back to the default green band style. */
  positiveClass?: string;
  /** CSS class for the region where the series is below the reference
   *  (negative deviation). Falls back to the default red band style. */
  negativeClass?: string;
}

/**
 * An extra balance line overlaid on the running-balance chart, in addition to
 * the primary line drawn from `cell.balanceCents`. Useful for scenario
 * forecasts, a prior period, or a second account's running balance.
 */
export interface CashflowBalanceSeries {
  /** Stable identity — used to key the rendered line. */
  id: string;
  /** Human-readable label (legend / a11y). Optional. */
  label?: string;
  /** CSS class added to the polyline alongside the base line class.
   *  Color / dash / opacity are the consumer's to define on this class. */
  class?: string;
  /** Balance in cents for the cell at `index`, or `null` to break the line
   *  (e.g. to draw a forecast only for cells after `today`). */
  balanceCents: (cell: CashflowCell, index: number) => number | null;
  /** When set, shade the variance between this series and a baseline line,
   *  green where this series is higher and red where lower. */
  fill?: CashflowSeriesFill;
}

/** One plotline marker: the cell index it sits on, optionally selected. */
export interface CashflowChartMarker {
  index: number;
  selected?: boolean;
  /**
   * Visual treatment. `"flag"` (default) is the instance marker: a dashed
   * rule dropping from a flag at the plot top to a dot on the balance line,
   * clickable via `onMarkerClick`. `"rule"` is a reference line: a full-height
   * dotted rule with its `label` always visible at the top — non-interactive
   * (no flag, no dot, no click) — for marking a date like "Today" rather than
   * a selectable instance.
   */
  variant?: "flag" | "rule";
  /** Small caption rendered at the top of a `"rule"` marker. */
  label?: string;
}

export interface CashflowScrubChartProps {
  cells: CashflowCell[];
  /** Selected day index. Optional in plain (scrub=false) mode. */
  selected?: number;
  /** Scrub callback. Optional in plain (scrub=false) mode. */
  onScrub?: (index: number, cell: CashflowCell) => void;
  /**
   * Scrub layer toggle, forwarded to the inner ScrubChart. Default `true`:
   * the daily filmstrip ribbon, the window-band minimap, the pointer
   * gestures, and the selected-day rule + dot. Set `false` for the PLAIN
   * time series — the same running-balance line, overlay series, deviation
   * bands, and axes with the entire scrub layer composed off. One chart
   * codebase: Timeline composes the scrub + filmstrip on; overview pages
   * (console / configure / calibrate) render just the series.
   */
  scrub?: boolean;
  /**
   * PLOTLINE MARKERS — vertical dashed rules dropping from a flag at the top
   * of the plot to a dot ON the running-balance line, marking the dates a
   * chosen config fires. `selected` circles that instance. Rendered in the
   * overlay layer (above the scrub gestures) so the dots are CLICKABLE:
   * `onMarkerClick` fires with the marker's cell index. Off by default.
   * A marker with `variant: "rule"` renders instead as a non-interactive
   * labelled reference rule (see `CashflowChartMarker.variant`).
   */
  markers?: CashflowChartMarker[];
  onMarkerClick?: (index: number, cell: CashflowCell) => void;
  /** Recenter the detail ribbon on a cell (fresh object per request) —
   *  forwarded to ScrubChart. */
  centerOn?: { index: number } | null;
  /** Date used by the inner DateAxis for the today highlight. */
  today?: Date;
  /** Chart drawing-area height in px. Default 200. */
  chartHeight?: number;
  /** Width of one axis cell in px. Default 60 — matches the cashflow cell content. */
  cellWidth?: number;
  /** Extra balance lines overlaid on the chart. The y-domain widens to span
   *  their values. Drawn beneath the primary running-balance line. */
  balanceSeries?: CashflowBalanceSeries[];
  /**
   * Optional fixed upper y-bound, in **cents** (same semantics as
   * `WeeklyCashflowChart.yMax`). When provided (non-null), the chart's upper
   * y-domain is pinned to this value instead of auto-deriving from the running
   * balance — "fixed-range" mode. When `null`/`undefined` (the default), the
   * upper bound is auto-derived as before (no behavior change for current
   * callers). The lower bound is left auto-derived either way, but is always
   * pulled to `≤ 0` so the zero-line stays visible; an explicit `yMax` smaller
   * than the actual peak balance simply clips the top of the line.
   */
  yMax?: number | null;
  /**
   * Enable the passive hover readout — a transient vertical crosshair at the
   * hovered day, a hollow dot on every line, and (with `renderHoverTooltip`)
   * a positioned tooltip card. Coexists with the persistent scrub selection.
   * Off by default.
   */
  hover?: boolean;
  /**
   * Tooltip body for the hovered day. Receives the hovered `cell` and its
   * `index`; return the rows to display. The card chrome + positioning are
   * owned by the chart. When absent, the crosshair + dots draw with no card.
   */
  renderHoverTooltip?: (cell: CashflowCell, index: number) => JSX.Element;
}
