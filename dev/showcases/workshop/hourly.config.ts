/**
 * THE HOURLY BOARD, AS A CONFIG.
 *
 * A business that sells HOURS. Everything this board does is now `board-kit`'s
 * arithmetic read through one `BoardConfig` — the unit ($/wk), the grain (the
 * ISO week), the side (revenue), two axes and a fixture. What is left in this
 * file is the DOMAIN: the words `service`, `offer`, `hours` and `rate`, the
 * pair of measures they name, and the four tables this board prints.
 *
 * It replaces `hourly-board-model.ts`, which was 1,770 lines, of which roughly
 * two thirds was arithmetic the Scenario Board had already written and a third
 * board (License) was about to write again.
 *
 * ── THE UNIT IS DOLLARS A WEEK ─────────────────────────────────────────────
 *
 * Peter, 2026-09-18: "Hourly people tend to think of it that way." Every money
 * figure is $/wk — the service summaries, both of the gauge's sentences, its
 * domain and baseline, the fixed cost and every DEBUG table. There is no ×52
 * anywhere in the arithmetic the reader is shown:
 *
 *     rate = Σ (hours/wk × $/hr) − fixed costs        [$/wk]
 *
 * The year has not gone away — it is the SPAN the gauge averages over and the
 * length the projection integrates across — but it is no longer a unit. It is
 * `config.unit = "wk"` now, and the kit reads the conversions off it.
 *
 * ── A SERVICE IS A SEGMENT OR A RAY, AND ITS YEAR IS CHANGE EVENTS ─────────
 *
 * Peter, 2026-09-18: "Each service is either a segment or a ray. All services
 * have a start date. And segments have an end date as well." And, of the
 * season: "I'll compose the seasonality from those changes."
 *
 * So there is NO seasonal formula. A change is an ABSOLUTE offer that holds
 * until the next one — editing the January level leaves June's 30 hours where
 * they are, because June's event says 30. That is `BoardEntity`'s rule now,
 * shared with every board, and it is why the kit ships no `baseline` strategy.
 *
 * ── THE CALIBRATION, IN $/WK ───────────────────────────────────────────────
 *
 * Revenue is an INFLOW, so the arithmetic and the words run the same way — up
 * is better, the exact opposite of the Scenario Board's payroll gauge, and the
 * only thing `side: "revenue"` decides.
 *
 * Every row is the reading THE GAUGE GIVES — the rate time-averaged over the
 * whole span, in weeks — for the scenario the board opens on, with the row's
 * change applied to EVERY offer in that service's history. With
 * FIXED_WEEKLY_COST = 1,700 and COMFORTABLE = 400:
 *
 *     scenario                     revenue/wk   rate/wk   band    why
 *     --------------------------   ----------   -------   ------  ----------------
 *     as it opens                       2,185       485   green   ≥ COMFORTABLE
 *     A's hours +10                     2,372       672   green   raising reads better
 *     A's rate to its floor             2,008       308   yellow  above water, not clear
 *     BOTH rates to their floors        1,408      −292   red     under breakeven
 *
 * The constants are the solution to four inequalities (REV0 = 2,184.82,
 * REVafloor = 2,008.22, REVfloor = 1,408.22 — the time-weighted averages of the
 * seeded schedule):
 *
 *     REV0      − FIXED ≥ COMFORTABLE    the board opens green
 *     REVafloor − FIXED > 0              cutting ONE rate is not yet a loss
 *     REVafloor − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     REVfloor  − FIXED < 0              cutting BOTH crosses zero
 *
 * Solving them leaves FIXED ∈ (1,408.22, 2,008.22) and, at FIXED = 1,700,
 * COMFORTABLE ∈ (308.22, 484.82]. `rateBandTable()` prints exactly that table
 * and the test asserts it.
 */
import { filter, find, map, pipe, some, sortBy, sum } from "../../../src/fn";
import { timeOf } from "../../../src";
import type {
  Mutation,
  StackedAreaSeriesData,
  TimeDomain,
} from "../../../src";
import type {
  MeasureIndex,
  PairedMutationEntity,
} from "../../../src/components/PairedMutationSliders";

import type { BoardConfig, BoardEntity, RateBand } from "./board-kit/config";
import {
  bandOfRate as bandOf,
  drawnRate as drawn,
  isOffDial as offDial,
  rateFromContribution,
} from "./board-kit/config";
import type { Change, EntitySpec } from "./board-kit/lens";
import { add, clear, set, uniqueId } from "./board-kit/lens";
import * as kit from "./board-kit/model";
import { weekLabel } from "./board-kit/model";
import {
  againstBreakeven,
  dollarsPerWeek,
  formatHours,
  formatRate,
  revenueShift,
} from "./hourly-board-money";

export { uniqueId };
export type { Change, EntitySpec };
export type { RateBand } from "./board-kit/config";
// The CALENDAR and the pure arithmetic are the kit's, re-exported under the
// names this board's bench and test already use. Nothing here is a wrapper —
// these are the same functions, reached by one more name.
export {
  addMutation,
  monthStarts,
  monthsBetween,
  orderedMutations,
  quarterLabelOf,
  runningBalances,
  weekLabel,
  weeksBetween,
  nearestMutation,
} from "./board-kit/model";
export type { SegmentLabel } from "./board-kit/model";

