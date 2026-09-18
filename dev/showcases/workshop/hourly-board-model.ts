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
 *   seasonalHours ────────────▶ offerAt  (the committed weekly schedule)
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
 * ── THE BASELINE IS A SEASON, NOT A NUMBER ─────────────────────────────────
 *
 * Peter, 2026-09-18: "Model them having more work in the summer and less
 * winter. Spikes during 4th of July and Labor Day and spring break."
 *
 * So a service's COMMITTED hours are a CURVE over the 53 week slots of the span
 * (`seasonalHours`), not a scalar: a smooth annual cosine peaking in July /
 * August and troughing in January / February, plus a one-week additive spike on
 * the weeks holding spring break, Independence Day and Labor Day. Service B
 * peaks four weeks after Service A, so the stack reads as two shapes rather than
 * one shape drawn twice. The two services' stack peaks at 61 h/wk in the Labor
 * Day week and troughs at 25 in mid-February — over the 40-hour rule in summer,
 * under it in winter, and inside the 80 cap everywhere, which is the reading the
 * dashed rule and the fixed domain exist to give.
 *
 * This is the BASELINE. The board still opens with ZERO mutations: the season is
 * what the business has already committed to, not something proposed.
 *
 * ── HOW A PROPOSED CHANGE COMPOSES WITH THE SEASON ─────────────────────────
 *
 * A change is an OFFSET, carried forward — not a level:
 *
 *     hours(week) = clamp(seasonalHours(shape, week) + offset(week))
 *     offset      = 0 before the first change; after a change in week c that
 *                   set the hours to h, it is h − seasonalHours(shape, c), and
 *                   it carries until the next change
 *
 * So "+10 h/wk from July" means ten hours ON TOP OF the season for the rest of
 * the year, which is what a person proposing more work means, and the dial's
 * prior and value are both read in the week being edited — their difference is
 * therefore the change the reader made and never the season's own drift. A drop
 * is still absence (`null`), and a reinstate still DELETES the change, so the
 * service falls back onto whatever offset it was carrying.
 *
 * `changes` stores the ABSOLUTE hours the reader set, and the offset is derived
 * from the change's own week at read time. That way what is stored is what the
 * dial said, and the storage cannot disagree with the curve it was read against.
 *
 * With nothing selected the dials read the SPAN'S FIRST WEEK — so clicking that
 * week changes nothing, which is the only reading that makes the first click a
 * no-op rather than a jump.
 *
 * ── THE CALIBRATION, RE-SOLVED IN $/WK ─────────────────────────────────────
 *
 * Revenue is an INFLOW, so the arithmetic and the words run the same way — up is
 * better, which is the exact opposite of the Scenario Board's payroll gauge.
 *
 * Every row is the reading THE GAUGE GIVES: the rate time-averaged over the
 * whole span, with the change made at the span's start so it is in force for all
 * of it (weight 1). Because the baseline is seasonal, the average is no longer
 * the same number as the opening week's rate — the average is what the dial
 * shows, so the average is what the constants are solved against. With
 * FIXED_WEEKLY_COST = 3,600 and COMFORTABLE = 1,000:
 *
 *     scenario                     revenue/wk   rate/wk   band    why
 *     --------------------------   ----------   -------   ------  ----------------
 *     as it opens                       4,937     1,337   green   ≥ COMFORTABLE
 *     A's hours +10 (offset)            6,437     2,837   green   raising reads better
 *     A's rate to its floor             3,908       308   yellow  above water, not clear
 *     BOTH rates to their floors        3,291      −309   red     under breakeven
 *
 * The constants are the solution to four inequalities, which is why they are
 * derived here and not chosen (REV0 = 4,936.52, REVafloor = 3,908.44, REVfloor =
 * 3,291.01 — the time-weighted averages of the seasonal schedule, fixed by the
 * fixture's own shapes and ranges):
 *
 *     REV0      − FIXED ≥ COMFORTABLE    the board opens green
 *     REVafloor − FIXED > 0              cutting ONE rate is not yet a loss
 *     REVafloor − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     REVfloor  − FIXED < 0              cutting BOTH crosses zero
 *
 * Raising a service's hours needs no inequality of its own: revenue only rises,
 * so a board that opens green stays green — which is the reading Peter asked for
 * and the sign that the gauge is wired up the right way round. That row is
 * EXACTLY +$1,500/wk (ten hours at $150 every week of the year), and it is exact
 * only because Service A's allowance was widened to 45 h/wk so the offset never
 * meets the clamp — see the fixture.
 *
 * Solving them leaves FIXED ∈ (3,291.01, 3,908.44) and, at FIXED = 3,600,
 * COMFORTABLE ∈ (308.44, 1,336.52]. 3,600 is within a dollar of the midpoint of
 * the first and 1,000 sits inside the second with room either side, so nothing
 * here balances on a knife edge. `rateBandTable()` prints exactly the table
 * above and the test asserts it.
 *
 * ── WHEN, NOT ONLY HOW MUCH ────────────────────────────────────────────────
 *
 * The gauge reads the COMPOSITE — the rate time-averaged over the whole span the
 * board draws — so a change is worth its own rate times the share of the year it
 * is in force for, and the table above is the w = 1 case rather than the only
 * case.
 *
 * That the table describes the OPENING MOVE at all is a fact about
 * `nextFreeSlot`: the first free WEEK is clamped to the span's own start, so the
 * first interaction a reader makes lands at weight 1 and the dial agrees with
 * the table. The test pins that.
 *
 * `weightToReach` is the algebra of that trade — the share of the span a change
 * must still have ahead of it to pull the average past a threshold — and it is
 * exact for a change BETWEEN TWO FLAT LEVELS. Under a seasonal baseline neither
 * level is flat, so it is a reading of the shape of the trade rather than a
 * prediction about this fixture, and the empirical claim is the one the test
 * makes instead: both rates cut to their floors in APRIL leaves the gauge
 * yellow, where the same cut in January reads red. That is not a
 * miscalibration — it is the composite reading doing its job.
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
// that sells HOURS A WEEK cannot say anything about week-to-week seasonality on
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

/** Weeks in a year. The cosine's period, and the week/month bridge. */
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
// The season is quoted per WEEK SLOT, so the slots have to be the same grid a
// click lands on — otherwise a reader could pick a week the schedule has no
// reading for. They are not re-derived here: `nextFreeSlot` is already the
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
 *  mid-week. The season's table has one row each. */
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

/**
 * Every moment the schedule can change at: EVERY WEEK SLOT, and each flag.
 *
 * The week slots are in here because the baseline is seasonal — the rate now
 * moves every week whether or not anybody proposed anything, so a sampler given
 * only the mutation times would read a flat year and the gauge and the
 * projection would both miss the season they are drawn to show.
 *
 * Flags are usually slots already (a click snaps), so the union is normally the
 * slots alone; a mutation off the grid is kept rather than rounded onto one.
 */
export const momentsOf = (mutations: readonly Mutation[]): number[] => {
  const times = new Set<number>(WEEK_SLOTS);
  for (const mutation of mutations) times.add(timeOf(mutation.at));
  return sortBy((time: number) => time, [...times]);
};

// ── The season ───────────────────────────────────────────────────────────────

/**
 * The shape of one service's committed year, in hours a week.
 *
 * A SHAPE rather than 53 numbers because the reader is meant to be able to say
 * what the picture means: a base, how hard it swings, when it peaks, and how
 * much a holiday week adds. The spike WEEKS are not in here — they are calendar
 * facts shared by every service (see `SPIKE_SLOTS`), and giving each service its
 * own would invite two services with different Labor Days.
 */
export interface SeasonalShape {
  /** The hours a week the curve swings about. */
  readonly base: number;
  /** How far it swings, as a fraction of the base. 0.3 = ±30%. */
  readonly swing: number;
  /** The week slot the curve peaks in; it troughs 26 slots away. */
  readonly peakSlot: number;
  /** What a spike week adds, as a fraction of the base. */
  readonly spike: number;
}

/** The year the span opens in — the calendar the holidays are read from. */
const SPAN_YEAR = DOMAIN_START.getUTCFullYear();

/** The first Monday of a month, as a UTC timestamp. Labor Day, by definition. */
const firstMondayOf = (year: number, month: number): number => {
  for (let day = 1; day <= 7; day += 1) {
    const at = Date.UTC(year, month, day);
    if (new Date(at).getUTCDay() === 1) return at;
  }
  return Date.UTC(year, month, 1);
};

/**
 * The three weeks that spike, as dates — spring break, Independence Day and
 * Labor Day, in span order.
 *
 * Spring break has no fixed date, so mid-March is a CHOICE (Peter: "spring
 * break (choose mid-March, say the week)") and it is named here rather than
 * buried in a slot number. The other two are derived from the calendar: the 4th
 * of July is a date, Labor Day is the first Monday of September.
 */
export const SPIKE_DATES: readonly number[] = [
  Date.UTC(SPAN_YEAR, 2, 15),
  Date.UTC(SPAN_YEAR, 6, 4),
  firstMondayOf(SPAN_YEAR, 8),
];

/** The same three, as week slots — 10 (Mar 10), 26 (Jun 30) and 35 (Sep 1). */
export const SPIKE_SLOTS: readonly number[] = sortBy(
  (slot: number) => slot,
  map((at: number) => slotOfTime(at), SPIKE_DATES),
);

/** Is this week one of the three that spike? */
export const isSpikeWeek = (week: number): boolean =>
  some((slot: number) => slot === week, SPIKE_SLOTS);

/**
 * THE COMMITTED SCHEDULE, for one service in one week — hours a week.
 *
 *     base × (1 + swing × cos(2π(week − peakSlot)/52))  +  spike on 3 weeks
 *
 * A cosine because the year is a cycle and a reader can name its two ends: the
 * peak is where the cosine is 1 and the trough is 26 slots away, so "peaks in
 * July, troughs in January" is a single number (`peakSlot`) rather than a table
 * somebody has to check. The spike is ADDITIVE and lasts exactly one week,
 * which is what a holiday week is — not a change in the season.
 *
 * WHOLE HOURS. The dials snap to 1 and `formatHours` rounds, so a schedule with
 * a fractional hour in it would be a figure the board cannot show and the dial
 * cannot emit. Rounding here means the table, the stack and the dial all read
 * the same number.
 */
export const seasonalHours = (shape: SeasonalShape, week: number): number => {
  const phase = (2 * Math.PI * (week - shape.peakSlot)) / WEEKS_PER_YEAR;
  const curve = shape.base * (1 + shape.swing * Math.cos(phase));
  return Math.round(curve + (isSpikeWeek(week) ? shape.base * shape.spike : 0));
};

/**
 * A FLAT shape at `base` — no swing, no spike.
 *
 * What a service ADDED in the modal gets. It has negotiated no season any more
 * than it has negotiated a range: the reader typed one figure, and inventing a
 * summer for it would be the board making up a fact. Its offset is then zero
 * everywhere and it holds the figure it was added at, exactly.
 */
export const flatShape = (base: number): SeasonalShape => ({
  base,
  swing: 0,
  peakSlot: 0,
  spike: 0,
});

// ── The services ─────────────────────────────────────────────────────────────

/** What one service is worth in one WEEK: the pair the dials edit. */
export interface Offer {
  /** Hours a week. */
  readonly hours: number;
  /** Dollars an hour. */
  readonly rate: number;
}

/**
 * What a service is COMMITTED to, before anything is proposed against it.
 *
 * Only the rate. The hours are a curve, not a number, so they live in
 * `seasonal` — and keeping them out of here means there is exactly one place
 * the committed schedule is written down. `committed === null` is still the
 * whole of "not sold yet", which is what `isSoldAt` and `addedAt` read.
 */
export interface Committed {
  /** Dollars an hour. */
  readonly rate: number;
}

/**
 * A service the business sells.
 *
 * `seasonal` is the committed weekly SCHEDULE's shape and is always present,
 * including for a service added in the modal (a flat shape — see `flatShape`),
 * because `offerAt` has to have a curve to read whether or not the service was
 * ever committed.
 *
 * `hoursRange` / `rateRange` are the per-service ALLOWANCE — the shaded box on
 * each dial and the clamp. They are NOT the axis domain: the axes run 0–80 h/wk
 * and $0–300/hr for the whole row, which is what makes two services comparable,
 * and each service's own range says what THIS service is allowed inside that.
 * `hoursRange` is also what keeps the STACK inside the cap: the two fixture
 * services' ceilings add to 77 h/wk, under the 80 the chart is drawn to.
 *
 * `changes` is keyed by mutation id and holds the ABSOLUTE hours the reader set
 * in that week (the offset from the curve is derived from the change's own week
 * — see the header). An ABSENT key means this service did not move at that
 * mutation — not that it was sold for nothing. That absence is the whole reason
 * the history is a map: adding a mutation needs no change to anybody's history.
 * A `null` VALUE is the service being DROPPED at that mutation, which is what
 * "removal = both measures null" looks like in storage.
 */
export interface Service {
  readonly id: string;
  readonly label: string;
  /** The committed weekly schedule's shape. Always present. */
  readonly seasonal: SeasonalShape;
  /** The committed rate. `null` = not sold yet. */
  readonly committed: Committed | null;
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
    // 20 h/wk on average, swinging ±30% about a late-July peak: 14 h/wk in
    // February, 26 in August, 35 in a spike week.
    seasonal: {
      base: 20,
      swing: 0.3,
      peakSlot: slotOfTime(Date.UTC(SPAN_YEAR, 6, 28)),
      spike: 0.5,
    },
    committed: { rate: 150 },
    // 45 and not 30: the committed schedule itself reaches 35 h/wk in a spike
    // week, so the old allowance would have clamped the BASELINE — and 45 is
    // what lets the calibration's +10 offset ride the whole curve without
    // meeting the clamp, which is what keeps that row exactly +$1,500/wk.
    hoursRange: [0, 45],
    rateRange: [100, 200],
    changes: {},
  },
  {
    id: "service-b",
    label: "Service B",
    // The SAME season read four weeks later and a third less hard, so the two
    // bands are two shapes rather than one drawn twice: B is still climbing
    // while A has turned over.
    seasonal: {
      base: 15,
      swing: 0.25,
      peakSlot: slotOfTime(Date.UTC(SPAN_YEAR, 7, 25)),
      spike: 0.5,
    },
    committed: { rate: 120 },
    // 32 holds its own spike week (26 h/wk) with room to raise, and 45 + 32 =
    // 77 keeps the whole stack under the 80 cap.
    hoursRange: [0, 32],
    rateRange: [80, 160],
    changes: {},
  },
];

