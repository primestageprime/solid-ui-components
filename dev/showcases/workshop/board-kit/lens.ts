/**
 * Board Kit — A CHANGE IS A LENS MUTATION.
 *
 * Peter, 2026-09-18: "These should mostly be lens mutations on existing config
 * types, right?" This is the second half of that sentence.
 *
 * Every edit any of the three boards can make is one of four things, and until
 * now each board spelled all four itself with its own vocabulary:
 *
 *   board edit          Scenario Board      Hourly Board        here
 *   -----------------   -----------------   -----------------   -------------
 *   move a dial         withChange(…,n)     withChange(…,m,n)   set([id, m])
 *   take it off         withChange(…,null)  withDrop            set([id,"presence"], null)
 *   put it back         withoutChange       withoutChange       clear
 *   add a row           hire                addService          add
 *
 * The middle column is two functions with one name and different arities, and
 * the third column is two functions with one name that differ in what they
 * DELETE. Collapsing them needs no lens library: a path is a pair, `view` and
 * `set` are ten lines each, and everything else on the boards is already pure.
 *
 * ── WHY A PATH IS (ENTITY, MEASURE) AND NOT A STRING ───────────────────────
 *
 * A string path ("service-a.1") would need parsing, and a typo in it would be a
 * silent no-op rather than a compile error — which is the exact failure the
 * Hourly Board's own header warns about at its `setMeasure` ("ignoring the
 * measure index would write an hours figure into a rate"). A tuple keeps the
 * compiler in the loop and costs nothing.
 *
 * `"presence"` is the second inhabitant because dropping an entity is not a
 * measure moving to zero — it is the entity ceasing to be sold, which every
 * reading downstream distinguishes from zero. Putting it in the path means the
 * drop travels the same code path as a drag rather than beside it.
 *
 * ── THE TIME COORDINATE IS THE SLOT, AND IT IS NOT IN THE PATH ─────────────
 *
 * A `Change` carries `at` — the mutation id being edited — beside its path,
 * rather than as a third path element. That is deliberate: the boards' own UI
 * selects ONE slot at a time (the as-of control) and then edits paths within
 * it, so the slot is the context an edit happens in, not part of what it names.
 * `applyChanges` takes a list of `Change`s, each with its own slot, which is
 * what makes a whole scenario replayable from a log.
 *
 * ── PROMOTION NOTE ─────────────────────────────────────────────────────────
 *
 * `src/fn` has no lens helper (it ships `pipe`, `map`, `prop`, `pluck` and the
 * collection functions, and nothing that writes). These forty lines are
 * deliberately NOT added to it: they are specific to this entity shape —
 * `"presence"`, the clamp against `ranges`, the carry-forward of untouched
 * measures — so a generic `set` in `src/fn` would not be these functions, it
 * would be a different function these would then be written on top of. If a
 * second consumer in `src/` ever wants a generic optic, that is the moment to
 * promote a `lensOf` primitive and rewrite these over it.
 */
import { filter, map } from "../../../../src/fn";
import type { BoardEntity } from "./config";

/**
 * WHAT AN EDIT NAMES: an entity, and either one of its measures or its
 * presence on the board.
 */
export type BoardPath =
  | readonly [entityId: string, measure: number]
  | readonly [entityId: string, presence: "presence"];

/** The slot an edit happens at — a mutation id. */
export type Slot = string;

/**
 * ONE EDIT. `value` is the new number for a measure path, or `null` for a
 * presence path (the only value a presence can take, since present is the
 * absence of a drop rather than a `true`).
 */
export interface Change {
  readonly at: Slot;
  readonly path: BoardPath;
  readonly value: number | null;
}

/** Is this path naming the entity's presence rather than a measure? */
const isPresence = (path: BoardPath): boolean => path[1] === "presence";

/** The entity a path names, or `undefined`. */
const entityOf = (
  entities: readonly BoardEntity[],
  path: BoardPath,
): BoardEntity | undefined => {
  for (const entity of entities) if (entity.id === path[0]) return entity;
  return undefined;
};

/**
 * One measure held inside the entity's own allowance.
 *
 * The clamp lives HERE rather than at each call site because it is the same
 * rule the dial draws: the shaded box on a slider IS `ranges[measure]`, so a
 * figure written past it would be a stored value the control could never emit.
 */
const clampMeasure = (
  entity: BoardEntity,
  measure: number,
  value: number,
): number => {
  const range = entity.ranges[measure];
  if (range === undefined) return value;
  return Math.min(Math.max(value, range[0]), range[1]);
};

/** Every measure of a set, held inside the allowance. */
export const clampMeasures = (
  entity: BoardEntity,
  measures: readonly number[] | null,
): readonly number[] | null =>
  measures === null
    ? null
    : map(
        (value: number, index: number) => clampMeasure(entity, index, value),
        measures,
      );

/**
 * The measures an entity carried JUST BEFORE a slot, walking its history in
 * time order rather than reading one key.
 *
 * The walk is the point: an entity moved at slot 1 and untouched at slot 2
 * carries its slot-1 level into slot 2, not its opening one. Both boards wrote
 * this walk, and both wrote the same comment explaining why.
 */