// ── The span ─────────────────────────────────────────────────────────────────

/** The year the chart, the work mix and the gauge are all drawn against. */
export const DOMAIN_START = new Date("2025-01-01");
export const DOMAIN_END = new Date("2026-01-01");
export const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

const START = DOMAIN_START.getTime();
const END = DOMAIN_END.getTime();

/** Weeks in a year, months in a year, and the bridge between them. Kept as
 *  named constants because the board's own prose quotes them. */
export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const WEEKS_PER_MONTH = WEEKS_PER_YEAR / MONTHS_PER_YEAR;

/** A WEEKLY rate as a month's worth of it — the cash chart's grain. The kit
 *  keys this off the unit, so it cannot be written backwards. */
export const monthlyFrom = (ratePerWeek: number): number =>
  kit.monthlyFrom("wk", ratePerWeek);

// ── The two measures ─────────────────────────────────────────────────────────

/** What one service is worth in one WEEK: the pair the dials edit. */
export interface Offer {
  /** Hours a week. */
  readonly hours: number;
  /** Dollars an hour. */
  readonly rate: number;
}

/** The two dials, in reading order. `axes` is positioned against this. */
export const HOURS: MeasureIndex = 0;
export const RATE: MeasureIndex = 1;

/** The shared tracks. Peter's numbers; the whole row is drawn on them. */
export const HOURS_DOMAIN: readonly [number, number] = [0, 80];
export const RATE_DOMAIN_PER_HOUR: readonly [number, number] = [0, 300];

/**
 * A service — a SEGMENT or a RAY whose year is change events.
 *
 * This is the kit's `BoardEntity` wearing the board's own words: `committed`
 * and each entry of `changes` are an `Offer` rather than a bare `[hours, rate]`
 * pair, because "20 hours at $18" is what a reader and a fixture both say. The
 * translation to the kit's measures is `measuresOf` / `offerOf` below, and it
 * is the only place the two vocabularies meet.
 */
export interface Service {
  readonly id: string;
  readonly label: string;
  /** When the service begins, as a timestamp. */
  readonly start: number;
  /** When it ends, EXCLUSIVE. Absent = a ray. */
  readonly end?: number;
  /** The offer it opens on at `start`. `null` = added at a change instead. */
  readonly committed: Offer | null;
  readonly hoursRange: readonly [number, number];
  readonly rateRange: readonly [number, number];
  readonly changes: Readonly<Record<string, Offer | null>>;
}

/** An offer as the kit's measures, in axis order. */
const measuresOf = (offer: Offer | null): readonly number[] | null =>
  offer === null ? null : [offer.hours, offer.rate];

/** The kit's measures as an offer. */
const offerOf = (measures: readonly number[] | null): Offer | null =>
  measures === null
    ? null
    : { hours: measures[HOURS] ?? 0, rate: measures[RATE] ?? 0 };

/** A service as the kit's entity. The board's whole vocabulary crossing over. */
const entityOf = (service: Service): BoardEntity => ({
  id: service.id,
  label: service.label,
  start: service.start,
  ...(service.end === undefined ? {} : { end: service.end }),
  committed: measuresOf(service.committed),
  ranges: [service.hoursRange, service.rateRange],
  changes: Object.fromEntries(
    map(
      ([id, offer]: [string, Offer | null]) => [id, measuresOf(offer)],
      Object.entries(service.changes),
    ),
  ),
});

const entitiesOf = (services: readonly Service[]): BoardEntity[] =>
  map(entityOf, services);

/**
 * An entity back as a service, against the service it came from.
 *
 * The template carries the two things the kit's entity does not name — which
 * range is the hours one and which is the rate one — so the round trip is
 * lossless without the kit having to know the words.
 */
const serviceOf = (entity: BoardEntity, template: Service): Service => ({
  ...template,
  committed: offerOf(entity.committed),
  changes: Object.fromEntries(
    map(
      ([id, measures]: [string, readonly number[] | null]) => [
        id,
        offerOf(measures),
      ],
      Object.entries(entity.changes),
    ),
  ),
});

/** Is `time` inside the service's own life? */
export const isLiveAt = (service: Service, time: number): boolean =>
  kit.isLiveAt(entityOf(service), time);

// ── The fixture ──────────────────────────────────────────────────────────────

/** The two seeded changes — the first Mondays of June and of September. Both
 *  sit on the week grid, so a click in either week selects them rather than
 *  adding a second flag beside them. */
const JUNE: Mutation = { id: "seed-june", at: new Date("2025-06-02"), label: "1" };
const SEPTEMBER: Mutation = {
  id: "seed-september",
  at: new Date("2025-09-01"),
  label: "2",
};

/**
 * The opening scenario: two RAYS from the span's start.
 *
 * Service A is Peter's (2026-09-18): "20hrs at 18/hr. And then in june bump it
 * to 30 hrs at 18/hr. And in sept bump it back to 15 hrs at 20/hr" — three
 * weekly amounts, $360, $540 and $300, and so three slopes on the balance line.
 * Service B carries no events: one flat level all year, which is the contrast
 * that makes A's steps readable.
 */
