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
 *   start/end + changes ──────▶ offerAt  (what a service bills in a week)
 *   services ──workMixSeries──▶ StackedAreaSeries  (one band per service, hrs/wk)
 *   services ──revenueAt──────▶ rateAt ──▶ the balance line's sampled slope
 *   services ──revenueAt──────▶ averageRate ──▶ RateGauge.value  (the WHOLE year)
 *   services ──pairsForMutation▶ PairedMutationSliders.entities  (two dials each)
 *   segment click ────────────▶ which mutation the dials edit
 *
 * ── THE UNIT IS DOLLARS A WEEK ─────────────────────────────────────────────
 *
 * Peter, 2026-09-18: "Hourly people tend to think of it that way." So every
 * money figure this board quotes is $/WK — the service summaries, both of the
 * gauge's sentences, its domain and baseline, the fixed cost and every DEBUG
 * table. There is no ×52 anywhere in the arithmetic the reader is shown:
 *
 *     rate = Σ (hours/wk × $/hr) − fixed costs        [$/wk]
 *
 * The year has not gone away — it is the SPAN the gauge averages over and the
 * length the projection integrates across — but it is no longer a unit. The
 * bridge from a weekly rate to a monthly cash figure is `monthlyFrom`, spelled
 * once, and the projection's own conversion is the explicit `WEEKS_PER_UNIT`
 * table beside `accruedOver`. `abbreviateDollars` is still the shared rounding
 * policy; only the suffix and the arithmetic changed.
 *
 * ── A SERVICE IS A SEGMENT OR A RAY, AND ITS YEAR IS CHANGE EVENTS ──────────
 *
 * Peter, 2026-09-18: "Each service is either a segment or a ray. All services
 * have a start date. And segments have an end date as well." And, of the
 * season: "I'll compose the seasonality from those changes."
 *
 * So there is NO seasonal formula. A service has a `start`, an optional `end`,
 * the offer it opens on, and a history of change events keyed by mutation id —
 * the same shape the payroll board gives a person. What it bills in any week is
 * the last event at or before that week (`offerAt`), exactly as `payAt` reads
 * pay. A season is a run of those events: Service A opens at 20 h/wk × $18,
 * rises to 30 h/wk in June and drops to 15 h/wk × $20 in September, so it bills
 * $360, $540 and then $300 a week and the balance line takes three slopes.
 *
 * A change is an ABSOLUTE offer that holds until the next one — not an offset.
 * Editing the January level leaves June's 30 hours where they are, because
 * June's event says 30. A drop is still absence (`null`), and a reinstate still
 * DELETES the change, so the service falls back onto whatever it was carrying.
 *
 * The board OPENS on those two seeded events (`SEED_MUTATIONS`), so the as-of
 * chips read June and September from the first frame. With nothing selected the
 * dials read the SPAN'S FIRST WEEK.
 *
 * ── THE CALIBRATION, IN $/WK ────────────────────────────────────────────────
 *
 * Revenue is an INFLOW, so the arithmetic and the words run the same way — up is
 * better, which is the exact opposite of the Scenario Board's payroll gauge.
 *
 * Every row is the reading THE GAUGE GIVES — the rate time-averaged over the
 * whole span, in weeks — for the scenario the board opens on, with the row's
 * change applied to EVERY offer in that service's history, so it holds all
 * year. With FIXED_WEEKLY_COST = 1,700 and COMFORTABLE = 400:
 *
 *     scenario                     revenue/wk   rate/wk   band    why
 *     --------------------------   ----------   -------   ------  ----------------
 *     as it opens                       2,185       485   green   ≥ COMFORTABLE
 *     A's hours +10                     2,372       672   green   raising reads better
 *     A's rate to its floor             2,008       308   yellow  above water, not clear
 *     BOTH rates to their floors        1,408      −292   red     under breakeven
 *
 * The constants are the solution to four inequalities, which is why they are
 * derived here and not chosen (REV0 = 2,184.82, REVafloor = 2,008.22, REVfloor =
 * 1,408.22 — the time-weighted averages of the seeded schedule):
 *
 *     REV0      − FIXED ≥ COMFORTABLE    the board opens green
 *     REVafloor − FIXED > 0              cutting ONE rate is not yet a loss
 *     REVafloor − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     REVfloor  − FIXED < 0              cutting BOTH crosses zero
 *
 * Solving them leaves FIXED ∈ (1,408.22, 2,008.22) and, at FIXED = 1,700,
 * COMFORTABLE ∈ (308.22, 484.82]. 1,700 is within a dollar of the midpoint of
 * the first and 400 sits inside the second with room either side.
 * `rateBandTable()` prints exactly the table above and the test asserts it.
 *
 * ── WHEN, NOT ONLY HOW MUCH ────────────────────────────────────────────────
 *
 * The gauge reads the COMPOSITE — the rate time-averaged over the whole span the
 * board draws — so a change is worth its own rate times the share of the year it
 * is in force for. `weightToReach` is the algebra of that trade for a change
 * between two flat levels; with A's history stepping twice it is the shape of
 * the trade rather than a prediction, and the tests make the empirical claims.
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
  ensureMutation as ensureMutationOn,
  nextFreeSlot as nextFreeSlotOn,
  orderedMutations,
  type SegmentLabel,
  segmentLabelsOf as segmentLabelsOn,
  weekLabel,
  weekSlotOf,
} from "./scenario-board-people";

