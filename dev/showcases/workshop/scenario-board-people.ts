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
 * The pay range the CURRENT ROSTER can occupy: the lowest floor and the highest
 * ceiling among the roles these people hold.
 *
 * What it is for is the pay axis of the timeline (Peter, 2026-09-16: pin it,
 * "so the scale doesn't shift as sliders move"). A domain derived from the
 * LEVELS — which is what the chart does by default, and rightly — follows the
 * data, so every drag rescales the plot and a rail that is standing still
 * appears to move. Derived from the roles instead, it is a function of WHO IS
 * EMPLOYED rather than of what they are paid, so no drag can touch it.
 *
 * It is the roster's roles rather than every role that exists, which is the
 * one place this differs from the dials' own track: the track must hold still
 * across a hire into a new role, because the dial for that new person appears
 * beside the others and they have to be comparable. The chart has no such
 * obligation — a hire genuinely changes what it has to draw — and spending
 * four fifths of the plot on an intern band nobody occupies would make the
 * rails unreadable to insure against an event that has not happened.
 */
export const payDomainForPeople = (
  people: readonly Person[],
  roles: readonly Role[] = ROLES,
): readonly [number, number] => {
  const bands = map((person: Person) => roleForPerson(person, roles), people);
  if (bands.length === 0) return payDomainOf(roles);
  return [
    Math.min(...map((role: Role) => role.range[0], bands)),
    Math.max(...map((role: Role) => role.range[1], bands)),
  ];
};

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

/**
 * Add a mutation at a picked date, or SELECT the one already there.
 *
 * The timeline snaps a click to a month boundary, so "already there" is an
 * exact timestamp match — no tolerance window to tune. Returns the mutation
 * list and the id to select, so the caller does one thing with both outcomes
 * rather than branching on whether anything was added.
 */
export const addMutation = (
  mutations: readonly Mutation[],
  at: Date,
): { mutations: Mutation[]; selected: string } => {
  const existing = find(
    (mutation: Mutation) => timeOf(mutation.at) === at.getTime(),
    mutations,
  );
  if (existing !== undefined) {
    return { mutations: [...mutations], selected: existing.id };
  }
  const id = `picked-${at.getTime()}`;
  const added = orderedMutations([...mutations, { id, at, label: "" }]);
  // The flags are numbered by POSITION, so every label is restamped: inserting
  // a mutation in the middle renumbers the ones after it, which is what a
  // reader expects of "mutation 2".
  const numbered = map(
    (mutation: Mutation, index: number) => ({
      ...mutation,
      label: String(index + 1),
    }),
    added,
  );
  return { mutations: numbered, selected: id };
};

// ── Making the first change ──────────────────────────────────────────────────

/**
 * THE SNAP GRAIN — how coarse a calendar the board runs on.
 *
 * `"quarter"` is the Scenario Board's, and the default everywhere, so nothing
 * that does not ask changes. `"week"` is the Hourly Board's: Peter,
 * 2026-09-17 — "you should still have clicks on the chart at a weekly
 * granularity. That allows for weekly seasonality in projections." A business
 * that sells HOURS A WEEK cannot express week-to-week seasonality on a
 * quarterly grid, so the grain is a parameter of the calendar rather than a
 * second calendar.
 *
 * `"month"` is the License Board's: a licence is billed by the MONTH, so a
 * change to a product's seat count or its fee takes effect on a billing
 * boundary and nowhere else. A quarterly grid would refuse the reader three
 * quarters of the dates a subscription business actually changes on, and a
 * weekly one would offer them a grain no invoice has.
 *
 * It is not a free choice per call site: BOTH ways a change can be created —
 * a click on the chart and a drag with nothing selected — have to land on the
 * SAME grid, because `addMutation` dedupes on an exact timestamp. Two flags
 * five days apart would both be "this week" to a reader and two separate
 * changes to the model.
 */
export type SnapGrain = "quarter" | "month" | "week";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** The ISO week's Monday at or before a moment, at UTC midnight. */
const isoMondayOf = (time: number): number => {
  const at = new Date(time);
  // getUTCDay is 0 for Sunday; ISO weeks start on Monday, so rotate.
  const back = (at.getUTCDay() + 6) % 7;
  return Date.UTC(
    at.getUTCFullYear(),
    at.getUTCMonth(),
    at.getUTCDate() - back,
  );
};

/**
 * The WEEK SLOT a moment belongs to: its ISO Monday, or the span's own start
 * when that Monday falls before it.
 *
 * THE CLAMP IS THE POINT, not a rounding convenience. A span rarely opens on
 * a Monday — the Hourly Board's opens on Wednesday 2025-01-01 — so without it
 * the first pickable slot would be the following Monday, five days into a
 * year-long span. Every reading that depends on "a change at the left edge is
 * in force for the whole span" would then be off by those five days: the
 * gauge would disagree with `rateBandTable()`, whose whole claim is that it
 * describes the weight-1 case. Clamping makes the span's first week a
 * TRUNCATED one whose slot IS the span's start, so weight 1 is reachable and
 * the opening move still agrees with the table.
 *
 * Both entry points call this: a click snaps through it, and `nextFreeSlot`
 * enumerates the same grid.
 */