export const SERVICES: readonly Service[] = [
  {
    id: "service-a",
    label: "Service A",
    start: START,
    committed: { hours: 20, rate: 18 },
    hoursRange: [0, 45],
    rateRange: [10, 40],
    changes: {
      [JUNE.id]: { hours: 30, rate: 18 },
      [SEPTEMBER.id]: { hours: 15, rate: 20 },
    },
  },
  {
    id: "service-b",
    label: "Service B",
    start: START,
    committed: { hours: 15, rate: 120 },
    // 45 + 32 = 77 keeps the whole stack under the 80 cap.
    hoursRange: [0, 32],
    rateRange: [80, 160],
    changes: {},
  },
];

/** The board opens on Service A's two changes: June up, September down. */
export const SEED_MUTATIONS: readonly Mutation[] = [JUNE, SEPTEMBER];

// ── The money constants ──────────────────────────────────────────────────────

/**
 * What the business pays out in a WEEK regardless of what it sells — the
 * premises, the tools, the people who are not billable.
 *
 * It lives in the FIXTURE rather than in a component because it is the whole
 * reason breakeven is a number at all: without it every scenario is profitable
 * and the gauge's red half is unreachable. $1,700 is the solution to the
 * calibration's four inequalities — see the header.
 */
export const FIXED_WEEKLY_COST = 1_700;

/** The comfortable gain, in $/wk. At or above it the gauge lights green. */
export const COMFORTABLE = 400;

/**
 * The gauge's domain, in $/wk.
 *
 * Sized against the FIXTURE, not against everything the board can become:
 * `RateGauge` clamps `value` to its domain and announces the DRAWN figure, so a
 * reading outside it is a dial that quietly contradicts the terminal. The floor
 * is exact and unconditional — every service dropped is no revenue and all of
 * the fixed cost. The ceiling holds for the two services the board OPENS with
 * and NOT once services are added, since an added service carries the whole
 * track; `drawnRate` states the clamp explicitly and the DEBUG summary prints
 * the drawn figure beside the raw one rather than promising they never differ.
 */
export const RATE_DOMAIN: readonly [number, number] = [-1_700, 5_500];

/** The business's rate, given what it bills in a WEEK. */
export const rateFromRevenue = (revenue: number): number =>
  rateFromContribution(CONFIG, revenue);

// ── The config ───────────────────────────────────────────────────────────────

/** The two dials, as the kit and the sliders both read them. */
const AXES = [
  { label: "Hrs/wk", domain: HOURS_DOMAIN, snap: 1, format: formatHours },
  { label: "$/hr", domain: RATE_DOMAIN_PER_HOUR, snap: 5, format: formatRate },
] as const;

/**
 * THE BOARD, AS DATA. Everything below this line is `kit.<something>(CONFIG,
 * …)` wearing the board's words.
 */
export const CONFIG: BoardConfig<2> = {
  id: "hourly",
  title: "Hourly Board",
  unit: "wk",
  grain: "week",
  side: "revenue",
  domain: TIME_DOMAIN,
  axes: [...AXES],
  // WHAT ONE SERVICE BILLS IN A WEEK: hours a week times dollars an hour, with
  // no year in it.
  contributionOf: (measures: readonly number[]): number =>
    (measures[HOURS] ?? 0) * (measures[RATE] ?? 0),
  fixedCost: FIXED_WEEKLY_COST,
  comfortable: COMFORTABLE,
  rateDomain: RATE_DOMAIN,
  sentences: { against: againstBreakeven, delta: revenueShift },
  mix: "stacked",
  fixture: entitiesOf(SERVICES),
  seed: SEED_MUTATIONS,
  measures: 2,
};

// ── The week grid ────────────────────────────────────────────────────────────

/** Every week slot in the span, in order. Slot 0 is the span's own start (a
 *  truncated week — see the kit's `slotOf` clamp); slot 52 opens on 29 Dec. */
export const WEEK_SLOTS: readonly number[] = kit.gridOf(CONFIG);

/** The number of week slots the span holds — 53, for a 365-day year opening
 *  mid-week. The schedule table has one row each. */
export const WEEK_COUNT = WEEK_SLOTS.length;

/** The week slot a picked date belongs to, against THIS board's span. A click
 *  on the Work Mix plot arrives unsnapped and goes through here. */
export const weekOfPick = (at: Date | number): Date =>
  new Date(
    kit.slotOf("week", typeof at === "number" ? at : at.getTime(), START),
  );

/** The week slot a MOMENT falls in, as an index into `WEEK_SLOTS`. CLAMPED at
 *  both ends: a fixture date or one typed into a test need not sit on the
 *  grid, and a silent miss would put a July reading on January's hours. */
export const slotOfTime = (time: number): number =>
  kit.gridIndexOf(WEEK_SLOTS, Math.max(time, START));

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

/**
 * The week slot a MOMENT falls in, as its first and last DAY — both inclusive,
 * both inside the span. What the Work Mix hover reads out. The first slot is
 * the truncated week the span opens on and the last is cut at the span's end,
 * so neither ever names a day the board does not draw.
 */
export const weekRangeOf = (
  time: number,
): { start: number; end: number; label: string } => {
  const slot = slotOfTime(time);
  const start = WEEK_SLOTS[slot] ?? START;
  const next = WEEK_SLOTS[slot + 1] ?? END;
  const end = next - DAY_MS;
  return { start, end, label: `${isoDate(start)} to ${isoDate(end)}` };
};