export { addMutation, orderedMutations, weekLabel, weekSlotOf };
export type { SegmentLabel };

// ── This board's grain is the WEEK ───────────────────────────────────────────
//
// Peter, 2026-09-17: "You should still have clicks on the chart at a weekly
// granularity. That allows for weekly seasonality in projections." A business
// that sells HOURS A WEEK cannot compose a season out of changes on
// a quarterly grid, so this board's calendar runs a grain finer than the
// Scenario Board's.
//
// The grain is bound HERE, once, rather than passed at each of the bench's call
// sites. Both ways a change can be created — a click on the Work Mix plot and a
// drag with nothing selected — have to land on the SAME grid, because
// `addMutation` dedupes on an exact timestamp; a bench that had to remember to
// say `"week"` in two places could forget it in one and put two flags five days
// apart inside one week. `addMutation` itself needs no grain: the caller snaps,
// and exact-timestamp dedupe is then per-week for free.

/** The first free WEEK from the span's start. See `weekSlotOf` for the clamp
 *  that keeps that first slot at the span's own start, and so at weight 1. */
export const nextFreeSlot = (
  domainStart: number,
  domainEnd: number,
  mutations: readonly Mutation[],
): number | undefined =>
  nextFreeSlotOn(domainStart, domainEnd, mutations, "week");

/** The selected change, or a new one at the next free WEEK. */
export const ensureMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly selected: string | null;
  },
  domainStart: number,
  domainEnd: number,
): { mutations: Mutation[]; selected: string | null; created: boolean } =>
  ensureMutationOn(scenario, domainStart, domainEnd, "week");

/** The as-of chips, labelled by WEEK — `W27 · Jun 30`. */
export const segmentLabelsOf = (
  mutations: readonly Mutation[],
): SegmentLabel[] => segmentLabelsOn(mutations, "week");

/** The week slot a picked date belongs to, against THIS board's span. A click
 *  on the Work Mix plot arrives unsnapped (`Chart.onPick` snaps nothing) and
 *  goes through here. */
export const weekOfPick = (at: Date | number): Date =>
  new Date(
    weekSlotOf(
      typeof at === "number" ? at : at.getTime(),
      timeOf(DOMAIN_START),
    ),
  );

// ── The span ─────────────────────────────────────────────────────────────────

/** The year the chart, the work mix and the gauge are all drawn against. */
export const DOMAIN_START = new Date("2025-01-01");
export const DOMAIN_END = new Date("2026-01-01");
export const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

/** Weeks in a year. The week/month bridge. */
export const WEEKS_PER_YEAR = 52;

/** Months in a year. The balance chart steps a month at a time. */
export const MONTHS_PER_YEAR = 12;

/** A week, in ms. Unlike a month, a week IS a fixed length. */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Weeks in an average month — the ONE conversion between this board's unit
 *  ($/wk) and the cash chart's grain (a month). */
export const WEEKS_PER_MONTH = WEEKS_PER_YEAR / MONTHS_PER_YEAR;

/** A WEEKLY rate as a month's worth of it. Every money figure on this board is
 *  $/wk; the cash chart's cells are months, and this is the only place the two
 *  meet. */
export const monthlyFrom = (ratePerWeek: number): number =>
  ratePerWeek * WEEKS_PER_MONTH;

// ── The week grid ────────────────────────────────────────────────────────────
//
// The schedule table and the Work Mix stack are read per WEEK SLOT, so the
// slots have to be the same grid a click lands on — otherwise a reader could
// pick a week the schedule has no row for. They are not re-derived here: `nextFreeSlot` is already the
// exported enumeration of that grid, so walking it once at module load makes
// the two identical by construction rather than by agreement.

/** Every week slot in the span, in order. Slot 0 is the span's own start (a
 *  truncated week — see `weekSlotOf`'s clamp); slot 52 opens on 29 December. */