export const carriedBefore = (
  entity: BoardEntity,
  at: Slot,
  order: readonly Slot[],
): readonly number[] | null => {
  let carried = entity.committed;
  for (const slot of order) {
    if (slot === at) return carried;
    const own = entity.changes[slot];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/** Is `time` inside the entity's own life — on or after start, before end? */
export const isLiveAt = (entity: BoardEntity, time: number): boolean =>
  time >= entity.start && (entity.end === undefined || time < entity.end);

/**
 * READ one path at one slot: the measure's value from that slot onward, or
 * `null` when the entity is not on the board then.
 *
 * A presence path reads `1` when the entity is on the board and `null` when it
 * is not, so `view` answers both kinds of path with one return type.
 */
export const view = (
  entities: readonly BoardEntity[],
  path: BoardPath,
  at: Slot,
  order: readonly Slot[],
): number | null => {
  const entity = entityOf(entities, path);
  if (entity === undefined) return null;
  const own = entity.changes[at];
  const level =
    own !== undefined ? own : carriedBefore(entity, at, order);
  const held = clampMeasures(entity, level);
  if (isPresence(path)) return held === null ? null : 1;
  if (held === null) return null;
  return held[path[1] as number] ?? null;
};

/**
 * WRITE one path at one slot, leaving every other entity, every other measure
 * and every other slot untouched.
 *
 * The measure that did not move is CARRIED FORWARD rather than defaulted,
 * which is the honest answer and the reason a change in the history is a whole
 * set of measures: it did not change, and writing it down says exactly that.
 * An entity with no level either side of the slot cannot be edited into
 * existence here — that is `add`'s job, where the whole set is supplied at once.
 */
export const set = (
  entities: readonly BoardEntity[],
  path: BoardPath,
  value: number | null,
  at: Slot,
  order: readonly Slot[],
): BoardEntity[] =>
  map((entity: BoardEntity) => {
    if (entity.id !== path[0]) return entity;
    if (isPresence(path)) {
      return { ...entity, changes: { ...entity.changes, [at]: null } };
    }
    const own = entity.changes[at];
    const base = own !== undefined ? own : carriedBefore(entity, at, order);
    if (base === null || value === null) return entity;
    const measure = path[1] as number;
    const next = map(
      (held: number, index: number) => (index === measure ? value : held),
      base,
    );
    return {
      ...entity,
      changes: {
        ...entity.changes,
        [at]: clampMeasures(entity, next),
      },
    };
  }, entities);

/**
 * UNSET a slot entirely — the ↺ Reinstate / Restore both boards offer.
 *
 * DELETING the key is the honest inverse of setting it: the entity carries
 * whatever the previous slot left it on, which for one added at this slot is
 * the level it was added at, exactly. Inventing a level here would be the board
 * making up a figure nobody chose, and it is why a drop and a raise are undone
 * by the same single deletion rather than by two special cases.
 */
export const clear = (
  entities: readonly BoardEntity[],
  entityId: string,
  at: Slot,
): BoardEntity[] =>
  map((entity: BoardEntity) => {
    if (entity.id !== entityId) return entity;
    const { [at]: _dropped, ...rest } = entity.changes;
    return { ...entity, changes: rest };
  }, entities);

// ── Roster ops, expressed the same way ───────────────────────────────────────

/** What a board's Add form hands over once it is filled in. */
export interface EntitySpec {
  readonly id: string;
  readonly label: string;
  /** The level it opens on at the slot it is added at. */
  readonly measures: readonly number[];
  /** Its allowance, one range per measure. */
  readonly ranges: readonly (readonly [number, number])[];
  /** When it begins — the moment of the slot it was added at. */
  readonly start: number;
  readonly end?: number;
}

/**
 * ADD an entity at one slot.
 *
 * Three decisions, and they are the same three on every board:
 *
 *   • `committed: null` — it was not on the board before, so there is no prior
 *     and the dials draw no prior arrow. That is what makes it an ADDITION
 *     rather than a row that happens to start low.
 *   • ONE change, at `at` — so every EARLIER slot reads `null` both sides and
 *     hides it, and its existence starts exactly where the reader put it.
 *   • Nothing else is invented. The range, the label and the opening level all
 *     come from the caller's form.
 */
export const add = (
  entities: readonly BoardEntity[],
  spec: EntitySpec,
  at: Slot,
): BoardEntity[] => [
  ...entities,
  {
    id: spec.id,
    label: spec.label,
    start: spec.start,
    ...(spec.end === undefined ? {} : { end: spec.end }),
    committed: null,
    ranges: spec.ranges,
    changes: { [at]: spec.measures },
  },
];

/** REMOVE an entity outright — for one whose whole existence began at a slot
 *  that is being deleted, and which therefore has no history to revert to. */
export const remove = (
  entities: readonly BoardEntity[],
  entityId: string,
): BoardEntity[] =>
  filter((entity: BoardEntity) => entity.id !== entityId, entities);

/**
 * A STABLE id from a readable stem, so the same add made twice in a test gives
 * the same id and the caller stays pure. A counter or a clock in here would
 * make every assertion about an added row's id impossible to write.
 */
export const uniqueId = (
  stem: string,
  taken: readonly string[],
  fallback = "entity",
): string => {
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug === "" ? fallback : slug;
  let candidate = base;
  let suffix = 2;
  while (taken.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

/**
 * REPLAY a list of changes onto a fixture, in order.
 *
 * The whole scenario as a fold, which is what makes a board's state a VALUE:
 * the fixture plus a change log, rather than a mutable roster nothing can
 * reproduce. Every `Change` carries its own slot, so a log spanning several
 * as-of positions replays exactly as it was made.
 */
export const applyChanges = (
  fixture: readonly BoardEntity[],
  changes: readonly Change[],
  order: readonly Slot[],
): BoardEntity[] => {
  let entities: BoardEntity[] = [...fixture];
  for (const change of changes) {
    entities = set(entities, change.path, change.value, change.at, order);
  }
  return entities;
};
