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
  findLast,
  flatMap,
  join,
  map,
  pipe,
  sortBy,
  sum,
} from "../../../src/fn";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import { LevelsTimeline, timeOf } from "../../../src/components/LevelsTimeline";
import type {
  CountPoint,
  Level,
  Mutation,
  TimeDomain,
  Transfer,
} from "../../../src/components/LevelsTimeline";
import { MutationSliders } from "../../../src/components/MutationSliders";
import type { Entity } from "../../../src/components/MutationSliders";
import { RateGauge } from "../../../src/components/RateGauge";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import type { SegmentOption } from "../../../src/components/SegmentedControl";

import { GhostButton } from "../../../src/components/Button";
import {
  GrowFillBox,
  HalfFillColumn,
  LooseWrapRow,
  MajorFillColumn,
  MinorFillColumn,
  ActionSlot,
  SpreadRow,
  TightStack,
  ViewportColumn,
  WidePaneBox,
} from "../../../src/components/Layout";
import { CardSurface, FillCardSurface } from "../../../src/components/Surface";
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
const MUTATIONS: readonly Mutation[] = [
  { id: "spring", at: new Date("2025-04-01"), label: "1" },
  { id: "summer", at: new Date("2025-07-01"), label: "2" },
  { id: "autumn", at: new Date("2025-10-01"), label: "3" },
];

/** The as-of points from the sketch's split button. The middle one starts selected. */
const SEGMENTS: readonly { value: string; at: Date }[] = [
  { value: "2025-01", at: new Date("2025-01-01") },
  { value: "2025-06", at: new Date("2025-06-01") },
  { value: "2026-01", at: new Date("2026-01-01") },
];

const SEGMENT_OPTIONS: readonly SegmentOption[] = map(
  (segment: { value: string }) => ({ value: segment.value }),
  SEGMENTS,
);

/**
 * The three ROLE BANDS. A band is a range of pay a role permits; it is the
 * shaded box on each dial and it is the clamp on both amounts.
 *
 * The bands do not OVERLAP, and that is a rendering constraint rather than a
 * domain truth. `Level.value` is a pay figure and the board draws all three
 * bands on ONE timeline, so two bands sharing a pay would put two rails at the
 * same y and overdraw. The reference bench dodges this by drawing one chart per
 * track; the sketch gives the board a single chart, so the fixture keeps the
 * bands in disjoint strata instead. A real consumer with overlapping bands
 * needs either a chart per band or a level key that is not the bare pay.
 */
interface Band {
  readonly id: BandId;
  readonly label: string;
  readonly range: readonly [number, number];
}

type BandId = "A" | "B" | "C";

const BANDS: readonly Band[] = [
  { id: "A", label: "Support", range: [1, 3] },
  { id: "B", label: "Delivery", range: [4, 6] },
  { id: "C", label: "Platform", range: [7, 10] },
];

/**
 * A person: a dial's worth of data plus the two things the dial does not carry
 * — which band they are in, and which mutation they move at.
 *
 * `old: null` is a HIRE (no prior pay) and `value: null` is a DEPARTURE (no
 * new pay); both come straight from `Entity`, so the dials and the rails read
 * the same absence the same way.
 *
 * `range` is OMITTED from the inherited surface on purpose. A person has a
 * BAND; the range is what `entitiesOf` derives from that band when it builds
 * the dial. Carrying both would let a fixture row state a range that disagrees
 * with its own band — exactly the duplication the derivation step exists to
 * prevent — so the type refuses to represent it. Omitting it is also what
 * keeps this fixture honest when `Entity.range` becomes REQUIRED in phase 3:
 * the requirement lands on the dials, which always have one, rather than on
 * six literals that would have to repeat their band's numbers to satisfy it.
 */
interface Person extends Omit<Entity, "range"> {
  readonly band: BandId;
  readonly stepAt: string;
}

