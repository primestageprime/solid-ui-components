/**
 * Hourly Board — the model, as plain functions. No Solid, no DOM, no CSS.
 *
 * A business that sells HOURS. Every region of the bench is a different reading
 * of the same three facts — which services are sold, how many hours a week each
 * one takes, and what each one bills an hour — so the derivations live here,
 * once, where they can be asserted from a terminal (headless observation first).
 * The `.tsx` beside this file holds the ARRANGEMENT and the WIRING and nothing
 * else.
 *
 * The wiring, stated once:
 *
 *   services ──workMixSeries──▶ StackedAreaSeries  (one band per service, hrs/wk)
 *   services ──revenueAt──────▶ rateAt ──▶ the balance line's forward slope
 *   services ──revenueAt──────▶ averageRate ──▶ RateGauge.value  (the WHOLE year)
 *   services ──pairsForMutation▶ PairedMutationSliders.entities  (two dials each)
 *   segment click ────────────▶ which mutation the dials edit
 *
 * ── THE CALIBRATION ────────────────────────────────────────────────────────
 *
 * Revenue is an INFLOW, so the arithmetic and the words run the same way — up is
 * better, which is the exact opposite of the Scenario Board's payroll gauge:
 *
 *     rate = Σ (hours/wk × $/hr × 52) − fixed costs
 *
 * Peter's two readings, solved rather than picked. With the fixture below
 * (Service A 20 h/wk @ $150, Service B 15 h/wk @ $120), FIXED_MONTHLY_COST =
 * 15,000 and COMFORTABLE = 60,000:
 *
 *     scenario                     revenue      rate      band    why
 *     --------------------------   ---------   --------   ------  ----------------
 *     as it opens                   249,600      69,600   green   ≥ COMFORTABLE
 *     A's hours +10 (20→30 h/wk)    327,600     147,600   green   raising reads better
 *     A's rate to its floor         197,600      17,600   yellow  above water, not clear
 *     BOTH rates to their floors    166,400     −13,600   red     under breakeven
 *
 * The constants are the solution to four inequalities, which is why they are
 * derived here and not chosen (REV0 = 249,600, REVfloor = 166,400, REVafloor =
 * 197,600, all fixed by the fixture's own ranges):
 *
 *     REV0      − FIXED ≥ COMFORTABLE    the board opens green
 *     REVafloor − FIXED > 0              cutting ONE rate is not yet a loss
 *     REVafloor − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     REVfloor  − FIXED < 0              cutting BOTH crosses zero
 *
 * Raising a service's hours needs no inequality of its own: revenue only rises,
 * so a board that opens green stays green — which is the reading Peter asked for
 * and the sign that the gauge is wired up the right way round.
 *
 * Solving them leaves FIXED ∈ (166,400, 189,600) and, at FIXED = 180,000,
 * COMFORTABLE ∈ (17,600, 69,600]. 180,000 and 60,000 sit inside both with room
 * either side, so nothing here balances on a knife edge. `rateBandTable()`
 * prints exactly the table above and the test asserts it.
 *
 * ── WHEN, NOT ONLY HOW MUCH ────────────────────────────────────────────────
 *
 * Every row of that table is a change made at the START of the year, where the
 * weight is 1. The gauge reads the COMPOSITE — the rate time-averaged over the
 * whole span the board draws — so a change is worth its own rate times the share
 * of the year it is in force for, and the table is the w = 1 case rather than
 * the only case.
 *
 * That the table describes the OPENING MOVE at all is a fact about
 * `nextFreeSlot`: the domain starts on a quarter boundary, so the first free
 * quarter IS the domain start, so the first interaction a reader makes lands at
 * weight 1 and the dial agrees with the table. The test pins that.
 *
 * The binding consequence is `weightToReach`: cutting both rates to their
 * floors reaches RED only from the first 16.4% of the year. The same cut made in
 * April is in force for three quarters, pulls the average down by three quarters
 * of its own depth, and leaves the gauge YELLOW. That is not a miscalibration —
 * it is the composite reading doing its job.
 */
