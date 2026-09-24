// lastReviewedAt: 2026-09-23
// lastReviewedBy: claude
// ============================================
// ScrubChartYAxisModeControl — Composite (Depth 2).
// The three-segment switch ScrubChart renders in its axis ORIGIN corner when
// `yAxisMode` is set: Auto | Fixed | Fit. It takes the corner the y-fit
// button took (ScrubChartYFitControl), under the same guarantees — the x-axis
// row is at least CORNER_FOOTPRINT tall, the DEFAULT y-axis column is at least
// Y_AXIS_MODE_COLUMN wide, and `yLabelFloor` lifts the lowest y label clear of
// the corner — so it covers no gridline, no label and no data.
//
// A curried `SegmentedControl` at `size="xs"`: radio-group semantics and
// arrow-key movement come with it. Each segment is a WORD, not a glyph — the
// icon set has no honest picture for "grow, never shrink" — and a Tooltip
// states what the mode does. The word is the segment's accessible name.
//
// This module owns the markup only. The caller owns the mode (controlled);
// ScrubChart owns the corner, which it states through `axisTop`.
// ============================================

import type { JSX } from "solid-js";
import { createSegmentedControl, type SegmentOption } from "../SegmentedControl";
import { Tooltip } from "../Tooltip";
import { cornerStyle } from "./helpers";
import type { ScrubChartYAxisMode } from "./types";

/** What each mode does, in the reader's words — the segment tooltips. */
export const Y_AXIS_MODE_HINTS: Readonly<Record<ScrubChartYAxisMode, string>> = {
  auto: "Auto — grows with the data, never shrinks",
  fixed: "Fixed — holds the range you set; click the axis to edit it",
  autoscale: "Fit — fits the data now, both ways",
};

/** One segment. The label is a GETTER: the options live in a module-level
 *  variant, and a JSX node built once at import would be one DOM node shared
 *  by every chart on the page (and built outside any owner). The getter
 *  builds a fresh Tooltip each time SegmentedControl renders the segment. */
const option = (value: ScrubChartYAxisMode, word: string): SegmentOption => ({
  value,
  get label() {
    return (
      <Tooltip content={Y_AXIS_MODE_HINTS[value]} triggerAs="span">
        {word}
      </Tooltip>
    );
  },
});

/** The switch itself: three words, chart-furniture size. */
const YAxisModeSwitch = createSegmentedControl({
  options: [
    option("auto", "Auto"),
    option("fixed", "Fixed"),
    option("autoscale", "Fit"),
  ],
  size: "xs",
});

/** Props for the corner switch. `mode` is an accessor so the caller's signal
 *  keeps driving the selected segment. */
export interface ScrubChartYAxisModeControlProps {
  /** The mode the caller currently shows. */
  mode: () => ScrubChartYAxisMode;
  /** The caller applies the mode the reader picks. */
  onSelect: (mode: ScrubChartYAxisMode) => void;
  /** Pixel y of the x-axis row's top edge — ScrubChart's `plotBottom`. See
   *  `cornerStyle`. */
  axisTop?: () => number;
}

export const ScrubChartYAxisModeControl = (
  props: ScrubChartYAxisModeControlProps,
): JSX.Element => (
  <div
    class="sui-scrub-chart__corner sui-scrub-chart__y-axis-mode"
    style={cornerStyle(props.axisTop)}
  >
    <YAxisModeSwitch
      aria-label="Y-axis mode"
      value={props.mode()}
      onValueChange={(v) => props.onSelect(v as ScrubChartYAxisMode)}
    />
  </div>
);
