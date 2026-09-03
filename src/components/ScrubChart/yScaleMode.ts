// lastReviewedAt: 2026-09-02
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — y-scale-mode pipeline (pure, no Solid reactivity).
//
// The y-scale toggle picks WHICH CELL RANGE sets the y extent. Both states
// are fits:
//
//   • "visible" — fit the cells currently visible in the DateAxis viewport.
//   • "series"  — fit every cell in the series.
//
// ScrubChart asks the caller's `yFitDomain(from, to)` for the extent of that
// range, because `renderChart` is a slot: the chart never sees the values.
// This module holds the pure steps around that call:
//
//   • fitCellRange(mode, windowCells, cellCount) — the range to ask about.
//   • fitYDomain(extent, mode, pin, margin, tickCount) — the domain to draw.
//
// ScrubChart.tsx keeps the reactive wiring and the markup.
// ============================================

import { scaleLinear } from "d3-scale";

/** Which cell range sets the y extent. See the module header. */
export type ScrubChartYScaleMode = "visible" | "series";

/**
 * Hold one or both ends of the fitted domain at a fixed value.
 *
 * The pin is a PROP, not the caller's job, because the callback returns a RAW
 * extent and ScrubChart pads it afterwards. A caller who returns 0 as the min
 * watches the margin push that 0 below zero. Only ScrubChart knows the padding
 * step, so only ScrubChart can hold an end exactly.
 *
 * `min` and `max` apply to BOTH modes. A mode key overrides them for that mode
 * only, so `{ min: 0, series: { min: -500 } }` pins the floor at 0 in the
 * visible fit and at -500 in the series fit.
 */
export interface ScrubChartYFitPin {
  /** Fixed low end, in data units, for both modes. */
  min?: number;
  /** Fixed high end, in data units, for both modes. */
  max?: number;
  /** Pin for "visible" mode only. Wins over `min` / `max`. */
  visible?: { min?: number; max?: number };
  /** Pin for "series" mode only. Wins over `min` / `max`. */
  series?: { min?: number; max?: number };
}

/** Fraction of the fitted extent added above and below a free end. */
export const DEFAULT_Y_FIT_MARGIN = 0.08;

/** Span applied when an extent, or a pinned result, has zero height. */
const FLAT_EXTENT_SPAN = 1;

/**
 * The cell range a mode fits. Both ends are INCLUSIVE cell indices, which is
 * the convention `ScrubChartHighlight` and `windowCells` already follow.
 *
 * @param mode "visible" answers the axis viewport, "series" answers all cells.
 * @param windowCells The cells currently visible in the axis viewport.
 * @param cellCount The number of cells in the series.
 * @returns The first and the last cell index the caller must measure.
 */
export const fitCellRange = (
  mode: ScrubChartYScaleMode,
  windowCells: [number, number],
  cellCount: number,
): [number, number] =>
  mode === "series" ? [0, Math.max(0, cellCount - 1)] : windowCells;

/** One mode's effective pin. A mode key wins over the shared value. */
const resolvePin = (
  pin: ScrubChartYFitPin | undefined,
  mode: ScrubChartYScaleMode,
): { min?: number; max?: number } => ({
  min: pin?.[mode]?.min ?? pin?.min,
  max: pin?.[mode]?.max ?? pin?.max,
});

/** Order an extent low end first. A caller may return it either way round. */
const ordered = (extent: [number, number]): [number, number] =>
  extent[0] <= extent[1] ? extent : [extent[1], extent[0]];

/**
 * Give an inverted or flat domain a height by moving the FREE end out.
 * A pinned end never moves, because the pin is the exact number the caller
 * asked for.
 */
const withHeight = (
  [low, high]: [number, number],
  pin: { min?: number; max?: number },
  span: number,
): [number, number] => {
  if (low < high) return [low, high];
  const push = span > 0 ? span : FLAT_EXTENT_SPAN;
  if (pin.min != null) return [low, low + push];
  if (pin.max != null) return [high - push, high];
  return [low - push, high + push];
};

/**
 * Turn a fitted extent into the y-domain ScrubChart draws.
 *
 * The steps run in this order, and the order is the point:
 *
 *   1. Pad each FREE end by `margin`. A pinned end takes no margin.
 *   2. Snap the padded domain to d3's nice bounds for `tickCount`.
 *   3. Overwrite each pinned end with its exact value, LAST.
 *
 * Step 3 comes last so the pinned number stays exact while the free end still
 * lands on a nice bound. The ticks then read 0, 20, 40 instead of 0, 17.3,
 * 34.6.
 *
 * The snap also keeps the axis still. A fitted domain changes on every pan
 * frame, so an unsnapped domain moves the ticks and rewrites the labels
 * continuously.
 *
 * Two ends pinned skip every step: the caller stated the whole domain, so this
 * function returns it as given.
 *
 * @param extent The fitted extent in data units, in either order.
 * @param mode The mode that produced the extent. It selects the pin.
 * @param pin Fixed ends, or undefined when both ends are free.
 * @param margin Fraction of the extent added above and below a free end.
 * @param tickCount The tick count the y-axis asks for.
 * @returns The domain to draw, low end first.
 */
export const fitYDomain = (
  extent: [number, number],
  mode: ScrubChartYScaleMode,
  pin: ScrubChartYFitPin | undefined,
  margin: number,
  tickCount: number,
): [number, number] => {
  const resolved = resolvePin(pin, mode);
  if (resolved.min != null && resolved.max != null)
    return [resolved.min, resolved.max];

  const [low, high] = ordered(extent);
  const span = high - low;
  // A flat extent gets a fixed pad, so the padded span is never zero and the
  // scale never divides by zero.
  const pad = span > 0 ? span * margin : FLAT_EXTENT_SPAN;
  const padded: [number, number] = [
    resolved.min ?? low - pad,
    resolved.max ?? high + pad,
  ];
  const snapped = scaleLinear().domain(padded).nice(tickCount).domain();
  const pinned: [number, number] = [
    resolved.min ?? snapped[0],
    resolved.max ?? snapped[1],
  ];
  return withHeight(pinned, resolved, span);
};
