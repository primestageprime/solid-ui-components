// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// CashflowPopover — Structural (Depth 1). Internal render fragment; composes no library components.
// CashflowChart — the HOVER POPOVER render fragment for the weekly chart.
//
// When the pointer is over a bar segment, WeeklyCashflowChart tracks a
// `WeeklyHoverState` signal and floats this popover at the clamped screen
// position: a header naming the week + segment, the segment total, and a
// per-item breakdown. This is a pure, presentational fragment lifted verbatim
// out of CashflowChart.tsx to keep the component file under the module-size
// guideline.
//
// REACTIVITY CONTRACT: the parent passes its hover signal as an ACCESSOR
// (`hover: () => WeeklyHoverState | null`), NOT a snapshotted value. The
// `<Show when={props.hover()}>` reads that accessor inside this component's
// own reactive scope, so the popover appears/updates/disappears live as the
// parent signal changes — no stale capture. This is an internal sibling, not
// part of the public API.

import { type Component, For, Show } from "solid-js";
import type { WeeklyHoverState } from "./types";
import {
  WEEKLY_SEGMENT_LABELS,
  formatDollarsLong,
  formatWeekRange,
} from "./format";

export interface CashflowPopoverProps {
  /** Reactive accessor for the live hover state (null when nothing is hovered). */
  hover: () => WeeklyHoverState | null;
}

export const CashflowPopover: Component<CashflowPopoverProps> = (props) => (
  <Show when={props.hover()}>
    {(current) => (
      <div
        class="rc-cashflow__popover"
        style={{ left: `${current().x}px`, top: `${current().y}px` }}
      >
        <div class="rc-cashflow__popover-header">
          {formatWeekRange(current().week_start).label} —{" "}
          {WEEKLY_SEGMENT_LABELS[current().kind]}
        </div>
        <div class="rc-cashflow__popover-total">
          {formatDollarsLong(current().total_cents)}
        </div>
        <Show when={current().items.length > 0}>
          <ul class="rc-cashflow__popover-items">
            <For each={current().items}>
              {(item) => (
                <li class="rc-cashflow__popover-item">
                  <span class="rc-cashflow__popover-name">{item.name}</span>
                  <span class="rc-cashflow__popover-amount">
                    {formatDollarsLong(item.amount_cents)}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    )}
  </Show>
);
