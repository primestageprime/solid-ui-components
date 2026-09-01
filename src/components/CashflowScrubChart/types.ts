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
//   • CashflowLabelZone — where a line's or a marker's label prefers to sit.
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
 * Where a label prefers to sit. A caller cannot see the data, the container
 * width or the theme's font, so a caller cannot know what fits — this is a
 * preference, not a lock. The component walks body → right → below and takes
 * the first zone the label fits. Defaults to "auto", which starts at the top.
 *
 * Per-datum and not a curried variant: one chart's labels routinely need
 * different zones, and a variant would force them all into one.
 */
export type CashflowLabelZone = "auto" | "body" | "right" | "below";

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
  /** Human-readable label (legend / a11y). Optional. When set, it is also
   *  DRAWN on the chart beside the series, at the zone `labelPlacement` asks
   *  for. */
  label?: string;
  /**
   * Where this series' `label` prefers to sit. Defaults to `"auto"`, which
   * walks body → right → below and takes the first zone the text fits.
   *
   * Per-series because one chart routinely needs different zones for
   * different lines: a forecast that ends at the right edge reads best in the
   * gutter, while a flat floor line has room for its caption in the plot
   * body. A curried variant would lock every line on the chart into one zone
   * and lose that. Only an EXPLICIT zone buys frame space; `"auto"` uses
   * whatever another label bought, or the label is dropped in silence.
   */
  labelPlacement?: CashflowLabelZone;
  /** CSS class added to the polyline alongside the base line class.
   *  Color / dash / opacity are the consumer's to define on this class. */
  class?: string;
  /** Balance in cents for the cell at `index`, or `null` to break the line
   *  (e.g. to draw a forecast only for cells after `today`). */
  balanceCents: (cell: CashflowCell, index: number) => number | null;
  /**
   * Which side of the primary running-balance line this series paints on.
   * `"under"` (the default) is the original behaviour — the primary line wins
   * every overlap. `"over"` lifts this series above it.
   *
   * The knob exists for COINCIDENT lines: SVG has no z-index, so paint order
   * is document order, and a dashed scenario that tracks the primary line
   * exactly is covered pixel-for-pixel when drawn underneath. Over the top,
   * both read — the solid line shows through the dashes.
   *
   * Ordering is per-series precisely so one chart can hold both (a range cone
   * beneath, a comparison line above). Series keep their array order within
   * each layer, so the array is still the z-order among overlays; this only
   * picks which layer they sort into.
   */
  layer?: "under" | "over";
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
  /** Small caption rendered at the top of a `"rule"` marker, or placed by the
   *  label ladder when `labelPlacement` names an explicit zone. */
  label?: string;
  /**
   * Where this marker's `label` prefers to sit. Defaults to `"auto"`, which
   * keeps the caption at the top of the marker's own rule — the position
   * every `"rule"` marker had before this field existed.
   *
   * Per-marker because two markers on one chart routinely need different
   * zones: a "Today" rule wants its caption at the top of the plot, while a
   * runway-floor marker sharing that top row would collide with it and belongs
   * in the gutter. A curried variant would force both into one zone. Only an
   * EXPLICIT zone buys frame space.
   */
  labelPlacement?: CashflowLabelZone;
  /**
   * The marker's y value, in cents. Without it the dot lands on the primary
   * balance line (`lineCells()[index].balanceCents`), which is where every
   * marker sat before this field existed. Per-marker because one chart's
   * markers routinely point at values off the primary line — a scenario
   * balance, a threshold, a value with no cell of its own.
   */
  valueCents?: number;
  /**
   * Extra CSS class on this marker's own line and dot ONLY, alongside the
   * shared base class. Per-marker because two markers can share one base
   * class (`.sui-cashflow-scrub-chart__rule-line` for `"rule"` markers) —
   * styling one through that shared class recolours every other marker too.
   */
  class?: string;
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
   *  their values. Drawn in array order beneath the primary running-balance
   *  line, or above it for entries with `layer: "over"`. */
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
   * Optional fixed lower y-bound, in **cents**, mirroring `yMax`. When
   * provided (non-null), the lower bound is pinned to it instead of being
   * auto-derived from the data (the default: `min(0, …balance values)`, so
   * the zero-line stays visible but its PIXEL position drifts between
   * renders as the data's most-negative value changes — two scenarios with
   * different depths of "how bankrupt" render the zero-line at different
   * heights, which makes them uncomparable at a glance). Set this when the
   * caller wants zero pinned at a fixed position across renders instead.
   * Ignored when `yPadFraction` is set (tight-domain mode wins, same as
   * `yMax`'s own interaction with it).
   */
  yMin?: number | null;
  /**
   * Opt into a TIGHT y-domain that frames the visible line(s) instead of being
   * anchored to zero. When set (e.g. `0.1`), the domain becomes
   * `[min − pad, max + pad]` where `pad = fraction × (max − min)` over the drawn
   * balance values — so a line that lives in a narrow band (e.g. a zoomed-in
   * window of an always-positive cumulative total) fills the vertical space
   * instead of hugging the top. The zero-line is no longer forced into view.
   * Ignored when `yMax` is provided (fixed-range mode wins). Default
   * `undefined` = the zero-anchored behavior (no change for current callers).
   */
  yPadFraction?: number;
  /**
   * Override source for the PRIMARY running-balance LINE (and the plotline
   * markers/dots that sit on it), DECOUPLED from the ribbon. When provided, the
   * solid balance polyline, the selected/hover dots, and the marker dots read
   * their balance from these cells (indexed positionally, same geometry as
   * `cells`), while the day-cell ribbon (bars, labels, scrub, selection) keeps
   * deriving from `cells`. When omitted, everything derives from `cells`
   * (backward-compatible). Use it to show one scenario's daily ribbon beneath a
   * different scenario's balance line. Should be the same length as `cells`.
   */
  balanceLineCells?: CashflowCell[];
  /** CSS class added to the PRIMARY balance polyline alongside the base line
   *  class — the counterpart of `CashflowBalanceSeries.class` for the line the
   *  chart draws itself. Color / dash / opacity are the consumer's to define on
   *  this class. */
  lineClass?: string;
  /**
   * Accent color for the day-strip ribbon — draws a 1px border around the
   * ENTIRE ribbon element so the filmstrip reads as belonging to a specific
   * identity. When omitted, the ribbon keeps its default appearance (no
   * border).
   */
  stripAccent?: string;
  /**
   * Dash the ribbon accent border so it matches a dashed scenario line (vs a
   * solid rule). Default false (solid). No effect without `stripAccent`.
   */
  stripAccentDashed?: boolean;
  /**
   * Draw a dim horizontal gridline across the plot at every y-axis tick — the
   * same rules the low-level `Chart` kit draws through its `Grid` slot (solid
   * `--sui-border`, 1px, never dashed). Forwarded to the inner ScrubChart.
   * OPT-IN, default `false`: no existing chart gains chrome it did not ask
   * for. The rules use the SAME tick set as the y-axis labels, so a line
   * never sits where no label is, and they paint BENEATH the balance line,
   * the overlay series and the deviation bands.
   *
   * Undashed on purpose. Every short dash pattern on this chart is already
   * claimed by another line type — the zero line, the runway floor, a
   * comparison scenario, a ghost preview, a marker rule, the selected day,
   * the Today rule, the current-balance rule — so a dashed gridline would
   * read as one of them.
   */
  showGridlines?: boolean;
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