import {
  filter,
  find,
  findIndex,
  map,
  pipe,
  some,
  sortBy,
  sum,
} from "../../../src/fn";
import { timeOf } from "../../../src";
import type {
  Mutation,
  StackedAreaSeriesData,
  TimeDomain,
  TimeValue,
} from "../../../src";
import type {
  MeasureIndex,
  PairedMutationEntity,
} from "../../../src/components/PairedMutationSliders";
// The mutation calendar is REUSED, not re-derived. Every one of these is a pure
// function of `Mutation[]` alone — it holds no person and no salary — so the
// hourly board gets the same snapping, the same numbering and the same quarter
// chips as the Scenario Board rather than a second set that can drift from it.
// Anything that touches an ENTITY is written below against services.
import {
  addMutation,
  ensureMutation,
  nextFreeSlot,
  orderedMutations,
  type SegmentLabel,
  segmentLabelsOf,
} from "./scenario-board-people";

export {
  addMutation,
  ensureMutation,
  nextFreeSlot,
  orderedMutations,
  segmentLabelsOf,
};
export type { SegmentLabel };

// ── The span ─────────────────────────────────────────────────────────────────

/** The year the chart, the work mix and the gauge are all drawn against. */
export const DOMAIN_START = new Date("2025-01-01");
export const DOMAIN_END = new Date("2026-01-01");
export const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

/** Weeks in a year. Hours are quoted per WEEK and money per YEAR; one bridge. */
export const WEEKS_PER_YEAR = 52;

/** Months in a year. The balance chart steps a month at a time. */
export const MONTHS_PER_YEAR = 12;

/** A year's rate as a month's worth of it. */
export const monthlyFrom = (ratePerYear: number): number =>
  ratePerYear / MONTHS_PER_YEAR;

// ── The services ─────────────────────────────────────────────────────────────

/** What one service is worth at one moment: the pair the dials edit. */
export interface Offer {
  /** Hours a week. */
  readonly hours: number;
  /** Dollars an hour. */
  readonly rate: number;
}

/**
 * A service the business sells.
 *
 * `hoursRange` / `rateRange` are the per-service ALLOWANCE — the shaded box on
 * each dial and the clamp. They are NOT the axis domain: the axes run 0–80 h/wk
 * and $0–300/hr for the whole row, which is what makes two services comparable,
 * and each service's own range says what THIS service is allowed inside that.
 *
 * `changes` is keyed by mutation id, and an ABSENT key means this service did
 * not move at that mutation — not that it was sold for nothing. That absence is
 * the whole reason the history is a map: adding a mutation needs no change to
 * anybody's history. A `null` VALUE is the service being DROPPED at that
 * mutation, which is what "removal = both measures null" looks like in storage.
 */
export interface Service {
  readonly id: string;
  readonly label: string;
  /** The offer before the FIRST mutation. `null` = not sold yet. */
  readonly committed: Offer | null;
  readonly hoursRange: readonly [number, number];
  readonly rateRange: readonly [number, number];
  readonly changes: Readonly<Record<string, Offer | null>>;
}

/** The two dials, in reading order. `axes` is positioned against this. */
export const HOURS: MeasureIndex = 0;
export const RATE: MeasureIndex = 1;

/** The shared tracks. Peter's numbers; the whole row is drawn on them. */
export const HOURS_DOMAIN: readonly [number, number] = [0, 80];
export const RATE_DOMAIN_PER_HOUR: readonly [number, number] = [0, 300];

/**
 * The opening scenario: two services, nothing proposed against either.
 *
 * ZERO MUTATIONS on load, the same opening the Scenario Board holds: with no
 * mutation there is no prior and no future, so both dials read the committed
 * figure, the gauge reads the baseline exactly, the projection is one straight
 * line and the as-of control has nothing to offer and says so. Every one of
 * those is DERIVED from the empty array rather than switched on a flag.
 */
export const SERVICES: readonly Service[] = [
  {
    id: "service-a",
    label: "Service A",
    committed: { hours: 20, rate: 150 },
    hoursRange: [0, 30],
    rateRange: [100, 200],
    changes: {},
  },
  {
    id: "service-b",
    label: "Service B",
    committed: { hours: 15, rate: 120 },
    hoursRange: [0, 25],
    rateRange: [80, 160],
    changes: {},
  },
];

/** The board opens with nothing proposed. */
export const SEED_MUTATIONS: readonly Mutation[] = [];

// ── Walking the history ──────────────────────────────────────────────────────

/**
 * The offer a service carried JUST BEFORE a mutation: its last change at any
 * earlier mutation, or its committed offer if it made none.
 *
 * Walks in time order rather than reading one key, for the same reason the
 * payroll board does: a service raised at mutation 1 and untouched at mutation 2
 * has a prior of its mutation-1 offer while the reader is editing mutation 2.
 */
