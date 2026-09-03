// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — public type surface.
//
// Extracted verbatim from ScrubChart.tsx so the component module can stay
// focused on rendering + wiring. These are the names the folder's barrel
// (index.ts) re-exports, so they MUST keep their exact identifiers and shapes:
//
//   • ScrubChartXTickCadence  — the cadence enum a consumer asks for.
//   • ScrubChartHighlight     — one shaded band spanning a cell range.
//   • ResolvedXTickCadence    — the cadence actually chosen (never auto/none).
//   • ScrubChartContext<C>    — the render-slot context handed to renderChart.
//   • ScrubChartProps<C>      — the full prop surface of <ScrubChart>.
//   • ScrubChartOverrides<C>  — the sizing knobs createScrubChart bakes in.
//   • ScrubChartDataProps<C>  — the props a curried variant still exposes.
//
// Pure types only — no runtime values live here. The geometry helpers and
// default formatters live in helpers.ts; the component + factory in
// ScrubChart.tsx.
// ============================================

import type { JSX } from "solid-js";
import type { Cell, DateAxisCellContext } from "../DateAxis";
import type { ScrubChartYFitPin, ScrubChartYScaleMode } from "./yScaleMode";

export type { ScrubChartYFitPin, ScrubChartYScaleMode } from "./yScaleMode";

/** Cadence at which to emit x-axis ticks. Cells whose `start` matches the
 *  cadence's anchor get a labelled tick. `"auto"` picks the finest cadence
 *  whose candidate count fits under `xMaxTicks` — week → month → quarter →
 *  year, falling back to a strided coarsest cadence for very long ranges. */
export type ScrubChartXTickCadence =
  | "none"
  | "auto"
  | "week"
  | "month"
  | "quarter"
  | "year";

/** Resolved cadence — never `"auto"` or `"none"`, just the unit actually used. */
export type ResolvedXTickCadence = "week" | "month" | "quarter" | "year";

/**
 * One HIGHLIGHT BAND: a shaded rect spanning the cells from `from` to `to`,
 * drawn beneath the series so the data still reads over it — "this stretch of
 * the x-axis means something" (a funding gap, a forecast horizon, a quarter).
 *
 * The range is stated in CELL INDICES, not pixels or dates, because a caller
 * already picks its cells and the chart already owns the index → pixel map.
 * Both ends are INCLUSIVE and cover the FULL cell, so a one-cell band is
 * `{ from: i, to: i }` and it spans that cell's whole width — the same
 * convention the window band follows. ScrubChart clamps both ends to the cell
 * range and swaps them when `from > to`, so a band computed from live data
 * cannot draw outside the plot.
 *
 * Vertical extent is the whole plot; there is no y range. A band bounded in y
 * is a different shape — see `CashflowBalanceSeries.fill` for that one.
 */
export interface ScrubChartHighlight {
  /** First cell index inside the band (inclusive). */
  from: number;
  /** Last cell index inside the band (inclusive). */
  to: number;
  /** Extra CSS class on this band's rect ONLY, alongside the shared base class
   *  (`.sui-scrub-chart__highlight`) — fill and opacity are the consumer's to
   *  define on this class. Per-band because two bands on one chart routinely
   *  carry different meanings, and styling one through the shared base class
   *  recolours every other band too. */
  class?: string;
}

/** Context passed to the consumer's `renderChart`. */
export interface ScrubChartContext<C extends Cell> {
  /** Centre x in chart pixels for the cell at `index`. Linear, offset by `plotLeft`. */
  cellToX(index: number): number;
  /** [leftX, rightX] in chart pixels for the cell at `index`, offset by `plotLeft`. */
  cellBounds(index: number): [number, number];
  /** Width of one cell in chart pixels (`plotWidth / cells.length`). */
  dayPitch: number;
  /** Selected cell's index. */
  selected: number;
  /** Full cell array, for iteration + payload access. */
  cells: C[];
  /** [firstIndex, lastIndex] of cells currently visible in the axis viewport. */
  windowCells: [number, number];
  /** [leftX, rightX] in chart pixels covering the visible-window cells, offset by `plotLeft`. */
  windowBounds: [number, number];
  /** Full chart frame width in px (includes y-axis margin). */
  width: number;
  /** Full chart frame height in px (includes x-axis margin). */
  height: number;
  /** Inner plot region — area where the chart series should be drawn. */
  plotLeft: number;
  plotTop: number;
  plotRight: number;
  plotBottom: number;
  plotWidth: number;
  plotHeight: number;
  /** Maps a y-domain value to a pixel y inside the plot region. Present
   *  only when `yDomain` was supplied. */
  yToPlot: ((value: number) => number) | null;
  /** The hovered cell index, or `null` when not hovering. Populated only in
   *  the `renderHoverOverlay` slot (it is `null` in `renderChart` /
   *  `renderChartOverlay` so those don't re-run on every pointer move). */
  hoverIndex: number | null;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  /** Selected cell index. Optional in plain (scrub=false) mode. */
  selected?: number;
  /** Selection callback. Optional in plain (scrub=false) mode. */
  onScrub?: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;
  /** Optional layer rendered ABOVE the gesture overlay — pointer events reach
   *  it, so it can host clickable decorations (e.g. CashflowScrubChart's
   *  plotline markers). Off by default; same ctx as `renderChart`. */
  renderChartOverlay?: (ctx: ScrubChartContext<C>) => JSX.Element;
  /** Enable the passive hover readout: a pointer-move listener on the chart
   *  frame tracks the nearest cell (`hoverIndex`), suppressed during an active
   *  pan-drag and cleared on pointer-leave. Off by default — no other
   *  consumer changes. */
  hover?: boolean;
  /** Rendered in a `pointer-events:none` layer above all chrome while
   *  hovering (requires `hover`). Its `ctx.hoverIndex` carries the live
   *  hovered index; return `null` to draw nothing. */
  renderHoverOverlay?: (ctx: ScrubChartContext<C>) => JSX.Element;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;

