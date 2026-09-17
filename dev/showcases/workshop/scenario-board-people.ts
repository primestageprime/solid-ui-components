/**
 * Scenario Board — the PEOPLE model, as plain functions.
 *
 * Second helper beside the bench, same reason as `scenario-board-rate.ts`:
 * nothing here imports Solid, so every rule below can be asserted from a
 * terminal without a render (headless observation first). The bench imports
 * these; the bench keeps only the arrangement and the wiring.
 *
 * Three things live here, and they belong together because each one is
 * meaningless without the next:
 *
 *   1. ROLES — what a role permits to be paid. The band on every dial.
 *   2. The PAY HISTORY walk — what a person is paid just before a mutation
 *      and from it onward, which is the pair a dial draws.
 *   3. The STATE TRANSITIONS — raise, terminate, restore and HIRE. Each one
 *      takes the people and returns new people; none of them mutate.
 *   4. The MUTATION LABELS — how a change reads on the as-of control. They
 *      live beside the pay walk because both are functions of the mutation
 *      list in time order, and the disambiguation rule can only be decided by
 *      looking at the WHOLE list.
 *
 * ── ROLES REPLACED BANDS (Peter, 2026-09-16) ───────────────────────────────
 *
 * The board used to carry three anonymous bands A/B/C whose ranges were
 * DISJOINT, because the timeline draws every band's rails on one pay axis and
 * two bands sharing a pay figure would put two rails at the same y. Peter's
 * hire form needs roles a person would recognise — "Software Engineer 60k to
 * 200k" — and real roles overlap heavily.
 *
 * So the non-overlap rule is GONE, and what replaces it is narrower and true:
 * a level's id is keyed by ROLE AND PAY (`levelIdFor` in the bench), so ids
 * stay distinct across roles and no ribbon can be dropped for naming a level
 * that is not there. What overlap costs is only the DRAWING — two roles whose
 * people sit on the same pay figure put two rails at the same height and
 * overdraw. With this fixture that collision is LATENT rather than manifest:
 * every pay figure in it is held by exactly one role. It becomes visible the
 * first time a hire lands on a figure another role already occupies, and the
 * fix then is a chart per role rather than a fixture rule nobody can keep.
 */
import { filter, find, map, sortBy, sum } from "../../../src/fn";
// The TIME helpers come from the timeline's geometry module DIRECTLY rather
// than through its barrel: the barrel pulls the Solid component in with them,
// and the whole point of this file is that its test is arithmetic only.
// `quarterLabelOf` is the AXIS's own formatter, extracted for this call site
// (levels-timeline, 4f0dd9d) rather than copied: the chips exist to agree with
// the axis above them, and two definitions of one format is how a chart and
// the chips beside it drift into reading as different clocks.
import {
  quarterLabelOf,
  timeOf,
} from "../../../src/components/LevelsTimeline/geometry";
import type {
  Mutation,
  TimeValue,
} from "../../../src/components/LevelsTimeline/geometry";

/**
 * A role: a name a person would recognise and the pay it permits.
 *
 * `range` is the SHADED BOX on the dial and the clamp on both amounts. It is
 * the role's, not the person's — two people on one role draw the same box
 * however far each of them has moved inside it.
 */
export interface Role {
  readonly id: string;
  readonly label: string;
  readonly range: readonly [number, number];
}

/**
 * The roles the board hires into (Peter, 2026-09-16). Three, and two of them
 * share a band EXACTLY — a CFO and an engineer are both worth $80k to $200k on
 * this board, which is the overlap the header note is about, at its most
 * extreme. The intern's band is two orders of magnitude smaller, which is the
 * other thing this fixture is for: one track has to hold both.
 */
export const ROLES: readonly Role[] = [
  { id: "engineer", label: "Software Engineer", range: [80_000, 200_000] },
  { id: "cfo", label: "CFO", range: [80_000, 200_000] },
  { id: "intern", label: "Intern", range: [1_000, 5_000] },
];

