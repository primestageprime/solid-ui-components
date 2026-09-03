// lastReviewedAt: 2026-09-03
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartExpandControl — Composite (Depth 2).
// The expand control ScrubChart renders when `chartHeightExpanded` is set: ONE
// small icon button that moves the frame between the collapsed `chartHeight`
// and the expanded one.
//
// The control mirrors ScrubChartYFitControl across the frame. Same size, same
// inset, same bare glyph, same corner classes — `.sui-scrub-chart__corner` and
// `.sui-scrub-chart__corner-btn` in ScrubChart.css style both. Only the corner
// differs: the y-fit button pins to the left edge and this one to the RIGHT,
// so the two coexist on a chart that shows both.
//
// The button shows the STATE, not the action. A collapsed chart shows
// `chevron-down`, because a click grows the frame DOWNWARD; an expanded chart
// shows `chevron-up`, because a click takes the frame back up. The glyph and
// the label therefore agree on the direction the frame moves. The button
// carries NO `aria-pressed`: it is named for what a click does, which a plain
// button states already.
//
// The button hangs from the x-axis row, like the y-fit button, so the pair
// sits on ONE line across the frame. `CORNER_LEVEL_OFFSET` lifts it until it
// centres on the x tick labels.
//
// This module owns the markup only. ScrubChart owns the expanded signal, the
// height tween and the corner, which it states through `axisTop`.
// ============================================

import type { JSX } from "solid-js";
import { Icon } from "../Icon";
import { Tooltip } from "../Tooltip";
import { CORNER_LEVEL_OFFSET } from "./helpers";

/** Props for the expand button. `expanded` is an accessor, so the parent's
 *  signal keeps driving the glyph and the label. */
export interface ScrubChartExpandControlProps {
  /** Does the parent show the expanded height right now? */
  expanded: () => boolean;
  /** The parent applies the height the reader picks. */
  onToggle: (expanded: boolean) => void;
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

/** The glyph for the state the chart is in. */
const stateGlyph = (expanded: boolean): "chevron-up" | "chevron-down" =>
  expanded ? "chevron-up" : "chevron-down";

/** The name of the action a click performs from this state. */
const actionLabel = (expanded: boolean): string =>
  expanded ? "Collapse chart" : "Expand chart";

/**
 * The one-button expand control.
 *
 * The button rides in a Tooltip with `triggerAs="span"`, because a button
 * inside a button is invalid HTML. The trigger span is not focusable, so the
 * button carries the `aria-label` — the button is the thing a keyboard
 * reaches, and it takes its name from that label.
 */
export const ScrubChartExpandControl = (
  props: ScrubChartExpandControlProps,
): JSX.Element => (
  <div
    class="sui-scrub-chart__corner sui-scrub-chart__expand"
    style={cornerStyle(props.axisTop)}
  >
    <Tooltip content={actionLabel(props.expanded())} triggerAs="span">
      <button
        type="button"
        class="sui-scrub-chart__corner-btn sui-scrub-chart__expand-btn"
        aria-label={actionLabel(props.expanded())}
        onClick={() => props.onToggle(!props.expanded())}
      >
        <Icon name={stateGlyph(props.expanded())} size="sm" />
      </button>
    </Tooltip>
  </div>
);