/**
 * The board's fixture, mirroring the levels-timeline bench's three tracks at
 * six people instead of eleven (coordinator, 2026-09-16).
 *
 * The character of each track is preserved; the SIZE is not, and could not be.
 * Track A wants "several start equal" (three or more) and track C wants
 * "different-sized bumps" (two, to contrast), which needs seven people against
 * the sketch's six. B and C are therefore exact and A is degraded to two, since
 * "two start equal, one raises, one stays" still shows the equal-start-then-
 * diverge shape that is the point of it.
 *
 *   A — Peter and Joe both start on L2. Peter is raised off it at flag 1 and
 *       Joe LEAVES at the same flag, so A's L2 rail empties completely: two
 *       flows out of one level at one moment, and a rail that ends.
 *   B — Elaina and Reilly take the SAME step, L4 → L6, two flags apart.
 *   C — Adlai and Flynn bump on the SAME flag by different amounts, +1 and +3,
 *       so the two ribbon widths can be compared side by side.
 */
const PEOPLE: readonly Person[] = [
  {
    id: "peter",
    label: "Peter",
    band: "A",
    stepAt: "spring",
    old: 2,
    value: 3,
  },
  { id: "joe", label: "Joe", band: "A", stepAt: "spring", old: 2, value: null },
  {
    id: "elaina",
    label: "Elaina",
    band: "B",
    stepAt: "spring",
    old: 4,
    value: 6,
  },
  {
    id: "reilly",
    label: "Reilly",
    band: "B",
    stepAt: "autumn",
    old: 4,
    value: 6,
  },
  {
    id: "adlai",
    label: "Adlai",
    band: "C",
    stepAt: "summer",
    old: 7,
    value: 8,
  },
  {
    id: "flynn",
    label: "Flynn",
    band: "C",
    stepAt: "summer",
    old: 7,
    value: 10,
  },
];

/** The dial domain, in the consumer's own levels. */
const LEVEL_DOMAIN: readonly [number, number] = [0, 10];

/** What one level is worth per month. The board's only unit conversion. */
const DOLLARS_PER_LEVEL = 1000;

/** The gauge's domain and its fixed reference, both the consumer's. */
const RATE_DOMAIN: readonly [number, number] = [-30000, 30000];
/**
 * What the company nets per month BEFORE this scenario's changes. The gauge's
 * dashed needle sits here and the solid one at `rateOf`, so the sector between
 * them is what the scenario costs.
 *
 * Non-zero on purpose. With a baseline of 0 every scenario that pays anybody
 * anything drew below zero and the needle lived in the loss half, which made
 * the gauge a cost meter rather than a rate meter. At +$20k the default
 * fixture's $7k of raises lands the needle at +$13k — inside the domain, on
 * the gain side, and visibly short of the baseline, which is the reading the
 * card is for.
 */
const RATE_BASELINE = 20000;

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
    map((entity: Amounts) => deltaOf(entity) * DOLLARS_PER_LEVEL),
    sum,
  );

/**
 * The COMPANY'S net rate under the scenario, which is what the gauge shows.
 *
 * The sign is the whole point and it was inverted until 2026-09-16 (Peter:
 * "paying people more means less money in the company"). Pay is an OUTFLOW, so
 * the cost is SUBTRACTED from the rate the company was running at:
 *
 *     rate = baseline − Σ(new − old) × dollars-per-level
 *
 * The two absences fall out of that without a special case, which is the sign
 * that the reading is right rather than patched: a HIRE has no old amount, so
 * its whole new pay is a cost and the rate drops by all of it; a DEPARTURE has
 * no new amount, so its delta is negative, the subtraction flips, and the rate
 * RISES by what they were paid.
 */
export const rateOf = (entities: readonly Amounts[]): number =>
  RATE_BASELINE - payChangeOf(entities);