/**
 * The role with this id, or `undefined` when there is none.
 *
 * Returning the absence rather than falling back to the first role is what
 * lets `canHire` below refuse an unpicked role instead of silently hiring
 * somebody as an engineer because the picker was empty.
 */
export const roleOf = (
  roleId: string | null | undefined,
  roles: readonly Role[] = ROLES,
): Role | undefined =>
  roleId === null || roleId === undefined
    ? undefined
    : find((role: Role) => role.id === roleId, roles);

/**
 * The role a person is on. The bench needs a role for every dial it draws, so
 * this one INSISTS — a `roleId` with no role is a broken fixture rather than a
 * state the board should render around.
 */
export const roleForPerson = (
  person: Person,
  roles: readonly Role[] = ROLES,
): Role => {
  const role = roleOf(person.roleId, roles);
  if (role === undefined) {
    throw new Error(`No such role: ${person.roleId}`);
  }
  return role;
};

/**
 * How a role reads in the picker — `Software Engineer · $60k–$200k`.
 *
 * The FORMATTER is the caller's, exactly as on every other money surface on
 * this board: the amounts here are dollars-per-year and nothing in this module
 * gets to decide how a dollar is written.
 */
export const roleOptionLabel = (
  role: Role,
  format: (amount: number) => string,
): string =>
  `${role.label} · ${format(role.range[0])}–${format(role.range[1])}`;

/**
 * The dial track's domain: the lowest floor any role permits to the highest
 * ceiling. DERIVED, so adding a role cannot leave the track too short for the
 * band it now has to draw.
 *
 * It spans EVERY role rather than only the roles currently on the payroll, and
 * that is the point of passing it at all: `MutationSliders` derives its own
 * domain from the entities when none is given, so a pinned one exists to hold
 * the scale STILL — and a scale that moved every time somebody was hired into
 * a new role would be no pin at all.
 */
export const payDomainOf = (
  roles: readonly Role[] = ROLES,
): readonly [number, number] => [
  Math.min(...map((role: Role) => role.range[0], roles)),
  Math.max(...map((role: Role) => role.range[1], roles)),
];

/**
 * A person: a dial's worth of data plus the two things the dial does not carry
 * — which ROLE they hold, and what they were paid before anything changed.
 *
 * `range` is OMITTED on purpose. A person has a ROLE; the range is what the
 * bench derives from that role when it builds the dial. Carrying both would
 * let a fixture row state a range that disagrees with its own role — exactly
 * the duplication the derivation step exists to prevent — so the type refuses
 * to represent it.
 */
export interface Person {
  readonly id: string;
  readonly label: string;
  readonly roleId: string;
  /** Pay before the FIRST mutation. `null` = not on the payroll yet. */
  readonly base: number | null;
  /**
   * What CHANGED, keyed by mutation id. An ABSENT key means this person did
   * not move at that mutation — not that they were paid nothing.
   *
   * That absence is the whole reason the history is a map rather than a list
   * of points: adding a new mutation needs NO change to anybody's history,
   * because "unchanged at the new date" is what an absent key already says.
   *
   * A `null` VALUE is a termination at that mutation.
   */
  readonly changes: Readonly<Record<string, number | null>>;
}

/** Mutations in time order. Every walk below depends on this ordering. */
export const orderedMutations = (mutations: readonly Mutation[]): Mutation[] =>
  sortBy((mutation: Mutation) => timeOf(mutation.at), mutations);

/**
 * What a person was paid JUST BEFORE a mutation: the last change they made at
 * any earlier mutation, or their base if they made none.
 *
 * This is the `old` the dial draws its fixed tick at, which is why it walks the
 * mutations in time order rather than reading one key — a person raised at
 * mutation 1 and untouched at mutation 2 has an `old` of their mutation-1 pay
 * when the reader is editing mutation 2, not their base.
 */