export const offerBefore = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null => {
  let carried = service.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (mutation.id === mutationId) return carried;
    const own = service.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/** The offer from a mutation onward: its change at it, or whatever it was on. */
export const offerFrom = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null => {
  const own = service.changes[mutationId];
  if (own !== undefined) return own;
  return offerBefore(service, mutationId, mutations);
};

/**
 * The offer in force at a MOMENT, or `null` when the service is not sold then.
 * `null` is absence, not zero: a service sold for nothing would still be work.
 */
export const offerAt = (
  service: Service,
  time: number,
  mutations: readonly Mutation[],
): Offer | null => {
  let carried = service.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = service.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/**
 * Is this service on the books at the mutation being edited?
 *
 * ONE condition covers four cases, which is why it is worth naming. Given its
 * offer just BEFORE the mutation and its offer FROM it:
 *
 *   before   from    what it is                        shown?
 *   ------   -----   -------------------------------   ------
 *   offer    offer   a change (or no change)           yes
 *   offer    null    DROPPED at this mutation          yes — struck through
 *   null     offer   ADDED at this mutation            yes
 *   null     null    dropped EARLIER, or not added
 *                    until a later mutation            no
 *
 * The last row is Peter's "terminated services hidden at later dates", and it
 * gives "not added yet" for free: a service that starts at a later mutation is
 * equally absent from this one.
 */
export const isSoldAt = (before: Offer | null, from: Offer | null): boolean =>
  before !== null || from !== null;

// ── Editing ──────────────────────────────────────────────────────────────────

/** One measure of an offer, replaced; the other carried forward untouched. */
export const withMeasure = (
  offer: Offer,
  measure: MeasureIndex,
  value: number,
): Offer =>
  measure === HOURS ? { ...offer, hours: value } : { ...offer, rate: value };

/**
 * Set ONE measure of ONE service at ONE mutation.
 *
 * `PairedMutationSliders` emits `(id, measureIndex, value)` — one measure at a
 * time — but a change in the history is a whole OFFER, because the stack and the
 * revenue both need both numbers at every moment. So the measure that did not
 * move is carried forward from `offerBefore`, which is the honest answer: it did
 * not change, and writing it down says exactly that.
 *
 * A service with no prior offer at all cannot be edited into existence here; it
 * is added through the modal, which is where the pair is supplied together.
 */
export const withChange = (
  services: readonly Service[],
  id: string,
  mutationId: string,
  measure: MeasureIndex,
  value: number,
  mutations: readonly Mutation[],
): Service[] =>
  map((service: Service) => {
    if (service.id !== id) return service;
    const base =
      offerFrom(service, mutationId, mutations) ??
      offerBefore(service, mutationId, mutations);
    if (base === null) return service;
    return {
      ...service,
      changes: {
        ...service.changes,
        [mutationId]: withMeasure(base, measure, value),
      },
    };
  }, services);

/** ⊗ Drop: this service is off the books from the selected mutation onward. */
export const withDrop = (
  services: readonly Service[],
  id: string,
  mutationId: string,
): Service[] =>
  map(
    (service: Service) =>
      service.id === id
        ? { ...service, changes: { ...service.changes, [mutationId]: null } }
        : service,
    services,
  );

/**
 * ↺ Reinstate: DELETE the change rather than invent an offer. The service
 * carries whatever the previous mutation left it on, which for one added here is
 * the offer it was added at, exactly.
 */
export const withoutChange = (
  services: readonly Service[],
  id: string,
  mutationId: string,
): Service[] =>
  map((service: Service) => {
    if (service.id !== id) return service;
    const { [mutationId]: _dropped, ...rest } = service.changes;
    return { ...service, changes: rest };
  }, services);

// ── Adding a service ─────────────────────────────────────────────────────────

/** What the Add form holds while it is being filled in. */
export interface ServiceDraft {
  readonly name: string;
  readonly hours: number | undefined;
  readonly rate: number | undefined;
}

/** The form opens empty of a name and on Peter's own starting figures. */
export const EMPTY_DRAFT: ServiceDraft = {
  name: "",
  hours: 10,
  rate: 120,
};

export const draftName = (draft: ServiceDraft): string => draft.name.trim();

/**
 * Can this draft be added? A name, and two figures the shared tracks admit.
 *
 * The RANGE a new service gets is the whole axis (below), so "inside the track"
 * is the only bound there is to check — a narrower rule here would refuse a
 * figure the dial would then happily accept.
 */
export const canAdd = (draft: ServiceDraft): boolean => {
  const { hours, rate } = draft;
  if (draftName(draft) === "") return false;
  if (hours === undefined || rate === undefined) return false;
  return (
    hours >= HOURS_DOMAIN[0] &&
    hours <= HOURS_DOMAIN[1] &&
    rate >= RATE_DOMAIN_PER_HOUR[0] &&
    rate <= RATE_DOMAIN_PER_HOUR[1]
  );
};

/**
 * A stable id from the NAME rather than a counter or a clock, so the same add
 * made twice in a test gives the same id and this function stays pure.
 */
export const uniqueId = (stem: string, taken: readonly string[]): string => {
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug === "" ? "service" : slug;
  let candidate = base;
  let suffix = 2;
  while (taken.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

/**
 * ADD a service at one mutation.
 *
 * Three decisions, all the consumer's:
 *
 *   • `committed: null` — it was not sold before, so there is no prior and the
 *     dials draw no prior arrow. That is what makes it an ADDITION rather than a
 *     service that happens to start small.
 *   • ONE change, at `at` — so `offerBefore` reads `null`, `offerFrom` reads its
 *     opening offer, and at every EARLIER mutation both read `null` and
 *     `isSoldAt` hides it. Its existence starts exactly where the reader put it.
 *   • The RANGE is the whole axis. The fixture's two services carry ranges
 *     somebody negotiated; a service invented in a modal has negotiated nothing,
 *     and inventing a band for it would be the board making up a constraint.
 */
export const addService = (
  services: readonly Service[],
  draft: ServiceDraft,
  at: string,
): { services: Service[]; id: string } => {
  if (!canAdd(draft)) throw new Error("Draft is not addable");
  const name = draftName(draft);
  const id = uniqueId(
    name,
    map((service: Service) => service.id, services),
  );
  const added: Service = {
    id,
    label: name,
    committed: null,
    hoursRange: HOURS_DOMAIN,
    rateRange: RATE_DOMAIN_PER_HOUR,
    changes: {
      [at]: { hours: draft.hours ?? 0, rate: draft.rate ?? 0 },
    },
  };
  return { services: [...services, added], id };
};

// ── Removing a change ────────────────────────────────────────────────────────

/** The mutation a service was ADDED at, or `undefined` if it was always sold. */
export const addedAt = (
  service: Service,
  mutations: readonly Mutation[],
): string | undefined => {
  if (service.committed !== null) return undefined;
  return find(
    (mutation: Mutation) => service.changes[mutation.id] !== undefined,
    orderedMutations(mutations),
  )?.id;
};

/** The mutation the selection should move to once `id` is gone. */
export const nearestMutation = (
  mutations: readonly Mutation[],
  id: string,
): string | null => {
  const ordered = orderedMutations(mutations);
  const index = findIndex((mutation: Mutation) => mutation.id === id, ordered);
  if (index === -1) return ordered[0]?.id ?? null;
  const survivor = ordered[index + 1] ?? ordered[index - 1];
  return survivor?.id ?? null;
};

/**
 * DELETE the selected change and everything that only existed because of it —
 * the flag, the chip, every service's entry at it, and anything added there.
 * The inverse, mark for mark, of what the board can do.
 */
export const removeMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly services: readonly Service[];
  },
  id: string,
): { mutations: Mutation[]; services: Service[]; selected: string | null } => {
  const selected = nearestMutation(scenario.mutations, id);
  const survivors = filter(
    (service: Service) => addedAt(service, scenario.mutations) !== id,
    scenario.services,
  );
  return {
    mutations: filter(
      (mutation: Mutation) => mutation.id !== id,
      scenario.mutations,
    ),
    services: map((service: Service) => {
      const { [id]: _dropped, ...rest } = service.changes;
      return { ...service, changes: rest };
    }, survivors),
    selected,
  };
};

// ── The dials ────────────────────────────────────────────────────────────────

/** The two measures of one service across one mutation, in reading order. */
export const pairOf = (
  service: Service,
  before: Offer | null,
  from: Offer | null,
): PairedMutationEntity => ({
  id: service.id,
  label: service.label,
  measures: [
    {
      prior: before === null ? null : before.hours,
      value: from === null ? null : from.hours,
      range: service.hoursRange,
    },
    {
      prior: before === null ? null : before.rate,
      value: from === null ? null : from.rate,
      range: service.rateRange,
    },
  ],
});

/**
 * The pairs for ONE mutation: each service's offer just before it against its
 * offer from it onward. This is what the as-of control selects.
 */
export const pairsForMutation = (
  services: readonly Service[],
  mutationId: string,
  mutations: readonly Mutation[],
): PairedMutationEntity[] =>
  pipe(
    services,
    map(
      (service: Service): AcrossMutation => ({
        service,
        before: offerBefore(service, mutationId, mutations),
        from: offerFrom(service, mutationId, mutations),
      }),
    ),
    filter((row: AcrossMutation) => isSoldAt(row.before, row.from)),
    map((row: AcrossMutation) => pairOf(row.service, row.before, row.from)),
  );

/** One service read across one mutation: what it was, and what it becomes. */
interface AcrossMutation {
  readonly service: Service;
  readonly before: Offer | null;
  readonly from: Offer | null;
}

/**
 * The pairs when there is NO mutation yet: every service on the offer it already
 * carries, prior and value the same figures.
 *
 * A separate function rather than a nullable id threaded through the walkers,
 * because the question is different. With a mutation the dials show a CHANGE;
 * with none there is no change to show, and saying so with `prior === value` is
 * what makes every reading downstream fall out with no special case — the delta
 * is zero, no change line is drawn, and the gauge reads exactly the baseline.
 */
export const pairsWithoutMutation = (
  services: readonly Service[],
): PairedMutationEntity[] =>
  pipe(
    services,
    filter((service: Service) => service.committed !== null),
    map((service: Service) =>
      pairOf(service, service.committed, service.committed),
    ),
  );

/** Annual revenue from one pair of dials, as the summary line reads it. */
export const annualOfPair = (entity: PairedMutationEntity): number => {
  const hours = entity.measures[HOURS].value;
  const rate = entity.measures[RATE].value;
  if (hours === null || rate === null) return 0;
  return hours * rate * WEEKS_PER_YEAR;
};

// ── The money ────────────────────────────────────────────────────────────────

/** What one offer bills in a year. */
export const annualOf = (offer: Offer | null): number =>
  offer === null ? 0 : offer.hours * offer.rate * WEEKS_PER_YEAR;

/** What every service sold at a moment bills in a year, added up. */
export const revenueAt = (
  services: readonly Service[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (service: Service) => annualOf(offerAt(service, time, mutations)),
      services,
    ),
  );

/**
 * What the business pays out in a month regardless of what it sells — the
 * premises, the tools, the people who are not billable.
 *
 * It lives in the FIXTURE rather than in a component because it is the whole
 * reason breakeven is a number at all: without it every scenario is profitable
 * and the gauge's red half is unreachable.
 */
export const FIXED_MONTHLY_COST = 15_000;

/** The same, per year — the unit every other figure on this board is in. */
export const FIXED_ANNUAL_COST = FIXED_MONTHLY_COST * MONTHS_PER_YEAR;

/** The business's rate, given what it bills in a year. */
export const rateFromRevenue = (revenue: number): number =>
  revenue - FIXED_ANNUAL_COST;

/** The COMMITTED rate — what the fixture bills before anything is proposed. */
export const COMMITTED_RATE = rateFromRevenue(
  revenueAt(SERVICES, DOMAIN_START.getTime(), []),
);

/**
 * The comfortable gain. At or above it the gauge lights green, below it yellow;
 * below zero is red, and that split is the gauge's own.
 */
export const COMFORTABLE = 60_000;

/**
 * The gauge's domain, in $/yr.
 *
 * Wide enough to hold every reading the DIALS can reach, which is the binding
 * constraint rather than the calibration table: `RateGauge` clamps `value` to
 * its domain and announces the DRAWN figure, so a reachable reading outside the
 * domain would make the dial and the DEBUG table disagree in front of the
 * reader. The floor is every service dropped (no revenue, all of the fixed cost)
 * and the ceiling is every service at the top of its own range.
 */
export const RATE_DOMAIN: readonly [number, number] = [-180_000, 360_000];

/** The highest rate the fixture's ranges can reach — the domain's ceiling test. */
export const maxReachableRate = (services: readonly Service[]): number =>
  rateFromRevenue(
    sum(
      map(
        (service: Service) =>
          service.hoursRange[1] * service.rateRange[1] * WEEKS_PER_YEAR,
        services,
      ),
    ),
  );

/** The lowest — every service dropped, so the fixed cost stands alone. */
export const minReachableRate = (): number => rateFromRevenue(0);

// ── The composite reading ────────────────────────────────────────────────────
//
// Time is weighted in MONTHS rather than milliseconds, and that is a decision
// rather than a convenience: a calendar month is not 1/12 of a year, so a change
// made on 1 July weighs 0.4959 of a year in milliseconds and exactly half of it
// in months. Every mutation is snapped to a month boundary and every figure is
// quoted per year, so months are the unit the reader is counting in.
//
// COPIED from `scenario-board-rate.ts` rather than imported, deliberately: that
// module's `averageRateOver` returns a PAYROLL rate through `rateFromPayChange`,
// and importing fifteen lines of date arithmetic would drag the people model and
// three payroll constants into this test's module graph for no other reason.
// `abbreviateDollars` IS imported (see `hourly-board-money`) because a second
// rounding policy would be visible to a reader; a second month-position function
// that agrees by construction is not.

/** A moment as a position on the MONTH line, carrying the fraction elapsed. */
const monthPosition = (time: number): number => {
  const at = new Date(time);
  const daysInMonth = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const elapsed = (at.getUTCDate() - 1 + at.getUTCHours() / 24) / daysInMonth;
  return at.getUTCFullYear() * 12 + at.getUTCMonth() + elapsed;
};

/** Months from one moment to another. Exact — and integral — on boundaries. */
export const monthsBetween = (from: number, to: number): number =>
  monthPosition(to) - monthPosition(from);

/**
 * The rate over a whole span, weighted by time.
 *
 * Takes a FUNCTION and the moments rather than the services and the mutations,
 * because neither model is anything this arithmetic needs: given "what does it
 * bill at time t" and "when can it change", the average is decided.
 *
 * Moments outside the span are IGNORED rather than clamped: one before it is
 * already in the revenue at the span's start, and one after it never happens
 * inside the period being read.
 */
export const averageRateOver = (
  start: number,
  end: number,
  moments: readonly number[],
  revenue: (time: number) => number,
): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return rateFromRevenue(revenue(start));
  const inside = filter(
    (moment: number) => moment > start && moment < end,
    moments,
  );
  const edges = [start, ...sortBy((moment: number) => moment, inside), end];
  let weighted = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const from = edges[index] ?? start;
    const to = edges[index + 1] ?? end;
    weighted += monthsBetween(from, to) * revenue(from);
  }
  return rateFromRevenue(weighted / span);
};