/** The first free WEEK from the span's start. */
export const nextFreeSlot = (
  _domainStart: number,
  _domainEnd: number,
  mutations: readonly Mutation[],
): number | undefined => kit.nextFreeSlot(CONFIG, mutations);

/** The selected change, or a new one at the next free WEEK. */
export const ensureMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly selected: string | null;
  },
  _domainStart: number,
  _domainEnd: number,
): { mutations: Mutation[]; selected: string | null; created: boolean } =>
  kit.ensureMutation(CONFIG, scenario);

/** The as-of chips, labelled by WEEK — `W27 · Jun 30`. */
export const segmentLabelsOf = (
  mutations: readonly Mutation[],
): kit.SegmentLabel[] => kit.segmentLabelsOf(mutations, "week");

/** Every moment the schedule can change at: EVERY WEEK SLOT, and each flag. */
export const momentsOf = (mutations: readonly Mutation[]): number[] =>
  kit.momentsOf(CONFIG, mutations);

/** The quarter starts inside the span — the x-axis's four tick values. */
export const quarterTicks = (
  start: Date = DOMAIN_START,
  end: Date = DOMAIN_END,
): number[] => kit.quarterTicks(start, end);

// ── Walking the history ──────────────────────────────────────────────────────

/** The offer a service carried JUST BEFORE a change — `null` when it had not
 *  begun by then, or had already ended. */
export const offerBefore = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null =>
  offerOf(kit.levelsBefore(entityOf(service), mutationId, mutations, START));

/** The offer from a change onward: its entry at it, or whatever it was on. */
export const offerFrom = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null =>
  offerOf(kit.levelsFrom(entityOf(service), mutationId, mutations, START));

/**
 * The offer in force at a MOMENT, or `null` when the service is not sold then
 * — outside its `[start, end)`, or dropped. `null` is absence, not zero: a
 * service sold for nothing would still be work.
 */
export const offerAt = (
  service: Service,
  time: number,
  mutations: readonly Mutation[],
): Offer | null => offerOf(kit.levelsAt(entityOf(service), time, mutations));

/** Is this service on the books at the change being edited? See the kit's
 *  `isPresentAt` for the four cases this one condition covers. */
export const isSoldAt = (before: Offer | null, from: Offer | null): boolean =>
  kit.isPresentAt(measuresOf(before), measuresOf(from));

// ── Editing ──────────────────────────────────────────────────────────────────

/** One measure of an offer, replaced; the other carried forward untouched. */
export const withMeasure = (
  offer: Offer,
  measure: MeasureIndex,
  value: number,
): Offer =>
  measure === HOURS ? { ...offer, hours: value } : { ...offer, rate: value };

/** Apply a lens write to the service list, keeping each service's own words. */
const through = (
  services: readonly Service[],
  edit: (entities: readonly BoardEntity[]) => BoardEntity[],
): Service[] => {
  const edited = edit(entitiesOf(services));
  return map(
    (entity: BoardEntity, index: number) =>
      serviceOf(entity, services[index] as Service),
    edited,
  );
};

/**
 * Set ONE measure of ONE service at ONE change — `set([id, measure])`.
 *
 * The sliders emit `(id, measureIndex, value)`, one measure at a time, but a
 * change in the history is a whole OFFER, because the stack and the revenue
 * both need both numbers at every moment. The measure that did not move is
 * carried forward, which is the honest answer: it did not change, and writing
 * it down says exactly that.
 */
export const withChange = (
  services: readonly Service[],
  id: string,
  mutationId: string,
  measure: MeasureIndex,
  value: number,
  mutations: readonly Mutation[],
): Service[] =>
  through(services, (entities) =>
    set(entities, [id, measure], value, mutationId, kit.slotOrder(mutations)),
  );

/** ⊗ Drop: this service is off the books from the selected change onward —
 *  `set([id, "presence"], null)`. */
export const withDrop = (
  services: readonly Service[],
  id: string,
  mutationId: string,
): Service[] =>
  through(services, (entities) =>
    set(entities, [id, "presence"], null, mutationId, []),
  );

/** ↺ Reinstate: DELETE the change rather than invent an offer. The service
 *  carries whatever the previous change left it on. */
export const withoutChange = (
  services: readonly Service[],
  id: string,
  mutationId: string,
): Service[] => through(services, (entities) => clear(entities, id, mutationId));

// ── Adding a service ─────────────────────────────────────────────────────────

/** What the Add form holds while it is being filled in. */
export interface ServiceDraft {
  readonly name: string;
  readonly hours: number | undefined;
  readonly rate: number | undefined;
}

/** The form opens empty of a name and on Peter's own starting figures. */
export const EMPTY_DRAFT: ServiceDraft = { name: "", hours: 10, rate: 120 };

export const draftName = (draft: ServiceDraft): string => draft.name.trim();

/**
 * Can this draft be added? A name, and two figures the shared tracks admit.
 * The RANGE a new service gets is the whole axis, so "inside the track" is the
 * only bound there is to check — a narrower rule would refuse a figure the dial
 * would then happily accept.
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
 * ADD a service at one change — the kit's `add`, with this board's three
 * decisions: `committed: null` so it reads as an ADDITION rather than a service
 * that starts small; ONE change at `at`, so its existence starts exactly where
 * the reader put it; and the WHOLE TRACK as its range, because a service
 * invented in a modal has negotiated nothing and inventing a band for it would
 * be the board making up a constraint.
 */