export const WEEK_SLOTS: readonly number[] = ((): number[] => {
  const slots: number[] = [];
  const taken: Mutation[] = [];
  for (;;) {
    const at = nextFreeSlot(
      DOMAIN_START.getTime(),
      DOMAIN_END.getTime(),
      taken,
    );
    if (at === undefined) break;
    slots.push(at);
    taken.push({ id: String(at), at: new Date(at), label: "" });
  }
  return slots;
})();

/** The number of week slots the span holds — 53, for a 365-day year opening
 *  mid-week. The schedule table has one row each. */
export const WEEK_COUNT = WEEK_SLOTS.length;

/**
 * The week slot a MOMENT falls in, as an index into `WEEK_SLOTS`.
 *
 * Arithmetic rather than a lookup, and CLAMPED at both ends on purpose: a
 * mutation date need not be on the grid (a click is snapped, but a fixture or a
 * date typed into a test is not), and a silent miss would put a July reading on
 * January's hours. Anything at or before the span's start is slot 0 and anything
 * at or after its end is the last slot.
 */
export const slotOfTime = (time: number): number => {
  const firstWholeWeek = WEEK_SLOTS[1];
  const monday = weekOfPick(time).getTime();
  if (firstWholeWeek === undefined || monday < firstWholeWeek) return 0;
  const index = 1 + Math.floor((monday - firstWholeWeek) / WEEK_MS);
  return Math.min(Math.max(index, 0), WEEK_COUNT - 1);
};

/** A day, in ms. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** A timestamp as its UTC calendar date, `2025-08-04`. */
const isoDate = (time: number): string => new Date(time).toISOString().slice(0, 10);

/**
 * The week slot a MOMENT falls in, as its first and last DAY — both inclusive,
 * both inside the span. What the Work Mix hover reads out.
 *
 * The first slot is the truncated week the span opens on (Wed 1 Jan to Sun 5
 * Jan), and the last is cut at the span's end, so neither end ever names a day
 * the board does not draw.
 */
export const weekRangeOf = (
  time: number,
): { start: number; end: number; label: string } => {
  const slot = slotOfTime(time);
  const start = WEEK_SLOTS[slot] ?? DOMAIN_START.getTime();
  const next = WEEK_SLOTS[slot + 1] ?? DOMAIN_END.getTime();
  const end = next - DAY_MS;
  return { start, end, label: `${isoDate(start)} to ${isoDate(end)}` };
};

/**
 * Every moment the schedule can change at: EVERY WEEK SLOT, and each flag.
 *
 * The week slots are in here because a service can begin or end at a moment
 * that is not a flag — a segment's `end` is a date on the service, not a
 * mutation — and a sampler given only the mutation times would carry a service
 * past the week it stopped. Sampling every week costs nothing and catches it.
 *
 * Flags are usually slots already (a click snaps), so the union is normally the
 * slots alone; a mutation off the grid is kept rather than rounded onto one.
 */
export const momentsOf = (mutations: readonly Mutation[]): number[] => {
  const times = new Set<number>(WEEK_SLOTS);
  for (const mutation of mutations) times.add(timeOf(mutation.at));
  return sortBy((time: number) => time, [...times]);
};

// ── The services ─────────────────────────────────────────────────────────────

/** What one service is worth in one WEEK: the pair the dials edit. */
export interface Offer {
  /** Hours a week. */
  readonly hours: number;
  /** Dollars an hour. */
  readonly rate: number;
}

/**
 * A service the business sells — a SEGMENT or a RAY on the time axis (Peter,
 * 2026-09-18: "Each service is either a segment or a ray. All services have a
 * start date. And segments have an end date as well").
 *
 *   • `start` — when it begins billing. Every service has one.
 *   • `end`   — when it stops, EXCLUSIVE. Present = a segment; absent = a ray
 *               that runs off the right edge of the span.
 *
 * Outside `[start, end)` the service does not exist, and `offerAt` reads `null`
 * there — absence, not zero hours.
 *
 * INSIDE it, what the service bills is a history of CHANGE EVENTS, walked
 * exactly the way the payroll board walks pay: `committed` is the offer it
 * opens on at `start`, and `changes` — keyed by mutation id — is every later
 * event, each an ABSOLUTE offer that holds until the next one. There is no
 * formula anywhere: a season is composed from changes (Peter, 2026-09-18: "I'll
 * compose the seasonality from those changes"), so a busy summer is an event in
 * June raising the hours and another in September taking them back down.
 *
 * `committed === null` is a service with NO opening offer — one added in the
 * modal, which exists from the mutation it was added at, carrying one change
 * there. An ABSENT key in `changes` means the service did not move at that
 * mutation; a `null` VALUE is the service being DROPPED there.
 *
 * `hoursRange` / `rateRange` are the per-service ALLOWANCE — the shaded box on
 * each dial and the clamp. They are NOT the axis domain: the axes run 0–80 h/wk
 * and $0–300/hr for the whole row, which is what makes two services comparable.
 */