/** The share of the span a change made at `at` is in force for. */
export const weightFrom = (start: number, end: number, at: number): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return 0;
  return Math.min(Math.max(monthsBetween(at, end) / span, 0), 1);
};

/**
 * THE GAUGE'S READING: the scenario's rate averaged over the whole year.
 *
 * Not the selected change's own rate, which would say a service dropped in
 * December costs the year what the same service dropped in January does.
 */
export const averageRate = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  services: readonly Service[],
): number =>
  averageRateOver(
    timeOf(domain[0]),
    timeOf(domain[1]),
    map((mutation: Mutation) => timeOf(mutation.at), mutations),
    (time: number) => revenueAt(services, time, mutations),
  );

/**
 * The INSTANTANEOUS rate from a moment onward — what the business runs at once
 * every change up to then is in force. A different question from `averageRate`
 * and both are wanted: the gauge reads the year, the balance line projects
 * FORWARD from the moment being edited, which is a slope rather than an average.
 */
export const rateAt = (
  time: number,
  mutations: readonly Mutation[],
  services: readonly Service[],
): number => rateFromRevenue(revenueAt(services, time, mutations));

/**
 * The share of the year a change must still have ahead of it to pull the average
 * from the opening rate down past a THRESHOLD:
 *
 *     COMMITTED + w × (changed − COMMITTED) < threshold
 *
 * With the floor-cut scenario (changed = −13,600, COMMITTED = 69,600) and a
 * threshold of zero that is 0.836 — so cutting both rates to their floors reaches
 * RED only from the first 16.4% of the year, and the same cut made in April
 * leaves the gauge yellow.
 */
