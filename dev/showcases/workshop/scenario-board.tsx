/**
 * Scenario Board bench — Peter's pencil sketch of 2026-09-16, composed.
 *
 * This bench builds NOTHING. Every part of it already exists: the running
 * balance is `CashflowScrubChart`, the stepped people-lines are
 * `LevelsTimeline`, the as-of picker is `SegmentedControl`, the dials are
 * `MutationSliders` and the card on the right is `RateGauge`. What the bench
 * adds is the ARRANGEMENT and the WIRING — which is exactly the thing a
 * component-per-bench prototype cannot tell you: whether the five pieces say
 * the same thing when they are looking at one scenario.
 *
 * There is NO engine here on purpose. Every number the board shows is decided
 * by one of the small pure functions at the top of this file, each named, each
 * takes data and returns data, and the whole set is printed as a table on
 * mount behind `DEBUG` — so the board can be read and argued with from a
 * terminal, before anyone opens a browser (headless observation first).
 *
 * The wiring, stated once:
 *
 *   people ──deltaOf──▶ rateOf ──▶ RateGauge.value
 *   people ──levelsOf──▶ LevelsTimeline.levels      (rails, thickness = headcount)
 *   people ──transfersOf──▶ LevelsTimeline.transfers (ribbons, one per move)
 *   flag click ──segmentForMutation──▶ SegmentedControl.value
 *   segment click ──mutationForSegment──▶ LevelsTimeline.selectedMutationId
 *
 * The last two are NOT inverses, and that is a finding rather than a bug — see
 * `segmentForMutation` for why the sketch's own two date rows cannot round-trip.
 *
 * MIGRATED 2026-09-16 from the `series` model (one thin line per person plus a
 * consumer-computed Total) to `levels` + `transfers`. The board's unit of
 * drawing is no longer a person: it is a PAY LEVEL inside a ROLE BAND, drawn as
 * a rail whose thickness is how many people sit on it, and a raise is a ribbon
 * carrying heads from one rail to another. A person is now something the board
 * derives rails FROM, not something it draws. The Total went with the change —
 * headcount-weighted rails say what it used to say, and better.
 */
import { createSignal, onMount, type Component } from "solid-js";
import {
  filter,
  find,
  flatMap,
  join,
  map,
  pipe,
  sortBy,
  sum,
} from "../../../src/fn";
import {
  EMPTY_HIRE,
  type HireDraft,
  type Person,
  ROLES,
  type Role,
  canHire,
  hire,
  orderedMutations,
  payAt,
  payBefore,
  payDomainOf,
  payFrom,
  peopleOnRole,
  roleForPerson,
  roleOf,
  roleOptionLabel,
  withChange,
  withoutChange,
} from "./scenario-board-people";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import {
  COMFORTABLE,
  RATE_BASELINE,
  RATE_DOMAIN,
  bandOfRate,
  isPresentAt,
  maxRateFor,
  monthlyFrom,
  pinnedCeiling,
  rateBandTable,
  rateFromPayChange,
} from "./scenario-board-rate";
import { LevelsTimeline, timeOf } from "../../../src/components/LevelsTimeline";
import type {
  CountPoint,
  Level,
  Mutation,
  TimeDomain,
  TimeValue,
  Transfer,
} from "../../../src/components/LevelsTimeline";
import { MutationSliders } from "../../../src/components/MutationSliders";
import type { Entity } from "../../../src/components/MutationSliders";
import { RateGauge } from "../../../src/components/RateGauge";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import type { SegmentOption } from "../../../src/components/SegmentedControl";

import { GhostButton, PrimaryButton } from "../../../src/components/Button";
import { ThemedInput } from "../../../src/components/Inputs";
import { Modal } from "../../../src/components/Modal";
import { Select } from "../../../src/components/Select";
import type { SelectOption } from "../../../src/components/Select";
import {
  EndWrapRow,
  GrowCenterColumn,
  GrowFillBox,
  NarrowStack,
  HalfFillColumn,
  FillWrapRow,
  SpreadRow,
  ViewportColumn,
  MajorPaneBox,
} from "../../../src/components/Layout";
import { FillCardSurface } from "../../../src/components/Surface";
import { SectionTitle, TextTitle } from "../../../src/components/Text";

export const meta = { label: "Scenario Board" };

/** Flip to print every derived table to the console on mount. */
const DEBUG = false;

// ── The fixture, shared by all four regions ──────────────────────────────────
//
// One year, read four ways. Everything below is the CONSUMER's: the span, the
// people, the money-per-level rate, the gauge's domain. No component here
// decides a unit.

