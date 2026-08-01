// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// Axes (XAxis / YAxis) — Structural (Depth 1). SVG chart slot; composes no library components.
import {
  type Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import { useChart } from "./context";
import type { Scale } from "./scales";
import { map } from "../../fn";

// ---- Y-axis title placement ----
// Tick labels sit at x=-8 (see YAxis `<text x={-8}>`); the rotated title is
// placed this many px further left than the widest tick label so it clears
// them without leaving a gaping margin when labels are narrow.
const YAXIS_TICK_LABEL_X = 8;
const YAXIS_TITLE_GAP = 10;
// Fallback glyph width (px) per character at the 0.7rem tick-label size, used
// when DOM text metrics are unavailable (SSR / jsdom returns no
// getComputedTextLength). Digits at 0.7rem (~11.2px) run ~0.55em ≈ 6.2px.
const APPROX_CHAR_PX = 6.2;

/** Pure estimate of the widest label's rendered width from character counts. */
const estimateMaxLabelWidth = (labels: readonly string[]): number =>
  labels.reduce((max, l) => Math.max(max, l.length * APPROX_CHAR_PX), 0);

/**
 * Widest rendered tick-label width (px) inside `group`, measured via SVG glyph
 * metrics. Returns 0 when metrics are unavailable (e.g. jsdom) so the caller
 * can fall back to {@link estimateMaxLabelWidth}.
 */
const measureMaxLabelWidth = (group: SVGGElement): number =>
  Array.from(
    group.querySelectorAll<SVGTextElement>(".sui-chart__axis-label"),
  ).reduce((max, node) => {
    const len =
      typeof node.getComputedTextLength === "function"
        ? node.getComputedTextLength()
        : 0;
    return Math.max(max, len);
  }, 0);

export interface AxisProps {
  tickCount?: number;
  /** Override scale-derived ticks (e.g. categorical bar positions). */
  tickValues?: readonly number[];
  tickFormat?: (value: number) => string;
  /** Hide the baseline. Default false. */
  hideLine?: boolean;
  /**
   * Optional axis title rendered centered along the axis. For XAxis it sits
   * below the tick labels; for YAxis it sits to the left of the y-tick
   * labels, rotated 90deg counter-clockwise.
   */
  label?: string;
  /**
   * Vertical pixel offset for XAxis tick labels (the `y` of each label
   * `<text>`). Default 16. Increase to push labels further below the axis
   * line — useful when a slot (e.g. a timeline strip) needs to sit between
   * the axis and the labels. No effect on YAxis.
   */
  labelOffset?: number;
  /**
   * Vertical pixel offset for XAxis tick marks. Default 0 — ticks render
   * from `y=0` to `y=4` relative to the axis baseline. Increase to push tick
   * marks DOWN so they emerge below a strip occupying the top of the axis
   * region (e.g. a TimelineBar with `bandY={{ anchor: "margin-bottom" }}`
   * flush against the axis line). Independent of `labelOffset` — adjust both when ticks
   * move so labels still clear them. No effect on YAxis.
   */
  tickOffset?: number;
  /**
   * Rotate x-axis tick labels -45° (bottom-left → top-right). Prevents
   * collision when labels are long (e.g. dates). Y-axis ignores this prop.
   * Default false.
   */
  rotateLabels?: boolean;
}

const defaultFormat = (v: number): string => {
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 100) / 100);
};

const isTimeScale = (
  s: Scale,
): s is Scale & { tickFormat: (count?: number) => (v: number) => string } =>
  typeof (s as { tickFormat?: unknown }).tickFormat === "function";

