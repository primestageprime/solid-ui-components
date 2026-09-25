// ============================================
// MutationSliders link math — pure, headless, no Solid, no DOM.
//
// Lowercase filename ON PURPOSE, the same disposition as rows.ts: a PascalCase
// module here would register as a published component owing a showcase.
//
// A LINK GROUP is a set of dials that STAY at one level (Peter, 2026-09-24).
// It is not the name-click selection pin beside it in rows.ts, and the two
// differ in exactly one respect: a pinned move carries every peer by the SAME
// DELTA, so a group split by different ceilings keeps its shape; a linked move
// sends every member to the SAME AMOUNT, so a group a ceiling split collapses
// back to level on the next move. Forming either snaps to the HIGHEST amount
// among the members, and that step is `pinTo`'s, reused rather than restated.
//
// THE GROUP IS THE SELECTION (manager ruling, 2026-09-24): there is no second
// link state. `grouping: "link"` on the row makes the selection move by this
// rule instead of `moveTogether`'s; the forming snap stays `pinTo`.
//
// Everything here prints as a table (links.test.ts).
// ============================================
import { filter, find, map, some } from "../../fn";
import { type Entity, clampToRange } from "../MarkedSlider/geometry";
import { type PinnedValue, movable, ownBand } from "./rows";

/**
 * The amounts a link group takes when ONE member is moved to `target`: every
 * member to that SAME amount, each clamped to its own range.
 *
 * The same amount, not the same delta — that is the difference between a link
 * and a pin. A member whose ceiling stops it short diverges for as long as the
 * target is above its ceiling, and rejoins the level on the first move back
 * inside it.
 *
 * Returns EVERY movable member, changed or not: a commit has to reach the
 * whole group or a consumer persisting per dial would save one member alone.
 * A removed member is skipped — it has no amount to set.
 */
export const applyLinkedMove = (
  entities: readonly Entity[],
  linked: readonly string[],
  target: number,
): readonly PinnedValue[] =>
  map(
    (entity: Entity) => ({
      id: entity.id,
      value: clampToRange(ownBand(entity), target),
    }),
    movable(entities, linked),
  );


/** What a per-dial RESET does to the row: who moves where, and who unlinks. */
export interface ResetResult {
  readonly moves: readonly PinnedValue[];
  readonly unlink: readonly string[];
}

const NOTHING: ResetResult = { moves: [], unlink: [] };

/**
 * A per-dial RESET as a MOVE (Peter, 2026-09-24): the dial goes back to its
 * prior amount through the same path a drag takes, so a linked group follows
 * it to that level (`applyLinkedMove`'s rule).
 *
 * A member that cannot validly stand at that level — the target is outside
 * its own range, or it has been removed — is UNLINKED rather than clamped: a
 * clamp would leave it in the group at a different level, which is the one
 * state a link exists to prevent. If fewer than two members survive, the
 * group DISSOLVES and the reset dial unlinks too: a group of one draws a link
 * mark that links it to nothing.
 *
 * Nothing for a dial with no prior amount (a new entity — what its reset
 * means is the consumer's) or a removed one (its footer offers Restore).
 * A dial outside any group simply moves alone.
 */
export const resetLinked = (
  entities: readonly Entity[],
  selected: readonly string[],
  id: string,
): ResetResult => {
  const dial = find((entity: Entity) => entity.id === id, entities);
  if (dial === undefined || dial.old === null || dial.value === null) {
    return NOTHING;
  }
  const target = clampToRange(ownBand(dial), dial.old);
  const members = filter(
    (entity: Entity) => some((other: string) => other === entity.id, selected),
    entities,
  );
  const grouped =
    members.length > 1 && some((entity: Entity) => entity.id === id, members);
  if (!grouped) return { moves: [{ id, value: target }], unlink: [] };
  const reaches = (entity: Entity): boolean => {
    const [low, high] = ownBand(entity);
    return entity.value !== null && target >= low && target <= high;
  };
  const stay = filter(reaches, members);
  const leave = map(
    (entity: Entity) => entity.id,
    filter((entity: Entity) => !reaches(entity), members),
  );
  if (stay.length < 2) {
    return {
      moves: [{ id, value: target }],
      unlink: map((entity: Entity) => entity.id, members),
    };
  }
  return {
    moves: map((entity: Entity) => ({ id: entity.id, value: target }), stay),
    unlink: leave,
  };
};