/** The span the chart and the timeline are both drawn against. */
const DOMAIN_START = new Date("2025-01-01");
const DOMAIN_END = new Date("2026-01-01");
const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

/**
 * The three numbered events. These Date objects are the ONLY ones used for a
 * mutation moment anywhere on the board: `LevelsTimeline` ties a riser to a
 * flag by exact timestamp equality (`geometry.timeOf`), so a series point
 * built from a differently-constructed Date would draw the step and light no
 * flag.
 */
const SEED_MUTATIONS: readonly Mutation[] = [
  { id: "spring", at: new Date("2025-04-01"), label: "1" },
  { id: "summer", at: new Date("2025-07-01"), label: "2" },
  { id: "autumn", at: new Date("2025-10-01"), label: "3" },
];

/**
 * The people. Everyone holds a ROLE, and the role's band is the shaded box on
 * their dial and the clamp on both their amounts — see `scenario-board-people`
 * for the roles themselves, the pay-history walk and the hire.
 *
 * The three anonymous bands A/B/C this fixture used to carry are gone: they
 * mapped one-for-one onto roles the moment Peter asked the `+` for a role
 * picker, and A→Support, B→Designer, C→Manager keeps every pay figure below
 * inside its new band, so no amount had to move. The roles OVERLAP where the
 * bands could not; the header of `scenario-board-people` states exactly what
 * that costs and why this fixture does not pay it yet.
 */
const PEOPLE: readonly Person[] = [
  {
    id: "peter",
    label: "Peter",
    roleId: "support",
    base: 46_000,
    changes: { spring: 52_000 },
  },
  {
    id: "joe",
    label: "Joe",
    roleId: "support",
    base: 46_000,
    changes: { spring: null },
  },
  {
    id: "elaina",
    label: "Elaina",
    roleId: "designer",
    base: 62_000,
    changes: { spring: 68_000 },
  },
  {
    id: "reilly",
    label: "Reilly",
    roleId: "designer",
    base: 62_000,
    changes: { autumn: 68_000 },
  },
  {
    id: "adlai",
    label: "Adlai",
    roleId: "manager",
    base: 90_000,
    changes: { summer: 95_000 },
  },
  {
    id: "flynn",
    label: "Flynn",
    roleId: "manager",
    base: 90_000,
    changes: { autumn: 104_000 },
  },
];

/**
 * The dial domain, in $/yr. DERIVED from every role's band — the lowest floor
 * to the highest ceiling — so a hire into a role nobody holds yet still draws
 * its whole band on a track that did not move to accommodate it.
 */
const PAY_DOMAIN: readonly [number, number] = payDomainOf();

/**
 * The chart fixture: thirteen months of net monthly flow in dollars, opening
 * from a starting balance. Deliberately hand-written rather than derived from
 * the dials — the sketch's top line is the scenario ALREADY committed, and the
 * dials below it are the change being proposed against it.
 */
const OPENING_BALANCE = 42000;
const MONTHLY_NET: readonly number[] = [
  4200, 3800, 5100, 6400, 5900, 7300, 6800, 8200, 7600, 9100, 8400, 9800, 10400,
];

// ── Pure derivations ─────────────────────────────────────────────────────────

/**
 * The two amounts every money reading on this board is computed from.
 *
 * The rate functions below take THIS rather than a whole `Entity`, because
 * `old` and `value` are all they read. That is not fastidiousness: a `Person`
 * deliberately has no `range` (see `Person`), so once `Entity.range` becomes
 * required in phase 3 a `Person` stops being assignable to an `Entity` and
 * every one of these call sites would break on a field none of them touch.
 * Asking for the narrowest shape that answers the question keeps them working
 * for people and dials alike. Verified by simulating the tightening locally.
 */
type Amounts = Pick<Entity, "old" | "value">;

/**
 * The level an entity holds in the NEW scenario. A removed entity (`value:
 * null`) reads as level 0 — the sketch strikes Joe's name through, which says
 * his contribution is gone, not that it is unknown. `null − old` would be
 * arithmetic on an absence; this is the consumer stating what removal MEANS.
 */
export const newLevelOf = (entity: Amounts): number => entity.value ?? 0;

/**
 * The level an entity held in the OLD scenario. A NEW HIRE (`old: null`) reads
 * as level 0 — they were not in the old scenario at all, so there is nothing
 * to subtract. Same shape as `newLevelOf` above: the consumer states what an
 * absence MEANS rather than doing arithmetic on it.
 */
export const oldLevelOf = (entity: Amounts): number => entity.old ?? 0;

/**
 * How far one dial moved. Negative for a cut, fully negative for a removal,
 * and for a hire the delta IS the new cost — there is no prior to subtract.
 */