export interface Service {
  readonly id: string;
  readonly label: string;
  /** When the service begins, as a timestamp. */
  readonly start: number;
  /** When it ends, EXCLUSIVE. Absent = a ray. */
  readonly end?: number;
  /** The offer it opens on at `start`. `null` = added at a mutation instead. */
  readonly committed: Offer | null;
  readonly hoursRange: readonly [number, number];
  readonly rateRange: readonly [number, number];
  readonly changes: Readonly<Record<string, Offer | null>>;
}

/** Is `time` inside the service's own life — on or after `start`, before `end`? */
export const isLiveAt = (service: Service, time: number): boolean =>
  time >= service.start && (service.end === undefined || time < service.end);

/** The two dials, in reading order. `axes` is positioned against this. */
export const HOURS: MeasureIndex = 0;
export const RATE: MeasureIndex = 1;

/** The shared tracks. Peter's numbers; the whole row is drawn on them. */
export const HOURS_DOMAIN: readonly [number, number] = [0, 80];
export const RATE_DOMAIN_PER_HOUR: readonly [number, number] = [0, 300];

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
    start: DOMAIN_START.getTime(),
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
    start: DOMAIN_START.getTime(),
    committed: { hours: 15, rate: 120 },
    // 45 + 32 = 77 keeps the whole stack under the 80 cap.
    hoursRange: [0, 32],
    rateRange: [80, 160],
    changes: {},
  },
];

/** The board opens on Service A's two changes: June up, September down. */
export const SEED_MUTATIONS: readonly Mutation[] = [JUNE, SEPTEMBER];

// ── Walking the history ──────────────────────────────────────────────────────

/** The hours the ALLOWANCE admits. Every offer rides inside it, which is what
 *  keeps the stack under the chart's cap. */
const clampHours = (service: Service, hours: number): number =>
  Math.min(Math.max(hours, service.hoursRange[0]), service.hoursRange[1]);

/** An offer inside the service's allowance. */
const clamped = (service: Service, offer: Offer | null): Offer | null =>
  offer === null ? null : { hours: clampHours(service, offer.hours), rate: offer.rate };

/** The moment a mutation sits at. */
const timeOfMutation = (
  mutationId: string,
  mutations: readonly Mutation[],
): number =>
  timeOf(
    find((mutation: Mutation) => mutation.id === mutationId, mutations)?.at ??
      DOMAIN_START,
  );

/** The offer a service carried JUST BEFORE a mutation. Walks in time order
 *  rather than reading one key, for the same reason the payroll board does: a
 *  service raised at mutation 1 and untouched at mutation 2 has a prior of its
 *  mutation-1 offer while the reader is editing mutation 2. */
const carriedBefore = (
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

/**
 * The offer a service carried JUST BEFORE a mutation — `null` when it had not
 * begun by then, or had already ended.
 *
 * A mutation AT a service's start still reads its opening offer as the prior:
 * that is the dial's fixed tick, and a service that opens on `committed` has
 * that figure from its first instant. A mutation exactly AT a segment's end
 * reads the offer it ends on — the service was live up to that moment, and
 * `offerFrom` then reads `null`, which is the dial's "ended here".
 */
export const offerBefore = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (at < service.start) return null;
  if (service.end !== undefined && at > service.end) return null;
  return clamped(service, carriedBefore(service, mutationId, mutations));
};

/** The offer from a mutation onward: its change at it, or whatever it was on. */
export const offerFrom = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (!isLiveAt(service, at)) return null;
  const own = service.changes[mutationId];
  if (own !== undefined) return clamped(service, own);
  return clamped(service, carriedBefore(service, mutationId, mutations));
};

/**
 * The offer in force at a MOMENT, or `null` when the service is not sold then —
 * outside its `[start, end)`, or dropped. `null` is absence, not zero: a
 * service sold for nothing would still be work.
 *
 * The last change at or before `time` wins, exactly as `payAt` does. Every
 * money figure on the board is a reading of this one function, which is how a
 * change reaches the gauge, the projection and the stack at once.
 */