export const addService = (
  services: readonly Service[],
  draft: ServiceDraft,
  at: string,
  mutations: readonly Mutation[],
): { services: Service[]; id: string } => {
  if (!canAdd(draft)) throw new Error("Draft is not addable");
  const name = draftName(draft);
  const id = uniqueId(
    name,
    map((service: Service) => service.id, services),
    "service",
  );
  const spec: EntitySpec = {
    id,
    label: name,
    measures: [draft.hours ?? 0, draft.rate ?? 0],
    ranges: [HOURS_DOMAIN, RATE_DOMAIN_PER_HOUR],
    // It begins where the reader added it and runs on as a RAY.
    start: kit.timeOfMutation(at, mutations, START),
  };
  const template: Service = {
    id,
    label: name,
    start: spec.start,
    committed: null,
    hoursRange: HOURS_DOMAIN,
    rateRange: RATE_DOMAIN_PER_HOUR,
    changes: {},
  };
  const entities = add(entitiesOf(services), spec, at);
  const addedEntity = entities[entities.length - 1] as BoardEntity;
  return {
    services: [...services, serviceOf(addedEntity, template)],
    id,
  };
};

/** The change a service was ADDED at, or `undefined` if it was always sold. */
export const addedAt = (
  service: Service,
  mutations: readonly Mutation[],
): string | undefined => kit.addedAt(entityOf(service), mutations);

/**
 * DELETE the selected change and everything that only existed because of it —
 * the flag, the chip, every service's entry at it, and anything added there.
 */
export const removeMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly services: readonly Service[];
  },
  id: string,
): { mutations: Mutation[]; services: Service[]; selected: string | null } => {
  const next = kit.removeMutation(
    { mutations: scenario.mutations, entities: entitiesOf(scenario.services) },
    id,
  );
  return {
    mutations: next.mutations,
    services: map((entity: BoardEntity) => {
      const template = find(
        (service: Service) => service.id === entity.id,
        scenario.services,
      ) as Service;
      return serviceOf(entity, template);
    }, next.entities),
    selected: next.selected,
  };
};

// ── The dials ────────────────────────────────────────────────────────────────

/** The two measures of one service across one change, in reading order. */
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

/** One service read across one change: what it was, and what it becomes. */
interface AcrossMutation {
  readonly service: Service;
  readonly before: Offer | null;
  readonly from: Offer | null;
}

/** The pairs for ONE change: each service's offer just before it against its
 *  offer from it onward. This is what the as-of control selects. */
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

/**
 * The pairs when there is NO change yet: every service on its committed
 * schedule, READ IN THE SPAN'S FIRST WEEK, prior and value the same figures.
 *
 * Saying "no change" with `prior === value` is what makes every reading
 * downstream fall out with no special case — the delta is zero, no change line
 * is drawn, and the gauge reads exactly the baseline.
 */
export const pairsWithoutMutation = (
  services: readonly Service[],
): PairedMutationEntity[] =>
  pipe(
    services,
    filter((service: Service) => service.committed !== null),
    map((service: Service) => {
      const opening = offerAt(service, START, []);
      return pairOf(service, opening, opening);
    }),
  );

/** WEEKLY revenue from one pair of dials, as the summary line reads it. */
export const weeklyOfPair = (entity: PairedMutationEntity): number => {
  const hours = entity.measures[HOURS].value;
  const rate = entity.measures[RATE].value;
  if (hours === null || rate === null) return 0;
  return hours * rate;
};

// ── The money ────────────────────────────────────────────────────────────────

/** What one offer bills in a WEEK. No ×52: the week IS the unit. */
export const weeklyOf = (offer: Offer | null): number =>
  offer === null ? 0 : CONFIG.contributionOf(measuresOf(offer) ?? []);

/** What every service sold at a moment bills in that WEEK, added up. */
export const revenueAt = (
  services: readonly Service[],
  time: number,
  mutations: readonly Mutation[],
): number => kit.contributionAt(CONFIG, entitiesOf(services), time, mutations);

/** What the gauge will actually DRAW for a rate — the domain clamp, named. */
export const drawnRate = (rate: number): number => drawn(CONFIG, rate);

/** Is this rate off the end of the dial? Then the table must say so. */
export const isOffDial = (rate: number): boolean => offDial(CONFIG, rate);

/** The band a rate reads as — the gauge's own split. */
export const bandOfRate = (rate: number): RateBand => bandOf(CONFIG, rate);

/**
 * The highest rate the fixture's ranges can reach, in $/wk — the domain's
 * ceiling test. The allowance bounds it whatever the history says.
 */
export const maxReachableRate = (services: readonly Service[]): number =>
  rateFromRevenue(
    sum(
      map(
        (service: Service) => service.hoursRange[1] * service.rateRange[1],
        services,
      ),
    ),
  );

/** The lowest — every service dropped, so the fixed cost stands alone. */
export const minReachableRate = (): number => rateFromRevenue(0);

// ── The composite reading ────────────────────────────────────────────────────