export const deltaOf = (entity: Amounts): number =>
  newLevelOf(entity) - oldLevelOf(entity);

/**
 * What the scenario's pay changes COST, per month. Every dial's change,
 * priced and added up: positive when the scenario pays people more.
 */
export const payChangeOf = (entities: readonly Amounts[]): number =>
  pipe(
    entities,
    map((entity: Amounts) => deltaOf(entity)),
    sum,
  );

/**
 * The COMPANY'S net rate under the scenario, which is what the gauge shows.
 *
 * Pay is an OUTFLOW, so the cost is SUBTRACTED from the rate the company was
 * running at. The arithmetic and the three constants it balances live in
 * `scenario-board-rate.ts`, where they are asserted without a browser — see
 * the calibration table in its header.
 *
 * The two absences fall out of that without a special case, which is the sign
 * the reading is right rather than patched: a HIRE has no old amount, so its
 * whole new pay is a cost and the rate drops by all of it; a TERMINATION has
 * no new amount, so its delta is negative, the subtraction flips, and the rate
 * RISES by what they were paid.
 */
export const rateOf = (entities: readonly Amounts[]): number =>
  rateFromPayChange(payChangeOf(entities));

/**
 * The segment label for a mutation — its month.
 *
 * THE LOSSY MAPPING IS GONE. Until Peter merged the as-of control into the
 * Mutations card, the flags sat at three dates and the split button offered
 * three DIFFERENT ones, so two flags collapsed onto one segment and the round
 * trip lost information. The segments ARE the mutations now — the control
 * selects which mutation the dials are editing — so flag→segment→flag is the
 * identity and there is nothing left to lose. The two functions that used to
 * paper over the gap are deleted rather than kept as pass-throughs.
 */
const segmentLabelOf = (mutation: Mutation): string =>
  new Date(timeOf(mutation.at)).toISOString().slice(0, 7);

/** The as-of control's options: one per mutation, in time order. */
export const segmentOptionsOf = (
  mutations: readonly Mutation[],
): SegmentOption[] =>
  map(
    (mutation: Mutation) => ({
      value: mutation.id,
      label: segmentLabelOf(mutation),
    }),
    orderedMutations(mutations),
  );

/**
 * A level's id. EVERY id the board emits — on a level and on both ends of a
 * transfer — comes through this one function, and that is load-bearing: the
 * chart DROPS a transfer naming a level it does not have rather than drawing it
 * as an open-ended flow, so an id built two ways would make a ribbon vanish in
 * silence instead of failing loudly.
 *
 * It keys on the ROLE as well as the pay, which is what lets the roles overlap:
 * two roles whose people sit on the same figure still name two distinct levels,
 * so no ribbon is ever dropped for want of an end. What overlap still costs is
 * the DRAWING — see the header of `scenario-board-people`.
 */
const levelIdFor = (roleId: string, pay: number): string =>
  `${roleId}-${Math.round(pay)}`;

/**
 * A rail's caption. Deliberately SHORT — `Designer · $62k` — because the chart
 * paints it above the rail's left end the way an axis paints a tick, with no
 * ellipsize and no tooltip behind it.
 */
const payLabel = (roleId: string, pay: number): string =>
  `${roleOf(roleId)?.label ?? roleId} · ${formatMoney(pay)}`;

/** Every moment the board can change at: the domain's left edge and each flag. */
const momentsOf = (mutations: readonly Mutation[]): number[] =>
  sortBy(
    (time: number) => time,
    [
      DOMAIN_START.getTime(),
      ...map((mutation: Mutation) => timeOf(mutation.at), mutations),
    ],
  );

/** The distinct pay figures a role's people ever hold, ascending. */
const paysIn = (
  people: readonly Person[],
  roleId: string,
  mutations: readonly Mutation[],
): number[] => {
  const pays = new Set<number>();
  for (const person of peopleOnRole(people, roleId)) {
    if (person.base !== null) pays.add(person.base);
    for (const mutation of mutations) {
      const own = person.changes[mutation.id];
      if (own !== undefined && own !== null) pays.add(own);
    }
  }
  return sortBy((pay: number) => pay, [...pays]);
};

/**
 * The headcount on one pay figure over time.
 *
 * Only CHANGES are emitted. A point saying "still two people" would put a
 * dropline where nothing happened; dropping to ZERO is a change and IS emitted,
 * because that is what ends a rail's span.
 */
export const countPointsFor = (
  people: readonly Person[],
  roleId: string,
  pay: number,
  mutations: readonly Mutation[],
): CountPoint[] => {
  const members = peopleOnRole(people, roleId);
  const points: CountPoint[] = [];
  let previous = 0;
  for (const time of momentsOf(mutations)) {
    const holders = filter(
      (person: Person) => payAt(person, time, mutations) === pay,
      members,
    );
    if (holders.length === previous) continue;
    points.push({ at: new Date(time), count: holders.length });
    previous = holders.length;
  }
  return points;
};