export const offerAt = (
  service: Service,
  time: number,
  mutations: readonly Mutation[],
): Offer | null => {
  if (!isLiveAt(service, time)) return null;
  let carried = service.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = service.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return clamped(service, carried);
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
  mutations: readonly Mutation[],
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
    // It begins where the reader added it and runs on as a RAY.
    start: timeOfMutation(at, mutations),
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
 * The pairs when there is NO mutation yet: every service on its committed
 * schedule, READ IN THE SPAN'S FIRST WEEK, prior and value the same figures.
 *
 * A separate function rather than a nullable id threaded through the walkers,
 * because the question is different. With a mutation the dials show a CHANGE;
 * with none there is no change to show, and saying so with `prior === value` is
 * what makes every reading downstream fall out with no special case — the delta
 * is zero, no change line is drawn, and the gauge reads exactly the baseline.
 *
 * WHICH WEEK is stated rather than left to fall out, because a service's
 * history steps: the span's FIRST week. The first free slot is that same week
 * (`nextFreeSlot` clamps to the span's start), so a reader's first click
 * proposes a change whose dials already read what these did — nothing jumps.
 */
export const pairsWithoutMutation = (
  services: readonly Service[],
): PairedMutationEntity[] =>
  pipe(
    services,
    filter((service: Service) => service.committed !== null),
    map((service: Service) => {
      const opening = offerAt(service, DOMAIN_START.getTime(), []);
      return pairOf(service, opening, opening);
    }),
  );

/** WEEKLY revenue from one pair of dials, as the summary line reads it — hours
 *  a week times dollars an hour, with no year in it. */
export const weeklyOfPair = (entity: PairedMutationEntity): number => {
  const hours = entity.measures[HOURS].value;
  const rate = entity.measures[RATE].value;
  if (hours === null || rate === null) return 0;
  return hours * rate;
};

// ── The money ────────────────────────────────────────────────────────────────

/** What one offer bills in a WEEK. No ×52: the week IS the unit. */
export const weeklyOf = (offer: Offer | null): number =>
  offer === null ? 0 : offer.hours * offer.rate;

/** What every service sold at a moment bills in that WEEK, added up. */
export const revenueAt = (
  services: readonly Service[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (service: Service) => weeklyOf(offerAt(service, time, mutations)),
      services,
    ),
  );

/**
 * What the business pays out in a WEEK regardless of what it sells — the
 * premises, the tools, the people who are not billable.
 *
 * It lives in the FIXTURE rather than in a component because it is the whole
 * reason breakeven is a number at all: without it every scenario is profitable
 * and the gauge's red half is unreachable. $3,600 is the solution to the
 * calibration's four inequalities and within a dollar of the middle of the
 * interval they leave — see the header.
 */
export const FIXED_WEEKLY_COST = 1_700;

/** The business's rate, given what it bills in a WEEK. */
export const rateFromRevenue = (revenue: number): number =>
  revenue - FIXED_WEEKLY_COST;

/**
 * The comfortable gain, in $/wk. At or above it the gauge lights green, below it
 * yellow; below zero is red, and that split is the gauge's own.
 */
export const COMFORTABLE = 400;

/**
 * The gauge's domain, in $/wk.
 *
 * Sized against the FIXTURE, not against everything the board can become, and
 * the difference is worth stating because `RateGauge` clamps `value` to its
 * domain and announces the DRAWN figure — so a reading outside the domain is a
 * dial that quietly contradicts the terminal.
 *
 *   • The floor is exact and unconditional: every service dropped is no revenue
 *     and all of the fixed cost, which is −FIXED_WEEKLY_COST. Nothing can go
 *     below it, because revenue cannot be negative.
 *   • The ceiling holds for the two services the board OPENS with —
 *     `maxReachableRate(SERVICES)` is 10,520, and the test pins it under this
 *     number. It does NOT hold once services are ADDED: `addService` gives a
 *     service the whole track (it has negotiated no band of its own), so one
 *     added service alone reaches 80 × 300 = $24k/wk, and the count is
 *     unbounded. No per-service range can fix that; only a cap on the row could,
 *     and inventing one would be the board making up a constraint.
 *
 * So the promise is kept the other way round: `drawnRate` states the clamp
 * explicitly, and the DEBUG summary prints the drawn figure BESIDE the raw one.
 * The terminal then reports what the dial draws by construction, and an
 * exploratory scenario that runs off the top says so in words rather than
 * looking like a gauge that has stopped responding.
 */
export const RATE_DOMAIN: readonly [number, number] = [-1_700, 5_500];

/**
 * What the gauge will actually DRAW for a rate — the domain clamp, named.
 *
 * `RateGauge` applies exactly this to `value` before it draws or announces
 * anything, so the consumer that wants its table to agree with its dial applies
 * it too rather than assuming the two never differ.
 */
export const drawnRate = (rate: number): number =>
  Math.min(Math.max(rate, RATE_DOMAIN[0]), RATE_DOMAIN[1]);

/** Is this rate off the end of the dial? Then the table must say so. */
export const isOffDial = (rate: number): boolean => drawnRate(rate) !== rate;

/**
 * The highest rate the fixture's ranges can reach, in $/wk — the domain's
 * ceiling test.
 *
 * The allowance is what bounds it whatever the history says: `clampHours`
 * holds every offer inside the range, so "every week at the top of the
 * allowance" really is the most the board can bill.
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
//
// Time is weighted in WEEKS or MONTHS rather than milliseconds, and that is a
// decision rather than a convenience: a calendar month is not 1/12 of a year, so
// a change made on 1 July weighs 0.4959 of a year in milliseconds and exactly
// half of it in months. This board counts WEEKS — its changes land on ISO weeks
// and its schedule is quoted per week — so weeks are the default wherever it
// asks; the month reading stays available beside it.
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
 * Weeks from one moment to another.
 *
 * Plain division, and the contrast with `monthsBetween` is the reason weeks are
 * worth having: a calendar month is not 1/12 of a year, so month positions need
 * a walk over each month's own length, while every week is seven days. On a
 * board whose changes land on ISO weeks that makes the unit both exact and the
 * one the reader is counting in.
 */
export const weeksBetween = (from: number, to: number): number =>
  (to - from) / WEEK_MS;

/**
 * THE UNIT time is weighted in.
 *
 * `"month"` is what the composite reading was built in and stays the default,
 * so nothing that does not ask changes. `"week"` is what this board asks for:
 * its changes land on ISO weeks, so a weight quoted in months would round a
 * reader's own grid away.
 *
 * The two barely disagree over a year — a change on 1 April is 0.75 of it in
 * months and 0.7534 in weeks — and that is the point: the unit is a statement
 * about what the reader is counting, not a correction to a wrong number.
 */
export type RateUnit = "month" | "week";

const spanIn = (unit: RateUnit, from: number, to: number): number =>
  unit === "week" ? weeksBetween(from, to) : monthsBetween(from, to);

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
  unit: RateUnit = "month",
): number => {
  const span = spanIn(unit, start, end);
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
    weighted += spanIn(unit, from, to) * revenue(from);
  }
  return rateFromRevenue(weighted / span);
};

