// lastReviewedAt: 2026-09-22
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChartMinimizedBar — Composite (Depth 2).
// What ScrubChart shows in place of itself while `minimized` is true: ONE
// line holding the chart's core information on the left and the restore
// button on the right.
//
// The bar REPLACES the frame and the ribbon; it does not sit above them. The
// whole point of the control that raises it is to give the page its vertical
// space back, so a bar plus a shrunken chart would defeat it. ScrubChart
// swaps the two with a `<Show>`, and the frame unmounts.
//
// The bar owns NO flex rules of its own. It is a curried `Row` and a curried
// `Text`, set once here, so the Layout Purity commandment holds and the bar
// inherits the gap scale every other row in the library uses. The only local
// style is the bar's padding and its one-line clamp, and both ride on those
// curried variants. It draws NO border: while the bar is up it is the root's
// ONLY child, and the root already carries the card's border and radius, so a
// border here would rule off an empty side. `.sui-scrub-chart__minimized`
// stays on the markup as the hook a consumer overrides the bar with.
//
// The RESTORE button is fixed at `plus` / "Restore chart" while the
// minimizing button is the caller's to re-aim. A caller that states its own
// `topAction.onClick` never minimizes the chart, so it never raises this bar
// and the two never disagree. The button reuses
// `.sui-scrub-chart__corner-btn`, so the glyph the reader clicks to come back
// is the one they clicked to leave.
// ============================================

import type { JSX } from "solid-js";
import { Icon } from "../Icon";
import { createRow } from "../Layout/Row";
import { createText } from "../Text/Text";
import { Tooltip } from "../Tooltip";

/** The bar's one row. `justify="between"` puts the summary at the left edge
 *  and the restore button at the right, which is where the reader last saw
 *  it. The right padding is the corner inset, so the button lands on the same
 *  vertical line the top-right control held. */
const BarRow = createRow({
  align: "center",
  justify: "between",
  gap: "sm",
  fill: true,
  style: {
    padding: "2px 2px 2px 10px",
    "min-height": "30px",
  },
});

/**
 * The summary's cell. Mono at 11px, the same face and size `ChartHeader`
 * gives a chart's meta readout, so a minimized chart and a titled one read
 * alike.
 *
 * `as="div"` and not the default span: the cell holds a caller's
 * `renderMinimized` output as well as the derived span, and that output is
 * any JSX at all. `min-width: 0` is what lets the clamp below fire — a flex
 * item's automatic minimum size is its content, so without it a long line
 * pushes the restore button off the bar instead of ellipsing.
 */
const BarText = createText({
  variant: "sublabel",
  as: "div",
  style: {
    "font-family": "var(--sui-font-mono)",
    "font-size": "11px",
    "min-width": "0",
    "white-space": "nowrap",
    overflow: "hidden",
    "text-overflow": "ellipsis",
  },
});

/** The glyph and the name the restore button always shows. */
const RESTORE_LABEL = "Restore chart";

export interface ScrubChartMinimizedBarProps {
  /** The line to show. ScrubChart resolves the caller's slot, or the derived
   *  date span, before it gets here. */
  children?: JSX.Element;
  /** The parent opens the chart back up. */
  onRestore: () => void;
}

/**
 * The one-line bar.
 *
 * The restore button rides in a Tooltip with `triggerAs="span"`, because a
 * button inside a button is invalid HTML. The trigger span is not focusable,
 * so the button carries the `aria-label`.
 */
export const ScrubChartMinimizedBar = (
  props: ScrubChartMinimizedBarProps,
): JSX.Element => (
  <BarRow class="sui-scrub-chart__minimized">
    <BarText class="sui-scrub-chart__minimized-summary">
      {props.children}
    </BarText>
    <Tooltip content={RESTORE_LABEL} triggerAs="span">
      <button
        type="button"
        class="sui-scrub-chart__corner-btn sui-scrub-chart__restore-btn"
        aria-label={RESTORE_LABEL}
        onClick={() => props.onRestore()}
      >
        <Icon name="plus" size="sm" />
      </button>
    </Tooltip>
  </BarRow>
);