export const weightToReach = (changed: number, threshold: number): number =>
  (COMMITTED_RATE - threshold) / (COMMITTED_RATE - changed);

// ── The calibration table ────────────────────────────────────────────────────

export type RateBand = "red" | "yellow" | "green";

/** The band a rate reads as. Mirrors the gauge's own split, so the headless
 *  table and the drawn dial cannot disagree. */
export const bandOfRate = (rate: number): RateBand => {
  if (rate < 0) return "red";
  if (rate < COMFORTABLE) return "yellow";
  return "green";
};

export interface RateRow {
  readonly scenario: string;
  readonly revenue: number;
  readonly rate: number;
  readonly band: RateBand;
}

/** The revenue of a whole set of offers, one per service, in fixture order. */
const revenueOfOffers = (offers: readonly (Offer | null)[]): number =>
  sum(map((offer: Offer | null) => annualOf(offer), offers));

/** Each service's committed offer, or its floor on one or both measures. */
const committedOffers = (services: readonly Service[]): (Offer | null)[] =>
  map((service: Service) => service.committed, services);

/**
 * The calibration, as data — AT THE START OF THE YEAR, where the weight is 1 and
 * the average equals the instantaneous rate. That is the one moment at which the
 * table is a statement about the CONSTANTS rather than about a date, which is
 * why it is the moment the table fixes. What a LATER change does is
 * `weightToReach`'s business, and it has a test of its own.
 */