/** THE UNIT time is weighted in. `"month"` is the composite reading's original
 *  default; `"week"` is what this board asks for, because its changes land on
 *  ISO weeks and a weight quoted in months would round the reader's own grid
 *  away. The two barely disagree over a year, which is the point. */
export type RateUnit = "month" | "week";

const unitOf = (unit: RateUnit) => (unit === "week" ? "wk" : "mo");

/** The rate over a whole span, weighted by time. Takes a FUNCTION and the
 *  moments rather than the services and the changes, because given "what does
 *  it bill at time t" and "when can it change", the average is decided. */
export const averageRateOver = (
  start: number,
  end: number,
  moments: readonly number[],
  revenue: (time: number) => number,
  unit: RateUnit = "month",
): number =>
  rateFromRevenue(
    kit.averageContributionOver(start, end, moments, revenue, unitOf(unit)),
  );

/** The share of the span a change made at `at` is in force for. */
export const weightFrom = (
  start: number,
  end: number,
  at: number,
  unit: RateUnit = "month",
): number => kit.weightFrom(start, end, at, unitOf(unit));

/**
 * THE GAUGE'S READING: the scenario's rate averaged over the whole year, in
 * WEEKS — not the selected change's own rate, which would say a service
 * dropped in December costs the year what the same service dropped in January
 * does. It samples EVERY WEEK, not only the flags.
 */
export const averageRate = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  services: readonly Service[],
  unit: RateUnit = "week",
): number =>
  kit.averageRate(
    { ...CONFIG, domain },
    entitiesOf(services),
    mutations,
    unitOf(unit),
  );

/**
 * The COMMITTED rate, in $/wk — THE SAME CALL the gauge makes for its own
 * value, so the two are equal by construction rather than by arithmetic that
 * could drift. On the opening scenario the delta is zero and the brace reads
 * "no change to revenue". It is not the opening WEEK's rate — A bills $360 in
 * January and $540 in summer — and that gap is why the calibration is solved
 * against the average.
 */
export const COMMITTED_RATE = averageRate(
  TIME_DOMAIN,
  SEED_MUTATIONS,
  SERVICES,
);

/** The INSTANTANEOUS rate from a moment onward — the balance line's slope. */
export const rateAt = (
  time: number,
  mutations: readonly Mutation[],
  services: readonly Service[],
): number => kit.rateAt(CONFIG, entitiesOf(services), time, mutations);

/**
 * The share of the year a change must still have ahead of it to pull the
 * average from the committed rate past a THRESHOLD. EXACT for a change between
 * two FLAT levels, which is what its two arguments are — two rates.
 */
export const weightToReach = (changed: number, threshold: number): number =>
  (COMMITTED_RATE - threshold) / (COMMITTED_RATE - changed);

// ── The calibration table ────────────────────────────────────────────────────

export interface RateRow {
  readonly scenario: string;
  readonly revenue: number;
  readonly rate: number;
  readonly band: ReturnType<typeof bandOf>;
}

/**
 * One calibration scenario: each service asked for has EVERY offer in its
 * history moved — its opening offer and each change — so the row reads "all
 * year", whatever steps the history already takes.
 *
 * `addHours` is a DELTA and `rate` an absolute figure, because that is what the
 * two readings Peter named are: "ten hours more" is more work in every week,
 * and "at its floor" is a level. A dropped offer (`null`) stays dropped.
 */
const calibrationServices = (
  services: readonly Service[],
  change: (
    service: Service,
    index: number,
  ) => { addHours?: number; rate?: number } | undefined,
): Service[] =>
  map((service: Service, index: number) => {
    const asked = change(service, index);
    if (asked === undefined) return service;
    const moved = (offer: Offer | null): Offer | null =>
      offer === null
        ? null
        : {
            hours: offer.hours + (asked.addHours ?? 0),
            rate: asked.rate ?? offer.rate,
          };
    return {
      ...service,
      committed: moved(service.committed),
      changes: Object.fromEntries(
        map(
          ([id, offer]: [string, Offer | null]) => [id, moved(offer)],
          Object.entries(service.changes),
        ),
      ),
    };
  }, services);

/** The calibration, as data — each row the reading THE GAUGE GIVES for the
 *  scenario the board OPENS on, with the row's change applied to every week. */
export const rateBandTable = (
  services: readonly Service[] = SERVICES,
): RateRow[] => {
  const row = (scenario: string, scenarioServices: Service[]): RateRow => {
    const rate = averageRate(TIME_DOMAIN, SEED_MUTATIONS, scenarioServices);
    return {
      scenario,
      revenue: rate + FIXED_WEEKLY_COST,
      rate,
      band: bandOf(CONFIG, rate),
    };
  };
  const floorOf = (service: Service): number => service.rateRange[0];
  return [
    row("as it opens", [...services]),
    row(
      "first service's hours +10",
      calibrationServices(services, (_service, index) =>
        index === 0 ? { addHours: 10 } : undefined,
      ),
    ),
    row(
      "first service's rate at its floor",
      calibrationServices(services, (service, index) =>
        index === 0 ? { rate: floorOf(service) } : undefined,
      ),
    ),
    row(
      "every rate at its floor",
      calibrationServices(services, (service) => ({ rate: floorOf(service) })),
    ),
  ];
};

