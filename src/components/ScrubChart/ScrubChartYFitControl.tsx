// lastReviewedAt: 2026-09-02
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartYFitControl — Composite (Depth 2).
// The y-fit toggle ScrubChart renders when `yFitDomain` is set: a two-segment
// control that picks WHICH cell range sets the y extent ("visible" or
// "series"). See yScaleMode.ts for the pipeline behind the two states.
//
// The control needs a ROW OF ITS OWN below the plot. ScrubChart adds
// Y_FIT_ROW_HEIGHT to its bottom inset, so the plot area, the x-axis labels
// and this control stack without touching. An absolutely-placed control with
// no reserved row covers the lowest gridline and its label — and that label is
// the one a pinned floor makes the reader look at.
//
// This module owns the markup only. ScrubChart owns the mode signal and the
// row reservation.
// ============================================

import type { JSX } from "solid-js";
import { Icon } from "../Icon";
import { SegmentedControl } from "../SegmentedControl";
import { Tooltip } from "../Tooltip";
import type { ScrubChartYScaleMode } from "./yScaleMode";

/**
 * Height, in pixels, of the row ScrubChart reserves for this control.
 *
 * The number covers the rendered control (a segment is 13px text on 8px of
 * padding, inside a 1px frame) plus the 2px inset the stylesheet places it at,
 * top and bottom. Keep it in step with `.sui-scrub-chart__y-fit` in
 * ScrubChart.css: the CSS pins the control to the bottom of the frame, and
 * this number is what keeps the plot above it.
 */
export const Y_FIT_ROW_HEIGHT = 38;

/** Props for the y-fit toggle. `mode` is an accessor, so the parent's signal
 *  keeps driving the selected segment. */
export interface ScrubChartYFitControlProps {
  /** The mode the parent currently shows. */
  mode: () => ScrubChartYScaleMode;
  /** The parent applies the mode the reader picks. */
  onSelect: (mode: ScrubChartYScaleMode) => void;
}

/**
 * The two-segment y-fit toggle.
 *
 * Each glyph rides in a Tooltip with `triggerAs="span"`, because the segment
 * is already a button and a button inside a button is invalid HTML. The
 * trigger span is not focusable, so the Icon carries the `aria-label` — the
 * segment button is the thing a keyboard reaches, and it takes its name from
 * that label.
 */
export const ScrubChartYFitControl = (
  props: ScrubChartYFitControlProps,
): JSX.Element => (
  <div class="sui-scrub-chart__y-fit">
    <SegmentedControl
      aria-label="Y-axis fit"
      value={props.mode()}
      onValueChange={(v) => props.onSelect(v as ScrubChartYScaleMode)}
      options={[
        {
          value: "visible",
          label: (
            <Tooltip content="Fit to visible" triggerAs="span">
              <Icon name="zoom-in" size="sm" aria-label="Fit to visible" />
            </Tooltip>
          ),
        },
        {
          value: "series",
          label: (
            <Tooltip content="Fit to all" triggerAs="span">
              <Icon name="zoom-out" size="sm" aria-label="Fit to all" />
            </Tooltip>
          ),
        },
      ]}
    />
  </div>
);