export const rateBandTable = (
  services: readonly Service[] = SERVICES,
): RateRow[] => {
  const committed = committedOffers(services);
  const raisedHours = map(
    (offer: Offer | null, index: number) =>
      offer === null || index !== 0
        ? offer
        : { ...offer, hours: offer.hours + 10 },
    committed,
  );
  const firstAtFloor = map(
    (offer: Offer | null, index: number) =>
      offer === null || index !== 0
        ? offer
        : { ...offer, rate: services[index]?.rateRange[0] ?? offer.rate },
    committed,
  );
  const allAtFloor = map(
    (offer: Offer | null, index: number) =>
      offer === null
        ? offer
        : { ...offer, rate: services[index]?.rateRange[0] ?? offer.rate },
    committed,
  );
  const row = (
    scenario: string,
    offers: readonly (Offer | null)[],
  ): RateRow => {
    const revenue = revenueOfOffers(offers);
    const rate = rateFromRevenue(revenue);
    return { scenario, revenue, rate, band: bandOfRate(rate) };
  };
  return [
    row("as it opens", committed),
    row("first service's hours +10", raisedHours),
    row("first service's rate at its floor", firstAtFloor),
    row("every rate at its floor", allAtFloor),
  ];
};

// ── The Work Mix chart ───────────────────────────────────────────────────────

