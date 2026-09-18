// ============================================
// GroupedMutationSliders — the AXES. Private module, no Solid, no DOM.
//
// An axis is everything that is true of a MEASURE rather than of an entity:
// what the measure is called, what unit it reads in, which values its domain
// admits, the scale its dials share, and — the one field
// `PairedMutationSliders` has no equivalent of — which captioned GROUP it
// belongs to. It is supplied ONCE, at the component, because "the fourth dial
// is an annual discount percentage" is a fact about the whole row, and
// repeating it on every entity would be a fact that can disagree with itself.
//
// This is the module a curried variant locks. `axes` is presentational
// configuration in exactly the sense ADR-0001 means: the unit, the vocabulary,
// the grid and the grouping, per measure.
// ============================================
import { map } from "../../fn";
import {
  type Domain,
  dragStep,
  niceStep,
  trackDomainOf,
} from "../MarkedSlider/geometry";
import {
  type GroupedMeasureIndex,
  type GroupedMutationEntity,
  measureEntities,
} from "./groups";

/**
 * One measure's axis: everything true of the measure rather than of an entity.
 *
 * Every field is optional, so an axis can be `{}` and still draw — the default
 * is a nameless, ungrouped, unformatted, ungridded scale derived from the data,
 * which is the same disposition `MutationSliders` and `PairedMutationSliders`
 * take when their own overrides are omitted.
 */
export interface GroupedMeasureAxis {
  /**
   * What this measure is CALLED, printed in the muted line under its dial —
   * `"#"`, `"$"`, `"%"`. It is the only thing telling a reader which of the
   * dials under one name is which, so a row of unlabelled axes is a row the
   * reader has to guess at.
   *
   * With groups in play the label can be SHORT, and that is the point of having
   * both: `"#"` under a `"mo"` caption and `"#"` under a `"yr"` one say
   * everything `"Monthly licences"` and `"Annual licences"` would, in a column
   * the width of a dial. The caption carries the noun; the label carries the
   * unit.
   *
   * Omitted, the line is still rendered and hidden, so a labelled and an
   * unlabelled column stand at exactly the same height.
   */
  readonly label?: string;
  /**
   * Which captioned GROUP this measure belongs to — `"mo"`, `"yr"`. Axes that
   * are CONSECUTIVE and share a name are drawn under one caption.
   *
   * THE FIELD THIS COMPONENT EXISTS FOR. Four dials under one entity name is a
   * row the reader cannot parse without being told which two go together; the
   * alternative — two `PairedMutationSliders` rows per entity — duplicates the
   * name, the footer slot, the selection and the paging, so the entity stops
   * being one thing on screen.
   *
   * Omitted, the measure stands alone. See `groupRuns` for what "consecutive"
   * buys and why a name that comes back after an interruption opens a second
   * run rather than reordering the row.
   */
  readonly group?: string;
  /**
   * Renders this measure's amount under its dial, and the `aria-valuetext` a
   * screen reader announces. Default `String`.
   *
   * PER MEASURE, which is the whole reason this family of components exists:
   * a seat count and a discount percentage do not share a formatter any more
   * than they share a scale.
   */
  readonly format?: (value: number) => string;
  /**
   * Round every emitted amount on this measure onto a grid of this size — `1`
   * for whole licences, `5` for five-dollar steps. Omitted, the drag stays
   * continuous to the finest unit the domain can express.
   */
  readonly snap?: number;
  /**
   * The `[min, max]` this measure's TRACK runs. Every dial in the row at this
   * position uses it, which is what makes two entities comparable on the same
   * measure.
   *
   * OPTIONAL. Left out, it is DERIVED from the entities' ranges at this
   * position — lowest floor to highest ceiling. Pass one only to hold the track
   * STILL across edits.
   */
  readonly domain?: Domain;
}

/** The measures, in reading order. N ≥ 1. */
export type GroupedMeasureAxes = readonly GroupedMeasureAxis[];

/** This measure's unit, or the neutral fallback. */
export const formatOf = (
  axis: GroupedMeasureAxis,
): ((value: number) => string) => axis.format ?? String;

/**
 * The scale this measure's dials share: the axis's own if it named one, and
 * otherwise the span the entities bracket at this position.
 *
 * `axisDomainOf`, not `domainOf`: `Chart/scales.ts` already publishes a
 * `domainOf` to the ROOT barrel, and `scripts/adherence.mjs` flags a second
 * folder exporting that name — an ambiguous `export *` resolves to nothing at
 * all, silently. The name is qualified here even though this module is private
 * and this folder is not on the barrel, so that publishing it later could never
 * be the thing that breaks `Chart`.
 */
export const axisDomainOf = (
  axis: GroupedMeasureAxis,
  entities: readonly GroupedMutationEntity[],
  index: GroupedMeasureIndex,
): Domain => axis.domain ?? trackDomainOf(measureEntities(entities, index));

/**
 * One measure's axis with every derivation already done — the shape a COLUMN
 * is handed.
 *
 * Resolved once by the ROW and passed down, because every one of these is
 * either shared by the whole row (the domain, and the two steps derived from
 * it) or a component-level override (the unit, the name, the grid, the group).
 * A column that derived its own would let two columns in one row disagree about
 * the scale they are drawn on, which is the one thing a row of dials exists to
 * prevent.
 */
export interface ResolvedGroupedAxis {
  readonly domain: Domain;
  readonly format: (value: number) => string;
  readonly label?: string;
  readonly group?: string;
  readonly snap?: number;
  /** What a POINTER drag moves by — the finest unit this domain expresses. */
  readonly dragStep: number;
  /** What one ARROW KEY moves by. Ten of these for a page key. */
  readonly keyStep: number;
}

/** The resolved measures, in reading order. */
export type ResolvedGroupedAxes = readonly ResolvedGroupedAxis[];

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
  axis: GroupedMeasureAxis,
  entities: readonly GroupedMutationEntity[],
  index: GroupedMeasureIndex,
): ResolvedGroupedAxis => {
  const domain = axisDomainOf(axis, entities, index);
  return {
    domain,
    format: formatOf(axis),
    label: axis.label,
    group: axis.group,
    snap: axis.snap,
    dragStep: axis.snap ?? dragStep(domain),
    keyStep: Math.max(niceStep(domain), axis.snap ?? 0),
  };
};

/** Every axis, resolved against the row's own entities. */
export const resolveAxes = (
  axes: GroupedMeasureAxes,
  entities: readonly GroupedMutationEntity[],
): ResolvedGroupedAxes =>
  map(
    (axis: GroupedMeasureAxis, index: number) =>
      resolveAxis(axis, entities, index),
    axes,
  );
