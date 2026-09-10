// ============================================
// ruleMarker — the `"rule"` variant of a plotline marker (Depth 3).
//
// A rule marker is a reference line, not an instance. It draws a full-height
// dotted rule with an always-visible caption at the top, for a date like
// "Today". It sits in its own file because `CashflowScrubChart.tsx` is
// already past the 500-line guidance.
//
// THE DOT
//
// A rule marker draws a dot when, and only when, the caller sets
// `valueCents`. The rule gives the dot its x, `valueCents` gives it its y, so
// the dot marks the point where this rule crosses a value — a horizontal
// marker at the same `valueCents`, most often. One marker describes one
// event, so the rule and its dot stay one marker rather than two.
//
// THE DOT IS DECORATIVE, AND MUST STAY THAT WAY
//
// The `"flag"` variant wraps its group in `role="button"` with `tabIndex={0}`
// and a full-height invisible hit rect. A rule dot takes NONE of that: no
// role, no tab stop, no hit rect, no `onMarkerClick` path, and
// `pointer-events: none` so it never takes a pointer from the scrub gesture
// underneath. A decorative dot that answers the keyboard is a fake button,
// and a consumer refused the feature on exactly that ground.
// ============================================

import type { Component } from "solid-js";
import type { ScrubChartContext } from "../ScrubChart";
import { markerValueCents } from "./helpers";
import { markerJoinsLadder } from "./labelLayer";
import type { CashflowCell, CashflowChartMarker } from "./types";

/** Radius of the crossing dot, in user units. */
const RULE_DOT_RADIUS = 4.5;

/** Vertical space the top caption takes, in user units. The rule starts below
 *  it so the caption and the rule never overlap. */
const CAPTION_HEIGHT = 15;

/** Horizontal inset that keeps the caption inside the plot's span — the same
 *  policy the over-top label uses. */
const CAPTION_INSET = 18;

export interface RuleMarkerProps {
  /** The marker to draw. The caller has already checked `variant === "rule"`
   *  and that `index` is in range. */
  marker: CashflowChartMarker;
  /** Scales and plot edges for the current frame. */
  ctx: ScrubChartContext<CashflowCell>;
  /** Value-to-screen scale, already narrowed to non-null by the caller. */
  yToPlot: (valueCents: number) => number;
  /** Emphasis-class builder from the chart, so a hovered label dims the rules
   *  it does not name. */
  emphasisClass: (block: string, id: string | null) => string;
}

/** The caption's x, clamped inside the plot's horizontal span. */
const captionX = (x: number, plotLeft: number, plotRight: number): number =>
  Math.min(Math.max(x, plotLeft + CAPTION_INSET), plotRight - CAPTION_INSET);

/** One `"rule"` marker: a dotted reference rule, an optional caption, and an
 *  optional crossing dot. Every part is non-interactive. */
export const RuleMarker: Component<RuleMarkerProps> = (props) => {
  const marker = () => props.marker;
  const x = () => props.ctx.cellToX(marker().index);
  // The caption keeps its top-of-rule seat unless the caller names an explicit
  // zone, in which case the label layer owns it and the rule takes its full
  // height back.
  const topCaption = () =>
    Boolean(marker().label) && !markerJoinsLadder(marker());
  const extraClass = () => (marker().class ? ` ${marker().class}` : "");
  const ladderId = () =>
    markerJoinsLadder(marker()) ? `marker:${marker().index}` : null;
  const dotY = () => {
    const value = markerValueCents(marker());
    return value == null ? null : props.yToPlot(value);
  };
  return (
    <g
      class={`sui-cashflow-scrub-chart__marker sui-cashflow-scrub-chart__marker--rule${props.emphasisClass(
        "sui-cashflow-scrub-chart__marker",
        ladderId(),
      )}`}
    >
      {topCaption() && (
        <text
          class="sui-cashflow-scrub-chart__rule-label"
          x={captionX(x(), props.ctx.plotLeft, props.ctx.plotRight)}
          y={props.ctx.plotTop + 8}
          text-anchor="middle"
        >
          {marker().label}
        </text>
      )}
      <line
        class={`sui-cashflow-scrub-chart__rule-line${extraClass()}`}
        // The colour effect reads this rule's stroke back through this
        // attribute, and gives it to the marker label.
        data-marker-index={marker().index}
        x1={x()}
        x2={x()}
        y1={props.ctx.plotTop + (topCaption() ? CAPTION_HEIGHT : 0)}
        y2={props.ctx.plotBottom}
        // Presentation attributes so `CashflowChartMarker.class` wins on a
        // plain single class. The stroke was `var(--sui-text, …)` and
        // `--sui-text` is not a token in any theme, so it only ever rendered
        // through its literal.
        stroke="var(--sui-cashflow-rule-stroke, var(--sui-text-primary, rgba(255, 255, 255, 1)))"
        stroke-width="1"
        stroke-linecap="round"
        stroke-dasharray="1 4"
        opacity="0.5"
      />
      {dotY() != null && (
        <circle
          class={`sui-cashflow-scrub-chart__rule-dot${extraClass()}`}
          cx={x()}
          cy={dotY() ?? 0}
          r={RULE_DOT_RADIUS}
          // The panel colour fills the dot, so the rule and the crossed line
          // stop at its edge instead of showing through it. The accent rings
          // it. Presentation attributes so `CashflowChartMarker.class` wins on
          // a plain single class, the way the flag dot works.
          fill="var(--sui-cashflow-rule-dot-fill, var(--sui-bg-secondary, rgba(22, 33, 62, 1)))"
          stroke="var(--sui-cashflow-rule-dot-stroke, var(--sui-accent, rgba(0, 168, 204, 1)))"
          stroke-width="2"
          // The dot is decoration. It takes no pointer, so the scrub gesture
          // underneath keeps working and the dot never reads as a control.
          pointer-events="none"
        />
      )}
    </g>
  );
};