/**
 * The cap the Work Mix y-axis is FIXED to, in hours a week.
 *
 * Peter: "You can set the absolute cap in settings, but it defaults to 80." A
 * fixed domain is the whole point — the bands' heights are then comparable
 * across every edit, and a stack that re-scaled itself would make a service
 * dropped look like a service unchanged.
 */
export const DEFAULT_WORK_CAP = 80;

/**
 * The full-time line, in hours a week. Peter: the chart "affords overtime, but
 * lets you know when you're working more than full time", so this is a rule
 * drawn ACROSS the stack rather than a bound on it.
 */
export const FULL_TIME_HOURS = 40;

/** The cap can never sit below the rule it has to contain. */
export const MIN_WORK_CAP = FULL_TIME_HOURS;

/** Every moment the mix can change at: the span's left edge and each flag. */
export const momentsOf = (mutations: readonly Mutation[]): number[] =>
  sortBy(
    (time: number) => time,
    [
      DOMAIN_START.getTime(),
      ...map((mutation: Mutation) => timeOf(mutation.at), mutations),
    ],
  );

/**
 * The hours-a-week points for one service. Changes only, opening at the edge.
 *
 * Only changes are emitted. A point repeating the current figure would spend a
 * Sankey transition on nothing; dropping to ZERO is a change and IS emitted,
 * because that is what collapses the band onto the edge below it.
 *
 * Every series opens at the span's left edge, including one at zero: a band that
 * started later would leave the bands above it with no floor to sit on until it
 * appeared, and the mark documents a series as contributing nothing before its
 * first point.
 */
export const hourPointsFor = (
  service: Service,
  mutations: readonly Mutation[],
): { at: Date; value: number }[] => {
  const points: { at: Date; value: number }[] = [];
  let previous: number | null = null;
  for (const time of momentsOf(mutations)) {
    const value = offerAt(service, time, mutations)?.hours ?? 0;
    if (previous !== null && value === previous) continue;
    points.push({ at: new Date(time), value });
    previous = value;
  }
  return points;
};

/**
 * One band per service, BOTTOM FIRST — array order is stacking order and
 * palette order, so the fixture's order is the reading order of the chart.
 */
export const workMixSeries = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): StackedAreaSeriesData[] =>
  map(
    (service: Service) => ({
      id: service.id,
      label: service.label,
      points: hourPointsFor(service, mutations),
    }),
    services,
  );

/** Total hours a week at a moment — the top edge of the stack. */
export const totalHoursAt = (
  services: readonly Service[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (service: Service) => offerAt(service, time, mutations)?.hours ?? 0,
      services,
    ),
  );

