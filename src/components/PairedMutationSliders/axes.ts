// ============================================
// PairedMutationSliders — the two AXES. Private module, no Solid, no DOM.
//
// An axis is everything that is true of a MEASURE rather than of an entity:
// what the measure is called, what unit it reads in, which values its domain
// admits, and the scale its dials share. It is supplied ONCE, at the component,
// because "the second dial is dollars per hour" is a fact about the whole row
// and repeating it on every entity would be a fact that can disagree with
// itself.
//
// This is the module a curried variant locks. `axes` is presentational
// configuration in exactly the sense ADR-0001 means: the unit, the vocabulary
// and the grid, per measure.
// ============================================
import {
  type Domain,
  dragStep,
  niceStep,
  trackDomainOf,
} from "../MarkedSlider/geometry";
import {
  type MeasureIndex,
  type PairedMutationEntity,
  measureEntities,
} from "./pairs";

/**
 * One measure's axis: everything true of the measure rather than of an entity.
 *
 * Every field is optional, so an axis can be `{}` and still draw — the default
 * is a nameless, unformatted, ungridded scale derived from the data, which is
 * the same disposition `MutationSliders` takes when its own overrides are
 * omitted.
 */
export interface PairedMeasureAxis {
  /**
   * What this measure is CALLED, printed in the muted line under its dial —
   * `"Hrs/wk"`, `"$/hr"`. It is the only thing telling a reader which of the
   * two dials under one name is which, so a pair with two unlabelled axes is a
   * pair the reader has to guess at.
   *
   * Omitted, the line is still rendered and hidden, so a labelled and an
   * unlabelled pair stand at exactly the same height.
   */
  readonly label?: string;
  /**
   * Renders this measure's amount under its dial, and the `aria-valuetext` a
   * screen reader announces. Default `String`.
   *
   * PER MEASURE, which is the whole reason this component exists: hours and
   * dollars do not share a formatter any more than they share a scale.
   */
  readonly format?: (value: number) => string;
  /**
   * Round every emitted amount on this measure onto a grid of this size — `1`
   * for whole hours, `5` for five-dollar steps. Omitted, the drag stays
   * continuous to the finest unit the domain can express.
   */
  readonly snap?: number;
  /**
   * The `[min, max]` this measure's TRACK runs. Every dial in the row at this
   * position uses it, which is what makes two entities comparable on the same
   * measure.
   *
   * OPTIONAL. Left out, it is DERIVED from the entities' ranges at this
   * position — lowest floor to highest ceiling — exactly as `MutationSliders`
   * derives its own. Pass one only to hold the track STILL.
   */
  readonly domain?: Domain;
}

/** The pair, in reading order: measure 0 then measure 1. */
export type PairedMeasureAxes = readonly [PairedMeasureAxis, PairedMeasureAxis];

/** This measure's unit, or the neutral fallback. */
export const formatOf = (
  axis: PairedMeasureAxis,
): ((value: number) => string) => axis.format ?? String;

/**
 * The scale this measure's dials share: the axis's own if it named one, and
 * otherwise the span the entities bracket at this position.
 *
 * `axisDomainOf`, not `domainOf`: `Chart/scales.ts` already publishes a
 * `domainOf` to the ROOT barrel, and `scripts/adherence.mjs` flags a second
 * folder exporting that name for exactly the reason MutationSliders' barrel
 * states — an ambiguous `export *` resolves to nothing at all, silently. The
 * name is qualified here even though this module is private, so that
 * publishing it later could never be the thing that breaks `Chart`.
 */
export const axisDomainOf = (
  axis: PairedMeasureAxis,
  entities: readonly PairedMutationEntity[],
  index: MeasureIndex,
): Domain => axis.domain ?? trackDomainOf(measureEntities(entities, index));

/**
 * One measure's axis with every derivation already done — the shape a COLUMN
 * is handed.
 *
 * Resolved once by the ROW and passed down, because every one of these is
 * either shared by the whole row (the domain, and the two steps derived from
 * it) or a component-level override (the unit, the name, the grid). A column
 * that derived its own would let two columns in one row disagree about the
 * scale they are drawn on, which is the one thing a row of dials exists to
 * prevent.
 */
export interface ResolvedAxis {
  readonly domain: Domain;
  readonly format: (value: number) => string;
  readonly label?: string;
  readonly snap?: number;
  /** What a POINTER drag moves by — the finest unit this domain expresses. */
  readonly dragStep: number;
  /** What one ARROW KEY moves by. Ten of these for a page key. */
  readonly keyStep: number;
}

/** The pair of resolved axes, in reading order. */
export type ResolvedAxes = readonly [ResolvedAxis, ResolvedAxis];

/**
 * Resolve one axis against the entities: derive the domain when it was not
 * given, then derive both steps from whichever domain resulted.
 *
 * `snap` raises the KEY step when it is coarser, exactly as it does on
 * `MutationSliders`: a grid of round units with a finer key step would let the
 * keyboard land between the rungs a drag is confined to, so two ways of moving
 * one thumb would disagree about which values exist.
 */
export const resolveAxis = (
  axis: PairedMeasureAxis,
  entities: readonly PairedMutationEntity[],
  index: MeasureIndex,
): ResolvedAxis => {
  const domain = axisDomainOf(axis, entities, index);
  return {
    domain,
    format: formatOf(axis),
    label: axis.label,
    snap: axis.snap,
    dragStep: axis.snap ?? dragStep(domain),
    keyStep: Math.max(niceStep(domain), axis.snap ?? 0),
  };
};