/** The share of the span a change made at `at` is in force for. */
export const weightFrom = (
  start: number,
  end: number,
  at: number,
  unit: RateUnit = "month",
): number => {
  const span = spanIn(unit, start, end);
  if (span <= 0) return 0;
  return Math.min(Math.max(spanIn(unit, at, end) / span, 0), 1);
};

/**
 * THE GAUGE'S READING: the scenario's rate averaged over the whole year, in
 * WEEKS.
 *
 * Not the selected change's own rate, which would say a service dropped in
 * December costs the year what the same service dropped in January does.
 *
 * Weeks rather than months because every change on this board lands on an ISO
 * week and every hours figure is quoted per week — the average samples the
 * revenue at each change and weights it by the weeks it is in force for, so a
 * scenario whose hours alternate WEEK TO WEEK reads differently from the flat
 * one with the same mean. That is the seasonality Peter composes from changes,
 * and it is why the unit is not a detail. `unit` is still a parameter,
 * defaulting here to weeks, so a test can print both readings side by side.
 *
 * It samples EVERY WEEK (`momentsOf`), not only the flags — see there.
 */
export const averageRate = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  services: readonly Service[],
  unit: RateUnit = "week",
): number =>
  averageRateOver(
    timeOf(domain[0]),
    timeOf(domain[1]),
    momentsOf(mutations),
    (time: number) => revenueAt(services, time, mutations),
    unit,
  );

/**
 * The COMMITTED rate, in $/wk — what the scenario the board OPENS on bills on
 * average over the year, June and September included, less the fixed cost.
 *
 * THE SAME CALL the gauge makes for its own value, so the two are equal by
 * construction rather than by arithmetic that could drift: on the opening
 * scenario the delta is zero and the brace reads "no change to revenue". It is
 * not the opening WEEK's rate — A bills $360 in January and $540 in summer —
 * and that gap is why the calibration is solved against the average.
 */
