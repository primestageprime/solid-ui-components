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
 *   people ──payChangeAt──▶ averageRate ──▶ RateGauge.value  (the WHOLE year)
 *   people ──payChangeAt──▶ rateAt ──▶ the balance line's forward slope
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
import { Show, batch, createSignal, onMount, type Component } from "solid-js";
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
  addMutation,
  ensureMutation,
  type HireDraft,
  type Person,
  ROLES,
  type Role,
  canHire,
  hire,
  orderedMutations,
  payAt,
  payBefore,
  payDomainForPeople,
  payDomainOf,
  payFrom,
  removeMutation,
  type SegmentLabel,
  segmentLabelsOf,
  peopleOnRole,
  roleForPerson,
  roleOf,
  roleOptionLabel,
  withChange,
  withoutChange,
} from "./scenario-board-people";

import {
  abbreviateDollars,
  againstBreakeven,
  payrollShift,
  signedDollarsPerYear,
} from "./scenario-board-money";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import {
  COMFORTABLE,
  RATE_BASELINE,
  RATE_DOMAIN,
  averageRate,
  rateAt,
  weightFrom,
  bandOfRate,
  isPresentAt,
  maxRateFor,
  monthlyFrom,
  pinnedCeiling,
  rateBandTable,
  rateFromPayChange,
} from "./scenario-board-rate";
import {
  createLevelsTimeline,
  timeOf,
} from "../../../src/components/LevelsTimeline";
import type {
  CountPoint,
  Level,
  Mutation,
  TimeDomain,
  TimeValue,
  Transfer,
} from "../../../src/components/LevelsTimeline";
// The two PROMOTED components come through their factories, not their bases.
// Promotion split both surfaces: the money format, the snap grid, the staffing
// verbs and the callout sentences are all OVERRIDES now, and this board is the
// consumer that owns those decisions — so it curries them once, below, and its
// call sites pass data and callbacks only.
//
// `Entity` is published as `MutationEntity`, because `Entity` is too generic a
// word for the root barrel. The type comes from the component's own folder
// rather than the root: an ambiguous `export *` resolves to nothing there.
import { createMutationSliders } from "../../../src/components/MutationSliders";
import type { MutationEntity } from "../../../src/components/MutationSliders";
import { createRateGauge } from "../../../src/components/RateGauge";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import type { SegmentOption } from "../../../src/components/SegmentedControl";

