// ============================================
// RateGauge — Composite (Depth 2)
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
//   • a curly BRACE outside the ring spanning the angular difference, labelled
//     with the delta — WORDED by the consumer, never here — and the faint
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
// ## What this module is, and is not
//
// It owns NO CSS and renders NO intrinsic element. It composes three SUI
// components and nothing else:
//
//   • RateGaugeCanvas (Structural Primitive, Depth 1) — the instrument. The
//     meter host, the measured box, the dial, the needles, the brace, the
//     callouts and the <foreignObject> live there, with RateGaugeCanvas.css,
//     which is the only place stroke widths, dash patterns, band fills and
//     label clipping can be expressed.
//   • Tooltip + EllipsizedHudCaption — the label device, supplied INTO the
//     canvas's <foreignObject> via `renderLabel`. A Primitive may not import a
//     sibling Primitive, so the canvas states the slot and this module fills
//     it. ADR 0010's core/adapter split, at the element level.
//
// What is left here is exactly the WORDING. Every word the gauge says about
// the numbers is the consumer's: the component supplies no units, no currency
// and no domain nouns. `formatAgainst` returns the whole second line of a
// callout and `formatDelta` the whole brace line, so a consumer saying
// "$60k/yr over breakeven" and one saying "12 points clear" both get exactly
// their own sentence. The generic defaults print a plain grouped number, and
// "at zero" for zero. Those functions, the strings they produce, the column
// they have to be sized against and the announcement they compose are this
// module's whole job — no number is decided here and no pixel is painted.
//
// Which lines are UNBOUNDED is a wording decision too, and so it is made here:
// the value rows carry the consumer's non-enumerated `label`, so they go to
// the canvas's ellipsize-plus-tooltip seam. The delta line is the consumer's
// words as well, but it is a HUD line they build to fit; the reference
// needle's name is this module's default or a short override. Neither can run
// away with the column, so both stay bounded.
//
// The curried surface is `createRateGauge` (variants.ts): the WORDING — the
// reference needle's name and the two formatters — is presentational and curries
// once at the consumer's design-system layer; `domain`, `baseline`, `value`,
// `label` and `caution` are DATA and stay at the call site.
//
// Why `caution` is data and not a presentational fraction of the domain: a
// consumer's rule for it is their own, and a percentage-of-baseline rule cannot
// reach every case. Put the reference needle BELOW a small positive value and
// ask for caution — a threshold worth 5% of that baseline is one the value is
// already far above — so that consumer uses a flat absolute threshold instead.
// The prop is an absolute value in the consumer's own units for that reason.
//
// One size, one geometry — expand only when a caller demands it.
// ============================================
import { type Component, type JSX, mergeProps } from "solid-js";
import {
  type Callout,
  clampedValue,
  type Domain,
  type GaugeGeometry,
} from "./geometry";
import {
  RateGaugeCanvas,
  type RateGaugeLabelSlot,
  type RateGaugeLine,
} from "./RateGaugeCanvas";
import { EllipsizedHudCaption } from "../Text";
import { Tooltip } from "../Tooltip";

export interface RateGaugeProps {
  /** The value range the ring spans, mapped onto [−90°, +90°]. */
  domain: Domain;
  /** The value to compare against, drawn as the dashed needle. */
  baseline: number;
  /** The value right now, drawn as the solid needle. Clamped to the domain. */
  value: number;
  /** What the current value IS — its name, shown beside its needle. */
  label: string;
  /**
   * The WHOLE second line of a value's callout: where that value stands
   * against the ring's zero, in the consumer's own words and units.
   *
   * Not a number formatter — a sentence builder. The component supplies no
   * words of its own around it, so a consumer returning "$60k/yr over
   * breakeven" gets exactly that, and one returning "12 points clear" gets
   * that. It is called with the DRAWN (clamped) value, signed.
   *
   * Default: the plain grouped number, and "at zero" for zero.
   */
  formatAgainst?: (value: number) => string;
  /**
   * The WHOLE brace line: the difference between the two needles, in the
   * consumer's own words and units.
   *
   * Again a sentence, not a figure. The delta is handed over signed — value
   * minus baseline — and what that difference MEANS is the consumer's to say:
   * "$20k/yr to payroll" flips the sign on purpose, and the gauge must not
   * second-guess that by printing a sign of its own around it.
   *
   * Default: the plain grouped number, signed.
   */
  formatDelta?: (delta: number) => string;
  /** Name for the reference needle. Defaults to "Reference". */
  baselineLabel?: string;
  /**
   * The caution threshold, in the consumer's own units.
   *
   * Positive values BELOW this read as caution: the ring's positive half
   * splits at it, below is the warning tone, at or above is the success tone.
   * Ignored when zero or negative — a non-positive caution threshold is not a
   * threshold.
   */
  caution?: number;
}

const DEFAULT_BASELINE_LABEL = "Reference";

/**
 * The fallback wording: a bare grouped number, and a sentence for zero.
 *
 * Deliberately plain and deliberately unit-less. A consumer that cares about
 * units passes `formatAgainst`; one that has not got to it yet gets a figure
 * that is at least not WRONG. Zero gets its own sentence rather than "0",
 * which on a line that is supposed to say where a value STANDS reads as a
 * missing answer.
 */
const plainAgainst = (value: number): string =>
  value === 0 ? "at zero" : Math.round(value).toLocaleString();