/** The board opens with nothing proposed. */
export const SEED_MUTATIONS: readonly Mutation[] = [];

// ── Walking the history ──────────────────────────────────────────────────────

/**
 * WHAT A CHANGE MEANS, once the season is taken out of it: an hours OFFSET from
 * the committed curve, and a rate. `null` — anywhere a level is carried — is the
 * service not being sold, which covers both dropped and not-yet-added.
 *
 * This is the type the history is really written in. `changes` stores absolute
 * hours (what the dial said), and the offset is derived from the change's own
 * week here, so the two cannot disagree about the curve they were read against.
 */
interface Level {
  readonly offsetHours: number;
  readonly rate: number;
}

/** The committed level: on the curve exactly, at the committed rate. */
const committedLevel = (service: Service): Level | null =>
  service.committed === null
    ? null
    : { offsetHours: 0, rate: service.committed.rate };

/** What a stored change means as a level, read against ITS OWN week. */
const levelOf = (service: Service, change: Offer, at: number): Level => ({
  offsetHours: change.hours - seasonalHours(service.seasonal, slotOfTime(at)),
  rate: change.rate,
});

/** The hours the ALLOWANCE admits. The schedule and every offset ride inside
 *  it, which is what keeps the stack under the chart's cap. */
const clampHours = (service: Service, hours: number): number =>
  Math.min(Math.max(hours, service.hoursRange[0]), service.hoursRange[1]);