export const payBefore = (
  person: Person,
  mutationId: string,
  mutations: readonly Mutation[],
): number | null => {
  let carried = person.base;
  for (const mutation of orderedMutations(mutations)) {
    if (mutation.id === mutationId) return carried;
    const own = person.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/**
 * What a person is paid from a mutation onward: their change at it if they
 * moved, otherwise whatever they were already on.
 */
export const payFrom = (
  person: Person,
  mutationId: string,
  mutations: readonly Mutation[],
): number | null => {
  const own = person.changes[mutationId];
  if (own !== undefined) return own;
  return payBefore(person, mutationId, mutations);
};

/**
 * What a person was paid at a MOMENT in time, or `null` when they are not on
 * the payroll then — before a hire, after a termination. `null` is absence, not
 * zero: somebody on no pay would still be a head on a rail.
 */
export const payAt = (
  person: Person,
  time: number,
  mutations: readonly Mutation[],
): number | null => {
  let carried = person.base;
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = person.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/**
 * Set one person's pay AT ONE MUTATION, leaving every other person and every
 * other mutation untouched. A drag edits the selected mutation only, which is
 * what makes the as-of control a position selector rather than a filter.
 */
export const withChange = (
  people: readonly Person[],
  id: string,
  mutationId: string,
  value: number | null,
): Person[] =>
  map(
    (person: Person) =>
      person.id === id
        ? { ...person, changes: { ...person.changes, [mutationId]: value } }
        : person,
    people,
  );

/**
 * Undo a person's change at one mutation — the ↺ Restore the dial offers a
 * terminated row. DELETING the key is the honest inverse of setting it: it
 * returns them to "unchanged at this mutation", so they carry whatever the
 * previous mutation left them on rather than a figure this function invented.
 */
export const withoutChange = (
  people: readonly Person[],
  id: string,
  mutationId: string,
): Person[] =>
  map((person: Person) => {
    if (person.id !== id) return person;
    const { [mutationId]: _dropped, ...rest } = person.changes;
    return { ...person, changes: rest };
  }, people);

/**
 * What the scenario costs AT A MOMENT: everyone's pay then, against the pay
 * they were committed to before anything was proposed.
 *
 * Both absences read as ZERO, and each says something different by saying the
 * same thing: somebody not yet hired had no committed pay, so their whole new
 * salary is the cost; somebody terminated has no pay now, so the whole of
 * their old salary is the saving. Neither is arithmetic on an absence — it is
 * the consumer stating what the absence MEANS, exactly as `newLevelOf` and
 * `oldLevelOf` do for one dial.
 */
export const payChangeAt = (
  people: readonly Person[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (person: Person) =>
        (payAt(person, time, mutations) ?? 0) - (person.base ?? 0),
      people,
    ),
  );

// ── Hiring ───────────────────────────────────────────────────────────────────

/** What the hire form holds while it is being filled in. */
export interface HireDraft {
  readonly name: string;
  /** `null` until a role is picked — the picker opens empty. */
  readonly roleId: string | null;
}

/** An empty form. Named, so "reset the form" and "open the form" agree. */
export const EMPTY_HIRE: HireDraft = { name: "", roleId: null };

/**
 * The name as it would be STORED — trimmed. The form validates this rather
 * than the raw field, so a name of three spaces is refused and a name typed
 * with a trailing space is accepted and kept tidy. One function, so the check
 * and the stored value can never disagree.
 */
export const hireName = (draft: HireDraft): string => draft.name.trim();

/** Is this draft a hire? A trimmed non-empty name AND a role that exists. */
export const canHire = (
  draft: HireDraft,
  roles: readonly Role[] = ROLES,
): boolean =>
  hireName(draft) !== "" && roleOf(draft.roleId, roles) !== undefined;

/**
 * An id nobody else is using, from a readable stem.
 *
 * Derived from the NAME rather than from a counter or a clock, so the same
 * hire made twice in a test gives the same ids in the same order and the
 * function stays pure — a `Date.now()` in here would make every assertion
 * about a hired person's id impossible to write.
 */
export const uniqueId = (stem: string, taken: readonly string[]): string => {
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug === "" ? "hire" : slug;
  let candidate = base;
  let suffix = 2;
  while (taken.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

/**
 * HIRE somebody at one mutation.
 *
 * Three decisions, all of them the consumer's and none of them the dial's:
 *
 *   • `base: null` — they were not on the payroll before, so there is no prior
 *     amount and the dial draws no prior arrow. This is what makes them a HIRE
 *     rather than a person who happens to start on a low number.
 *   • ONE change, at `at` — so `payBefore` reads `null` and `payFrom` reads
 *     their pay at that mutation, and at every EARLIER mutation both read
 *     `null` and `isPresentAt` hides them. Their existence starts exactly
 *     where the reader put it, and the mutations after it need no entry at
 *     all, because an absent key already means "unchanged".
 *   • The pay is the role's FLOOR. A new hire starts at the bottom of their
 *     band and is argued upward on the dial — which is the gesture the board
 *     exists for. A midpoint would be the board inventing a salary nobody
 *     agreed, and it would also make every hire an immediate half-raise
 *     against the rate.
 *
 * Returns the people AND the id, because the caller wants both outcomes
 * without re-deriving the second from the first.
 */
export const hire = (
  people: readonly Person[],
  draft: HireDraft,
  at: string,
  roles: readonly Role[] = ROLES,
): { people: Person[]; id: string } => {
  const role = roleOf(draft.roleId, roles);
  if (role === undefined) {
    throw new Error(`No such role: ${String(draft.roleId)}`);
  }
  const name = hireName(draft);
  const id = uniqueId(
    name,
    map((person: Person) => person.id, people),
  );
  const hired: Person = {
    id,
    label: name,
    roleId: role.id,
    base: null,
    changes: { [at]: role.range[0] },
  };
  return { people: [...people, hired], id };
};

// ── Removing a change ────────────────────────────────────────────────────────

/** The board's scenario, as much of it as removing a change has to touch. */
export interface Scenario {
  readonly mutations: readonly Mutation[];
  readonly people: readonly Person[];
}

/**
 * The mutation a person was HIRED at, or `undefined` for somebody who was
 * already on the payroll.
 *
 * A hire is `base: null` plus a first change; their earliest change IS their
 * hire, so the moment is derived rather than stored — there is no `hiredAt`
 * field to fall out of step with the history.
 */
export const hiredAt = (
  person: Person,
  mutations: readonly Mutation[],
): string | undefined => {
  if (person.base !== null) return undefined;
  const first = find(
    (mutation: Mutation) => person.changes[mutation.id] !== undefined,
    orderedMutations(mutations),
  );
  return first?.id;
};

/**
 * The mutation to select once `id` is gone: the nearest one still standing,
 * EARLIER for preference, otherwise later, and `null` when none remain.
 *
 * Earlier for preference because the changes after the deleted one now mean
 * something different — they carry forward from a different figure — and the
 * reader should land where the scenario still says what it said.
 */
export const nearestMutation = (
  mutations: readonly Mutation[],
  id: string,
): string | null => {
  const ordered = orderedMutations(mutations);
  const index = ordered.findIndex((mutation: Mutation) => mutation.id === id);
  if (index < 0) return ordered[0]?.id ?? null;
  const earlier = ordered[index - 1];
  const later = ordered[index + 1];
  return earlier?.id ?? later?.id ?? null;
};

/**
 * REMOVE A CHANGE, and everything that only existed because of it.
 *
 * Peter, 2026-09-16: "add a delete button next to RESET so that I can remove a
 * change frame." Four things happen, and each is the inverse of a thing the
 * board can do:
 *
 *   • the mutation leaves the list, so its flag leaves the timeline and its
 *     chip leaves the control;
 *   • every person drops their entry at it — which is `withoutChange`, so a
 *     raise reverts to the previous interval's pay and a TERMINATION is
 *     undone, both by the same deletion rather than by two special cases;
 *   • anyone HIRED at it is removed outright, along with whatever they were
 *     given later: a person whose existence began at the deleted change has no
 *     history left to revert to, and keeping them would invent a hire the
 *     reader never made;
 *   • the selection moves to the nearest survivor, or to `null` when the
 *     change being removed was the last one — which is the board's opening
 *     state, so the empty-state sentence comes back on its own.
 *
 * NO CONFIRMATION, deliberately. This is a bench and every change on it is
 * two clicks to re-make; a modal between the reader and an experiment is the
 * expensive thing. A real payroll tool with a saved scenario is a different
 * question and should ask.
 */
export const removeMutation = (
  scenario: Scenario,
  id: string,
): { mutations: Mutation[]; people: Person[]; selected: string | null } => {
  const selected = nearestMutation(scenario.mutations, id);
  const survivors = filter(
    (person: Person) => hiredAt(person, scenario.mutations) !== id,
    scenario.people,
  );
  return {
    mutations: filter(
      (mutation: Mutation) => mutation.id !== id,
      scenario.mutations,
    ),
    people: map((person: Person) => {
      const { [id]: _dropped, ...rest } = person.changes;
      return { ...person, changes: rest };
    }, survivors),
    selected,
  };
};

/** The people on one role, in fixture order. */
export const peopleOnRole = (
  people: readonly Person[],
  roleId: string,
): Person[] => filter((person: Person) => person.roleId === roleId, people);

// ── Mutation labels ──────────────────────────────────────────────────────────

/** The month, exactly — `2025-08`. What the chip's label is an abbreviation OF. */
export const monthLabel = (at: TimeValue): string =>
  new Date(timeOf(at)).toISOString().slice(0, 7);

const MONTH_NAMES: readonly string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The month, short — `Aug`. Only ever used to tell two chips in one quarter apart. */
export const monthAbbrev = (at: TimeValue): string =>
  MONTH_NAMES[new Date(timeOf(at)).getUTCMonth()] ?? "";

/** One chip on the as-of control. */
export interface SegmentLabel {
  readonly id: string;
  /** What the chip READS — `2025-Q3`, or `2025-Q3 · Aug` when it has company. */
  readonly label: string;
  /** The exact month the mutation is at — `2025-08`. */
  readonly month: string;
}

/**
 * The as-of chips, labelled to match the AXIS.
 *
 * The timeline's axis labels a one-year span by quarter (`2025-Q3`), so a chip
 * that said `2025-07` made the reader translate between two vocabularies for
 * the same instant. The chip reads the quarter.
 *
 * TWO MUTATIONS CAN SHARE A QUARTER — a click in July and another in August
 * are both `2025-Q3` — and two chips with one label is a control that cannot
 * be operated. So the rule is stated over the whole list rather than per
 * mutation: a quarter holding more than one mutation labels ALL of its chips
 * `2025-Q3 · Aug`. Both of them gain the month, not just the second one,
 * because a reader comparing two chips needs them to differ in the same place.
 *
 * That suffix is always enough. A mutation's moment is snapped to a month
 * boundary and `addMutation` refuses a second one at an existing timestamp, so
 * no two mutations can share a month, and the pair (quarter, month) is unique
 * by construction.
 *
 * The exact month rides along in `month` rather than only in the label,
 * because the chip is an abbreviation and the table, the tooltip and anything
 * else that wants the unabridged figure should not have to re-derive it.
 * `SegmentedControl` has no per-segment title or aria today, so the board
 * currently spends it on the DEBUG table; giving the control one is a change
 * to a published component and belongs to whoever needs it next.
 */
export const segmentLabelsOf = (
  mutations: readonly Mutation[],
): SegmentLabel[] => {
  const ordered = orderedMutations(mutations);
  const crowd = new Map<string, number>();
  for (const mutation of ordered) {
    const quarter = quarterLabelOf(mutation.at);
    crowd.set(quarter, (crowd.get(quarter) ?? 0) + 1);
  }
  return map((mutation: Mutation) => {
    const quarter = quarterLabelOf(mutation.at);
    const shared = (crowd.get(quarter) ?? 0) > 1;
    return {
      id: mutation.id,
      label: shared ? `${quarter} \u00b7 ${monthAbbrev(mutation.at)}` : quarter,
      month: monthLabel(mutation.at),
    };
  }, ordered);
};
