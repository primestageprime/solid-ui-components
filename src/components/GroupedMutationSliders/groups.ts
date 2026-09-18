// ============================================
// GroupedMutationSliders — the pure part. No Solid, no DOM, no CSS.
//
// Lowercase filename ON PURPOSE (the same disposition as PairedMutationSliders'
// pairs.ts and MutationSliders' rows.ts): `isEntryPath` in
// scripts/render-coverage.mjs matches any PascalCase `.tsx` under
// src/components/, so a PascalCase module here would register as a component
// owing a mount test of its own.
//
// WHAT THIS OWNS: two things, and they are the only two ideas this component
// adds to `PairedMutationSliders`.
//
//   1. THE PROJECTION, at an arbitrary index. A grouped entity carries N
//      measures under one name; every piece of row arithmetic that already
//      exists — the window, the pin, the group move, the clamp — is written
//      against the SINGLE-measure `Entity` this library already has. So rather
//      than reimplement any of it, this module projects the entity down to one
//      measure at a time and hands the result to `MutationSliders/rows.ts`
//      unchanged. That is why "a pin only affects the SAME measure index" is
//      not a branch anywhere: measure i and measure j are disjoint
//      projections, and `pinTo` applied to one cannot see the other.
//
//   2. THE RUNS. Consecutive axes sharing a `group` are drawn under ONE
//      caption. `groupRuns` is the whole of that rule, as data, so what the
//      captions say can be argued with from a terminal.
//
// Everything here prints as a table (groups.test.ts).
// ============================================
import { every, filter, join, map, some } from "../../fn";
import type { Domain, Entity } from "../MarkedSlider/geometry";
import { DIAL_SLOT } from "../MutationSliders/rows";

/**
 * ONE measure of a grouped entity, in the consumer's own units for THAT
 * measure: where it was, where it is going, and what it is allowed.
 *
 * Structurally identical to `PairedMeasure`, and DELIBERATELY not imported from
 * that folder: this component is on the bench and that one is published, so a
 * type dependency between them would tie a shipped component's API to something
 * still being designed. If this graduates and `PairedMutationSliders` is
 * re-expressed over it, the two collapse into one declaration at that point —
 * which is a deletion, and deletions come last (add / deprecate / delete).
 */
export interface GroupedMeasure {
  /**
   * The amount in the OLD scenario, or `null` for a measure that was not in it
   * at all. Drawn as the muted prior mark; `null` draws none.
   */
  readonly prior: number | null;
  /**
   * The amount in the NEW scenario, or `null` when this measure has no future
   * value — which is what a REMOVED entity looks like on every one of its
   * measures at once.
   */
  readonly value: number | null;
  /** What this measure is allowed: the shaded box, and the clamp. */
  readonly range: Domain;
}

/**
 * One named thing with N differently-united measures under it.
 *
 * `measures` is a LIST where `PairedMutationEntity`'s is a fixed pair, and that
 * is the entire difference between the two components. `PairedMutationSliders`
 * states the case for a pair in its own `pairs.ts` — "two is the shape that has
 * a consumer; an N-measure component would owe a per-measure layout decision
 * nobody has asked for" — and the second half of that sentence is what changed:
 * a licence has four measures in two captioned groups (a monthly seat count and
 * its fee, an annual seat count and its discount), so the layout decision now
 * has a consumer and an answer. The answer is `group`.
 *
 * Position for position with the component's `axes`. An entity with fewer
 * measures than there are axes draws only the ones it has; the row does not
 * pad, because a padded dial would be a figure the consumer never supplied.
 */
export interface GroupedMutationEntity {
  readonly id: string;
  readonly label: string;
  /** Measure 0, 1, …, matching `axes` position for position. */
  readonly measures: readonly GroupedMeasure[];
}

/**
 * Which measure a callback is about. A plain number, not a union: the count is
 * the consumer's, so there is no finite set of positions to name.
 */
export type GroupedMeasureIndex = number;

/** Every position in reading order — one place for `[0, 1, … n-1]`. */
export const measureIndices = (count: number): readonly number[] =>
  Array.from({ length: Math.max(count, 0) }, (_unused, index) => index);

/**
 * What ONE grouped entity costs the row: one dial slot per measure.
 *
 * The dials sit in `sm`-gap rows, whose gap is 8px — the same `ROW_GAP` that
 * `DIAL_SLOT` already folds in after each dial — so N dials plus the gaps
 * between them plus the gap after the group is exactly `N * DIAL_SLOT`, with no
 * separate constant to drift out of step with the Layout variant. (The group
 * captions cost HEIGHT, not width, so they do not enter this.)
 *
 * The count is the AXES' rather than any entity's: the row's columns have to
 * line up across entities, and an entity that supplied fewer measures still
 * stands in a slot the width of the row's widest reading.
 */
export const slotFor = (measureCount: number): number =>
  Math.max(measureCount, 1) * DIAL_SLOT;

/**
 * One measure of one entity, as the single-measure row arithmetic sees it, or
 * `undefined` when this entity has no measure at that position.
 *
 * The id is the ENTITY'S, unchanged, because every caller of the result keys
 * its answer back to the entity — a synthetic per-measure id would have to be
 * unpicked again at every emission.
 */