// ── The Work Mix chart ───────────────────────────────────────────────────────

/** The cap the Work Mix y-axis is FIXED to, in hours a week. Peter: "You can
 *  set the absolute cap in settings, but it defaults to 80." A fixed domain is
 *  the point — the bands' heights are then comparable across every edit. */
export const DEFAULT_WORK_CAP = 80;

/** The full-time line, in hours a week. The chart "affords overtime, but lets
 *  you know when you're working more than full time", so it is a rule drawn
 *  ACROSS the stack rather than a bound on it. */
export const FULL_TIME_HOURS = 40;

/** The cap can never sit below the rule it has to contain. */
export const MIN_WORK_CAP = FULL_TIME_HOURS;

/** The hours-a-week points for one service. Changes only, opening at the edge. */
export const hourPointsFor = (
  service: Service,
  mutations: readonly Mutation[],
): { at: Date; value: number }[] =>
  kit.pointsFor(CONFIG, entityOf(service), HOURS, mutations);

/** ONE SERVICE'S VARIABILITY: the standard deviation of its hours across every
 *  week slot, read from the LIVE schedule. Std dev rather than peak-to-trough,
 *  because Peter asked for "the one with the biggest bumps" and std dev weighs
 *  how LONG each level lasts. */
export const variabilityOf = (
  service: Service,
  mutations: readonly Mutation[],
): number => kit.variabilityOf(CONFIG, entityOf(service), HOURS, mutations);

/** Services ordered ASCENDING by variability — so the MOST variable is LAST,
 *  which the stacked mark draws as the TOP band. Peter, 2026-09-18: "Sort by
 *  variability. So the one with the biggest bumps is on top." */
export const byVariability = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): Service[] =>
  sortBy(
    (service: Service) => variabilityOf(service, mutations),
    services,
  );

/** One row of the DEBUG stack-order table. Position 0 is the bottom band. */
export interface StackOrderRow {
  readonly service: string;
  readonly stdDevHoursPerWeek: number;
  readonly position: number;
  readonly band: "bottom" | "top" | "middle";
}

/** The stack-order table `byVariability` produces, as data. */
export const stackOrderTable = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): StackOrderRow[] => {
  const ordered = byVariability(services, mutations);
  return map(
    (service: Service, position: number): StackOrderRow => ({
      service: service.label,
      stdDevHoursPerWeek:
        Math.round(variabilityOf(service, mutations) * 100) / 100,
      position,
      band:
        position === 0
          ? "bottom"
          : position === ordered.length - 1
            ? "top"
            : "middle",
    }),
    ordered,
  );
};

/** One band per service, ordered by `byVariability` — array order is stacking
 *  order and palette order. */
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
    byVariability(services, mutations),
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

/** One week of the schedule, as a row a terminal can print. */
export interface WeekRow {
  /** The slot index, 0–52. */
  readonly week: number;
  /** `W27 · Jun 30` — the same chip the as-of control reads. */
  readonly label: string;
  /** One column per service, in fixture order: its hours that week. */
  readonly hours: readonly number[];
  /** The top of the stack that week. */
  readonly total: number;
  /** `over` or `under` the full-time rule. */
  readonly fullTime: "over" | "under";
  /** What the business bills that week, in $/wk. */
  readonly revenue: number;
}

/**
 * THE SCHEDULE, week by week — every service's history as a table, so the
 * shape can be argued with from a terminal before anyone opens the chart. A
 * stepped history is exactly the kind of thing that looks plausible in a
 * picture and wrong in a column of numbers.
 */
export const scheduleTable = (
  services: readonly Service[] = SERVICES,
  mutations: readonly Mutation[] = [],
): WeekRow[] =>
  map((at: number, week: number) => {
    const hours = map(
      (service: Service) => offerAt(service, at, mutations)?.hours ?? 0,
      services,
    );
    const total = sum(hours);
    return {
      week,
      label: weekLabel(new Date(at)),
      hours,
      total,
      fullTime:
        total > FULL_TIME_HOURS ? ("over" as const) : ("under" as const),
      revenue: revenueAt(services, at, mutations),
    };
  }, WEEK_SLOTS);

/** The busiest week of a schedule, and how many hours it holds. The claim the
 *  cap has to contain: 45 h/wk from June, for the fixture. */
export const peakWeek = (
  services: readonly Service[] = SERVICES,
  mutations: readonly Mutation[] = [],
): WeekRow => {
  const rows = sortBy(
    (row: WeekRow) => -row.total,
    scheduleTable(services, mutations),
  );
  return (
    rows[0] ?? {
      week: 0,
      label: "",
      hours: [],
      total: 0,
      fullTime: "under" as const,
      revenue: 0,
    }
  );
};

// ── The Cash Flow chart ──────────────────────────────────────────────────────

/** The opening bank balance, in dollars. */
export const OPENING_BALANCE = 42_000;

/** Thirteen months of net monthly flow, hand-written rather than derived from
 *  the dials: the top line is the business as ALREADY COMMITTED, and the dials
 *  below it are the change being proposed against it. */
export const MONTHLY_NET: readonly number[] = [
  5200, 4800, 6100, 5400, 6900, 6300, 7800, 6600, 8100, 7200, 8600, 7900, 9300,
];