export const COMMITTED_RATE = averageRate(
  TIME_DOMAIN,
  SEED_MUTATIONS,
  SERVICES,
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
 * from the committed rate past a THRESHOLD:
 *
 *     COMMITTED + w × (changed − COMMITTED) < threshold
 *
 * EXACT for a change between two FLAT levels, which is what its two arguments
 * are — two rates. Service A's history steps twice, so neither level is flat;
 * read this as the shape of the trade rather than a prediction about this
 * fixture. The empirical claims are the tests'.
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

/**
 * The calibration, as data — each row the reading THE GAUGE GIVES for the
 * scenario the board OPENS on (`SEED_MUTATIONS`), with the row's change applied
 * to every week of the year.
 */
export const rateBandTable = (
  services: readonly Service[] = SERVICES,
): RateRow[] => {
  const row = (scenario: string, scenarioServices: Service[]): RateRow => {
    const rate = averageRate(TIME_DOMAIN, SEED_MUTATIONS, scenarioServices);
    return {
      scenario,
      revenue: rate + FIXED_WEEKLY_COST,
      rate,
      band: bandOfRate(rate),
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

/**
 * The hours-a-week points for one service. Changes only, opening at the edge.
 *
 * It walks EVERY WEEK (`momentsOf`), so a segment's start or end lands in the
 * week it happens even when no flag sits there. It emits CHANGES only — a week
 * repeating the previous week's hours spends a transition on nothing — so a
 * flat stretch costs one point and Service A's year costs three.
 *
 * Dropping to ZERO is a change and IS emitted, because that is what collapses
 * the band onto the edge below it.
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
 * Population standard deviation of a list of numbers — the measure of "how
 * big are the bumps" `byVariability` sorts on.
 */
const stdDev = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const mean = sum(values) / values.length;
  return Math.sqrt(
    sum(map((value: number) => (value - mean) ** 2, values)) / values.length,
  );
};

/**
 * ONE SERVICE'S VARIABILITY: the standard deviation of its hours across
 * every week slot in the span (`WEEK_SLOTS`), read from the LIVE schedule —
 * every change in its history (`offerAt`). So a scenario that makes a service
 * swing harder moves it up the stack the moment the reader makes that change.
 *
 * Std dev rather than peak-to-trough: Peter, 2026-09-18, asked for "the one
 * with the biggest bumps", and std dev weighs how LONG each level lasts, where
 * peak-to-trough would see only the two extremes — a one-week blip would rank
 * a service as high as a whole summer at a different level.
 */
export const variabilityOf = (
  service: Service,
  mutations: readonly Mutation[],
): number =>
  stdDev(
    map(
      (at: number) => offerAt(service, at, mutations)?.hours ?? 0,
      WEEK_SLOTS,
    ),
  );

/**
 * Services ordered ASCENDING by variability — so the MOST variable service
 * is LAST, which `StackedAreaSeries` draws as the TOP band (its own header:
 * "array order is stacking order"). Peter, 2026-09-18: "Sort by
 * variability. So the one with the biggest bumps is on top."
 *
 * `sortBy` is STABLE, so two services whose variability ties keep the
 * FIXTURE'S OWN order rather than swapping as the reader edits toward and
 * away from the tie.
 */
export const byVariability = (
  services: readonly Service[],
  mutations: readonly Mutation[],
): Service[] =>
  sortBy((service: Service) => variabilityOf(service, mutations), services);

/**
 * One row of the DEBUG stack-order table: a service's variability beside
 * where it landed in the stack — position 0 is the bottom band. Printed so
 * the order `byVariability` chose can be argued with from a terminal before
 * anyone looks at which band is on top.
 */
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
      stdDevHoursPerWeek: Math.round(variabilityOf(service, mutations) * 100) / 100,
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

/**
 * One band per service, ordered by `byVariability` — the MOST variable
 * service is LAST in the array, which is the TOP band (see `byVariability`'s
 * header and `StackedAreaSeries`'s: "array order is stacking order and
 * palette order").
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
 * shape can be argued with from a terminal before anyone opens the chart.
 *
 * This is the observation the Work Mix chart draws and the projection
 * integrates: one row per week slot, every service's hours beside the total and
 * what it bills. A stepped history is exactly the kind of thing that looks
 * plausible in a picture and wrong in a column of numbers, so it is printed.
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
 * THE WEEKS ONE SAMPLING UNIT HOLDS — the whole of the unit conversion, named.
 *
 * The rate is quoted per WEEK, so a stretch measured in weeks needs no
 * conversion at all and the integral is `weeks × $/wk` exactly as Peter's
 * ruling states it. A stretch measured in months needs the one factor there is,
 * and it is `monthlyFrom`'s factor: both rows of this table and that function
 * are the same statement, which is why they are written next to each other.
 *
 * This replaces a `UNITS_PER_YEAR` divisor. A divisor was the right shape while
 * the rate was annual; with a weekly rate it would be a second, invisible ×52.
 */
const WEEKS_PER_UNIT: Readonly<Record<RateUnit, number>> = {
  month: WEEKS_PER_MONTH,
  week: 1,
};

/** The first instant of each of `count` consecutive months from `from`. The
 *  balance chart's own cell edges — `monthlyCells(DOMAIN_START, …)[i].start` —
 *  stated as a number the arithmetic can take, so the projection's integral and
 *  the drawn cells cannot disagree about where a month begins. */
export const monthStarts = (from: Date, count: number): number[] => {
  const starts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    starts.push(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1));
  }
  return starts;
};

/**
 * The balance a rate ACCRUES between two moments — the projection's integral.
 *
 *     accrued = Σ over each stretch between changes of
 *                   span(stretch, unit) × weeksPerUnit × rate(at its start)
 *
 * The rate is $/WK and the stretches are weeks, so in this board's own unit that
 * is `weeks × $/wk` with nothing in between — the conversion factor is 1, and
 * the `WEEKS_PER_UNIT` table above says so out loud rather than leaving a ×52
 * hidden in a divisor.
 *
 * A SUM rather than one multiplication, and that is the whole of Peter's ruling
 * (2026-09-17): weekly seasonality has to reach the cash flow projection, not
 * only the gauge. One scalar rate times the elapsed months draws the same
 * straight slope whatever the weeks did, so a scenario alternating 30 and 10
 * hours week to week projected as a flat line while the gauge beside it read
 * the swing. Integrating the SAMPLED rate makes each stretch carry its own
 * reading, so the deltas differ cell to cell and the line bends.
 *
 * The walk is over the CHANGE MOMENTS rather than over a fixed grid of weeks,
 * and the two agree by construction on this board: every mutation is snapped to
 * an ISO week (`weekOfPick`), so a stretch between two changes is a whole number
 * of weeks and summing the stretches IS summing `rateAt(week) × 1/52` over
 * them. Walking the moments is also exact when they are not — a change landing
 * mid-week is weighted by the fraction of the week it is in force for instead of
 * being rounded onto the nearest sample.
 *
 * Moments outside the stretch are IGNORED, the same rule `averageRateOver`
 * follows: one before it is already in the rate at the start, and one after it
 * never happens inside the stretch being projected.
 */
export const accruedOver = (
  from: number,
  to: number,
  moments: readonly number[],
  rate: (time: number) => number,
  unit: RateUnit = "month",
): number => {
  if (to <= from) return 0;
  const inside = filter(
    (moment: number) => moment > from && moment < to,
    moments,
  );
  const edges = [from, ...sortBy((moment: number) => moment, inside), to];
  let accrued = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index] ?? from;
    const end = edges[index + 1] ?? to;
    accrued += spanIn(unit, start, end) * WEEKS_PER_UNIT[unit] * rate(start);
  }
  return accrued;
};