export const measureEntity = (
  entity: GroupedMutationEntity,
  index: GroupedMeasureIndex,
): Entity | undefined => {
  const measure = entity.measures[index];
  if (measure === undefined) return undefined;
  return {
    id: entity.id,
    label: entity.label,
    old: measure.prior,
    value: measure.value,
    range: measure.range,
  };
};

/**
 * One measure across the whole row — the input every row helper wants.
 *
 * Entities with no measure at this position are DROPPED rather than
 * represented by a blank, because `pinTo` and `moveTogether` reason about which
 * entities are movable and a placeholder would be one more thing for them to
 * exclude. An entity that is not on a measure cannot be pinned on it.
 */
export const measureEntities = (
  entities: readonly GroupedMutationEntity[],
  index: GroupedMeasureIndex,
): readonly Entity[] => {
  const rows: Entity[] = [];
  for (const entity of entities) {
    const projected = measureEntity(entity, index);
    if (projected !== undefined) rows.push(projected);
  }
  return rows;
};

/**
 * Whether an entity is REMOVED: every one of its measures has lost its future
 * value.
 *
 * There is no `removed` flag, deliberately — `MutationSliders` says removal
 * with `value: null` and nothing else, and a flag beside N nullable values
 * would be a second copy of the same truth that can disagree with itself. An
 * entity with ONE measure still holding a value is not removed; it is an entity
 * whose other measures have nothing to say, which is a real state and a
 * different drawing.
 *
 * An entity with NO measures at all is not removed either. "Every measure is
 * null" is vacuously true of an empty list, and reading that as removal would
 * strike through a name for having supplied no data.
 */
export const isRemoved = (entity: GroupedMutationEntity): boolean =>
  entity.measures.length > 0 &&
  every((measure: GroupedMeasure) => measure.value === null, entity.measures);

/**
 * One captioned run of dials: a caption and the measure positions under it.
 *
 * `caption` is `""` for a run of ungrouped axes, and the component still draws
 * the line — hidden — so a grouped and an ungrouped run stand at exactly the
 * same height. (Peter, 2026-09-16, on the readouts below: "elements that become
 * invisible but don't hold their space … the control moves around when you
 * change it.")
 */
export interface GroupRun {
  readonly caption: string;
  readonly indices: readonly number[];
}

/**
 * The runs a list of group names breaks into — CONSECUTIVE axes sharing a name
 * get one caption.
 *
 * Consecutive and not "all axes with this name", which is the rule worth
 * stating because the alternative silently reorders the row: axes named
 * `mo, yr, mo` would have to draw the two `mo` dials side by side to caption
 * them once, and the reader supplied that order on purpose. So a name that
 * comes back after an interruption opens a SECOND run with the same caption,
 * and the row draws what it was given.
 *
 * An UNGROUPED axis (`undefined`) is always its own run, never merged with the
 * ungrouped axis beside it. Two axes with no group are two unrelated measures
 * that happen to be adjacent; captioning them together would invent a grouping
 * the consumer did not ask for, and captioning them `""` jointly would be the
 * same invention with nothing drawn to show for it.
 */
export const groupRuns = (
  groups: readonly (string | undefined)[],
): readonly GroupRun[] => {
  const runs: GroupRun[] = [];
  let open: { caption: string; indices: number[] } | null = null;
  let openName: string | undefined;
  for (const [index, name] of groups.entries()) {
    const continues =
      open !== null && name !== undefined && name === openName;
    if (continues && open !== null) {
      open.indices.push(index);
      continue;
    }
    open = { caption: name ?? "", indices: [index] };
    openName = name;
    runs.push(open);
  }
  return runs;
};

/** The runs of a resolved axis list — the call the component actually makes. */
export const runsOf = (
  axes: readonly { readonly group?: string }[],
): readonly GroupRun[] =>
  groupRuns(map((axis: { readonly group?: string }) => axis.group, axes));

/**
 * ONE DIAL'S ACCESSIBLE NAME — `Starter yr #`.
 *
 * The entity, then the group, then the measure. All three, because on a
 * grouped row the first two are not enough: "Starter #" names two different
 * controls, one monthly and one annual, and telling them apart is the whole
 * reason the caption exists. Empty parts are dropped rather than spelled, so an
 * ungrouped row reads `Starter #` with no gap where a caption would have been.
 *
 * The fallback is POSITIONAL (`measure 3`) rather than blank: a dial a screen
 * reader cannot name is a dial it cannot refer to, and a number the reader can
 * count to is better than silence. It is 1-based, because the index is an
 * implementation detail and "the third dial" is what a person would say.
 */
export const dialLabel = (
  entityLabel: string,
  caption: string,
  axisLabel: string | undefined,
  index: number,
): string =>
  join(
    " ",
    filter((part: string) => part !== "", [
      entityLabel,
      caption,
      axisLabel ?? `measure ${index + 1}`,
    ]),
  );

/** Does any axis name a group? When none does, no caption line is drawn at
 *  all — a row of unrelated measures should not pay a blank line for a feature
 *  it is not using, and every entity in the row agrees, so nothing can jump. */
export const hasCaptions = (
  axes: readonly { readonly group?: string }[],
): boolean =>
  some((axis: { readonly group?: string }) => axis.group !== undefined, axes);
