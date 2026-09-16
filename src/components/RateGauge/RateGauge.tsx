// ============================================
// RateGauge — Composite (Depth 2)
// Owns CSS (RateGauge.css). Composes Text (EllipsizedHudCaption) + Tooltip.
//
// A right-facing half ring — a "D" open to the left — that answers one
// question: is the rate right now above or below its baseline, and by how
// much? The upper half of the ring is the positive zone, the lower half the
// negative one, split at the angle of ZERO; whichever zone the needle is not
// in is dimmed, so the live half reads as lit.
//
// Three marks, all the consumer's own values:
//   • a dashed grey needle at the BASELINE;
//   • a solid needle in the active tone at the CURRENT value, capped at the tip
//     with a short arc concentric with the ring;
//   • a curly BRACE outside the ring spanning the angular difference, labelled with
//     the signed delta — formatted by the CONSUMER, never here — and the faint
//     sector between the two needles, which is that same difference drawn as an
//     area in the active tone. The brace is a `}` bent around the ring, and its
//     cusp is the terminal its label's leader leaves from.
//
// Each mark carries a HUD CALLOUT: a terminal on the dial, a leader that runs
// radially out, turns, and levels off into a shared column, and a label on the
// end of it. The callouts are placed by a spacing heuristic in geometry.ts
// which keeps each row as near its own mark as legibility allows and cannot
// let two leaders cross.
//
// The component does NO arithmetic beyond geometry and the delta it announces.
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts); this file only paints what that returns. It is the
// headless-observation-first discipline made structural: there is nowhere in
// this module for a number to be decided.
//
// Why it is Depth 2 and not the Atomic it began as: the scenario NAME is
// consumer-supplied and non-enumerated, so by Peter's standing rule it has to
// ellipsize and offer the full value in a Tooltip. That means real HTML in a
// <foreignObject> — the same device AnimatedSwimlaneChart uses — and real HTML
// means the Text and Tooltip components rather than an SVG <text>. The delta
// and the baseline's name are chart-formatted short strings, so they stay as
// SVG text.
//
// No factory and no override props: `domain`, `baseline`, `value`, `label`,
// `format` and `baselineLabel` are all DATA, and there is nothing static left
// to curry. One size, one geometry — expand only when a caller demands it.
// ============================================
import {
  For,
  type Component,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  type Band,
  type Box,
  type Callout,
  clampedValue,
  COLUMN_TICK_HALF,
  gaugeGeometry,
  PIVOT_RADIUS,
  TERMINAL_RADIUS,
  type Domain,
} from "./geometry";
import { EllipsizedHudCaption } from "../Text";
import { Tooltip } from "../Tooltip";
import { observeSize } from "../../internal/dom/observeSize";
import "./RateGauge.css";

export interface RateGaugeProps {
  /** The value range the ring spans, mapped onto [−90°, +90°]. */
  domain: Domain;
  /** The rate to compare against, drawn as the dashed needle. */
  baseline: number;
  /** The rate right now, drawn as the solid needle. Clamped to the domain. */
  value: number;
  /** What the current value IS — the scenario's name, shown beside its needle. */
  label: string;
  /** The consumer's formatter for the signed delta, e.g. `+$23,000/mo`. */
  format: (delta: number) => string;
  /** Name for the baseline needle. */
  baselineLabel?: string;
  /**
   * A gain the consumer considers comfortable, in their own units.
   *
   * When given, the ring's gain half splits at it: below is the warning tone
   * (a gain, but not yet a comfortable one), at or above is the success tone.
   * Ignored when zero or negative — a non-positive comfortable gain is not a
   * threshold.
   */
  comfortable?: number;
}

const DEFAULT_BASELINE_LABEL = "Baseline";

/** Height of a callout's label box, and half of it — one 11px line. */
const LABEL_BOX_HEIGHT = 14;
/**
 * A band carries its own tone and whether it is lit. The dimming is the primary
 * channel for the answer — the reader watches which band the needle stands
 * in — so the tone is redundant encoding rather than the only signal.
 */
const bandClass = (band: Band): string =>
  `sui-rate-gauge__band sui-rate-gauge__band--${band.tone} sui-rate-gauge__band--${
    band.lit ? "lit" : "dim"
  }`;

