// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// CashflowChart — the STACKED WEEKLY BARS render fragment.
//
// For each week this draws up to four stacked <rect>s — two revenue segments
// rising from the $0 baseline (recurring, then project revenue on top) and two
// expense segments dropping below it (recurring, then one-time) — plus the
// rotated month-boundary x-axis label. Each segment is a hover affordance that
// calls back into the parent's popover handlers. Lifted verbatim out of
// CashflowChart.tsx to keep the component file under the module-size guideline.
//
// REACTIVITY CONTRACT: every value that can change is passed as an ACCESSOR
// (`bars`, `xScale`, `yScale`, `h`), never a snapshot — the geometry closures
// below read them inside this component's reactive scope, so bars re-lay-out
// live when the scales or measured height change. The three mouse handlers are
// the parent's own closures (they read the parent's refs/signals), passed
// straight through. This is an internal sibling, not part of the public API.

import { type Component, For, Show } from "solid-js";
import type { ScaleBand, ScaleLinear } from "d3-scale";
import type { WeeklyChartBar, WeeklySegmentKind } from "./types";
import { PAD } from "./format";

export interface CashflowBarsProps {
  /** Reactive accessor for the weeks to draw. */
  bars: () => WeeklyChartBar[];
  /** Reactive accessor for the current band (x) scale. */
  xScale: () => ScaleBand<string>;
  /** Reactive accessor for the current linear (y) scale. */
  yScale: () => ScaleLinear<number, number>;
  /** Reactive accessor for the current viewBox height in px. */
  h: () => number;
  /** Begin a hover popover for a bar segment. */
  onEnter: (
    bar: WeeklyChartBar,
    kind: WeeklySegmentKind,
    e: MouseEvent,
  ) => void;
  /** Track pointer movement while a popover is open. */
  onMove: (e: MouseEvent) => void;
  /** Dismiss the hover popover. */
  onLeave: () => void;
}

export const CashflowBars: Component<CashflowBarsProps> = (props) => (
  <For each={props.bars()}>
    {(bar) => {
      const x = () => props.xScale()(bar.week_start)!;
      const bw = () => props.xScale().bandwidth();
      const zero = () => props.yScale()(0);

      const recurRevTop = () => props.yScale()(bar.recurring_revenue_cents);
      const recurRevH = () => zero() - recurRevTop();
      const projRevTop = () => props.yScale()(bar.revenue_cents);
      const projRevH = () => recurRevTop() - projRevTop();
      const recurExpBot = () => props.yScale()(-bar.recurring_expense_cents);
      const recurExpH = () => recurExpBot() - zero();
      const totalExpBot = () =>
        props.yScale()(
          -(bar.recurring_expense_cents + bar.onetime_expense_cents),
        );
      const onetimeExpH = () => totalExpBot() - recurExpBot();

      return (
        <>
          {bar.recurring_revenue_cents > 0 && (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip/popover affordance on SVG data-viz; no activating action
            <rect
              x={x()}
              y={recurRevTop()}
              width={bw()}
              height={recurRevH()}
              class="rc-cashflow__bar rc-cashflow__bar--rev-recurring"
              classList={{
                "rc-cashflow__bar--projected": bar.isProjected,
              }}
              onMouseEnter={(e) => props.onEnter(bar, "revenue", e)}
              onMouseMove={props.onMove}
              onMouseLeave={props.onLeave}
            />
          )}
          {bar.project_revenue_cents > 0 && (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip/popover affordance on SVG data-viz; no activating action
            <rect
              x={x()}
              y={projRevTop()}
              width={bw()}
              height={projRevH()}
              class="rc-cashflow__bar rc-cashflow__bar--rev-project"
              classList={{
                "rc-cashflow__bar--projected": bar.isProjected,
              }}
              onMouseEnter={(e) => props.onEnter(bar, "revenue", e)}
              onMouseMove={props.onMove}
              onMouseLeave={props.onLeave}
            />
          )}
          {bar.recurring_expense_cents > 0 && (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip/popover affordance on SVG data-viz; no activating action
            <rect
              x={x()}
              y={zero()}
              width={bw()}
              height={recurExpH()}
              class="rc-cashflow__bar rc-cashflow__bar--exp-recurring"
              classList={{
                "rc-cashflow__bar--projected": bar.isProjected,
              }}
              onMouseEnter={(e) => props.onEnter(bar, "exp-recurring", e)}
              onMouseMove={props.onMove}
              onMouseLeave={props.onLeave}
            />
          )}
          {bar.onetime_expense_cents > 0 && (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip/popover affordance on SVG data-viz; no activating action
            <rect
              x={x()}
              y={recurExpBot()}
              width={bw()}
              height={onetimeExpH()}
              class="rc-cashflow__bar rc-cashflow__bar--exp-onetime"
              classList={{
                "rc-cashflow__bar--projected": bar.isProjected,
              }}
              onMouseEnter={(e) => props.onEnter(bar, "exp-onetime", e)}
              onMouseMove={props.onMove}
              onMouseLeave={props.onLeave}
            />
          )}

          {/* X-axis label — only on month boundaries */}
          <Show when={bar.month_label}>
            <text
              x={x() + bw() / 2}
              y={props.h() - PAD.bottom + 10}
              text-anchor="end"
              transform={`rotate(-45, ${x() + bw() / 2}, ${props.h() - PAD.bottom + 10})`}
              class="rc-cashflow__label-x"
            >
              {bar.month_label}
            </text>
          </Show>
        </>
      );
    }}
  </For>
);