  /** When set (a fresh object per request), scroll the detail ribbon so the
   *  cell at `index` is CENTERED in the axis viewport — "recenter the scrub".
   *  Object identity is the trigger, so re-centering on the same index works.
   *  Scrub mode only (plain mode has no ribbon). */
  centerOn?: { index: number } | null;

  /**
   * Scrub layer toggle. Default `true` — the full overview+detail pairing:
   * the DateAxis cell ribbon below the chart, the window-band minimap
   * overlay, and the pointer pan / click-to-scrub gestures. Set `false` for
   * a PLAIN time series: the same chart frame, axes, and `renderChart`
   * series with the entire scrub layer composed off (no ribbon, no window
   * band, no pointer interaction, no selection). One codebase — pages that
   * need scrubbing and pages that just need the series share everything
   * but this flag.
   */
  scrub?: boolean;

  /** Chart drawing-area height in px. Default 200. Includes any reserved
   *  x-axis margin. */
  chartHeight?: number;
  /** Width of one axis cell in px. Default 40. */
  cellWidth?: number;
  /** Accent color for the detail ribbon — draws a 1px border around the ENTIRE
   *  DateAxis ribbon element (scrub mode only). Omitted → default appearance,
   *  no border. */
  ribbonAccent?: string;
  /** Dash the ribbon accent border (matches a dashed scenario line) instead of
   *  a solid rule. Default false (solid). No effect without `ribbonAccent`. */
  ribbonAccentDashed?: boolean;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;

  // ── Highlight bands (optional) ───────────────────────────────────────

  /** Shaded bands over cell ranges, drawn BENEATH the gridlines and the
   *  `renderChart` series so the data paints over them. Default: none. Bands
   *  render in array order, so a later band paints over an earlier one where
   *  they overlap. See `ScrubChartHighlight`. */
  highlights?: ScrubChartHighlight[];

  // ── Y-axis (optional) ────────────────────────────────────────────────

  /** Domain (data-units) of the y-axis. When set, ScrubChart reserves a
   *  left margin, draws ticks + labels, and exposes `yToPlot` in the ctx.
   *  `yFitDomain` wins when it is set and returns a domain; this prop is the
   *  fallback. With neither prop there is no y-axis. */
  yDomain?: [number, number];
  /**
   * Y-domain for a cell range, in data units. ScrubChart calls it with the
   * VISIBLE window in "visible" mode and with the WHOLE cell range in
   * "series" mode. Both ends are INCLUSIVE cell indices, matching
   * `ScrubChartHighlight`. Return `null` to fall back to `yDomain`.
   *
   * The callback exists because `renderChart` is a slot: ScrubChart never
   * sees the values, so the caller states the extent. Return the RAW extent
   * of the range — ScrubChart pads it, snaps it, and applies `yFitPin`.
   *
   * Setting this prop also renders the fit toggle at the bottom-left of the
   * chart frame.
   */
  yFitDomain?: (from: number, to: number) => [number, number] | null;
  /** Fraction of the fitted extent added above and below a FREE end.
   *  Default 0.08. A pinned end takes no margin. No effect without
   *  `yFitDomain`. */
  yFitMargin?: number;
  /**
   * Hold one or both ends of the fitted domain at a fixed value.
   *
   * A pinned end ignores the fitted extent, the margin and the nice() snap,
   * and renders exactly as given; the free end still gets all three. `min`
   * and `max` apply to BOTH modes. A mode key overrides them for that mode
   * only. No effect without `yFitDomain`.
   */
  yFitPin?: ScrubChartYFitPin;
  /**
   * Milliseconds the fitted y-domain takes to reach a new target. `false`
   * disables the tween and the domain snaps. Default 240.
   *
   * No effect on a static `yDomain` — only the fitted domain animates, so no
   * existing chart gains motion it did not ask for. The tween RETARGETS: a
   * new domain arriving mid-flight is followed from wherever the axis has
   * reached, which is what a pan needs (the domain changes on every frame).
   * A reader who sets `prefers-reduced-motion: reduce` gets the target at
   * once, whatever this prop says.
   */
  yFitTransition?: number | false;
  /** Which cell range sets the y extent. Controlled: omit it and ScrubChart
   *  owns the signal, starting at "visible". No effect without
   *  `yFitDomain`. */
  yScaleMode?: ScrubChartYScaleMode;
  /** Fires when the user picks a segment of the fit toggle. */
  onYScaleModeChange?: (mode: ScrubChartYScaleMode) => void;
  /** Format y-axis tick values for display. Default: locale number. */
  formatYLabel?: (value: number) => string;
  /** Approximate number of y-axis ticks. Default 5. d3-scale picks the
   *  nearest "nice" count. */
  yTickCount?: number;
  /**
   * Draw a horizontal gridline across the plot at every y-axis tick — the
   * same rules `Chart`'s `Grid` slot draws for the low-level chart kit
   * (solid `--sui-border`, 1px, never dashed). OPT-IN: default `false`, so
   * no existing chart gains chrome it did not ask for. The rules use the
   * SAME tick set as the y-axis labels, so a line never sits where no label
   * is, and they render BENEATH the `renderChart` series. Horizontal only —
   * there is no x-tick counterpart yet. No effect unless `yDomain` is set.
   */
  showGridlines?: boolean;
  /** Distance in px from the container's left edge to the y-axis line.
   *  Defaults to the narrowest width that fits the longest formatted label
   *  (computed via canvas text measurement, with an 8px gap to the axis
   *  line). With `yFitDomain` set, that default is also at least wide enough
   *  for the fit control that sits in the column, so short labels such as "0"
   *  and "1" still leave the button room. Set explicitly only when you need
   *  two charts' y-axes to align to the same column: an explicit width is
   *  used AS GIVEN, and one narrower than the control clips it. No effect
   *  unless `yDomain` or `yFitDomain` is set. */
  yAxisWidth?: number;