/** The fan's half-width at a month: ZERO at now, widening with the SQUARE of
 *  the months since — a forecast is surer about next month than next year. */
export const UNCERTAINTY_PER_MONTH_SQUARED = 200;

export const fanAt = kit.fanOf(UNCERTAINTY_PER_MONTH_SQUARED);

/**
 * The balance a rate ACCRUES between two moments — the projection's integral.
 *
 * The rate is $/WK and the stretches are weeks, so in this board's own unit
 * that is `weeks × $/wk` with nothing in between. Asking for `"month"` gives
 * the month-grained reading the cash chart draws, and the kit's `unitsPer` is
 * then the one conversion — written down rather than hidden in a divisor.
 */
export const accruedOver = (
  from: number,
  to: number,
  moments: readonly number[],
  rate: (time: number) => number,
  unit: RateUnit = "month",
): number => kit.accruedOver(from, to, moments, rate, "wk", unitOf(unit));

/** The chart's PINNED y-domain ceiling, in dollars — the worst case being the
 *  projection starting as early as possible at the highest rate, plus the
 *  fan's upper edge at that month. */
export const pinnedCeiling = (
  balances: readonly number[],
  maxRate: number,
  fan: (monthsAfterNow: number) => number,
  tick = 50_000,
): number => kit.pinnedCeiling("wk", balances, maxRate, fan, tick);

/**
 * WHAT THE PROJECTION SAMPLES, in this board's own vocabulary.
 *
 * The kit's `RateSampling` names its units `"wk"` / `"mo"` / `"yr"`, which is
 * what a board's `unit` is; this board's own prose and its bench have always
 * said `"week"` and `"month"`, so the translation lives here with the rest of
 * the vocabulary rather than leaking the kit's spelling into the bench. The
 * rate itself is ALWAYS $/wk — `unit` chooses the grain the spans are measured
 * in, which is the only thing the cash chart's months need.
 */
export interface RateSampling {
  /** The first instant of each cell, in ms. Same length and order as the
   *  committed balances. See `monthStarts`. */
  readonly boundaries: readonly number[];
  /** The rate in force from a moment onward. `rateAt` bound to a scenario — or
   *  `() => rate` for a flat projection, which is the same one code path. */
  readonly rate: (time: number) => number;
  /** The moments the rate is allowed to change at. */
  readonly moments: readonly number[];
  /** The grain the integral is summed in. MONTHS unless the board counts weeks
   *  — this one does, because its changes land on ISO weeks. */
  readonly unit?: RateUnit;
}

/** The sampling as the kit reads it: a $/wk rate, sampled at the asked grain. */
const samplingForKit = (sampling: RateSampling): kit.RateSampling => ({
  boundaries: sampling.boundaries,
  rate: sampling.rate,
  moments: sampling.moments,
  unit: "wk",
  sampleIn: unitOf(sampling.unit ?? "month"),
});

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward by
 * INTEGRATING the sampled rate from the pivot. A drag changes the rate, the
 * rate changes every month after now, and the line visibly pivots about the
 * now point. Before now nothing moves, because the past is not a forecast.
 */
export const projectedBalances = (
  committed: readonly number[],
  sampling: RateSampling,
  nowIndex: number,
): number[] =>
  kit.projectedBalances(committed, samplingForKit(sampling), nowIndex);

/** One row of the DEBUG projection table: the rate the projection SAMPLED for
 *  that cell and what it did to the balance. */
export interface ProjectionRow {
  readonly month: string;
  readonly projectedRate: number;
  readonly balance: number;
  readonly delta: number;
  readonly part: "committed" | "projected";
}

/** The balance line as a table — headless first, so the bend can be argued
 *  with from a terminal before anyone opens the chart. */
export const projectionTable = (
  committed: readonly number[],
  sampling: RateSampling,
  nowIndex: number,
): ProjectionRow[] => {
  const balances = projectedBalances(committed, sampling, nowIndex);
  return map((balance: number, index: number) => {
    const at = sampling.boundaries[index] ?? 0;
    const previous =
      index === 0 ? (committed[0] ?? 0) : (balances[index - 1] ?? 0);
    return {
      month: new Date(at).toISOString().slice(0, 7),
      projectedRate: Math.round(sampling.rate(at)),
      balance: Math.round(balance),
      delta: Math.round(balance - previous),
      part: index <= nowIndex ? ("committed" as const) : ("projected" as const),
    };
  }, balances);
};

/**
 * The scenario, reduced to the thing Save would persist. A DIGEST rather than a
 * deep comparison, because "is this dirty?" is one question asked on every
 * render and a stable string answers it with no traversal at the call site.
 */
export const scenarioDigest = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): string => kit.scenarioDigest(entitiesOf(services), mutations);

/** Has anything moved since the last save? */
export const isDirty = (
  services: readonly Service[],
  mutations: readonly Mutation[],
  savedDigest: string,
): boolean => scenarioDigest(services, mutations) !== savedDigest;

/** Does any service carry a change at all? For the DEBUG table's summary line. */
export const hasAnyChange = (services: readonly Service[]): boolean =>
  some((service: Service) => Object.keys(service.changes).length > 0, services);

/** The money words, re-exported so the bench has one import for the board. */
export { dollarsPerWeek };