/**
 * The as-of segment a mutation falls in: the last segment at or before it.
 *
 * GAP, and worth stating plainly rather than hiding: the sketch's two date
 * rows do not correspond. The flags sit at 2025-04 / 2025-07 / 2025-10 and the
 * split button offers 2025-01 / 2025-06 / 2026-01, so there is no bijection —
 * mutations 2 AND 3 both land in the 2025-06 segment, and the 2026-01 segment
 * contains no mutation at all. Clicking flag 3 therefore selects 2025-06, and
 * clicking 2025-06 selects flag 2: the round trip is LOSSY by construction.
 * Renumbering one row to match the other would make the wiring look tidy and
 * would be an invention; the sketch is what it is.
 */
export const segmentForMutation = (mutationId: string): string | undefined => {
  const mutation = find((m: Mutation) => m.id === mutationId, MUTATIONS);
  if (mutation === undefined) return undefined;
  const landed = findLast(
    (segment: { value: string; at: Date }) =>
      segment.at.getTime() <= timeOf(mutation.at),
    SEGMENTS,
  );
  return landed?.value;
};

/** The first mutation at or after a segment. `undefined` where none follows. */
export const mutationForSegment = (
  segmentValue: string,
): string | undefined => {
  const segment = find(
    (s: { value: string }) => s.value === segmentValue,
    SEGMENTS,
  );
  if (segment === undefined) return undefined;
  const next = find(
    (m: Mutation) => timeOf(m.at) >= segment.at.getTime(),
    MUTATIONS,
  );
  return next?.id;
};

/** The band a person is in. Their dial's box and their rails' keyspace. */
const bandOf = (bandId: BandId): Band =>
  find((band: Band) => band.id === bandId, BANDS) ?? BANDS[0];

/** The mutation a person moves at, or `undefined` for one pinned to nothing. */
const momentOf = (person: Person): Mutation | undefined =>
  find((mutation: Mutation) => mutation.id === person.stepAt, MUTATIONS);

/**
 * A level's id. EVERY id the board emits — on a level and on both ends of a
 * transfer — comes through this one function, and that is load-bearing: the
 * chart DROPS a transfer naming a level it does not have rather than drawing it
 * as an open-ended flow, so an id built two ways would make a ribbon vanish in
 * silence instead of failing loudly.
 */
const levelIdFor = (bandId: BandId, pay: number): string => `${bandId}-L${pay}`;

/**
 * A rail's caption. Deliberately SHORT and enumerated — `A · L2` — because the
 * chart paints it above the rail's left end the way an axis paints a tick, with
 * no ellipsize and no tooltip behind it. A consumer wanting a person's name
 * here would be asking the component to grow a text-truncation treatment it
 * does not have.
 */
const payLabel = (bandId: BandId, pay: number): string => `${bandId} · L${pay}`;

/** The people in one band, in fixture order. */
const peopleIn = (people: readonly Person[], bandId: BandId): Person[] =>
  filter((person: Person) => person.band === bandId, people);

/**
 * What a person was paid at a moment, or `null` when they are not there at all
 * — before a hire arrives, or after a departure leaves. `null` is absence, not
 * zero: somebody on no pay would still be a head on a rail.
 */
const payAt = (person: Person, time: number): number | null => {
  const moment = momentOf(person);
  if (moment === undefined) return person.value;
  return timeOf(moment.at) <= time ? person.value : person.old;
};

/** Every moment the board can change at: the domain's left edge and each flag. */
const MOMENTS: readonly number[] = sortBy(
  (time: number) => time,
  [
    DOMAIN_START.getTime(),
    ...map((mutation: Mutation) => timeOf(mutation.at), MUTATIONS),
  ],
);