/**
 * WHAT THE PROJECTION SAMPLES: the rate as a function of time, the moments it
 * can change at, the cell edges to integrate between, and the unit to sum in.
 *
 * One object rather than four positional arguments because they are one
 * decision — "how is the forward rate read?" — and a caller that has an answer
 * for `rate` always has one for `moments`.
 */
export interface RateSampling {
  /** The first instant of each cell, in ms. Same length and order as the
   *  committed balances. See `monthStarts`. */
  readonly boundaries: readonly number[];
  /** The rate in force from a moment onward. `rateAt` bound to a scenario — or
   *  `() => rate` for a flat projection, which is the same one code path. */
  readonly rate: (time: number) => number;
  /** The moments the rate is allowed to change at. The mutation times. */
  readonly moments: readonly number[];
  /** The unit the integral is summed in. MONTHS unless the board counts weeks —
   *  the Hourly Board does, because its changes land on ISO weeks. */
  readonly unit?: RateUnit;
}

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward by
 * INTEGRATING the sampled rate from the pivot.
 *
 *     balance(m) = balance(now) + accruedOver(now, m, …)
 *
 * This is the wire from the dials to the chart. A drag changes the rate, the
 * rate changes every month after now, and the line visibly pivots about the now
 * point. Before now nothing moves, because the past is not a forecast.
 *
 * A FLAT scenario integrated in MONTHS reproduces the straight slope this
 * function used to draw, exactly rather than nearly: `monthsBetween` is integral
 * on month boundaries and the cell edges are month boundaries, so the sum
 * collapses to `rate/12 × (m − now)`. That equality is the proof the change is
 * additive in behaviour — see `hourly-board-model.test.ts`.
 */
export const projectedBalances = (
  committed: readonly number[],
  sampling: RateSampling,
  nowIndex: number,
): number[] =>
  map((_balance: number, index: number) => {
    const pivotIndex = Math.min(nowIndex, committed.length - 1);
    const pivot = committed[pivotIndex] ?? 0;
    if (index <= nowIndex) return committed[index] ?? pivot;
    const from = sampling.boundaries[pivotIndex];
    const to = sampling.boundaries[index];
    if (from === undefined || to === undefined) return pivot;
    return (
      pivot +
      accruedOver(
        from,
        to,
        sampling.moments,
        sampling.rate,
        sampling.unit ?? "month",
      )
    );
  }, committed);

/** One row of the DEBUG projection table: the rate the projection SAMPLED for
 *  that cell and what it did to the balance. The per-cell number that was
 *  invisible while the projection took one scalar. */
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