/** THE COMMITTED SCHEDULE at a moment, in hours a week — the baseline with no
 *  proposal in it at all. What the Work Mix chart draws before the first click. */
export const scheduledHours = (service: Service, time: number): number =>
  clampHours(service, seasonalHours(service.seasonal, slotOfTime(time)));

/** A level READ IN A WEEK: the season plus the offset, inside the allowance. */
const offerOf = (
  service: Service,
  level: Level | null,
  time: number,
): Offer | null =>
  level === null
    ? null
    : {
        hours: clampHours(
          service,
          seasonalHours(service.seasonal, slotOfTime(time)) + level.offsetHours,
        ),
        rate: level.rate,
      };

/** The moment a mutation sits at — the week its change is read in. */
const timeOfMutation = (
  mutationId: string,
  mutations: readonly Mutation[],
): number =>
  timeOf(
    find((mutation: Mutation) => mutation.id === mutationId, mutations)?.at ??
      DOMAIN_START,
  );

/** The level a service carried just BEFORE a mutation. Walks in time order
 *  rather than reading one key, for the same reason the payroll board does: a
 *  service raised at mutation 1 and untouched at mutation 2 has a prior of its
 *  mutation-1 level while the reader is editing mutation 2. */
const levelBefore = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Level | null => {
  let carried = committedLevel(service);
  for (const mutation of orderedMutations(mutations)) {
    if (mutation.id === mutationId) return carried;
    const own = service.changes[mutation.id];
    if (own !== undefined)
      carried =
        own === null ? null : levelOf(service, own, timeOf(mutation.at));
  }
  return carried;
};