/** The distinct pay figures a band's people touch, old and new alike, ascending. */
const paysIn = (people: readonly Person[], bandId: BandId): number[] => {
  const pays = new Set<number>();
  for (const person of peopleIn(people, bandId)) {
    if (person.old !== null) pays.add(person.old);
    if (person.value !== null) pays.add(person.value);
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
  bandId: BandId,
  pay: number,
): CountPoint[] => {
  const members = peopleIn(people, bandId);
  const points: CountPoint[] = [];
  let previous = 0;
  for (const time of MOMENTS) {
    const holders = filter(
      (person: Person) => payAt(person, time) === pay,
      members,
    );
    if (holders.length === previous) continue;
    points.push({ at: new Date(time), count: holders.length });
    previous = holders.length;
  }
  return points;
};

/** Every band's rails. One level per pay figure the band's people touch. */
export const levelsOf = (people: readonly Person[]): Level[] =>
  flatMap(
    (band: Band) =>
      map(
        (pay: number) => ({
          id: levelIdFor(band.id, pay),
          label: payLabel(band.id, pay),
          value: pay,
          points: countPointsFor(people, band.id, pay),
        }),
        paysIn(people, band.id),
      ),
    BANDS,
  );

/**
 * Every move, as a flow. Which ends are present is what the flow MEANS:
 * both = a raise or a cut, `from` only = a DEPARTURE out of the system,
 * `to` only = a HIRE into it.
 *
 * Two people making the identical move at the identical moment merge into ONE
 * ribbon of width two — the chart does no arithmetic on counts, so a caller
 * that wants them merged merges them, and this board does. Two DIFFERENT moves
 * at one moment (Peter's raise and Joe's departure at flag 1) stay two ribbons.
 */
export const transfersOf = (people: readonly Person[]): Transfer[] => {
  const merged = new Map<string, Transfer>();
  for (const person of people) {
    const moment = momentOf(person);
    if (moment === undefined) continue;
    const band = person.band;
    const from = person.old === null ? undefined : levelIdFor(band, person.old);
    const to =
      person.value === null ? undefined : levelIdFor(band, person.value);
    // Nobody moved: same pay before and after, or a record with neither end.
    if (from === to) continue;
    const at = new Date(timeOf(moment.at));
    const key = `${at.getTime()}|${from ?? "out"}|${to ?? "out"}`;
    const existing = merged.get(key);
    merged.set(key, { at, from, to, count: (existing?.count ?? 0) + 1 });
  }
  return sortBy(
    (transfer: Transfer) => timeOf(transfer.at),
    [...merged.values()],
  );
};

/**
 * A dial: an `Entity` whose `range` is CERTAIN.
 *
 * `Entity.range` is optional today and becomes required in phase 3. Narrowing
 * the return type here rather than saying `Entity[]` makes `entitiesOf` prove
 * at compile time that it sets one on every row — so the phase-3 tightening
 * cannot quietly break this board, and if someone ever adds a path through
 * this function that omits a range, it fails here instead of in a consumer.
 */
type Dial = Entity & { readonly range: NonNullable<Entity["range"]> };

/**
 * PHASE-3 GUARDS. `Entity.range` becomes required once every consumer has
 * moved, and these two aliases are this board's proof that it has. They are
 * types, so they cost nothing at runtime and fail the build if either claim
 * stops holding.
 *
 * They exist because simulating the tightening locally caught three call sites
 * that a reading of the code had missed: `Person` deliberately has no `range`,
 * so the moment the field is required a `Person` stops being assignable to an
 * `Entity`, and every function typed to take an `Entity` breaks on a field it
 * never touches. Narrowing those functions to `Amounts` was the fix; these
 * pin it.
 */
type _DialCarriesARange = Dial extends { range: NonNullable<Entity["range"]> }
  ? true
  : never;
type _RateReadsPeopleDirectly = readonly Person[] extends readonly Amounts[]
  ? true
  : never;

/** The dials, as `MutationSliders` wants them: a person plus their band's box. */
export const entitiesOf = (people: readonly Person[]): Dial[] =>
  map(
    (person: Person) => ({
      id: person.id,
      label: person.label,
      old: person.old,
      value: person.value,
      range: bandOf(person.band).range,
    }),
    people,
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

const BALANCES = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/** The chart's thirteen monthly cells. Cents, because the chart's y IS cents. */
export const balanceCells = (): CashflowCell[] =>
  map(
    (cell: { start: Date; end: Date }, index: number) => ({
      ...cell,
      cashflowCents: (MONTHLY_NET[index] ?? 0) * 100,
      balanceCents: (BALANCES[index] ?? 0) * 100,
    }),
    monthlyCells(DOMAIN_START, DOMAIN_END),
  );

/**
 * One faint alternative in the fan: the same line, pulled away from the
 * committed balance by a spread that widens with the months, because a
 * forecast is surer about next month than about next year.
 */
const SPREAD_PER_MONTH_SQUARED = 220;

export const fanAt = (index: number, sign: number): number =>
  sign * SPREAD_PER_MONTH_SQUARED * index * index;

const fanSeries = (id: string, sign: number) => ({
  id,
  class: "scenario-board-demo__fan",
  balanceCents: (cell: CashflowCell, index: number): number =>
    cell.balanceCents + fanAt(index, sign) * 100,
});

/** The consumer's money formatter — a real minus sign, as the gauge bench uses. */
const perMonth = (delta: number): string =>
  `${delta < 0 ? "−" : "+"}$${Math.abs(delta).toLocaleString("en-US")}/mo`;

/** Replace one person's new pay, leaving every other row untouched. */
const withValue = (
  people: readonly Person[],
  id: string,
  value: number | null,
): Person[] =>
  map(
    (person: Person) => (person.id === id ? { ...person, value } : person),
    people,
  );

/** The board, read as tables, with no browser in the room. */
const printTables = (people: readonly Person[]): void => {
  /* eslint-disable no-console */
  console.table(
    map(
      (person: Person) => ({
        person: person.label,
        band: person.band,
        old: person.old ?? "— (hire)",
        new: person.value ?? "— (departure)",
        delta: deltaOf(person),
        costs: deltaOf(person) * DOLLARS_PER_LEVEL,
        rateEffect: -deltaOf(person) * DOLLARS_PER_LEVEL,
      }),
      people,
    ),
  );
  console.table(
    map(
      (mutation: Mutation) => ({
        flag: mutation.label,
        at: new Date(timeOf(mutation.at)).toISOString().slice(0, 10),
        segment: segmentForMutation(mutation.id) ?? "—",
      }),
      MUTATIONS,
    ),
  );
  console.table(
    map(
      (segment: { value: string }) => ({
        segment: segment.value,
        flag: mutationForSegment(segment.value) ?? "—",
      }),
      SEGMENTS,
    ),
  );
  console.table(
    map(
      (level: Level) => ({
        level: level.id,
        label: level.label,
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
      levelsOf(people),
    ),
  );
  console.table(
    map(
      (transfer: Transfer) => ({
        at: new Date(timeOf(transfer.at)).toISOString().slice(0, 10),
        from: transfer.from ?? "— (hire)",
        to: transfer.to ?? "— (departure)",
        count: transfer.count,
      }),
      transfersOf(people),
    ),
  );
  console.log(
    "baseline",
    perMonth(RATE_BASELINE),
    "· pay change",
    perMonth(payChangeOf(people)),
    "· rate",
    perMonth(rateOf(people)),
  );
  /* eslint-enable no-console */
};

// ── The board ────────────────────────────────────────────────────────────────

const ScenarioBoardBench: Component = () => {
  const [people, setPeople] = createSignal<readonly Person[]>(PEOPLE);
  const [asOf, setAsOf] = createSignal("2025-06");
  const [selectedMutation, setSelectedMutation] = createSignal<
    string | undefined
  >(mutationForSegment("2025-06"));

  onMount(() => {
    if (DEBUG) printTables(people());
  });

  /** A flag click moves the as-of segment with it. */
  const selectMutation = (id: string): void => {
    setSelectedMutation(id);
    const segment = segmentForMutation(id);
    if (segment !== undefined) setAsOf(segment);
  };

  /** A segment click moves the lit flag with it — where a mapping exists. */
  const selectSegment = (value: string): void => {
    setAsOf(value);
    setSelectedMutation(mutationForSegment(value));
  };

  const setLevel = (id: string, value: number): void => {
    setPeople((current) => withValue(current, id, value));
  };

  const removeEntity = (id: string): void => {
    setPeople((current) => withValue(current, id, null));
  };

  /**
   * A HIRE. `old: null` — not the domain floor, which is what this bench used
   * to invent before `Entity.old` could be absent. They enter band C at the
   * last flag, which is where the board can show a from-less ribbon arriving.
   */
  const addEntity = (): void => {
    setPeople((current) => [
      ...current,
      {
        id: `hire-${current.length}`,
        label: `Hire ${current.length - PEOPLE.length + 1}`,
        band: "C",
        stepAt: "autumn",
        old: null,
        value: 9,
      },
    ]);
  };

  const reset = (): void => {
    setPeople(PEOPLE);
  };

  /** The dials, derived once: a person plus their band's box. */
  const dials = () => entitiesOf(people());
  const rate = () => rateOf(dials());

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
        <MinorFillColumn>
          <HalfFillColumn>
            <FillCardSurface>
              <TextTitle>Running balance</TextTitle>
              <GrowFillBox>
                <CashflowScrubChart
                  cells={balanceCells()}
                  scrub={false}
                  chartHeight="fill"
                  showGridlines
                  lineLabel="Committed"
                  balanceSeries={[
                    fanSeries("optimistic", 1),
                    fanSeries("pessimistic", -1),
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
                  levels={levelsOf(people())}
                  transfers={transfersOf(people())}
                  mutations={MUTATIONS}
                  domain={TIME_DOMAIN}
                  selectedMutationId={selectedMutation()}
                  onSelectMutation={selectMutation}
                />
              </GrowFillBox>
            </FillCardSurface>
          </HalfFillColumn>
        </MinorFillColumn>

        <CardSurface>
          <TightStack>
            <TextTitle>As of</TextTitle>
            <SegmentedControl
              options={[...SEGMENT_OPTIONS]}
              value={asOf()}
              onValueChange={selectSegment}
              aria-label="As-of point"
            />
          </TightStack>
        </CardSurface>

        <MajorFillColumn>
          <LooseWrapRow>
            <WidePaneBox>
              <CardSurface>
                <TightStack>
                  <SpreadRow>
                    <TextTitle>Mutations</TextTitle>
                    <GhostButton onClick={reset}>Reset</GhostButton>
                  </SpreadRow>
                  <MutationSliders
                    entities={dials()}
                    domain={LEVEL_DOMAIN}
                    onChange={setLevel}
                    onRemove={removeEntity}
                    onAdd={addEntity}
                    format={(value) => `L${value}`}
                  />
                </TightStack>
              </CardSurface>
            </WidePaneBox>

            {/* The narrow column. ConstrainedBox caps the CARD at 400px rather
              than only the dial inside it: a NoShrinkColumn took its width
              from the caption's max-content and swallowed the row, which is
              the opposite of the sketch's wide-left / narrow-right split. */}
            <ActionSlot>
              <CardSurface>
                <TightStack>
                  <TextTitle>Rate, right now</TextTitle>
                  <RateGauge
                    domain={RATE_DOMAIN}
                    baseline={RATE_BASELINE}
                    value={rate()}
                    label="Scenario"
                    format={perMonth}
                  />
                </TightStack>
              </CardSurface>
            </ActionSlot>
          </LooseWrapRow>
        </MajorFillColumn>
      </ViewportColumn>
    </div>
  );
};

export default ScenarioBoardBench;