export const weekSlotOf = (time: number, domainStart: number): number =>
  Math.max(isoMondayOf(time), domainStart);

/** The week slots inside the span — the first one clamped to its start. */
const weekStartsIn = (start: number, end: number): number[] => {
  const first = isoMondayOf(start);
  const stops: number[] = [];
  for (let index = 0; ; index += 1) {
    const monday = first + index * WEEK_MS;
    if (monday >= end) break;
    const at = Math.max(monday, start);
    if (at >= end) break;
    stops.push(at);
  }
  return stops;
};

/** The first instant of the month at or before a moment, at UTC midnight. */
const monthStartOf = (time: number): number => {
  const at = new Date(time);
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1);
};

/**
 * The MONTH SLOT a moment belongs to: the first of its month, or the span's own
 * start when that first falls before it.
 *
 * The clamp is `weekSlotOf`'s, for `weekSlotOf`'s reason: a span that opens
 * mid-month would otherwise have its first pickable slot weeks inside itself,
 * and every reading that depends on "a change at the left edge is in force for
 * the whole span" — the calibration table's whole claim — would be off by them.
 * A span opening on the first of a month, which both boards' do, is the case
 * where the clamp does nothing at all.
 */
export const monthSlotOf = (time: number, domainStart: number): number =>
  Math.max(monthStartOf(time), domainStart);

/** The month slots inside the span — the first one clamped to its start. */
const monthStartsIn = (start: number, end: number): number[] => {
  const from = new Date(start);
  const stops: number[] = [];
  for (let index = 0; ; index += 1) {
    const at = Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1);
    if (at >= end) break;
    const clamped = Math.max(at, start);
    if (clamped >= end) break;
    stops.push(clamped);
  }
  return stops;
};

/** The month a quarter starts, as a UTC timestamp. */
const quarterStartsIn = (start: number, end: number): number[] => {
  const from = new Date(start);
  const stops: number[] = [];
  let year = from.getUTCFullYear();
  let month = Math.floor(from.getUTCMonth() / 3) * 3;
  for (;;) {
    const at = Date.UTC(year, month, 1);
    if (at >= end) break;
    if (at >= start) stops.push(at);
    month += 3;
    if (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  return stops;
};

/**
 * The slot a first interaction lands in: the earliest QUARTER BOUNDARY in the
 * domain that has no mutation on it yet.
 *
 * Peter, 2026-09-16: dragging a dial with nothing selected should no longer be
 * a no-op — it should make the change it so obviously means. The question is
 * only WHERE, and his own answer is "the nearest possible slot", read as the
 * first free quarter from the start of the span.
 *
 * I considered "nearest to the as-of or hover position" and did not take it:
 * in the empty state there IS no as-of position — that is what empty means —
 * and the pointer at the moment of a drag is over a DIAL, which says nothing
 * about a date. A rule that depended on where a pointer had last been over a
 * different chart would put the reader's first change somewhere they could not
 * predict. The first free quarter is somewhere they can: it is the leftmost
 * flag the timeline can hold, the reader sees it appear there, and moving it is
 * a click on the chart away.
 *
 * Returns `undefined` when every slot in the span is already taken, which
 * the caller reads as "there is nowhere left to put one" rather than crowding
 * two flags onto one slot.
 *
 * `snap` chooses the grid, defaulting to the quarters the Scenario Board has
 * always used. On `"week"` the same argument holds a grain down: the first
 * free WEEK from the start of the span, which for a span opening mid-week is
 * that truncated first week (see `weekSlotOf`) and so is still weight 1. On
 * `"month"` it is the first free MONTH, which is the same argument again at
 * the grain a subscription actually bills on.
 */
export const nextFreeSlot = (
  domainStart: number,
  domainEnd: number,
  mutations: readonly Mutation[],
  snap: SnapGrain = "quarter",
): number | undefined => {
  const taken = new Set(
    map((mutation: Mutation) => timeOf(mutation.at), mutations),
  );
  const slots =
    snap === "week"
      ? weekStartsIn(domainStart, domainEnd)
      : snap === "month"
        ? monthStartsIn(domainStart, domainEnd)
        : quarterStartsIn(domainStart, domainEnd);
  return slots.find((at: number) => !taken.has(at));
};

/**
 * The mutation a first interaction should apply to: the one already selected,
 * or a NEW one at the next free slot.
 *
 * Returns the list and the id together — the caller does one thing whether or
 * not anything was created, exactly as `addMutation` does for a click on the
 * chart. `created` is there for a caller that wants to say something about it;
 * nothing on the board does yet.
 */
export const ensureMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly selected: string | null;
  },
  domainStart: number,
  domainEnd: number,
  snap: SnapGrain = "quarter",
): { mutations: Mutation[]; selected: string | null; created: boolean } => {
  if (scenario.selected !== null) {
    return {
      mutations: [...scenario.mutations],
      selected: scenario.selected,
      created: false,
    };
  }
  const at = nextFreeSlot(domainStart, domainEnd, scenario.mutations, snap);
  if (at === undefined) {
    return {
      mutations: [...scenario.mutations],
      selected: orderedMutations(scenario.mutations)[0]?.id ?? null,
      created: false,
    };
  }
  const added = addMutation(scenario.mutations, new Date(at));
  return { ...added, created: true };
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

/**
 * The ISO week number of a moment — the week containing its Thursday, which is
 * the ISO rule stated as arithmetic rather than as a table of exceptions.
 */
export const isoWeekNumber = (at: TimeValue): number => {
  const thursday = isoMondayOf(timeOf(at)) + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  return Math.floor((thursday - Date.UTC(year, 0, 1)) / WEEK_MS) + 1;
};

/**
 * `W27 · Jun 30` — what a chip reads under week snap.
 *
 * Two vocabularies in one label, deliberately, because the chip has two jobs
 * a single one cannot do. The WEEK NUMBER is what a reader talks seasonality
 * in ("the week 27 dip"). The MONTH AND DAY is what makes the chip locatable
 * against the axis, which is ticked by QUARTER: nobody can find W27 on a
 * quarter axis, and everybody can find Jun 30.
 *
 * The year is not in it. It is in the axis, in the quarter chips this replaces
 * for the hourly board, and in `SegmentLabel.month` — and 53 chips on one
 * control cannot each carry four characters that never vary within a span.
 */
export const weekLabel = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `W${String(isoWeekNumber(at)).padStart(2, "0")} \u00b7 ${
    MONTH_NAMES[when.getUTCMonth()] ?? ""
  } ${when.getUTCDate()}`;
};

