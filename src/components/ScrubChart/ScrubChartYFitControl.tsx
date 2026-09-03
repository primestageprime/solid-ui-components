// lastReviewedAt: 2026-09-02
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartYFitControl — Composite (Depth 2).
// The y-fit control ScrubChart renders when `yFitDomain` is set: ONE small
// icon button that picks WHICH cell range sets the y extent ("visible" or
// "series"). See yScaleMode.ts for the pipeline behind the two states.
//
// The control is a plain `<button>`, not `Button`. At rest it is the bare
// glyph: no fill, no border, no ring. `Button` brings a shape and a colour
// set with every variant, and the stylesheet would have to undo all of them,
// so the control styles itself. It stays a real `<button>`, so a keyboard
// still reaches it and a click still fires. ScrubChart.css holds the rules,
// under `.sui-scrub-chart__corner` and `.sui-scrub-chart__corner-btn` — the
// shared names the expand chevron takes as well. The `__y-fit` names stay on
// the markup as the hook a consumer overrides this one button with.
//
// The button shows the ACTION, not the state. In "visible" mode it shows
// `zoom-out` and reads "Fit to all", because a click takes the reader there.
// The glyph and the label always agree, so the button depicts what a click
// does. It carries NO `aria-pressed`: this is a switch between two named
// modes, not a pressed toggle, so a plain button named for the action is the
// correct control.
//
// The button sits in the chart's ORIGIN CORNER: in the y-axis label column,
// left of the plot, and level with the x-axis tick labels. It reads as axis
// furniture at the corner where the two axes meet, not as an overlay parked
// under the chart. The button takes NO row of its own. ScrubChart keeps three
// guarantees instead: the x-axis row is at least Y_FIT_FOOTPRINT tall, the
// DEFAULT y-axis column is at least Y_FIT_COLUMN wide, and `yLabelFloor`
// lifts the lowest y label above the button's top edge. The button therefore
// covers no gridline, no label and no data.
//
// Levelling costs the corner a little height. The button centres on the x
// tick labels, and it is taller than the drop from `plotBottom` to their
// centre line, so its top edge sits ABOVE `plotBottom` by
// -CORNER_LEVEL_OFFSET. helpers.ts derives that number; this module only
// applies it.
//
// This module owns the markup only. ScrubChart owns the mode signal and the
// corner, which it states through `axisTop`.
// ============================================

import type { JSX } from "solid-js";
import { Icon } from "../Icon";
import { Tooltip } from "../Tooltip";
import { CORNER_LEVEL_OFFSET } from "./helpers";
import type { ScrubChartYScaleMode } from "./yScaleMode";

/** Props for the y-fit button. `mode` is an accessor, so the parent's signal
 *  keeps driving the glyph and the label. */
export interface ScrubChartYFitControlProps {
  /** The mode the parent currently shows. */
  mode: () => ScrubChartYScaleMode;
  /** The parent applies the mode the reader picks. */
  onSelect: (mode: ScrubChartYScaleMode) => void;
  /** Pixel y of the x-axis row's top edge — ScrubChart's `plotBottom`. The
   *  control hangs from it, so the button stays level with the tick labels
   *  even when the caller reserves extra rows below them. Left unset, the
   *  stylesheet parks the control at the frame's bottom edge. */
  axisTop?: () => number;
}

/** Where the control hangs from. An inline `top` beats the stylesheet's
 *  `bottom` inset, so the button tracks the x-axis row instead of the frame
 *  edge. `CORNER_LEVEL_OFFSET` then lifts the button until it centres on the x
 *  tick labels. `undefined` leaves the stylesheet in charge. */
const cornerStyle = (
  axisTop: (() => number) | undefined,
): JSX.CSSProperties | undefined =>
  axisTop === undefined
    ? undefined
    : { top: `${axisTop() + CORNER_LEVEL_OFFSET}px`, bottom: "auto" };

/** The mode a click moves to — the OTHER one of the two. */
const otherMode = (mode: ScrubChartYScaleMode): ScrubChartYScaleMode =>
  mode === "visible" ? "series" : "visible";

/** The glyph for the action a click performs from `mode`. */
const actionGlyph = (mode: ScrubChartYScaleMode): "zoom-in" | "zoom-out" =>
  mode === "visible" ? "zoom-out" : "zoom-in";

/** The name of the action a click performs from `mode`. */
const actionLabel = (mode: ScrubChartYScaleMode): string =>
  mode === "visible" ? "Fit to all" : "Fit to visible";

/**
 * The one-button y-fit control.
 *
 * The button rides in a Tooltip with `triggerAs="span"`, because a button
 * inside a button is invalid HTML. The trigger span is not focusable, so the
 * button carries the `aria-label` — the button is the thing a keyboard
 * reaches, and it takes its name from that label.
 */
export const ScrubChartYFitControl = (
  props: ScrubChartYFitControlProps,
): JSX.Element => (
  <div
    class="sui-scrub-chart__corner sui-scrub-chart__y-fit"
    style={cornerStyle(props.axisTop)}
  >
    <Tooltip content={actionLabel(props.mode())} triggerAs="span">
      <button
        type="button"
        class="sui-scrub-chart__corner-btn sui-scrub-chart__y-fit-btn"
        aria-label={actionLabel(props.mode())}
        onClick={() => props.onSelect(otherMode(props.mode()))}
      >
        <Icon name={actionGlyph(props.mode())} size="sm" />
      </button>
    </Tooltip>
  </div>
);