/**
 * The offer a service carried JUST BEFORE a mutation, read IN THAT MUTATION'S
 * WEEK.
 *
 * The week matters and it is the mutation's own: the dial's prior and value are
 * then two readings of the same week, so their difference is the change the
 * reader made and never the season's drift between two dates.
 */
export const offerBefore = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null =>
  offerOf(
    service,
    levelBefore(service, mutationId, mutations),
    timeOfMutation(mutationId, mutations),
  );

/**
 * The offer from a mutation onward, in that mutation's week: its change at it,
 * or whatever it was on.
 *
 * A change stored AT this mutation is read back as itself — the offset is
 * derived from this very week, so adding it back to this week's season returns
 * the figure the dial wrote (clamped to the allowance, as the dial is).
 */
export const offerFrom = (
  service: Service,
  mutationId: string,
  mutations: readonly Mutation[],
): Offer | null => {
  const own = service.changes[mutationId];
  if (own === undefined) return offerBefore(service, mutationId, mutations);
  if (own === null) return null;
  return { hours: clampHours(service, own.hours), rate: own.rate };
};

/**
 * The offer in force at a MOMENT, or `null` when the service is not sold then.
 * `null` is absence, not zero: a service sold for nothing would still be work.
 *
 * THE SEASON IS IN HERE. With no change at all this is the committed schedule's
 * own reading for that week; with changes it is the last one's offset carried
 * forward onto that week's curve. Every other money figure on the board is a
 * reading of this one function, which is why the season reaches the gauge, the
 * projection and the stack without any of them knowing about it.
 */
