// ============================================
// PairedMutationSliders — the pure part. No Solid, no DOM, no CSS.
//
// Lowercase filename ON PURPOSE (the same disposition as MutationSliders'
// rows.ts and MarkedSlider's geometry.ts): `isEntryPath` in
// scripts/render-coverage.mjs matches any PascalCase `.tsx` under
// src/components/, so a PascalCase module here would register as a published
// component owing a showcase it does not have.
//
// WHAT THIS OWNS: the PROJECTION, and nothing else. A paired entity carries
// two measures under one name; every piece of row arithmetic that already
// exists — the window, the pin, the group move, the clamp — is written against
// the SINGLE-measure `Entity` this library already has. So rather than
// reimplement any of it against a pair, this module projects the pair down to
// one measure at a time and hands the result to `MutationSliders/rows.ts`
// unchanged.
//
// That is the whole reason "a pin only affects the SAME measure index" is not
// a branch anywhere: measure 0 and measure 1 are two disjoint projections, and
// `pinTo` applied to one of them cannot see the other.
//
// Everything here prints as a table (pairs.test.ts).
// ============================================
import { map } from "../../fn";
import type { Domain, Entity } from "../MarkedSlider/geometry";
import { DIAL_SLOT } from "../MutationSliders/rows";

/**
 * ONE measure of a paired entity, in the consumer's own units for THAT
 * measure: where it was, where it is going, and what it is allowed.
 *
 * The three fields are `Entity`'s `old` / `value` / `range` under names that
 * read on their own, because a measure is no longer "the" amount — an entity
 * has two of them and they share nothing but the entity.
 */
export interface PairedMeasure {
  /**
   * The amount in the OLD scenario, or `null` for a measure that was not in
   * it at all. Drawn as the muted prior mark; `null` draws none.
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
 * One named thing with TWO differently-united measures under it — the shape
 * `MutationSliders` cannot express, because its `domain` is documented as the
 * shared scale that makes two dials comparable and two measures in different
 * units share no scale at all.
 *
 * `measures` is a fixed PAIR rather than a list. Two is the shape that has a
 * consumer; an N-measure component would owe a per-measure layout decision
 * nobody has asked for, and widening a tuple later is additive where narrowing
 * a list is not.
 */
export interface PairedMutationEntity {
  readonly id: string;
  readonly label: string;
  /** Measure 0 then measure 1, matching `axes` position for position. */
  readonly measures: readonly [PairedMeasure, PairedMeasure];
}

/** The two measure positions, as the callbacks name them. */
export type MeasureIndex = 0 | 1;

/** Both positions, in reading order — one place for `[0, 1]`. */
export const MEASURE_INDICES: readonly MeasureIndex[] = [0, 1];

/**
 * What ONE paired entity costs the row: two dial slots.
 *
 * The pair sits in a `sm`-gap row, whose gap is 8px — the same `ROW_GAP` that
 * `DIAL_SLOT` already folds in after each dial. So two dials plus the gap
 * between them plus the gap after the pair is exactly `2 * DIAL_SLOT`, with no
 * separate constant to drift out of step with the Layout variant.
 */
export const PAIR_SLOT = 2 * DIAL_SLOT;

/**
 * One measure of one entity, as the single-measure row arithmetic sees it.
 *
 * The id is the ENTITY'S, unchanged, because every caller of the result keys
 * its answer back to the entity — a synthetic per-measure id would have to be
 * unpicked again at every emission.
 */
export const measureEntity = (
  entity: PairedMutationEntity,
  index: MeasureIndex,
): Entity => ({
  id: entity.id,
  label: entity.label,
  old: entity.measures[index].prior,
  value: entity.measures[index].value,
  range: entity.measures[index].range,
});

/** One measure across the whole row — the input every row helper wants. */
export const measureEntities = (
  entities: readonly PairedMutationEntity[],
  index: MeasureIndex,
): readonly Entity[] =>
  map((entity: PairedMutationEntity) => measureEntity(entity, index), entities);

/**
 * Whether an entity is REMOVED: every one of its measures has lost its future
 * value.
 *
 * There is no `removed` flag, deliberately. `MutationSliders` says removal
 * with `value: null` and nothing else, and a flag beside two nullable values
 * would be a second copy of the same truth that can disagree with itself. An
 * entity with ONE measure still holding a value is not removed — it is an
 * entity whose other measure has nothing to say yet, which is a real state and
 * a different drawing.
 */
export const isRemoved = (entity: PairedMutationEntity): boolean =>
  entity.measures[0].value === null && entity.measures[1].value === null;