  // ── Right gutter (optional) ─────────────────────────────────────────

  /** Width in px reserved past the plot's right edge — feeds the `after`
   *  argument of the horizontal inset span. `yAxisWidth` above is the
   *  precedent: same role, opposite side. The one difference is that this
   *  side is never auto-measured, because nothing here knows how wide a
   *  caller's right-side content is (e.g. `CashflowScrubChart`'s
   *  right-zone labels) — the caller states the width it needs. Default 0,
   *  so no existing chart's plot narrows until a caller asks for the room. */
  rightGutter?: number;

  // ── X-axis (optional) ────────────────────────────────────────────────

  /** Cadence at which to emit labelled x-axis ticks. Default "none". */
  xTickCadence?: ScrubChartXTickCadence;
  /** Maximum number of x-axis ticks to render. Default 12. Used by the
   *  `"auto"` cadence to pick a coarse-enough unit, and to stride non-auto
   *  cadences whose raw candidate count is too high. */
  xMaxTicks?: number;
  /** Format an x-axis tick label. Receives the anchor cell and the cadence
   *  finally chosen (useful when `xTickCadence="auto"` — formatter can vary
   *  output by unit). Default: per-cadence sensible label. */
  formatXLabel?: (cell: C, cadence: ResolvedXTickCadence) => string;
  /** Pixel height reserved at the bottom for x-axis labels. Default 22
   *  when `xTickCadence !== "none"`; otherwise 0. This SETS the axis row's
   *  height — see `xAxisExtraHeight` below, which ADDS to it instead. */
  xAxisHeight?: number;
  /**
   * Extra height in px ADDED under the x-axis row, on top of whatever
   * `xAxisHeight` computes (the 22px default, an explicit override, or the
   * 0 that applies when `xTickCadence` is `"none"`). Where `xAxisHeight`
   * SETS the row's height, this ADDS to it: pass both and they stack —
   * `(xAxisHeight ?? default-or-zero) + xAxisExtraHeight`.
   *
   * Applies even when `xTickCadence` is `"none"` and the base height is 0.
   * The reservation is for a caller-owned row below the axis (e.g.
   * `CashflowScrubChart`'s below-zone labels), which is unrelated to
   * whether tick labels are drawn — a chart with no ticks can still need
   * room for a label row. Default 0, so no existing chart's x-axis height
   * changes.
   */
  xAxisExtraHeight?: number;
}

/**
 * Props that are visual / structural overrides — locked at variant-definition
 * time. Just the sizing knobs; everything else is data or a callback.
 */
export type ScrubChartOverrides<C extends Cell> = Pick<
  ScrubChartProps<C>,
  | "chartHeight"
  | "cellWidth"
  | "yAxisWidth"
  | "xAxisHeight"
  | "rightGutter"
  | "xAxisExtraHeight"
>;

/** Props that remain available to consumers of a curried ScrubChart variant. */
export type ScrubChartDataProps<C extends Cell> = Omit<
  ScrubChartProps<C>,
  keyof ScrubChartOverrides<C>
>;
