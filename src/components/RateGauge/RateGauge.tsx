// ============================================
// RateGauge — Atomic (Depth 1)
// Owns CSS (RateGauge.css), imports no other component.
//
// A right-facing half ring — a "D" open to the left — that answers one
// question: is the rate right now above or below its baseline, and by how
// much? The upper half of the ring is the positive zone, the lower half the
// negative one, split at the angle of ZERO; whichever zone the needle is not
// in is dimmed, so the live half reads as lit.
//
// Three marks, all the consumer's own values:
//   • a dashed grey needle at the BASELINE, with the faint sector it has swept
//     from zero;
//   • a solid needle in the active tone at the CURRENT value, capped at the tip;
//   • a bracket outside the ring spanning the angular difference, labelled with
//     the signed delta — formatted by the CONSUMER, never here.
//
// The component does NO arithmetic beyond geometry and the delta it announces.
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts); this file only paints what that returns. It is the
// headless-observation-first discipline made structural: there is nowhere in
// this module for a number to be decided.
//
// No factory and no override props: `domain`, `baseline`, `value`, `label`,
// `format` and `baselineLabel` are all DATA, and there is nothing static left
// to curry. One size, one geometry — expand only when a caller demands it.
// ============================================
import { For, type Component, createMemo, Show } from "solid-js";
import {
  CENTER,
  gaugeGeometry,
  type LabelId,
  PIVOT_RADIUS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type Domain,
} from "./geometry";
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
}

const DEFAULT_BASELINE_LABEL = "Baseline";

/** `sui-rate-gauge__<block>--lit` where the zone holds the needle, else `--dim`. */
const zoneClass = (block: string, lit: boolean): string =>
  `sui-rate-gauge__${block} sui-rate-gauge__${block}--${lit ? "lit" : "dim"}`;

export const RateGauge: Component<RateGaugeProps> = (props) => {
  const geometry = createMemo(() =>
    gaugeGeometry({
      domain: props.domain,
      baseline: props.baseline,
      value: props.value,
    }),
  );
  const baselineLabel = () => props.baselineLabel ?? DEFAULT_BASELINE_LABEL;
  const tone = () => (geometry().zone === "positive" ? "positive" : "negative");

  /** The label each row carries. The delta row is the only formatted one. */
  const textFor = (id: LabelId): string => {
    if (id === "value") return props.label;
    if (id === "baseline") return baselineLabel();
    return props.format(geometry().delta);
  };

  // One sentence, same disposition as BandRail: the announcement has to carry
  // what the picture carries — which needle is where, and the difference — or
  // the reading is colour-only.
  const valueText = () =>
    `${props.label}: ${props.value}. ${baselineLabel()}: ${props.baseline}. ${props.format(
      geometry().delta,
    )} against ${baselineLabel().toLowerCase()}.`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA meter; a native <meter> is a replaced element with its own UA bar rendering and cannot host the SVG dial that IS this readout.
    <div
      class={`sui-rate-gauge sui-rate-gauge--${tone()}`}
      role="meter"
      aria-label={props.label}
      aria-valuemin={props.domain[0]}
      aria-valuemax={props.domain[1]}
      aria-valuenow={props.value}
      aria-valuetext={valueText()}
    >
      <svg
        class="sui-rate-gauge__canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        aria-hidden="true"
      >
        {/* The two zones. Only the one holding the needle is lit. */}
        <path
          class={zoneClass("zone-positive", geometry().zone === "positive")}
          d={geometry().positiveRing}
        />
        <path
          class={zoneClass("zone-negative", geometry().zone === "negative")}
          d={geometry().negativeRing}
        />

        {/* The baseline's swept sector, then the zero reference it swept from. */}
        <Show when={geometry().wedge}>
          <path class="sui-rate-gauge__wedge" d={geometry().wedge} />
        </Show>
        <line
          class="sui-rate-gauge__zero"
          x1={CENTER.cx}
          y1={CENTER.cy}
          x2={geometry().zeroLine.x2}
          y2={geometry().zeroLine.y2}
        />

        {/* The baseline needle: dashed and grey, because it is the reference,
            not the reading. No tip cap — the cap marks where you ARE. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--baseline"
          x1={CENTER.cx}
          y1={CENTER.cy}
          x2={geometry().baselineTip.x}
          y2={geometry().baselineTip.y}
        />

        {/* The delta bracket, outside the ring, in the active tone. */}
        <Show when={geometry().bracket}>
          <path class="sui-rate-gauge__bracket" d={geometry().bracket} />
        </Show>

        {/* The current needle and its cap. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--value"
          x1={CENTER.cx}
          y1={CENTER.cy}
          x2={geometry().valueTip.x}
          y2={geometry().valueTip.y}
        />
        <line
          class="sui-rate-gauge__needle-cap"
          x1={geometry().valueTip.cap.x1}
          y1={geometry().valueTip.cap.y1}
          x2={geometry().valueTip.cap.x2}
          y2={geometry().valueTip.cap.y2}
        />

        <circle
          class="sui-rate-gauge__pivot"
          cx={CENTER.cx}
          cy={CENTER.cy}
          r={PIVOT_RADIUS}
        />

        {/* The label stack. Geometry decided the order and the leader paths, so
            two needles a degree apart still read as two rows. */}
        <For each={geometry().rows}>
          {(row) => (
            <g class={`sui-rate-gauge__row sui-rate-gauge__row--${row.id}`}>
              <path class="sui-rate-gauge__leader" d={row.leader} />
              <text
                class="sui-rate-gauge__label"
                x={row.x}
                y={row.y}
                dominant-baseline="middle"
              >
                {textFor(row.id)}
              </text>
            </g>
          )}
        </For>
      </svg>
    </div>
  );
};