/** Every role's rails. One level per pay figure the role's people touch. */
export const levelsOf = (
  people: readonly Person[],
  mutations: readonly Mutation[],
): Level[] =>
  flatMap(
    (role: Role) =>
      map(
        (pay: number) => ({
          id: levelIdFor(role.id, pay),
          label: payLabel(role.id, pay),
          value: pay,
          points: countPointsFor(people, role.id, pay, mutations),
        }),
        paysIn(people, role.id, mutations),
      ),
    ROLES,
  );

/**
 * Every move, as a flow. Which ends are present is what the flow MEANS:
 * both = a raise or a cut, `from` only = a TERMINATION, `to` only = a HIRE.
 *
 * Two people making the identical move at the identical moment merge into ONE
 * ribbon of width two — the chart does no arithmetic on counts, so a caller
 * that wants them merged merges them, and this board does.
 */
export const transfersOf = (
  people: readonly Person[],
  mutations: readonly Mutation[],
): Transfer[] => {
  const merged = new Map<string, Transfer>();
  for (const mutation of orderedMutations(mutations)) {
    for (const person of people) {
      const own = person.changes[mutation.id];
      if (own === undefined) continue;
      const was = payBefore(person, mutation.id, mutations);
      if (was === own) continue;
      const role = person.roleId;
      const from = was === null ? undefined : levelIdFor(role, was);
      const to = own === null ? undefined : levelIdFor(role, own);
      if (from === to) continue;
      const at = new Date(timeOf(mutation.at));
      const key = `${at.getTime()}|${from ?? "out"}|${to ?? "out"}`;
      const existing = merged.get(key);
      merged.set(key, { at, from, to, count: (existing?.count ?? 0) + 1 });
    }
  }
  return sortBy(
    (transfer: Transfer) => timeOf(transfer.at),
    [...merged.values()],
  );
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

/**
 * A dial: an `Entity` whose `range` is CERTAIN.
 *
 * `Entity.range` is optional today and becomes required in phase 3. Narrowing
 * the return type rather than saying `Entity[]` makes the builder below prove
 * at compile time that it sets one on every row.
 *
 * The two type-level guards that used to sit here are gone with the model
 * change, and for a good reason rather than an oversight: a `Person` no longer
 * has `old` or `value` at all — those are DERIVED for a chosen mutation — so
 * there is no longer any assignability between `Person` and `Entity` for a
 * guard to pin. `payBefore`/`payFrom` are the only bridge, and they are
 * ordinary functions the compiler checks directly.
 */
type Dial = Entity & { readonly range: NonNullable<Entity["range"]> };

/**
 * The dials for ONE mutation: each person's pay just before it against their
 * pay from it onward.
 *
 * This is what the as-of control selects. The dials are a view of one moment
 * in the history, not the history itself, so switching mutation changes the
 * NUMBERS on the same six faces rather than the people — which is why the
 * paging row can keep its offset by position across the switch.
 */
export const entitiesForMutation = (
  people: readonly Person[],
  mutationId: string,
  mutations: readonly Mutation[],
): Dial[] =>
  pipe(
    people,
    map((person: Person) => ({
      id: person.id,
      label: person.label,
      old: payBefore(person, mutationId, mutations),
      value: payFrom(person, mutationId, mutations),
      range: roleForPerson(person).range,
    })),
    // Anyone with NO pay either side of this mutation is not on the payroll
    // then — terminated at an earlier one, or not hired until a later one. See
    // `isPresentAt` for the table of four cases this one condition covers.
    filter((dial: Dial) => isPresentAt(dial.old, dial.value)),
  );

/** Running balance, month by month, in dollars. */
export const runningBalances = (
  flows: readonly number[],
  opening: number,
): number[] => {
  const balances: number[] = [];
  let carried = opening;
  for (const flow of flows) {
    carried += flow;
    balances.push(carried);
  }
  return balances;
};

/** The COMMITTED balance — what the fixture's flows have already produced. */
const COMMITTED = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/** The chart's months, as dates. One cell each. */
const CELLS = monthlyCells(DOMAIN_START, DOMAIN_END);

/**
 * Which month "now" falls in — the mutation the reader is editing.
 *
 * Tying NOW to the as-of selection rather than pinning it to a fixed month is
 * what makes the chart answer the question the rest of the board is asking:
 * the balance is HISTORY up to the point being mutated and a PROJECTION after
 * it, so moving the selector moves the boundary between the two.
 */
export const monthIndexOf = (at: TimeValue): number => {
  const when = timeOf(at);
  let index = 0;
  for (const [i, cell] of CELLS.entries()) {
    if (cell.start.getTime() <= when) index = i;
  }
  return index;
};

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward at the
 * scenario's live rate.
 *
 *     balance(m) = balance(now) + rate × (m − now)
 *
 * This is the wire from the dials to the chart. A drag changes the rate, the
 * rate changes every month after now, and the line visibly pivots about the
 * now point — which is the whole reason the board puts them on one screen.
 * Before now nothing moves, because the past is not a forecast.
 */
export const projectedBalances = (rate: number, nowIndex: number): number[] =>
  map((_cell: { start: Date }, index: number) => {
    const committed = COMMITTED[Math.min(nowIndex, COMMITTED.length - 1)] ?? 0;
    if (index <= nowIndex) return COMMITTED[index] ?? committed;
    return committed + monthlyFrom(rate) * (index - nowIndex);
  }, CELLS);

/**
 * The fan's half-width at a month: ZERO at now, widening with the SQUARE of
 * the months since. A forecast is surer about next month than about next year,
 * and the uncertainty is about the projection — so there is none over the part
 * that already happened.
 */
const UNCERTAINTY_PER_MONTH_SQUARED = 200;

export const fanAt = (index: number, nowIndex: number): number => {
  const months = index - nowIndex;
  return months <= 0 ? 0 : UNCERTAINTY_PER_MONTH_SQUARED * months * months;
};

/**
 * The chart's PINNED y-domain, in dollars. Computed once from the fixture's
 * extremes, so dragging a dial moves the LINE and never the axis under it.
 */
const BAND_FLOORS: readonly number[] = map(
  (person: Person) => roleForPerson(person).range[0],
  PEOPLE,
);
const COMMITTED_PAY: readonly number[] = map(
  (person: Person) => person.base ?? roleForPerson(person).range[0],
  PEOPLE,
);
export const PINNED_CEILING = pinnedCeiling(
  COMMITTED,
  maxRateFor(BAND_FLOORS, COMMITTED_PAY),
  (months) => fanAt(months, 0),
);

/** The chart's cells. Cents, because the chart's y IS cents. */
export const balanceCells = (
  rate: number,
  nowIndex: number,
): CashflowCell[] => {
  const balances = projectedBalances(rate, nowIndex);
  return map(
    (cell: { start: Date; end: Date }, index: number) => ({
      ...cell,
      cashflowCents: (MONTHLY_NET[index] ?? 0) * 100,
      balanceCents: (balances[index] ?? 0) * 100,
    }),
    CELLS,
  );
};

/** One faint alternative in the fan, above or below the projection. */
const fanSeries = (id: string, sign: number, nowIndex: number) => ({
  id,
  class: "scenario-board-demo__fan",
  balanceCents: (cell: CashflowCell, index: number): number =>
    cell.balanceCents + sign * fanAt(index, nowIndex) * 100,
});

/**
 * Money, short. `$104k` on a dial, `$95.5k` when the drag lands between —
 * continuous amounts need a format that does not pretend to be exact, and the
 * dial is read at a glance rather than audited.
 */
export const formatMoney = (amount: number): string => {
  const k = amount / 1000;
  const rounded = Math.round(k * 10) / 10;
  return `$${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
};

/** The consumer's money formatter — a real minus sign, as the gauge bench uses. */
const perYear = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(Math.round(delta)).toLocaleString("en-US")}/yr`;

/** The board, read as tables, with no browser in the room. */
const printTables = (
  people: readonly Person[],
  mutations: readonly Mutation[],
  mutationId: string,
): void => {
  /* eslint-disable no-console */
  console.table(
    map(
      (dial: Dial) => ({
        person: dial.label,
        old: dial.old ?? "— (not yet hired)",
        new: dial.value ?? "— (terminated)",
        delta: deltaOf(dial),
        costs: deltaOf(dial),
        rateEffect: -deltaOf(dial),
      }),
      entitiesForMutation(people, mutationId, mutations),
    ),
  );
  console.table(
    map(
      (mutation: Mutation) => ({
        flag: mutation.label,
        at: new Date(timeOf(mutation.at)).toISOString().slice(0, 10),
        // The segment IS the mutation now, so this column is a label rather
        // than a mapping that can lose anything.
        segment: segmentLabelOf(mutation),
        editing: mutation.id === mutationId ? "◀ editing" : "",
      }),
      orderedMutations(mutations),
    ),
  );
  console.table(
    map(
      (level: Level) => ({
        level: level.id,
        pay: level.value,
        counts: pipe(
          level.points,
          map(
            (point: CountPoint) =>
              `${new Date(timeOf(point.at)).toISOString().slice(0, 10)}=${point.count}`,
          ),
          join(" "),
        ),
      }),
      levelsOf(people, mutations),
    ),
  );
  console.table(
    map(
      (transfer: Transfer) => ({
        at: new Date(timeOf(transfer.at)).toISOString().slice(0, 10),
        from: transfer.from ?? "— (hire)",
        to: transfer.to ?? "— (termination)",
        count: transfer.count,
      }),
      transfersOf(people, mutations),
    ),
  );
  // The calibration, so the four readings Peter specified are checkable from a
  // terminal and not only from the dial.
  console.table(rateBandTable());
  const dials = entitiesForMutation(people, mutationId, mutations);
  console.log(
    "baseline",
    perYear(RATE_BASELINE),
    "· pay change",
    perYear(payChangeOf(dials)),
    "· rate",
    perYear(rateOf(dials)),
  );
  /* eslint-enable no-console */
};

// ── The hire form ────────────────────────────────────────────────────────────

/**
 * The role picker's options, built ONCE: the roles are a constant, so rebuilding
 * this list per render would only give `Select` a new array to diff.
 */
const ROLE_OPTIONS: SelectOption[] = map(
  (role: Role) => ({
    value: role.id,
    label: roleOptionLabel(role, formatMoney),
  }),
  ROLES,
);

/** The option a draft has picked, or `null` — `Select`'s own empty. */
const roleOptionOf = (roleId: string | null): SelectOption | null =>
  roleId === null
    ? null
    : (find((option: SelectOption) => option.value === roleId, ROLE_OPTIONS) ??
      null);

/**
 * The body of the Hire modal.
 *
 * It is a COMPONENT rather than a block of JSX inside the board because of the
 * focus: `Modal` has no initial-focus mechanism of its own, its children are
 * created lazily inside its `Show`, and so an `onMount` in here fires on every
 * OPEN — which is exactly when the name field wants the caret. An `onMount` in
 * the board would have fired once, at page load, while the form did not exist.
 *
 * ENTER SUBMITS from the name field, explicitly rather than through a `<form>`.
 * The confirm button lives in the modal's FOOTER, outside whatever element the
 * fields sit in, so a form element here would have no submit button in it and
 * would be relying on the browser's implicit-submission rule — which is
 * conditional on how many fields block it, and the role picker's own hidden
 * input is enough to make that a coin toss.
 */
const HireForm: Component<{
  draft: HireDraft;
  onDraft: (draft: HireDraft) => void;
  onSubmit: () => void;
}> = (props) => {
  let nameField: HTMLInputElement | undefined;
  onMount(() => nameField?.focus());

  const pickRole = (option: SelectOption | null): void =>
    props.onDraft({
      ...props.draft,
      roleId: option === null ? null : String(option.value),
    });

  const typeName = (name: string): void =>
    props.onDraft({ ...props.draft, name });

  return (
    <NarrowStack>
      <Select
        label="Role"
        placeholder="Pick a role"
        options={() => ROLE_OPTIONS}
        value={() => roleOptionOf(props.draft.roleId)}
        onChange={pickRole}
      />
      <ThemedInput
        ref={nameField}
        label="Name"
        placeholder="Who are you hiring?"
        value={props.draft.name}
        onInput={(event) => typeName(event.currentTarget.value)}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          props.onSubmit();
        }}
      />
    </NarrowStack>
  );
};