/**
 * Which callouts carry the consumer's own words, and so must ellipsize.
 *
 * The delta is formatted by the consumer but into a short figure, and
 * "Baseline" is the component's own default or a short override — neither can
 * run away with the column the way a scenario name can.
 */
const isConsumerText = (callout: Callout): boolean =>
  callout.id === "value" || callout.id === "valueAndBaseline";

export const RateGauge: Component<RateGaugeProps> = (props) => {
  // The host's own box, once it has one.
  //
  // With it, the canvas is that box at ONE UNIT PER CSS PIXEL: the dial grows
  // to fill the card while the labels, strokes and dots keep their own size.
  // Without it — a card that sizes to its content, which is most of the
  // bench — the gauge draws its default dial on a canvas cut tight to it, and
  // the whole thing scales together as it always did. That fallback is why
  // this is a signal starting `undefined` rather than a measurement the first
  // render has to wait for: an unmeasured gauge is a correct gauge, not a
  // blank one.
  const [box, setBox] = createSignal<Box | undefined>(undefined);
  let host: HTMLDivElement | undefined;

  const measureHost = (): void => {
    if (host === undefined) return;
    const rect = host.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setBox({ width: rect.width, height: rect.height });
    }
  };

  onMount(() => {
    if (host === undefined) return;
    // Synchronously first, so the first paint is already at the right size.
    measureHost();
    const stop = observeSize(host, (measured) => {
      if (measured.width > 0 && measured.height > 0) {
        setBox(measured);
        return;
      }
      // Not laid out yet. Look again once this frame's layout has settled
      // rather than recording a zero as though it were the answer.
      queueMicrotask(measureHost);
    });
    onCleanup(stop);
  });

  const baselineLabel = () => props.baselineLabel ?? DEFAULT_BASELINE_LABEL;

  /** Exactly the strings the callouts will carry, for sizing the column. */
  const columnTexts = (): readonly string[] => {
    const drawnValue = clampedValue(props.domain, props.value);
    const drawnBaseline = clampedValue(props.domain, props.baseline);
    return drawnValue === drawnBaseline
      ? [`${props.label} = ${baselineLabel()}`]
      : [
          props.label,
          props.format(drawnValue - drawnBaseline),
          baselineLabel(),
        ];
  };

  const geometry = createMemo(() =>
    gaugeGeometry({
      domain: props.domain,
      baseline: props.baseline,
      value: props.value,
      comfortable: props.comfortable,
      // The canvas is cut to the words as well as to the dial, so geometry is
      // handed the strings that will END UP in the column — which is not the
      // same as the three props. When the two needles coincide the callouts
      // collapse to one row naming both, and that row's text is longer than
      // any of the three; sizing the column from the props measured a string
      // the gauge was never going to draw.
      labels: columnTexts(),
      box: box(),
    }),
  );
  const tone = () => geometry().tone;

  /** The words each callout carries. The delta row is the only formatted one. */
  const textFor = (callout: Callout): string => {
    if (callout.id === "value") return props.label;
    if (callout.id === "baseline") return baselineLabel();
    if (callout.id === "valueAndBaseline") {
      return `${props.label} = ${baselineLabel()}`;
    }
    return props.format(geometry().delta);
  };

  // One sentence, same disposition as BandRail: the announcement has to carry
  // what the picture carries — which needle is where, and the difference — or
  // the reading is colour-only.
  //
  // It announces the DRAWN values, not the raw ones, for the same reason the
  // delta is computed against them: a needle parked at a pole must not read out
  // a number the dial contradicts. A screen-reader user gets the picture, and
  // the picture is clamped.
  /**
   * What band the needle stands in, said in words. Only when the consumer has
   * named a comfortable gain — without one there are just two halves, and the
   * delta's own sign already carries which.
   */
  const bandPhrase = () => {
    if (geometry().comfortable === undefined) return "";
    if (geometry().tone === "danger") return " Below the baseline's own zero.";
    return geometry().tone === "success"
      ? " In the comfortable range."
      : " Below the comfortable gain.";
  };

  const valueText = () =>
    `${props.label}: ${geometry().drawnValue}. ${baselineLabel()}: ${
      geometry().drawnBaseline
    }. ${props.format(geometry().delta)} against ${baselineLabel().toLowerCase()}.${bandPhrase()}`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA meter; a native <meter> is a replaced element with its own UA bar rendering and cannot host the SVG dial that IS this readout.
    <div
      ref={host}
      class={`sui-rate-gauge sui-rate-gauge--${tone()}`}
      role="meter"
      aria-label={props.label}
      aria-valuemin={props.domain[0]}
      aria-valuemax={props.domain[1]}
      aria-valuenow={geometry().drawnValue}
      aria-valuetext={valueText()}
    >
      <svg
        class="sui-rate-gauge__canvas"
        viewBox={geometry().viewBox}
        aria-hidden="true"
      >
        {/* The ring's bands. Only the one holding the needle is lit — two of
            them normally, three once a comfortable gain splits the gain half. */}
        <For each={geometry().bands}>
          {(band) => <path class={bandClass(band)} d={band.path} />}
        </For>

        {/* The delta as an AREA: the sector the two needles enclose, in the
            active tone at low alpha. Then the zero reference line. */}
        <Show when={geometry().deltaSector}>
          <path
            class="sui-rate-gauge__delta-sector"
            d={geometry().deltaSector}
          />
        </Show>
        <line
          class="sui-rate-gauge__zero"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().zeroLine.x2}
          y2={geometry().zeroLine.y2}
        />

        {/* The baseline needle: dashed and grey, because it is the reference,
            not the reading. No tip cap — the cap marks where you ARE. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--baseline"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().baselineTip.x}
          y2={geometry().baselineTip.y}
        />

        {/* The delta brace, outside the ring, in the active tone. Its cusp is
            where the delta's leader starts — which is why that callout carries
            no dot. */}
        <Show when={geometry().brace}>
          <path class="sui-rate-gauge__brace" d={geometry().brace} />
        </Show>

        {/* The current needle, capped with an arc concentric with the ring so
            the cap reads as a segment of the instrument's own edge. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--value"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().valueTip.x}
          y2={geometry().valueTip.y}
        />
        <path
          class="sui-rate-gauge__needle-cap"
          d={geometry().valueTip.capArc}
        />

        <circle
          class="sui-rate-gauge__pivot"
          cx={geometry().metrics.center.cx}
          cy={geometry().metrics.center.cy}
          r={PIVOT_RADIUS}
        />

        {/* The callouts. Geometry decided every point; this only paints. */}
        <For each={geometry().callouts}>
          {(callout) => (
            <g class={`sui-rate-gauge__row sui-rate-gauge__row--${callout.id}`}>
              <path class="sui-rate-gauge__leader" d={callout.leader} />
              {/* The terminal, when geometry says there is room for one. A dot
                  on a mark the callout does not name reads as a blemish on
                  that mark, so those leaders start bare from the anchor
                  instead. Filled for a live mark, open for the baseline — the
                  same distinction the dashed needle already makes. */}
              <Show when={callout.showDot}>
                <circle
                  class="sui-rate-gauge__terminal"
                  cx={callout.anchor.x}
                  cy={callout.anchor.y}
                  r={TERMINAL_RADIUS}
                />
              </Show>
              <line
                class="sui-rate-gauge__column-tick"
                x1={callout.labelX}
                x2={callout.labelX}
                y1={callout.y - COLUMN_TICK_HALF}
                y2={callout.y + COLUMN_TICK_HALF}
              />
              <Show
                when={isConsumerText(callout)}
                fallback={
                  <text
                    class="sui-rate-gauge__label"
                    x={callout.textX}
                    y={callout.y}
                    dominant-baseline="middle"
                  >
                    {textFor(callout)}
                  </text>
                }
              >
                {/* The consumer's own words: they can be any length, so they
                    ellipsize inside the column and hand the full value to a
                    Tooltip. HTML needs a <foreignObject> to have any layout at
                    all inside an <svg>. */}
                <foreignObject
                  x={callout.textX}
                  y={callout.y - LABEL_BOX_HEIGHT / 2}
                  width={geometry().labelWidth}
                  height={LABEL_BOX_HEIGHT}
                >
                  <div class="sui-rate-gauge__label-box">
                    <Tooltip content={textFor(callout)} triggerAs="span">
                      <EllipsizedHudCaption>
                        {textFor(callout)}
                      </EllipsizedHudCaption>
                    </Tooltip>
                  </div>
                </foreignObject>
              </Show>
            </g>
          )}
        </For>
      </svg>
    </div>
  );
};