/** The quarter starts inside the span — the x-axis's four tick values. */
export const quarterTicks = (
  start: Date = DOMAIN_START,
  end: Date = DOMAIN_END,
): number[] => {
  const ticks: number[] = [];
  let year = start.getUTCFullYear();
  let month = Math.floor(start.getUTCMonth() / 3) * 3;
  for (;;) {
    const at = Date.UTC(year, month, 1);
    if (at >= end.getTime()) break;
    if (at >= start.getTime()) ticks.push(at);
    month += 3;
    if (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  return ticks;
};

/** `2025-Q1`. The same vocabulary the as-of chips read in. */
export const quarterLabelOf = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `${when.getUTCFullYear()}-Q${Math.floor(when.getUTCMonth() / 3) + 1}`;
};

// ── The Cash Flow chart ──────────────────────────────────────────────────────

/** The opening bank balance, in dollars. */
export const OPENING_BALANCE = 42_000;

/**
 * Thirteen months of net monthly flow, hand-written rather than derived from the
 * dials: the top line is the business as ALREADY COMMITTED, and the dials below
 * it are the change being proposed against it.
 */
export const MONTHLY_NET: readonly number[] = [
  5200, 4800, 6100, 5400, 6900, 6300, 7800, 6600, 8100, 7200, 8600, 7900, 9300,
];

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

/** The fan's half-width at a month: ZERO at now, widening with the SQUARE of
 *  the months since — a forecast is surer about next month than next year. */
export const UNCERTAINTY_PER_MONTH_SQUARED = 200;

export const fanAt = (index: number, nowIndex: number): number => {
  const months = index - nowIndex;
  return months <= 0 ? 0 : UNCERTAINTY_PER_MONTH_SQUARED * months * months;
};

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward at the
 * scenario's live rate.
 *
 *     balance(m) = balance(now) + rate/12 × (m − now)
 *
 * This is the wire from the dials to the chart. A drag changes the rate, the
 * rate changes every month after now, and the line visibly pivots about the now
 * point. Before now nothing moves, because the past is not a forecast.
 */
export const projectedBalances = (
  committed: readonly number[],
  rate: number,
  nowIndex: number,
): number[] =>
  map((_balance: number, index: number) => {
    const pivot = committed[Math.min(nowIndex, committed.length - 1)] ?? 0;
    if (index <= nowIndex) return committed[index] ?? pivot;
    return pivot + monthlyFrom(rate) * (index - nowIndex);
  }, committed);

/**
 * The chart's PINNED y-domain ceiling, in dollars. Computed once from what the
 * fixture COULD reach, so dragging a dial moves the LINE and never the axis
 * under it — the worst case being the projection starting as early as possible
 * at the highest rate, plus the fan's upper edge at that month.
 */
export const pinnedCeiling = (
  balances: readonly number[],
  maxRate: number,
  fan: (monthsAfterNow: number) => number,
  tick = 50_000,
): number => {
  const monthly = monthlyFrom(maxRate);
  let highest = 0;
  for (const [index] of balances.entries()) {
    const projected = (balances[0] ?? 0) + monthly * index + fan(index);
    highest = Math.max(highest, projected, balances[index] ?? 0);
  }
  return Math.ceil(highest / tick) * tick;
};

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * The scenario, reduced to the thing Save would persist.
 *
 * A DIGEST rather than a deep comparison because "is this dirty?" is one
 * question asked on every render, and a stable string answers it with no
 * traversal at the call site. Keys are emitted in a fixed order, so two equal
 * scenarios can never digest differently.
 */
export const scenarioDigest = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): string =>
  JSON.stringify({
    mutations: map(
      (mutation: Mutation) => [mutation.id, timeOf(mutation.at)],
      orderedMutations(mutations),
    ),
    services: map(
      (service: Service) => [
        service.id,
        service.committed,
        map(
          (mutation: Mutation) => service.changes[mutation.id] ?? null,
          orderedMutations(mutations),
        ),
      ],
      services,
    ),
  });

/** Has anything moved since the last save? */
export const isDirty = (
  services: readonly Service[],
  mutations: readonly Mutation[],
  savedDigest: string,
): boolean => scenarioDigest(services, mutations) !== savedDigest;

/** Does any service carry a change at all? For the DEBUG table's summary line. */
export const hasAnyChange = (services: readonly Service[]): boolean =>
  some((service: Service) => Object.keys(service.changes).length > 0, services);