export const offerAt = (
  service: Service,
  time: number,
  mutations: readonly Mutation[],
): Offer | null => {
  let carried = committedLevel(service);
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = service.changes[mutation.id];
    if (own !== undefined)
      carried =
        own === null ? null : levelOf(service, own, timeOf(mutation.at));
  }
  return offerOf(service, carried, time);
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
    // FLAT, for the same reason the range is the whole track: a service invented
    // in a modal has negotiated no season, and giving it a summer would be the
    // board inventing a fact about it. Its offset is zero everywhere, so it
    // holds the figure it was added at exactly.
    seasonal: flatShape(draft.hours ?? 0),
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
 * WHICH WEEK, now that the hours are a curve, is the boundary case of the
 * composition rule and so is stated rather than left to fall out: the span's
 * FIRST week. The first free slot is that same week (`nextFreeSlot` clamps to
 * the span's start), so a reader's first click proposes a change whose dials
 * already read what these did — nothing jumps. Reading the curve's BASE instead
 * would make the opening dial disagree with both the chart's left edge and the
 * first change the reader can make.
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
export const FIXED_WEEKLY_COST = 3_600;

/** The business's rate, given what it bills in a WEEK. */
export const rateFromRevenue = (revenue: number): number =>
  revenue - FIXED_WEEKLY_COST;

/**
 * The comfortable gain, in $/wk. At or above it the gauge lights green, below it
 * yellow; below zero is red, and that split is the gauge's own.
 */
export const COMFORTABLE = 1_000;

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
export const RATE_DOMAIN: readonly [number, number] = [-3_600, 11_000];

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
 * The allowance is what bounds it whatever the season does: an offset large
 * enough to lift the curve's trough to the ceiling puts its peak through it, and
 * `clampHours` holds the whole schedule inside the range. So "every week at the
 * top of the allowance" really is the most the board can bill.
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
 * one with the same mean. That is the seasonality Peter asked for, and it is
 * why the unit is not a detail. `unit` is still a parameter, defaulting here
 * to weeks, so a test can print both readings side by side.
 *
 * It samples EVERY WEEK (`momentsOf`), not only the flags. With a seasonal
 * baseline the revenue moves week to week whether or not anybody proposed
 * anything, so a sampler given the mutation times alone would read a flat year
 * — and the gauge would ignore the season the chart above it draws. With no
 * mutation at all this is therefore the time-weighted average of the committed
 * schedule, which is exactly what `COMMITTED_RATE` is.
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
 * The COMMITTED rate, in $/wk — what the fixture's seasonal schedule bills on
 * average before anything is proposed, less the fixed cost.
 *
 * THE SAME CALL the gauge makes for its own baseline, so the two are equal by
 * construction rather than by arithmetic that could drift: with no mutation the
 * gauge's value IS this number, the delta is zero and the brace reads "no change
 * to revenue". It is no longer the opening WEEK's rate — the opening week is
 * January, near the trough — and that gap is the whole reason the calibration is
 * solved against the average.
 */
export const COMMITTED_RATE = averageRate(TIME_DOMAIN, [], SERVICES);

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
 * are — two rates. Under a seasonal baseline neither level is flat, so read this
 * as the shape of the trade rather than a prediction about this fixture: the
 * empirical claim is the test's, which cuts both rates to their floors in April
 * and reads the gauge yellow where the same cut in January reads red.
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

/** The one mutation every calibration row is made at: the span's own start, so
 *  each change is in force for the WHOLE span and the row is a statement about
 *  the constants rather than about a date. */
const CALIBRATION_AT: Mutation = {
  id: "calibration",
  at: DOMAIN_START,
  label: "1",
};

/**
 * One calibration scenario, as a set of services carrying ONE change at the
 * span's start.
 *
 * `hours` is a DELTA and `rate` an absolute figure, because that is what the two
 * readings Peter named actually are: "ten hours more" is an offset that rides
 * the season, and "at its floor" is a level. `undefined` on either measure
 * leaves it committed.
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
    if (asked === undefined || service.committed === null) return service;
    const opening = offerAt(service, DOMAIN_START.getTime(), []);
    if (opening === null) return service;
    return {
      ...service,
      changes: {
        ...service.changes,
        [CALIBRATION_AT.id]: {
          hours: opening.hours + (asked.addHours ?? 0),
          rate: asked.rate ?? opening.rate,
        },
      },
    };
  }, services);

/**
 * The calibration, as data — each row the reading THE GAUGE GIVES for a change
 * made at the span's start, which is the time-weighted average of the whole
 * seasonal year at weight 1.
 *
 * The average and not the opening week's rate, and that is the one thing the
 * seasonal baseline changed about this table: the two were the same number while
 * the schedule was flat, and the dial has always read the average. What a LATER
 * change does is `weightToReach`'s business, and it has a test of its own.
 */
export const rateBandTable = (
  services: readonly Service[] = SERVICES,
): RateRow[] => {
  const row = (scenario: string, scenarioServices: Service[]): RateRow => {
    const mutations = [CALIBRATION_AT];
    const rate = averageRate(TIME_DOMAIN, mutations, scenarioServices);
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
 * It walks EVERY WEEK now rather than only the flags, because the season is a
 * change the reader did not make: a band emitted at the mutation times alone
 * would draw a flat year with steps at the flags, which is the one picture this
 * board must not draw. It is still CHANGES that are emitted — a week repeating
 * the previous week's whole hours spends a transition on nothing — so the
 * fixture's smooth curve costs about thirty points a band rather than 53, and a
 * flat stretch costs one.
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
  /** `spike` on the three holiday weeks, empty otherwise. */
  readonly spike: string;
  /** What the business bills that week, in $/wk. */
  readonly revenue: number;
}

/**
 * THE SCHEDULE, week by week — the season as a table, so the shape can be
 * argued with from a terminal before anyone opens the chart.
 *
 * This is the observation the Work Mix chart draws and the projection
 * integrates: one row per week slot, every service's hours beside the total and
 * what it bills. A curve is exactly the kind of thing that looks plausible in a
 * picture and wrong in a column of numbers, which is why it is printed.
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
      spike: isSpikeWeek(week) ? "spike" : "",
      revenue: revenueAt(services, at, mutations),
    };
  }, WEEK_SLOTS);

/** The busiest week of a schedule, and how many hours it holds. The claim the
 *  cap has to contain: 61 h/wk in the Labor Day week, for the fixture. */
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
      spike: "",
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