export const XAxis: Component<AxisProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const fmt = () => {
    if (props.tickFormat) return props.tickFormat;
    const scale = ctx.xScale();
    if (isTimeScale(scale)) return scale.tickFormat(tickCount());
    return defaultFormat;
  };

  return (
    <g
      class="sui-chart__axis sui-chart__axis--x"
      transform={`translate(0, ${ctx.innerHeight()})`}
    >
      {!props.hideLine && (
        <line
          class="sui-chart__axis-line"
          x1={0}
          x2={ctx.innerWidth()}
          y1={0}
          y2={0}
        />
      )}
      <For each={props.tickValues ?? ctx.xScale().ticks(tickCount())}>
        {(t) => (
          <g transform={`translate(${ctx.xScale()(t)}, 0)`}>
            <line
              class="sui-chart__axis-tick"
              y1={props.tickOffset ?? 0}
              y2={(props.tickOffset ?? 0) + 4}
            />
            <text
              class="sui-chart__axis-label"
              text-anchor={props.rotateLabels ? "end" : "middle"}
              transform={
                props.rotateLabels
                  ? // x-shift = capHeight * sin(45°) ≈ 6px for 0.7rem font.
                    // Puts the rotated text's top corner directly under the tick.
                    `translate(6, ${props.labelOffset ?? 16}) rotate(-45)`
                  : undefined
              }
              y={props.rotateLabels ? undefined : (props.labelOffset ?? 16)}
            >
              {fmt()(t)}
            </text>
          </g>
        )}
      </For>
      <Show when={props.label}>
        {(label) => (
          <text
            class="sui-chart__axis-title"
            x={ctx.innerWidth() / 2}
            // Rotated labels drop ~half-their-width below the anchor; the
            // hardcoded +18 clearance designed for horizontal labels collides
            // with the bottom of long diagonal labels. +44 keeps the title
            // clear of typical date/time labels up to ~60px wide.
            y={(props.labelOffset ?? 16) + (props.rotateLabels ? 44 : 18)}
            text-anchor="middle"
          >
            {label()}
          </text>
        )}
      </Show>
    </g>
  );
};

export const YAxis: Component<AxisProps> = (props) => {
  const ctx = useChart();
  const tickCount = () => props.tickCount ?? 5;
  const fmt = () => props.tickFormat ?? defaultFormat;
  const ticks = () => props.tickValues ?? ctx.yScale().ticks(tickCount());
  const tickLabels = createMemo(() => map((t) => fmt()(t), ticks()));

  // Widest tick label, in px. Seeded from a char-count estimate so SSR/jsdom
  // still get a sane title offset, then refined to exact glyph metrics once
  // the tick `<text>` nodes have mounted.
  const [maxLabelWidth, setMaxLabelWidth] = createSignal(0);
  let axisGroup: SVGGElement | undefined;
  createEffect(() => {
    const labels = tickLabels(); // track re-measures on tick/format changes
    const measured = axisGroup ? measureMaxLabelWidth(axisGroup) : 0;
    setMaxLabelWidth(measured > 0 ? measured : estimateMaxLabelWidth(labels));
  });

  // Distance (px) from the axis line to the rotated title's baseline: clear
  // the tick labels (anchored at x=-8) plus the widest one, plus breathing
  // room — so the title tracks the labels instead of a fixed offset.
  const titleOffset = createMemo(
    () =>
      YAXIS_TICK_LABEL_X +
      maxLabelWidth() +
      YAXIS_TITLE_GAP +
      (props.labelOffset ?? 0),
  );

  return (
    <g class="sui-chart__axis sui-chart__axis--y" ref={axisGroup}>
      {!props.hideLine && (
        <line
          class="sui-chart__axis-line"
          y1={0}
          y2={ctx.innerHeight()}
          x1={0}
          x2={0}
        />
      )}
      <For each={ticks()}>
        {(t) => (
          <g transform={`translate(0, ${ctx.yScale()(t)})`}>
            <line class="sui-chart__axis-tick" x1={-4} x2={0} />
            <text
              class="sui-chart__axis-label"
              x={-YAXIS_TICK_LABEL_X}
              dy="0.32em"
              text-anchor="end"
            >
              {fmt()(t)}
            </text>
          </g>
        )}
      </For>
      <Show when={props.label}>
        {(label) => (
          <text
            class="sui-chart__axis-title sui-chart__axis-title--y"
            transform={`rotate(-90) translate(${-ctx.innerHeight() / 2}, ${-titleOffset()})`}
            text-anchor="middle"
          >
            {label()}
          </text>
        )}
      </Show>
    </g>
  );
};