/**
 * The fallback delta wording: the same plain number, with an explicit sign.
 *
 * Signed where `plainAgainst` is not, because a delta with no sign and no
 * words around it says nothing about which way it went.
 */
const plainDelta = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}${Math.abs(Math.round(delta)).toLocaleString()}`;

/**
 * Which callouts carry the consumer's own words, and so must ellipsize.
 *
 * The delta line is the consumer's words too, but it is a HUD line they build
 * to fit, and the reference needle's name is the component's own default or a
 * short override — neither can run away with the column the way a
 * consumer-supplied `label` can.
 */
const isConsumerText = (callout: Callout): boolean =>
  callout.id === "value" || callout.id === "valueAndBaseline";

export const RateGauge: Component<RateGaugeProps> = (props) => {
  const baselineLabel = () => props.baselineLabel ?? DEFAULT_BASELINE_LABEL;

  /** Where a value stands against the ring's zero, entirely in the consumer's words. */
  const against = (amount: number): string =>
    (props.formatAgainst ?? plainAgainst)(amount);

  /** The difference between the needles, entirely in the consumer's words. */
  const deltaText = (delta: number): string =>
    (props.formatDelta ?? plainDelta)(delta);

  /** Exactly the strings the callouts will carry, for sizing the column. */
  const columnTexts = (): readonly string[] => {
    const drawnValue = clampedValue(props.domain, props.value);
    const drawnBaseline = clampedValue(props.domain, props.baseline);
    const relative = [against(drawnValue), against(drawnBaseline)];
    return drawnValue === drawnBaseline
      ? [`${props.label} = ${baselineLabel()}`, ...relative]
      : [
          props.label,
          deltaText(drawnValue - drawnBaseline),
          baselineLabel(),
          ...relative,
        ];
  };

  /**
   * The words each callout carries. The delta row is the only formatted one.
   *
   * Line one names the thing; line two says where it stands against zero.
   * Only the NAME of a value row can be any length — it is the consumer's — so
   * only it is `unbounded`. The relative line is short by construction (the
   * consumer builds it to fit a HUD column).
   */
  const linesFor = (
    callout: Callout,
    geometry: GaugeGeometry,
  ): readonly RateGaugeLine[] => {
    if (callout.id === "delta") {
      return [{ text: deltaText(geometry.delta), unbounded: false }];
    }
    if (callout.id === "baseline") {
      return [
        { text: baselineLabel(), unbounded: false },
        { text: against(geometry.drawnBaseline), unbounded: false },
      ];
    }
    const name =
      callout.id === "valueAndBaseline"
        ? `${props.label} = ${baselineLabel()}`
        : props.label;
    return [
      { text: name, unbounded: isConsumerText(callout) },
      { text: against(geometry.drawnValue), unbounded: false },
    ];
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
   * named a caution threshold — without one there are just two halves, and the
   * delta's own wording already carries which.
   *
   * These three are the component's own words on purpose: they name a BAND of
   * the picture, not a quantity, so there is nothing domain-specific in them
   * for a consumer to have an opinion about.
   */
  const bandPhrase = (geometry: GaugeGeometry) => {
    if (geometry.caution === undefined) return "";
    if (geometry.tone === "danger") return " Below zero.";
    return geometry.tone === "success"
      ? " Above the caution threshold."
      : " Below the caution threshold.";
  };

  // The same phrases the callouts carry, in the same words — a screen reader
  // and a sighted reader should be able to quote the gauge to each other.
  const valueText = (geometry: GaugeGeometry): string =>
    `${props.label}: ${against(geometry.drawnValue)}. ${baselineLabel()}: ${against(
      geometry.drawnBaseline,
    )}. ${deltaText(geometry.delta)}.${bandPhrase(geometry)}`;

  /** The label device, dropped into the canvas's `<foreignObject>` slot. */
  const renderLabel = (slot: RateGaugeLabelSlot): JSX.Element => (
    <Tooltip content={slot.text} triggerAs="span">
      <EllipsizedHudCaption>{slot.text}</EllipsizedHudCaption>
    </Tooltip>
  );

  return (
    <RateGaugeCanvas
      domain={props.domain}
      baseline={props.baseline}
      value={props.value}
      caution={props.caution}
      labels={columnTexts()}
      lines={linesFor}
      valueText={valueText}
      ariaLabel={props.label}
      renderLabel={renderLabel}
    />
  );
};

/**
 * The presentational half: how the gauge WORDS itself.
 *
 * All three are decisions a product makes once — what the reference needle is
 * called, and the two sentences that carry the units — so they curry at the
 * design-system layer and never appear at a call site.
 */
export type RateGaugeOverrides = Pick<
  RateGaugeProps,
  "baselineLabel" | "formatAgainst" | "formatDelta"
>;

/**
 * The data half: what a call site still says. `caution` is here, not in the
 * overrides, because the threshold is in the consumer's own units and moves
 * with the numbers — see the header for the case a fixed fraction cannot reach.
 */
export type RateGaugeDataProps = Omit<RateGaugeProps, keyof RateGaugeOverrides>;

/** Bake the wording into a named variant. */
export function createRateGauge(
  defaults: RateGaugeOverrides,
): Component<RateGaugeDataProps> {
  return (props) => {
    const merged = mergeProps(defaults, props);
    return <RateGauge {...merged} />;
  };
}
