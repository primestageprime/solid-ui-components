// ============================================
// WeightedGroupCard's model — pure, headless, no Solid, no DOM.
//
// A GROUP of COUNTED members (Peter's role-card sketch, 2026-11-20: Carpenters
// is Gerald ×2 and Jen ×1). The group's own dial is READ-ONLY: it is what the
// members come to, never something dragged. Its amount is the members' mean
// WEIGHTED BY COUNT ("the weighted average between the children ... that's
// why that arrow is there"), its count is the sum of theirs, and its total is
// the members' totals summed.
//
// One range per group: the range belongs to the group (the role type's
// min/max), and every member is clamped into it.
// ============================================
import { filter, flatMap, map, some, sum } from "../../fn";
import type { Domain, Entity } from "../MarkedSlider/geometry";

export interface CountedMember {
  readonly id: string;
  readonly label: string;
  /** How many units this member stands for: 1 or more, whole. */
  readonly count: number;
  /** The amount in the old scenario, or `null` for a new member. */
  readonly old: number | null;
  /** The amount in the new scenario, or `null` for a removed member. */
  readonly value: number | null;
}

export interface WeightedGroup {
  readonly id: string;
  readonly label: string;
  /** The `[min, max]` every member's amount is allowed. */
  readonly range: Domain;
  readonly members: readonly CountedMember[];
}

type Weighted = readonly [amount: number, count: number];

/** Σ amount·count / Σ count, or `null` when nothing is counted. */
export const weightedMean = (pairs: readonly Weighted[]): number | null => {
  const counted = sum(map(([, count]: Weighted) => count, pairs));
  return counted > 0
    ? sum(map(([amount, count]: Weighted) => amount * count, pairs)) / counted
    : null;
};

const present = (members: readonly CountedMember[]): readonly CountedMember[] =>
  filter((m: CountedMember) => m.value !== null, members);

const pairsOf = (
  members: readonly CountedMember[],
  pick: (m: CountedMember) => number | null,
): readonly Weighted[] =>
  flatMap((m: CountedMember): readonly Weighted[] => {
    const amount = pick(m);
    return amount === null ? [] : [[amount, m.count] as const];
  }, members);

/** The units the group stands for: the present members' counts summed. */
export const headcount = (members: readonly CountedMember[]): number =>
  sum(map((m: CountedMember) => m.count, present(members)));

/** The entity the group's read-only dial draws. */
export const groupEntity = (group: WeightedGroup): Entity => ({
  id: group.id,
  label: group.label,
  old: weightedMean(pairsOf(group.members, (m) => m.old)),
  value: weightedMean(pairsOf(group.members, (m) => m.value)),
  range: group.range,
});

/** One member's amount times its count, or `null` when it is removed. */
export const memberTotal = (member: CountedMember): number | null =>
  member.value === null ? null : member.value * member.count;

/** The group's total: every present member's total summed. */
export const total = (members: readonly CountedMember[]): number | null => {
  const totals = pairsOf(members, (m) => m.value);
  return totals.length > 0
    ? sum(map(([amount, count]: Weighted) => amount * count, totals))
    : null;
};

const back = (m: CountedMember): CountedMember =>
  m.old === null ? m : { ...m, value: m.old };

/** Every member back on its old amount. A new member has none and stays. */
export const resetAll = (
  members: readonly CountedMember[],
): readonly CountedMember[] => map(back, members);

/** One member back on its old amount. */
export const resetMember = (
  members: readonly CountedMember[],
  id: string,
): readonly CountedMember[] =>
  map((m: CountedMember) => (m.id === id ? back(m) : m), members);

/**
 * A member out of the new scenario. One with an old amount keeps it, so it can
 * be restored; a NEW member had nothing before, so it is simply gone.
 */
export const removeMember = (
  members: readonly CountedMember[],
  id: string,
): readonly CountedMember[] =>
  flatMap(
    (m: CountedMember): readonly CountedMember[] =>
      m.id !== id ? [m] : m.old === null ? [] : [{ ...m, value: null }],
    members,
  );

/** A removed member back, on its old amount. The same move as its reset. */
export const restoreMember = resetMember;

/** Whether a reset has anything to undo. */
export const isChanged = (members: readonly CountedMember[]): boolean =>
  some((m: CountedMember) => m.old !== null && m.value !== m.old, members);

const wholeCount = (count: number): number =>
  Number.isFinite(count) ? Math.max(1, Math.round(count)) : 1;

/** A member's count, as a whole number of one or more. */
export const setCount = (
  members: readonly CountedMember[],
  id: string,
  count: number,
): readonly CountedMember[] =>
  map(
    (m: CountedMember) => (m.id === id ? { ...m, count: wholeCount(count) } : m),
    members,
  );

const clamp = (value: number, [lo, hi]: Domain): number =>
  Math.min(hi, Math.max(lo, value));

/** A member's amount, clamped into the group's range. */
export const setValue = (
  group: WeightedGroup,
  id: string,
  value: number,
): WeightedGroup => ({
  ...group,
  members: map(
    (m: CountedMember) =>
      m.id === id ? { ...m, value: clamp(value, group.range) } : m,
    group.members,
  ),
});

/** A new range, its ends in order, with every amount pulled inside it. */
export const setRange = (group: WeightedGroup, ends: Domain): WeightedGroup => {
  const [a, b] = ends;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return group;
  const range: Domain = [Math.min(a, b), Math.max(a, b)];
  return {
    ...group,
    range,
    members: map(
      (m: CountedMember) =>
        m.value === null ? m : { ...m, value: clamp(m.value, range) },
      group.members,
    ),
  };
};
