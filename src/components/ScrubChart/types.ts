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

  // ── Y-axis (optional) ────────────────────────────────────────────────

  /** Domain (data-units) of the y-axis. When set, ScrubChart reserves a
   *  left margin, draws ticks + labels, and exposes `yToPlot` in the ctx. */
  yDomain?: [number, number];
  /** Format y-axis tick values for display. Default: locale number. */
  formatYLabel?: (value: number) => string;
  /** Approximate number of y-axis ticks. Default 5. d3-scale picks the
   *  nearest "nice" count. */
  yTickCount?: number;
  /** Distance in px from the container's left edge to the y-axis line.
   *  Defaults to the narrowest width that fits the longest formatted label
   *  (computed via canvas text measurement, with an 8px gap to the axis
   *  line). Set explicitly only when you need two charts' y-axes to align
   *  to the same column. No effect unless `yDomain` is set. */
  yAxisWidth?: number;

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
   *  when `xTickCadence !== "none"`; otherwise 0. */
  xAxisHeight?: number;
}

/**
 * Props that are visual / structural overrides — locked at variant-definition
 * time. Just the sizing knobs; everything else is data or a callback.
 */
export type ScrubChartOverrides<C extends Cell> = Pick<
  ScrubChartProps<C>,
  "chartHeight" | "cellWidth" | "yAxisWidth" | "xAxisHeight"
>;

/** Props that remain available to consumers of a curried ScrubChart variant. */
export type ScrubChartDataProps<C extends Cell> = Omit<
  ScrubChartProps<C>,
  keyof ScrubChartOverrides<C>
>;
