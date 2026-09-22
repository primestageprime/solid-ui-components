// lastReviewedAt: 2026-09-22
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartTopActionControl — Composite (Depth 2).
// The top-right control ScrubChart renders when `topAction` is set: ONE small
// icon button in the corner opposite the chart's origin.
//
// It is the THIRD of the frame's corner controls, and it joins the family
// whole: same size, same scrim, same bare glyph, same `.sui-scrub-chart__
// corner` and `.sui-scrub-chart__corner-btn` classes. Two things separate it
// from the pair below.
//
// FIRST, the corner. The y-fit button and the expand chevron both hang from
// the x-axis row, so the two sit on one line across the BOTTOM of the frame.
// This one pins to the frame's TOP edge, which has no axis gutter to sit in,
// so the button floats over the top right of the plot on its scrim. It
// reserves no room and it hides for nothing — the same tradeoff the bottom
// pair already takes on a narrow chart.
//
// SECOND, the name. The other two each do ONE thing and are named for it.
// This one carries whatever the page needs, so it is named for its CORNER
// instead: the prop is `topAction` and the CSS hook is
// `.sui-scrub-chart__top-action`. A name like `__minimize` would lie the
// moment a caller states an `onClick` of its own.
//
// The button shows the ACTION, like the y-fit button: `minus` by default,
// because a click leaves the one-line bar that glyph depicts. The glyph and
// the label always agree. The button carries NO `aria-pressed`: it is named
// for what a click does, which a plain button states already.
//
// This module owns the markup only. ScrubChart owns the minimized signal and
// decides whether a click minimizes or calls the caller's handler.
// ============================================

import type { JSX } from "solid-js";
import { Icon, type IconName } from "../Icon";
import { Tooltip } from "../Tooltip";

/** The glyph a `topAction` shows when the caller states none. */
export const DEFAULT_TOP_ACTION_ICON: IconName = "minus";

/** The name a `topAction` takes when the caller states none. */
export const DEFAULT_TOP_ACTION_LABEL = "Minimize chart";

/** Props for the top-right button. Both are accessors, so the parent's
 *  signals keep driving the glyph and the label. */
export interface ScrubChartTopActionControlProps {
  /** The glyph to show. */
  icon: () => IconName;
  /** The button's name — the tooltip and the `aria-label`. */
  label: () => string;
  /** What a click does. ScrubChart resolves this to its own minimize step or
   *  to the caller's handler before it gets here. */
  onClick: () => void;
}

/**
 * The one-button top-right control.
 *
 * The button rides in a Tooltip with `triggerAs="span"`, because a button
 * inside a button is invalid HTML. The trigger span is not focusable, so the
 * button carries the `aria-label` — the button is the thing a keyboard
 * reaches, and it takes its name from that label.
 */
export const ScrubChartTopActionControl = (
  props: ScrubChartTopActionControlProps,
): JSX.Element => (
  <div class="sui-scrub-chart__corner sui-scrub-chart__top-action">
    <Tooltip content={props.label()} triggerAs="span">
      <button
        type="button"
        class="sui-scrub-chart__corner-btn sui-scrub-chart__top-action-btn"
        aria-label={props.label()}
        onClick={() => props.onClick()}
      >
        <Icon name={props.icon()} size="sm" />
      </button>
    </Tooltip>
  </div>
);
