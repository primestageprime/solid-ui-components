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
import { filter, find, map, sortBy } from "../../../src/fn";
// The TIME helpers come from the timeline's geometry module DIRECTLY rather
// than through its barrel: the barrel pulls the Solid component in with them,
// and the whole point of this file is that its test is arithmetic only.
import { timeOf } from "../../../src/components/LevelsTimeline/geometry";
import type { Mutation } from "../../../src/components/LevelsTimeline/geometry";

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
 * The roles the board hires into. Five, with distinct dollar bands, and
 * deliberately OVERLAPPING — see the header note on what that costs.
 */
export const ROLES: readonly Role[] = [
  { id: "engineer", label: "Software Engineer", range: [60_000, 200_000] },
  { id: "designer", label: "Designer", range: [55_000, 140_000] },
  { id: "support", label: "Support", range: [40_000, 80_000] },
  { id: "manager", label: "Manager", range: [90_000, 180_000] },
  { id: "intern", label: "Intern", range: [30_000, 45_000] },
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

/** The people on one role, in fixture order. */
export const peopleOnRole = (
  people: readonly Person[],
  roleId: string,
): Person[] => filter((person: Person) => person.roleId === roleId, people);
