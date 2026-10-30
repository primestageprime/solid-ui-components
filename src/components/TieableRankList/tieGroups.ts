// ============================================
// tieGroups — pure tie-group operations for a ranked list with ties.
// No Solid, no DOM: the headless half of TieableRankList.
//
// THE MODEL. A ranking is an `order` (ids, best first) plus `ties`, one flag
// per GAP between neighbours: `ties[i]` true means order[i] and order[i + 1]
// are equal. So `ties.length === order.length - 1`, and a run of trues is one
// N-way tie. A tier is a maximal run of tied neighbours.
// ============================================
import { map } from "../../fn";

/** One flag per gap between neighbours; true = the two are tied. */
export type TieFlags = readonly boolean[];

/** Tiers best-first; items in the same tier are tied. */
export function toTiers(order: readonly string[], ties: TieFlags): string[][] {
  const tiers: string[][] = [];
  for (const [i, id] of order.entries()) {
    if (i > 0 && ties[i - 1]) tiers[tiers.length - 1].push(id);
    else tiers.push([id]);
  }
  return tiers;
}

/** Rank per id, 1-based and dense: tied items share a rank, the next tier is +1. */
export function ranksOf(
  order: readonly string[],
  ties: TieFlags,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [i, tier] of toTiers(order, ties).entries()) {
    for (const id of tier) out[id] = i + 1;
  }
  return out;
}

/** Flip the tie between order[gap] and order[gap + 1]. */
export function toggleTie(ties: TieFlags, gap: number): boolean[] {
  return map((t, i) => (i === gap ? !t : t), ties);
}

/** Every item tied with every other: one tier. */
export const tieAll = (count: number): boolean[] =>
  Array.from({ length: Math.max(0, count - 1) }, () => true);

/** No ties: one item per tier. */
export const splitAll = (count: number): boolean[] =>
  Array.from({ length: Math.max(0, count - 1) }, () => false);

/**
 * Tie flags for a NEW order, from the old order and its ties.
 *
 * THE RULE: two neighbours in the new order are tied exactly when they were
 * in the same tier before. Ties therefore travel with the items, not with the
 * positions: a dragged item leaves its old group (unless it lands beside a
 * member of it), and an item dropped between two tied items splits them,
 * because it is now ranked between them.
 */
export function retie(
  prevOrder: readonly string[],
  prevTies: TieFlags,
  nextOrder: readonly string[],
): boolean[] {
  const tierOf = new Map<string, number>();
  for (const [i, tier] of toTiers(prevOrder, prevTies).entries()) {
    for (const id of tier) tierOf.set(id, i);
  }
  const flags: boolean[] = [];
  for (let i = 1; i < nextOrder.length; i++) {
    const a = tierOf.get(nextOrder[i - 1]);
    const b = tierOf.get(nextOrder[i]);
    flags.push(a !== undefined && a === b);
  }
  return flags;
}

/** Move the item at `index` one place up (-1) or down (+1), re-tying by `retie`. */
export function moveBy(
  order: readonly string[],
  ties: TieFlags,
  index: number,
  delta: -1 | 1,
): { order: string[]; ties: boolean[] } {
  const target = index + delta;
  if (
    index < 0 ||
    index >= order.length ||
    target < 0 ||
    target >= order.length
  ) {
    return { order: [...order], ties: [...ties] };
  }
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return { order: next, ties: retie(order, ties, next) };
}