// ── The board ────────────────────────────────────────────────────────────────

const ScenarioBoardBench: Component = () => {
  const [people, setPeople] = createSignal<readonly Person[]>(PEOPLE);
  // The mutations are STATE now, not a constant: a click on the timeline adds
  // one. The as-of control's options derive from this list, so a new flag and
  // a new segment are the same event.
  const [mutations, setMutations] =
    createSignal<readonly Mutation[]>(SEED_MUTATIONS);
  // WHICH MUTATION THE DIALS ARE EDITING. One signal for both the timeline's
  // lit flag and the as-of control's selected segment — the lossy two-signal
  // mapping is gone, because the segments ARE the mutations.
  const [editing, setEditing] = createSignal(SEED_MUTATIONS[1].id);
  // The hire form: whether it is open, and what it holds. Both are the BOARD'S
  // — the modal is a view of this draft, so Cancel throws away a signal rather
  // than reaching into a component to clear it.
  const [hiring, setHiring] = createSignal(false);
  const [draft, setDraft] = createSignal<HireDraft>(EMPTY_HIRE);

  const dials = () => entitiesForMutation(people(), editing(), mutations());
  const rate = () => rateOf(dials());

  /** The month the projection pivots on: the mutation being edited. */
  const nowIndex = () => {
    const chosen = find((m: Mutation) => m.id === editing(), mutations());
    return chosen === undefined ? 0 : monthIndexOf(chosen.at);
  };

  /**
   * The timeline draws the LIVE people, same as the gauge and the balance.
   *
   * It used to lag by a gesture, on the reasoning that a rail is keyed by pay
   * amount so a continuous drag would spawn a rail per pixel of travel. Peter
   * ruled that out and he is right: the levels are DERIVED from current state
   * on every read, so nothing accumulates — a rail moves, it does not breed.
   * The concern was about accumulation, and a derived model has none. With
   * `snap={1_000}` the intermediate values are whole thousands anyway, and six
   * people across three mutations is nothing to recompute.
   *
   * `onChangeEnd` is gone with it rather than kept "just in case": there is
   * nothing commit-only on this board today, and a second code path that
   * nothing needs is how two ways to do everything start. If a future chart
   * here is genuinely too expensive to recompute mid-drag, that is the moment
   * to measure the jank and bring the split back for it alone.
   */

  onMount(() => {
    if (DEBUG) printTables(people(), mutations(), editing());
  });

  /** A drag edits the SELECTED mutation only. */
  const setPay = (id: string, value: number): void => {
    setPeople((current) => withChange(current, id, editing(), value));
  };

  /** ⊗ Terminate: this person is gone from the selected mutation onward. */
  const terminate = (id: string): void => {
    setPeople((current) => withChange(current, id, editing(), null));
  };

  /**
   * ↺ Restore: drop the change entirely rather than inventing a figure. They
   * carry whatever the previous mutation left them on — which for a hire is
   * the pay they were hired at, exactly, and for anyone else their prior pay.
   */
  const restore = (id: string): void => {
    setPeople((current) => withoutChange(current, id, editing()));
  };

  /**
   * A HIRE is a FORM now, not a stub (Peter, 2026-09-16: "When I click + on the
   * Changes, show me a modal form that lets me choose a role … and a text input
   * for a name"). The `+` opens it; nothing changes until Hire is pressed.
   *
   * The draft is RESET on open rather than on close, so a cancelled form cannot
   * leave a half-typed name waiting inside the next one, and every path out of
   * the modal — Cancel, Escape, the overlay, the ×— is the same single line.
   */
  const openHire = (): void => {
    setDraft(EMPTY_HIRE);
    setHiring(true);
  };

  const closeHire = (): void => {
    setHiring(false);
  };

  /**
   * Confirm. The person is added at the mutation being EDITED, so a hire lands
   * where the reader is looking — and `hire` is the same pure function the test
   * asserts, so what the board does and what the test checks cannot drift.
   *
   * The guard is not redundant beside the disabled button: Enter in the name
   * field reaches here too, and a keyboard path that skipped the check would be
   * a second, weaker rule.
   */
  const confirmHire = (): void => {
    const current = draft();
    if (!canHire(current)) return;
    setPeople((people) => hire(people, current, editing()).people);
    setHiring(false);
  };

  /**
   * A click on the plot. The chart snaps the date to a month boundary, so
   * "there is already a mutation here" is an exact timestamp match and a click
   * on an existing flag's month SELECTS it instead of duplicating it.
   *
   * Nobody's history needs extending: an absent key already means "unchanged
   * at this mutation", so every person starts the new mutation with
   * `old === value` for free.
   */
  const pick = (at: TimeValue): void => {
    const picked = addMutation(mutations(), new Date(timeOf(at)));
    setMutations(picked.mutations);
    setEditing(picked.selected);
  };

  const reset = (): void => {
    setPeople(PEOPLE);
    setMutations(SEED_MUTATIONS);
    setEditing(SEED_MUTATIONS[1].id);
  };

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <ViewportColumn>
        <SectionTitle>Scenario Board</SectionTitle>

        {/* The two charts share the top 30% equally. Each sits in a
            ClipFillColumn — it takes half the band AND clips — because a chart
            that cannot fill a shorter box would otherwise paint straight over
            the controls beneath it. See the header note on which charts fill. */}
        {/* The top 30%, halved. Each card is a FillCardSurface — it takes
            its half of the band and lays out a column that fills it — so the
            title keeps its own height and the GrowBox hands the chart
            everything left. Both charts now ABSORB that box: the balance chart
            through `chartHeight="fill"`, the timeline by measuring the height
            it is given. Nothing clips and nothing is sized in pixels here. */}
        <HalfFillColumn>
          <HalfFillColumn>
            <FillCardSurface>
              <TextTitle>Running balance</TextTitle>
              <GrowFillBox>
                <CashflowScrubChart
                  cells={balanceCells(rate(), nowIndex())}
                  scrub={false}
                  chartHeight="fill"
                  showGridlines
                  lineLabel="Committed"
                  balanceSeries={[
                    fanSeries("optimistic", 1, nowIndex()),
                    fanSeries("pessimistic", -1, nowIndex()),
                  ]}
                />
              </GrowFillBox>
            </FillCardSurface>
          </HalfFillColumn>

          <HalfFillColumn>
            <FillCardSurface>
              <TextTitle>Pay levels through the year</TextTitle>
              <GrowFillBox>
                <LevelsTimeline
                  levels={levelsOf(people(), mutations())}
                  transfers={transfersOf(people(), mutations())}
                  mutations={mutations()}
                  domain={TIME_DOMAIN}
                  selectedMutationId={editing()}
                  onSelectMutation={setEditing}
                  onPick={pick}
                  formatValue={formatMoney}
                />
              </GrowFillBox>
            </FillCardSurface>
          </HalfFillColumn>
        </HalfFillColumn>

        <HalfFillColumn>
          <FillWrapRow>
            <MajorPaneBox>
              <FillCardSurface>
                {/* NO extra Stack here. `FillCardSurface` already lays its
                    children out as a column that FILLS the card, so a
                    TightStack inside it is a SECOND column sitting at its own
                    content height — which is what left the dials ending 40%
                    down the card with dead space beneath them. The header
                    keeps its intrinsic height; GrowFillBox hands the component
                    every pixel that is left. */}
                {/* The as-of control lives HERE, in the card's header, not
                      in a strip of its own (Peter: "merge the As Of with the
                      mutations — it's a selector for which position we're
                      mutating"). Title left, selector in the middle, Reset
                      right: the thing being edited is named beside the dials
                      that edit it. */}
                <SpreadRow>
                  <TextTitle>Changes</TextTitle>
                  <SegmentedControl
                    options={segmentOptionsOf(mutations())}
                    value={editing()}
                    onValueChange={setEditing}
                    aria-label="Change being edited"
                  />
                  <GhostButton onClick={reset}>Reset</GhostButton>
                </SpreadRow>
                <GrowFillBox>
                  <MutationSliders
                    entities={dials()}
                    domain={PAY_DOMAIN}
                    snap={1_000}
                    onChange={setPay}
                    onRemove={terminate}
                    onRestore={restore}
                    onAdd={openHire}
                    format={formatMoney}
                  />
                </GrowFillBox>
              </FillCardSurface>
            </MajorPaneBox>

            {/* The narrow column. ConstrainedBox caps the CARD at 400px rather
              than only the dial inside it: a NoShrinkColumn took its width
              from the caption's max-content and swallowed the row, which is
              the opposite of the sketch's wide-left / narrow-right split. */}
            <GrowFillBox class="scenario-board-gauge">
              <FillCardSurface>
                {/* NO extra Stack here. `FillCardSurface` already lays its
                    children out as a column that FILLS the card, so a
                    TightStack inside it is a SECOND column sitting at its own
                    content height — which is what left the dials ending 40%
                    down the card with dead space beneath them. The header
                    keeps its intrinsic height; GrowFillBox hands the component
                    every pixel that is left. */}
                <TextTitle>Rate, right now</TextTitle>
                <GrowCenterColumn>
                  <RateGauge
                    domain={RATE_DOMAIN}
                    baseline={RATE_BASELINE}
                    comfortable={COMFORTABLE}
                    value={rate()}
                    label="Scenario"
                    format={perYear}
                  />
                </GrowCenterColumn>
              </FillCardSurface>
            </GrowFillBox>
          </FillWrapRow>
        </HalfFillColumn>
      </ViewportColumn>

      {/* The hire form. Rendered here rather than beside the dials because it
          PORTALS — where it sits in this tree decides nothing about where it
          draws, and the state it edits is the board's. Escape, the overlay and
          the × all land on `onClose`, which is the same `closeHire` as Cancel:
          one way out, and none of them change anything. */}
      <Modal
        open={hiring()}
        onClose={closeHire}
        title="Hire"
        subtitle="They join at the change being edited, on their role's floor."
        footer={
          <EndWrapRow>
            <GhostButton onClick={closeHire}>Cancel</GhostButton>
            <PrimaryButton disabled={!canHire(draft())} onClick={confirmHire}>
              Hire
            </PrimaryButton>
          </EndWrapRow>
        }
      >
        <HireForm draft={draft()} onDraft={setDraft} onSubmit={confirmHire} />
      </Modal>
    </div>
  );
};

export default ScenarioBoardBench;