/** One chip on the as-of control. */
export interface SegmentLabel {
  readonly id: string;
  /** What the chip READS — `2025-Q3`, or `2025-Q3 · Aug` when it has company. */
  readonly label: string;
  /** The exact month the mutation is at — `2025-08`. */
  readonly month: string;
}

/**
 * The as-of chips, labelled to match the GRAIN the board runs on.
 *
 * UNDER QUARTER SNAP the label matches the AXIS. The timeline's axis labels a
 * one-year span by quarter (`2025-Q3`), so a chip that said `2025-07` made the
 * reader translate between two vocabularies for the same instant. The chip
 * reads the quarter.
 *
 * UNDER WEEK SNAP that rule cannot hold, and saying so is better than
 * pretending: the axis is still ticked by quarter, and a chip reading
 * `2025-Q3` for each of thirteen weekly changes would be thirteen chips with
 * one label. So a week chip reads `W27 · Jun 30` (see `weekLabel`) — the week
 * number the reader argues seasonality in, plus the date that locates it on a
 * quarter-ticked axis. The vocabularies differ on purpose, because the grain
 * does.
 *
 * UNDER MONTH SNAP the quarter rule holds again, with the month always
 * appended — `2025-Q3 · Aug`. A month chip needs no vocabulary of its own: it
 * is the Scenario Board's crowded-quarter chip, which already names the quarter
 * the axis is ticked by and the month that locates it inside one. See the
 * branch for why "always" rather than "when crowded".
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
  snap: SnapGrain = "quarter",
): SegmentLabel[] => {
  const ordered = orderedMutations(mutations);
  // WEEK SNAP NEEDS NO DISAMBIGUATION. The crowding rule below exists because
  // two mutations can share a quarter; one mutation per WEEK is unique by
  // construction — the slot grid is weekly and `addMutation` refuses a second
  // mutation at an existing timestamp — so every week chip already differs
  // from every other. There is nothing to add a suffix for, and adding one
  // anyway would widen 53 possible chips to say what the label already says.
  if (snap === "week") {
    return map(
      (mutation: Mutation) => ({
        id: mutation.id,
        label: weekLabel(mutation.at),
        month: monthLabel(mutation.at),
      }),
      ordered,
    );
  }
  // MONTH SNAP NEEDS NO DISAMBIGUATION EITHER, and for the week branch's exact
  // reason: one mutation per MONTH is unique by construction — the slot grid is
  // monthly and `addMutation` refuses a second mutation at an existing
  // timestamp. But unlike a week chip it is not given its OWN vocabulary,
  // because it does not need one: `2025-Q3 · Aug` is already the Scenario
  // Board's own crowded-quarter chip, it names the quarter the axis is ticked
  // by, and the month beside it is what makes it locatable and unique. So the
  // month branch is the quarter branch with the suffix ALWAYS on.
  //
  // Always-on is the whole point of it being a branch rather than a fall-through
  // to the crowding rule below. That rule suffixes only a quarter holding more
  // than one mutation, so a board that opens with no changes would give its
  // reader `2025-Q1` for a first change, `2025-Q1 · Jan` and `2025-Q1 · Feb`
  // once there are two in that quarter, and a bare `2025-Q2` for a third — one
  // control, three chip formats, changing shape as they work.
  if (snap === "month") {
    return map(
      (mutation: Mutation) => ({
        id: mutation.id,
        label: `${quarterLabelOf(mutation.at)} · ${monthAbbrev(mutation.at)}`,
        month: monthLabel(mutation.at),
      }),
      ordered,
    );
  }
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