import {
  DangerButton,
  GhostButton,
  PrimaryButton,
} from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import { ThemedInput } from "../../../src/components/Inputs";
import { Modal } from "../../../src/components/Modal";
import { Select } from "../../../src/components/Select";
import type { SelectOption } from "../../../src/components/Select";
import {
  ClusterRow,
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
import {
  NoteText,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";

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
 * NO MUTATIONS (Peter, 2026-09-16). The board opens on the scenario as it
 * stands — two engineers, both on $80k, nothing proposed — and the reader adds
 * the first change by CLICKING A DATE on the pay-levels chart.
 *
 * That empty opening is a state the whole board has to hold, not a special
 * case for the dials: with no mutation there is no `old` and no `new`, so the
 * gauge reads the baseline, the projection is one straight line at the
 * baseline rate, and the as-of control has nothing to offer and says so. Every
 * one of those is derived from this empty array rather than switched on a
 * flag — see `dialsFor`, `nowIndex` and the Changes header.
 *
 * Any mutation the reader adds is built by `addMutation` from a date the chart
 * snapped to a month boundary, which is the only way a flag's moment is ever
 * constructed: `LevelsTimeline` ties a riser to a flag by exact timestamp
 * equality, so a differently-built Date would draw the step and light no flag.
 */
const SEED_MUTATIONS: readonly Mutation[] = [];

/**
 * The people (Peter, 2026-09-16): TWO, both Software Engineers, both on $80k,
 * and neither of them has been given anything yet.
 *
 * Both hold the SAME role at the SAME pay on purpose, and that is the story
 * the timeline is meant to tell from the first frame: one rail, drawn at two
 * heads' thickness, which is what the levels model says and what six people
 * across three bands never showed plainly. It also sidesteps the overlap the
 * roles now permit — a CFO and an engineer share a band exactly, so putting
 * one of each at $80k would draw two rails at one height (see the header of
 * `scenario-board-people`). That collision is worth having a fixture for; it
 * is not worth having in the fixture that opens the board.
 *
 * `changes: {}` is the whole of "no raises": an absent key already means
 * unchanged, so an empty map is a person with a history and nothing in it.
 */
const PEOPLE: readonly Person[] = [
  {
    id: "peter",
    label: "Peter",
    roleId: "engineer",
    base: 80_000,
    changes: {},
  },
  {
    id: "adlai",
    label: "Adlai",
    roleId: "engineer",
    base: 80_000,
    changes: {},
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
 * The rate functions below take THIS rather than a whole `MutationEntity`, because
 * `old` and `value` are all they read. That is not fastidiousness: a `Person`
 * deliberately has no `range` (see `Person`), so once `MutationEntity.range` becomes
 * required in phase 3 a `Person` stops being assignable to an `MutationEntity` and
 * every one of these call sites would break on a field none of them touch.
 * Asking for the narrowest shape that answers the question keeps them working
 * for people and dials alike. Verified by simulating the tightening locally.
 */
type Amounts = Pick<MutationEntity, "old" | "value">;

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
 * The as-of control's options: one per mutation, in time order, labelled by
 * QUARTER to match the axis above them (`2025-Q3`).
 *
 * THE LOSSY MAPPING IS GONE. Until Peter merged the as-of control into the
 * Mutations card, the flags sat at three dates and the split button offered
 * three DIFFERENT ones, so two flags collapsed onto one segment and the round
 * trip lost information. The segments ARE the mutations now — the control
 * selects which mutation the dials are editing — so flag→segment→flag is the
 * identity whatever the chips READ, which is what makes it safe for the label
 * to be an abbreviation. `segmentLabelsOf` owns the abbreviating, including
 * what to do when two mutations land in one quarter.
 */
export const segmentOptionsOf = (
  mutations: readonly Mutation[],
): SegmentOption[] =>
  map(
    (segment: SegmentLabel) => ({
      value: segment.id,
      label: segment.label,
    }),
    segmentLabelsOf(mutations),
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
 * A dial: an `MutationEntity` whose `range` is CERTAIN.
 *
 * `MutationEntity.range` is optional today and becomes required in phase 3. Narrowing
 * the return type rather than saying `Entity[]` makes the builder below prove
 * at compile time that it sets one on every row.
 *
 * The two type-level guards that used to sit here are gone with the model
 * change, and for a good reason rather than an oversight: a `Person` no longer
 * has `old` or `value` at all — those are DERIVED for a chosen mutation — so
 * there is no longer any assignability between `Person` and `MutationEntity` for a
 * guard to pin. `payBefore`/`payFrom` are the only bridge, and they are
 * ordinary functions the compiler checks directly.
 */
type Dial = MutationEntity & {
  readonly range: NonNullable<MutationEntity["range"]>;
};

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

/**
 * The dials when there is NO mutation yet: everyone on the pay they are
 * already on, `old` and `value` the same number.
 *
 * A separate function rather than a nullable `mutationId` threaded through
 * `payBefore`/`payFrom`, because the question is genuinely different. With a
 * mutation the dials show a CHANGE — what was, against what will be. With no
 * mutation there is no change to show, and saying so with `old === value` is
 * what makes every reading downstream fall out without a special case: the
 * delta is zero, so the dial draws no coloured line and prints no figure, the
 * pay change sums to zero, and the gauge reads exactly the baseline.
 */
export const dialsWithoutMutation = (people: readonly Person[]): Dial[] =>
  pipe(
    people,
    map((person: Person) => ({
      id: person.id,
      label: person.label,
      old: person.base,
      value: person.base,
      range: roleForPerson(person).range,
    })),
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
 * Money, short — `$104k` on a dial, `$95.5k` when the drag lands between.
 *
 * ONE formatter for every surface (Peter, 2026-09-16), and it is the library's
 * own compact scaler underneath rather than a private rounding policy — see
 * `scenario-board-money`. The name stays `formatMoney` because that is what a
 * component's `format` prop is asking for.
 */
export const formatMoney = abbreviateDollars;

/**
 * The domain's own vocabulary. `MutationSliders` is GENERIC — its defaults are
 * "Remove" / "Restore" / "New" — so the staffing verbs live HERE, at the
 * consumer, which is the whole point of its `labels` prop.
 */
const PAY_LABELS = {
  remove: "Terminate",
  restore: "Restore",
  new: "new hire",
} as const;

/**
 * THE BOARD'S OWN DIALS, curried once.
 *
 * The unit, the grid and the vocabulary are properties of this BOARD rather
 * than of any one render, which is exactly what an Override is for — and a
 * `format` passed in the middle of a layout is a visual decision smuggled into
 * a JSX tree. Peter's snap ("do have the pay amount snap to whole $k numbers")
 * is locked here with them.
 */
const PayMutationSliders = createMutationSliders({
  format: formatMoney,
  snap: 1_000,
  labels: PAY_LABELS,
});

/**
 * THE BOARD'S OWN GAUGE, curried the same way.
 *
 * Both formatters are SENTENCE builders — the gauge supplies no words of its
 * own around them — so what the callouts say is the board's wording, written
 * and tested in `scenario-board-money` rather than inline here.
 */
/**
 * THE BOARD'S OWN TIMELINE. `formatValue` is presentational and became an
 * Override with the promotion, which is right: the rails' captions are money
 * on this board and nothing else, in every render.
 */
const PayLevelsTimeline = createLevelsTimeline({ formatValue: formatMoney });

const PayRateGauge = createRateGauge({
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: payrollShift,
});

/** The consumer's SIGNED rate — `+$20k/yr`, `−$40k/yr`. For the DEBUG tables. */
const perYear = signedDollarsPerYear;

/** The board, read as tables, with no browser in the room. */
/**
 * The board, read as tables, with no browser in the room — INCLUDING the state
 * it opens in.
 *
 * `mutationId` is nullable for the same reason the board's own signal is: the
 * opening frame has no mutation, and a headless observation that could not
 * describe the default state would leave the one screen Peter always sees as
 * the one screen with no terminal representation.
 */
const printTables = (
  people: readonly Person[],
  mutations: readonly Mutation[],
  mutationId: string | null,
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
      mutationId === null
        ? dialsWithoutMutation(people)
        : entitiesForMutation(people, mutationId, mutations),
    ),
  );
  console.table(
    map(
      (segment: SegmentLabel) => ({
        flag:
          find((m: Mutation) => m.id === segment.id, mutations)?.label ?? "",
        // The chip READS by quarter; the exact month is the column beside it,
        // which is where the abbreviation gets spent rather than lost.
        segment: segment.label,
        month: segment.month,
        editing: segment.id === mutationId ? "◀ editing" : "",
      }),
      segmentLabelsOf(mutations),
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
  const dials =
    mutationId === null
      ? dialsWithoutMutation(people)
      : entitiesForMutation(people, mutationId, mutations);
  // What the gauge reads and what the balance line slopes at are DIFFERENT
  // numbers now, so the table prints both beside the change that produced
  // them — a reader comparing the dial to the chart should not have to work
  // out which of the two they are looking at.
  const at =
    mutationId === null
      ? DOMAIN_START.getTime()
      : timeOf(
          find((m: Mutation) => m.id === mutationId, mutations)?.at ??
            DOMAIN_START,
        );
  console.log(
    "baseline",
    perYear(RATE_BASELINE),
    "· this change",
    perYear(payChangeOf(dials)),
    "· rate from here",
    perYear(rateAt(at, mutations, people)),
    "· gauge (year average)",
    perYear(averageRate(TIME_DOMAIN, mutations, people)),
    "· weight of this change",
    weightFrom(DOMAIN_START.getTime(), DOMAIN_END.getTime(), at).toFixed(2),
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
  // WHICH MUTATION THE DIALS ARE EDITING, or `null` when there is none to
  // edit — the state the board OPENS in. `null` is not "none selected by
  // accident": it is the honest answer while the scenario has no proposed
  // change at all, and every reading below asks for it rather than assuming a
  // mutation exists.
  const [editing, setEditing] = createSignal<string | null>(null);
  // The hire form: whether it is open, and what it holds. Both are the BOARD'S
  // — the modal is a view of this draft, so Cancel throws away a signal rather
  // than reaching into a component to clear it.
  const [hiring, setHiring] = createSignal(false);
  const [draft, setDraft] = createSignal<HireDraft>(EMPTY_HIRE);

  /**
   * The segment the as-of control is showing, or `undefined` when the board has
   * no mutation to select. `Show` renders its fallback on `undefined`, so this
   * one accessor decides both what the control reads and whether there is a
   * control at all.
   */
  const selectedSegment = (): string | undefined => editing() ?? undefined;

  /**
   * THE GAUGE'S READING: the whole year, averaged.
   *
   * Not `rateOf(dials())`, which is the selected change's own rate and says a
   * raise made in December costs the year what the same raise made in January
   * does (Peter, 2026-09-16). Editing one change now moves the gauge by that
   * change's share of the year.
   */
  const rate = () => averageRate(TIME_DOMAIN, mutations(), people());

  /**
   * THE PROJECTION'S SLOPE: the instantaneous rate from the moment being
   * edited, which is a different question and wants a different answer — a
   * line drawn forward from a point runs at the rate in force AT that point,
   * not at the year's average.
   */
  const projectedRate = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
    return rateAt(
      chosen === undefined ? DOMAIN_START.getTime() : timeOf(chosen.at),
      mutations(),
      people(),
    );
  };

  const dials = () => {
    const at = editing();
    return at === null
      ? dialsWithoutMutation(people())
      : entitiesForMutation(people(), at, mutations());
  };

  /**
   * The month the projection pivots on: the mutation being edited.
   *
   * With NO mutation the pivot is month zero, so the whole line is projection
   * and it runs dead straight at the baseline rate — there is no committed
   * stretch to draw, because nothing has been decided yet.
   */
  const nowIndex = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
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

  /**
   * THE FIRST INTERACTION MAKES ITS OWN CHANGE (Peter, 2026-09-16).
   *
   * Dragging a dial with nothing selected used to be a no-op, which made the
   * opening state a place the reader could get stuck: the one gesture they
   * reach for did nothing, and the sentence beside the dials was the only way
   * out. Now the gesture means what it obviously means — a change, at the
   * `nextFreeSlot` — and the drag lands on it.
   *
   * Returns the id to edit, so every caller does one thing whether or not
   * anything was created. `batch`, because the mutation list and the selection
   * describe one scenario and a render between the two writes would draw a
   * board disagreeing with itself.
   */
  const editingOrFirst = (): string | null => {
    const already = editing();
    if (already !== null) return already;
    const ensured = ensureMutation(
      { mutations: mutations(), selected: null },
      DOMAIN_START.getTime(),
      DOMAIN_END.getTime(),
    );
    batch(() => {
      setMutations(ensured.mutations);
      setEditing(ensured.selected);
    });
    return ensured.selected;
  };

  /** A drag edits the SELECTED mutation — making one first if there is none. */
  const setPay = (id: string, value: number): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setPeople((current) => withChange(current, id, at, value));
  };

  /** ⊗ Terminate: this person is gone from the selected mutation onward. */
  const terminate = (id: string): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setPeople((current) => withChange(current, id, at, null));
  };

  /**
   * ↺ Restore: drop the change entirely rather than inventing a figure. They
   * carry whatever the previous mutation left them on — which for a hire is
   * the pay they were hired at, exactly, and for anyone else their prior pay.
   */
  const restore = (id: string): void => {
    const at = editing();
    if (at === null) return;
    setPeople((current) => withoutChange(current, id, at));
  };

  // ↺ Restore does NOT make a change of its own: there is nothing to undo at a
  // mutation that does not exist yet, and the button is only ever drawn for
  // somebody already terminated — which takes a mutation to have happened.

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
    editingOrFirst();
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
    const at = editing();
    if (at === null || !canHire(current)) return;
    setPeople((people) => hire(people, current, at).people);
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

  /**
   * DELETE THE SELECTED CHANGE, and everything that only existed because of it
   * — the flag, the chip, every person's entry at it, and anyone hired there.
   *
   * One call to one pure function that the test pins, and one `batch` so the
   * three signals move together: the mutation list, the people and the
   * selection describe one scenario, and a render between two of those writes
   * would draw a board whose chips and dials disagreed.
   */
  const deleteChange = (id: string): void => {
    const next = removeMutation(
      { mutations: mutations(), people: people() },
      id,
    );
    batch(() => {
      setMutations(next.mutations);
      setPeople(next.people);
      setEditing(next.selected);
    });
  };

  const reset = (): void => {
    setPeople(PEOPLE);
    setMutations(SEED_MUTATIONS);
    setEditing(null);
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
                  cells={balanceCells(projectedRate(), nowIndex())}
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
              {/* `undefined` is the chart's "nothing selected" and the board
                  says `null`; `selectedSegment` is the one place the two
                  vocabularies meet. */}
              <GrowFillBox>
                <PayLevelsTimeline
                  levels={levelsOf(people(), mutations())}
                  transfers={transfersOf(people(), mutations())}
                  mutations={mutations()}
                  domain={TIME_DOMAIN}
                  valueDomain={payDomainForPeople(people())}
                  selectedMutationId={selectedSegment()}
                  onSelectMutation={setEditing}
                  onPick={pick}
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
                  {/* The as-of control has NOTHING TO OFFER until a date has
                      been picked, and an empty segmented bar would be a
                      control that cannot be operated. Peter's sentence takes
                      its place — same slot, same row — and says the one thing
                      the reader needs to know to get out of the empty state.

                      NOT `EmptyState`, though it was the obvious candidate:
                      that component is a CENTRED placeholder with an icon that
                      stands in for absent content, and the content here is not
                      absent — the two dials below still show what everyone is
                      paid today, which is exactly what Peter asked to keep.
                      This is a hint about a missing INPUT, in the slot the
                      missing control would have occupied, so it stays the
                      muted text variant. */}
                  <Show
                    when={selectedSegment()}
                    fallback={
                      <NoteText>
                        To change payroll click the pay levels chart to indicate
                        when
                      </NoteText>
                    }
                  >
                    {(selected) => (
                      <SegmentedControl
                        options={segmentOptionsOf(mutations())}
                        value={selected()}
                        onValueChange={setEditing}
                        aria-label="Change being edited"
                      />
                    )}
                  </Show>
                  {/* Delete removes the SELECTED change, so it is only ever
                      offered when there is one to remove — `Show` rather than
                      a disabled button, because with no changes at all the
                      sentence beside it already explains the whole state and a
                      dead control would be the only thing in the row that
                      could not be acted on. */}
                  <ClusterRow>
                    <Show when={editing()}>
                      {(selected) => (
                        <DangerButton onClick={() => deleteChange(selected())}>
                          <Icon name="trash" size="sm" /> Delete
                        </DangerButton>
                      )}
                    </Show>
                    <GhostButton onClick={reset}>Reset</GhostButton>
                  </ClusterRow>
                </SpreadRow>
                {/* Every control is live in the empty state now, because none
                    of them is a no-op there any more: a drag, a ⊗ or a + makes
                    the change it implies and applies itself to it. ↺ is the
                    exception and needs no guard — it is only drawn for somebody
                    already terminated, which takes a mutation to have
                    happened. */}
                <GrowFillBox>
                  <PayMutationSliders
                    entities={dials()}
                    domain={PAY_DOMAIN}
                    onChange={setPay}
                    onRemove={terminate}
                    onRestore={restore}
                    onAdd={openHire}
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
                  <PayRateGauge
                    domain={RATE_DOMAIN}
                    baseline={RATE_BASELINE}
                    caution={COMFORTABLE}
                    value={rate()}
                    label="Scenario"
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
