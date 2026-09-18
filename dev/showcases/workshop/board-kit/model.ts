/**
 * Board Kit — EVERY SHARED DERIVATION, ONCE, GENERIC OVER THE CONFIG.
 *
 * The Scenario Board and the Hourly Board came to 5,600 lines between them, and
 * a third board (License) was being written as a third copy when Peter asked
 * the question this kit answers. What was actually duplicated, once the
 * re-exported calendar wrappers are set aside, is the arithmetic below: the
 * slot grid, the mutation ops, the time-weighted average, the projection's
 * integral, the pinned ceiling and the unit conversions. Nothing in this file
 * knows what a service, a person or a plan is — it reads a `BoardConfig` and a
 * roster of `BoardEntity`, and both boards' numbers fall out of it unchanged.
 *
 * Three disagreements between the two originals were resolved here rather than
 * papered over, because writing one function where there were two forces the
 * question:
 *
 *   1. `nearestMutation` had OPPOSITE tie-breaks. The Scenario Board preferred
 *      the EARLIER survivor ("the changes after the deleted one now mean
 *      something different"); the Hourly Board preferred the LATER one, with no
 *      comment. The Scenario Board's rule is the argued one and is what this
 *      kit does — see `nearestMutation` for the one consequence.
 *   2. `monthlyFrom` ran in OPPOSITE directions — `/12` on a $/yr board,
 *      `× 52/12` on a $/wk one. Here it is a lookup keyed on the board's unit
 *      (`unitsPer` in `config.ts`), so neither board can have it backwards.
 *      Both had it right; only one of them had it under test.
 *   3. `averageRateOver` and `accruedOver` were copied with a note saying the
 *      copy was deliberate ("importing would drag the people model and three
 *      payroll constants into that board's module graph"). That reasoning was
 *      sound and is now moot: these take a FUNCTION and the moments, so they
 *      drag nothing at all.
 */
import { filter, find, findIndex, map, sortBy, sum } from "../../../../src/fn";
import { timeOf } from "../../../../src";
import type { Mutation, TimeDomain, TimeValue } from "../../../../src";
import { formatCompactNumber } from "../../../../src/internal/format/number";
import {
  type BoardConfig,
  type BoardEntity,
  type BoardGrain,
  type BoardUnit,
  rateFromContribution,
  unitsPer,
} from "./config";
import { carriedBefore, clampMeasures, isLiveAt, remove } from "./lens";

export { isLiveAt };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ── The calendar, by grain ───────────────────────────────────────────────────

/** Mutations in time order. Every walk below depends on this ordering. */
export const orderedMutations = (mutations: readonly Mutation[]): Mutation[] =>
  sortBy((mutation: Mutation) => timeOf(mutation.at), mutations);

/** The slot order as bare ids — what `lens`'s walks take. */
export const slotOrder = (mutations: readonly Mutation[]): string[] =>
  map((mutation: Mutation) => mutation.id, orderedMutations(mutations));

/** The ISO week's Monday at or before a moment, at UTC midnight. */
const isoMondayOf = (time: number): number => {
  const at = new Date(time);
  // getUTCDay is 0 for Sunday; ISO weeks start on Monday, so rotate.
  const back = (at.getUTCDay() + 6) % 7;
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - back);
};

/**
 * THE SLOT a moment belongs to, on a board's own grain — and CLAMPED to the
 * span's start.
 *
 * The clamp is the point rather than a rounding convenience. A span rarely
 * opens on a slot boundary — the Hourly Board's opens on Wednesday 2025-01-01 —
 * so without it the first pickable slot would be days into a year-long span,
 * and every reading that depends on "a change at the left edge is in force for
 * the whole span" would be off by those days: the gauge would disagree with the
 * calibration table, whose whole claim is that it describes the weight-1 case.
 */
export const slotOf = (
  grain: BoardGrain,
  time: number,
  domainStart: number,
): number => {
  const at = new Date(time);
  const raw =
    grain === "week"
      ? isoMondayOf(time)
      : grain === "month"
        ? Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1)
        : Date.UTC(at.getUTCFullYear(), Math.floor(at.getUTCMonth() / 3) * 3, 1);
  return Math.max(raw, domainStart);
};

/** Every slot in the span, in order. Slot 0 is the span's own start. */
export const slotsIn = (
  grain: BoardGrain,
  start: number,
  end: number,
): number[] => {
  const stops: number[] = [];
  if (grain === "week") {
    const first = isoMondayOf(start);
    for (let index = 0; ; index += 1) {
      const monday = first + index * WEEK_MS;
      if (monday >= end) break;
      const at = Math.max(monday, start);
      if (at >= end) break;
      stops.push(at);
    }
    return stops;
  }
  const step = grain === "month" ? 1 : 3;
  const from = new Date(start);
  let year = from.getUTCFullYear();
  let month =
    grain === "month"
      ? from.getUTCMonth()
      : Math.floor(from.getUTCMonth() / 3) * 3;
  for (;;) {
    const at = Date.UTC(year, month, 1);
    if (at >= end) break;
    if (at >= start) stops.push(at);
    month += step;
    while (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  return stops;
};

/** The board's whole slot grid — the one a click snaps to and a table reads. */
export const gridOf = (
  config: Pick<BoardConfig, "grain" | "domain">,
): number[] =>
  slotsIn(config.grain, timeOf(config.domain[0]), timeOf(config.domain[1]));

/**
 * The slot a MOMENT falls in, as an index into the grid. CLAMPED at both ends:
 * a fixture date or one typed into a test need not sit on the grid, and a
 * silent miss would put a July reading on January's levels.
 */
export const gridIndexOf = (grid: readonly number[], time: number): number => {
  let index = 0;
  for (const [i, at] of grid.entries()) if (at <= time) index = i;
  return Math.min(Math.max(index, 0), Math.max(grid.length - 1, 0));
};

/**
 * The slot a first interaction lands in: the earliest slot in the span with no
 * mutation on it yet, or `undefined` when every one is taken — which the caller
 * reads as "there is nowhere left to put one" rather than crowding two flags
 * onto one slot.
 */
export const nextFreeSlot = (
  config: Pick<BoardConfig, "grain" | "domain">,
  mutations: readonly Mutation[],
): number | undefined => {
  const taken = new Set(map((m: Mutation) => timeOf(m.at), mutations));
  const slots = slotsIn(
    config.grain,
    timeOf(config.domain[0]),
    timeOf(config.domain[1]),
  );
  return slots.find((at: number) => !taken.has(at));
};

/**
 * Add a mutation at a picked date, or SELECT the one already there.
 *
 * The date arrives already snapped, so "already there" is an exact timestamp
 * match with no tolerance window to tune. The flags are numbered by POSITION,
 * so every label is restamped: inserting one in the middle renumbers the ones
 * after it, which is what a reader expects of "change 2".
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
  return {
    mutations: map(
      (mutation: Mutation, index: number) => ({
        ...mutation,
        label: String(index + 1),
      }),
      added,
    ),
    selected: id,
  };
};

/**
 * The mutation a first interaction should apply to: the one already selected,
 * or a NEW one at the next free slot. Returns the list and the id together, so
 * the caller does one thing whether or not anything was created.
 */
export const ensureMutation = (
  config: Pick<BoardConfig, "grain" | "domain">,
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly selected: string | null;
  },
): { mutations: Mutation[]; selected: string | null; created: boolean } => {
  if (scenario.selected !== null) {
    return {
      mutations: [...scenario.mutations],
      selected: scenario.selected,
      created: false,
    };
  }
  const at = nextFreeSlot(config, scenario.mutations);
  if (at === undefined) {
    return {
      mutations: [...scenario.mutations],
      selected: orderedMutations(scenario.mutations)[0]?.id ?? null,
      created: false,
    };
  }
  return { ...addMutation(scenario.mutations, new Date(at)), created: true };
};

/**
 * The mutation to select once `id` is gone: the nearest one still standing,
 * EARLIER for preference, otherwise later, and `null` when none remain.
 *
 * EARLIER because the changes after the deleted one now mean something
 * different — they carry forward from a different level — and the reader should
 * land where the scenario still says what it said. This is the Scenario
 * Board's argued rule; the Hourly Board preferred the later survivor with no
 * stated reason, and that divergence is resolved here in favour of the one
 * somebody thought about.
 */
export const nearestMutation = (
  mutations: readonly Mutation[],
  id: string,
): string | null => {
  const ordered = orderedMutations(mutations);
  const index = findIndex((mutation: Mutation) => mutation.id === id, ordered);
  if (index < 0) return ordered[0]?.id ?? null;
  return ordered[index - 1]?.id ?? ordered[index + 1]?.id ?? null;
};

/** The slot an entity was ADDED at, or `undefined` if it was always on the
 *  board. An added entity is `committed: null` plus a first change, so the
 *  moment is derived rather than stored and cannot fall out of step. */
export const addedAt = (
  entity: BoardEntity,
  mutations: readonly Mutation[],
): string | undefined => {
  if (entity.committed !== null) return undefined;
  return find(
    (mutation: Mutation) => entity.changes[mutation.id] !== undefined,
    orderedMutations(mutations),
  )?.id;
};

/**
 * DELETE a change and everything that only existed because of it — the flag,
 * the chip, every entity's entry at it, and anything added there.
 *
 * Each of the four is the inverse of something the board can do, which is why
 * they belong in one function: an entity whose existence began at the deleted
 * change has no history left to revert to, and keeping it would invent an
 * addition the reader never made.
 */
export const removeMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly entities: readonly BoardEntity[];
  },
  id: string,
): { mutations: Mutation[]; entities: BoardEntity[]; selected: string | null } => {
  const selected = nearestMutation(scenario.mutations, id);
  let survivors: readonly BoardEntity[] = scenario.entities;
  for (const entity of scenario.entities) {
    if (addedAt(entity, scenario.mutations) === id) {
      survivors = remove(survivors, entity.id);
    }
  }
  return {
    mutations: filter(
      (mutation: Mutation) => mutation.id !== id,
      scenario.mutations,
    ),
    entities: map((entity: BoardEntity) => {
      const { [id]: _dropped, ...rest } = entity.changes;
      return { ...entity, changes: rest };
    }, survivors),
    selected,
  };
};

// ── Chip labels ──────────────────────────────────────────────────────────────

const MONTH_NAMES: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The month, exactly — `2025-08`. What a chip's label abbreviates. */
export const monthLabel = (at: TimeValue): string =>
  new Date(timeOf(at)).toISOString().slice(0, 7);

/** The month, short — `Aug`. Only ever used to tell two chips apart. */
export const monthAbbrev = (at: TimeValue): string =>
  MONTH_NAMES[new Date(timeOf(at)).getUTCMonth()] ?? "";

/** `2025-Q1`. The vocabulary a quarter-ticked axis reads in. */
export const quarterLabelOf = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `${when.getUTCFullYear()}-Q${Math.floor(when.getUTCMonth() / 3) + 1}`;
};

/** The ISO week number — the week containing its Thursday, stated as
 *  arithmetic rather than as a table of exceptions. */
export const isoWeekNumber = (at: TimeValue): number => {
  const thursday = isoMondayOf(timeOf(at)) + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  return Math.floor((thursday - Date.UTC(year, 0, 1)) / WEEK_MS) + 1;
};

/**
 * `W27 · Jun 30` — what a chip reads under week grain.
 *
 * Two vocabularies in one label, because the chip has two jobs one cannot do:
 * the WEEK NUMBER is what a reader talks seasonality in, and the MONTH AND DAY
 * is what makes the chip locatable against an axis ticked by quarter.
 */
export const weekLabel = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `W${String(isoWeekNumber(at)).padStart(2, "0")} · ${
    MONTH_NAMES[when.getUTCMonth()] ?? ""
  } ${when.getUTCDate()}`;
};

/** One chip on the as-of control. */
export interface SegmentLabel {
  readonly id: string;
  /** What the chip READS. */
  readonly label: string;
  /** The exact month the mutation is at — `2025-08`. */
  readonly month: string;
}

/**
 * The as-of chips, labelled to match the GRAIN the board runs on.
 *
 * UNDER QUARTER GRAIN the label matches the axis, and TWO MUTATIONS CAN SHARE A
 * QUARTER — so the rule is stated over the whole list rather than per mutation:
 * a quarter holding more than one labels ALL of its chips `2025-Q3 · Aug`, both
 * of them and not only the second, because a reader comparing two chips needs
 * them to differ in the same place.
 *
 * UNDER WEEK OR MONTH GRAIN there is nothing to disambiguate: one mutation per
 * slot is unique by construction, since the grid is that fine and `addMutation`
 * refuses a second mutation at an existing timestamp.
 */
export const segmentLabelsOf = (
  mutations: readonly Mutation[],
  grain: BoardGrain = "quarter",
): SegmentLabel[] => {
  const ordered = orderedMutations(mutations);
  if (grain === "week") {
    return map(
      (mutation: Mutation) => ({
        id: mutation.id,
        label: weekLabel(mutation.at),
        month: monthLabel(mutation.at),
      }),
      ordered,
    );
  }
  if (grain === "month") {
    return map(
      (mutation: Mutation) => ({
        id: mutation.id,
        label: monthLabel(mutation.at),
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
      label: shared ? `${quarter} · ${monthAbbrev(mutation.at)}` : quarter,
      month: monthLabel(mutation.at),
    };
  }, ordered);
};

// ── Reading the roster ───────────────────────────────────────────────────────

/**
 * The measures an entity carries AT A MOMENT, or `null` when it is not on the
 * board then — outside its `[start, end)`, or dropped.
 *
 * The last change at or before `time` wins. Every money figure on every board
 * is a reading of this one function, which is how a change reaches the gauge,
 * the projection and the mix chart at once.
 */
export const levelsAt = (
  entity: BoardEntity,
  time: number,
  mutations: readonly Mutation[],
): readonly number[] | null => {
  if (!isLiveAt(entity, time)) return null;
  let carried = entity.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = entity.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return clampMeasures(entity, carried);
};

/** The moment a mutation sits at, or the span's start when there is no such
 *  mutation — which is what a stale id from a deleted flag reads as. */
export const timeOfMutation = (
  mutationId: string,
  mutations: readonly Mutation[],
  fallback: number,
): number =>
  timeOf(
    find((mutation: Mutation) => mutation.id === mutationId, mutations)?.at ??
      new Date(fallback),
  );

/**
 * The measures an entity carried JUST BEFORE a change — `null` when it had not
 * begun by then, or had already ended.
 *
 * A change AT an entity's start still reads its opening level as the prior:
 * that is the dial's fixed tick, and an entity that opens on `committed` has
 * that figure from its first instant. A change exactly AT a segment's end reads
 * the level it ends on, and `levelsFrom` then reads `null` — the dial's "ended
 * here".
 */
export const levelsBefore = (
  entity: BoardEntity,
  mutationId: string,
  mutations: readonly Mutation[],
  spanStart: number,
): readonly number[] | null => {
  const at = timeOfMutation(mutationId, mutations, spanStart);
  if (at < entity.start) return null;
  if (entity.end !== undefined && at > entity.end) return null;
  return clampMeasures(
    entity,
    carriedBefore(entity, mutationId, slotOrder(mutations)),
  );
};

/** The measures from a change onward: its own entry at it, or whatever it was
 *  already carrying. */
export const levelsFrom = (
  entity: BoardEntity,
  mutationId: string,
  mutations: readonly Mutation[],
  spanStart: number,
): readonly number[] | null => {
  const at = timeOfMutation(mutationId, mutations, spanStart);
  if (!isLiveAt(entity, at)) return null;
  const own = entity.changes[mutationId];
  if (own !== undefined) return clampMeasures(entity, own);
  return clampMeasures(
    entity,
    carriedBefore(entity, mutationId, slotOrder(mutations)),
  );
};

/**
 * Is this entity on the board at the change being edited?
 *
 * ONE condition covers four cases, which is why it is worth naming. Given the
 * levels just BEFORE the change and the levels FROM it:
 *
 *   before   from    what it is                        shown?
 *   ------   -----   -------------------------------   ------
 *   levels   levels  a change (or no change)           yes
 *   levels   null    DROPPED at this change            yes — struck through
 *   null     levels  ADDED at this change              yes
 *   null     null    dropped EARLIER, or not added
 *                    until a later change              no
 *
 * The last row is the terminated-hidden rule, and it gives "not added yet" for
 * free: an entity that starts at a later change is equally absent from this one.
 */
export const isPresentAt = (
  before: readonly number[] | null,
  from: readonly number[] | null,
): boolean => before !== null || from !== null;

/**
 * Every moment the board can change at: EVERY SLOT in the grid, and each flag.
 *
 * The slots are in here because an entity can begin or end at a moment that is
 * not a flag — a segment's `end` is a date on the entity, not a mutation — and
 * a sampler given only the mutation times would carry it past the slot it
 * stopped in. Sampling the whole grid costs nothing and catches it. Flags are
 * usually slots already (a click snaps), so the union is normally the slots
 * alone; a mutation off the grid is kept rather than rounded onto one.
 */
export const momentsOf = (
  config: Pick<BoardConfig, "grain" | "domain">,
  mutations: readonly Mutation[],
): number[] => {
  const times = new Set<number>(
    slotsIn(config.grain, timeOf(config.domain[0]), timeOf(config.domain[1])),
  );
  for (const mutation of mutations) times.add(timeOf(mutation.at));
  return sortBy((time: number) => time, [...times]);
};

// ── The money ────────────────────────────────────────────────────────────────

/** What ONE entity contributes at a moment. An absence contributes nothing —
 *  which is the consumer stating what the absence MEANS, not arithmetic on it. */
export const contributionOfEntity = (
  config: Pick<BoardConfig, "contributionOf">,
  entity: BoardEntity,
  time: number,
  mutations: readonly Mutation[],
): number => {
  const levels = levelsAt(entity, time, mutations);
  return levels === null ? 0 : config.contributionOf(levels);
};

/** What the whole roster contributes at a moment, in unit terms. */
export const contributionAt = (
  config: Pick<BoardConfig, "contributionOf">,
  entities: readonly BoardEntity[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (entity: BoardEntity) =>
        contributionOfEntity(config, entity, time, mutations),
      entities,
    ),
  );

// ── Time, weighted in the board's own unit ───────────────────────────────────

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
 * Weeks from one moment to another. Plain division, and the contrast with
 * `monthsBetween` is the reason weeks are worth having: a calendar month is not
 * a twelfth of a year, so month positions need a walk over each month's own
 * length, while every week is seven days.
 */
export const weeksBetween = (from: number, to: number): number =>
  (to - from) / WEEK_MS;

/**
 * THE SPAN between two moments, counted in a board's own unit.
 *
 * Time is weighted in the unit the reader is counting in rather than in
 * milliseconds, and that is a decision rather than a convenience: a change made
 * on 1 July weighs 0.4959 of a year in milliseconds and exactly half of it in
 * months. The two barely disagree over a year, which is the point — the unit is
 * a statement about what is being counted, not a correction to a wrong number.
 */
export const spanIn = (unit: BoardUnit, from: number, to: number): number => {
  if (unit === "wk") return weeksBetween(from, to);
  if (unit === "mo") return monthsBetween(from, to);
  return monthsBetween(from, to) / 12;
};

/**
 * A rate as a MONTH's worth of it — the bridge between a board's unit and the
 * cash chart's grain.
 *
 * A LOOKUP rather than an arithmetic expression, because the two boards wrote
 * this in opposite directions (`/12` on a $/yr board, `× 52/12` on a $/wk one)
 * and only one of them was under test. Keyed on the unit, neither can be
 * backwards.
 */
export const monthlyFrom = (unit: BoardUnit, rate: number): number =>
  rate * unitsPer(unit, "mo");

/**
 * THE RATE OVER A WHOLE SPAN, weighted by time.
 *
 * Takes a FUNCTION and the moments rather than a roster and a config, because
 * neither is anything this arithmetic needs: given "what does it contribute at
 * time t" and "when can it change", the average is decided. That is also why
 * copying it into a second board was never necessary — it drags nothing.
 *
 * Moments outside the span are IGNORED rather than clamped: one before it is
 * already in the contribution at the span's start, and one after it never
 * happens inside the period being read.
 */
export const averageContributionOver = (
  start: number,
  end: number,
  moments: readonly number[],
  contribution: (time: number) => number,
  unit: BoardUnit,
): number => {
  const span = spanIn(unit, start, end);
  if (span <= 0) return contribution(start);
  const inside = filter(
    (moment: number) => moment > start && moment < end,
    moments,
  );
  const edges = [start, ...sortBy((moment: number) => moment, inside), end];
  let weighted = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const from = edges[index] ?? start;
    const to = edges[index + 1] ?? end;
    weighted += spanIn(unit, from, to) * contribution(from);
  }
  return weighted / span;
};

/** The share of the span a change made at `at` is in force for. The number
 *  every calibration is really about: a change is worth its own rate times it. */
export const weightFrom = (
  start: number,
  end: number,
  at: number,
  unit: BoardUnit,
): number => {
  const span = spanIn(unit, start, end);
  if (span <= 0) return 0;
  return Math.min(Math.max(spanIn(unit, at, end) / span, 0), 1);
};

/**
 * THE INSTANTANEOUS RATE from a moment onward — what the board runs at once
 * every change up to then is in force.
 *
 * A different question from the average and both are wanted: the gauge reads
 * the whole span, the balance line projects FORWARD from the moment being
 * edited, which is a slope rather than an average.
 */
export const rateAt = (
  config: Pick<BoardConfig, "contributionOf" | "side" | "fixedCost">,
  entities: readonly BoardEntity[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  rateFromContribution(
    config,
    contributionAt(config, entities, time, mutations),
  );

/**
 * THE GAUGE'S READING: the scenario's rate averaged over the whole span.
 *
 * Not the selected change's own rate, which would say a change made in December
 * costs the span what the same change made in January does. It samples EVERY
 * slot rather than only the flags (`momentsOf`), so a scenario whose levels
 * alternate slot to slot reads differently from the flat one with the same mean
 * — which is the seasonality a board composes out of changes.
 */
export const averageRate = (
  config: BoardConfig,
  entities: readonly BoardEntity[],
  mutations: readonly Mutation[],
  unit: BoardUnit = config.unit,
): number =>
  rateFromContribution(
    config,
    averageContributionOver(
      timeOf(config.domain[0]),
      timeOf(config.domain[1]),
      momentsOf(config, mutations),
      (time: number) => contributionAt(config, entities, time, mutations),
      unit,
    ),
  );

// ── The balance line ─────────────────────────────────────────────────────────

/** Running balance, step by step, from an opening figure. */
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

/** The first instant of each of `count` consecutive months from `from` — the
 *  balance chart's own cell edges, stated as numbers the arithmetic can take,
 *  so the integral and the drawn cells cannot disagree about a month's start. */
export const monthStarts = (from: Date, count: number): number[] => {
  const starts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    starts.push(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1));
  }
  return starts;
};

/**
 * THE BALANCE A RATE ACCRUES between two moments — the projection's integral.
 *
 *     accrued = Σ over each stretch between changes of
 *                   span(stretch, sampleIn) × unitsPer(unit, sampleIn) × rate(at its start)
 *
 * A SUM rather than one multiplication, and that is the whole of the ruling it
 * came from: one scalar rate times the elapsed months draws the same straight
 * slope whatever the stretches did, so a scenario alternating high and low
 * projected as a flat line while the gauge beside it read the swing.
 * Integrating the SAMPLED rate makes each stretch carry its own reading, so the
 * deltas differ cell to cell and the line bends.
 *
 * `unit` is what the RATE is quoted in; `sampleIn` is what the spans are
 * measured in, defaulting to the same. They differ when a $/wk board wants the
 * month-grained reading its cash chart draws, and `unitsPer` is then the one
 * conversion — written down rather than hidden in a divisor.
 *
 * Moments outside the stretch are IGNORED, the rule the average follows too.
 */
export const accruedOver = (
  from: number,
  to: number,
  moments: readonly number[],
  rate: (time: number) => number,
  unit: BoardUnit,
  sampleIn: BoardUnit = unit,
): number => {
  if (to <= from) return 0;
  const factor = unitsPer(unit, sampleIn);
  const inside = filter(
    (moment: number) => moment > from && moment < to,
    moments,
  );
  const edges = [from, ...sortBy((moment: number) => moment, inside), to];
  let accrued = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index] ?? from;
    const end = edges[index + 1] ?? to;
    accrued += spanIn(sampleIn, start, end) * factor * rate(start);
  }
  return accrued;
};

/**
 * WHAT THE PROJECTION SAMPLES: the rate as a function of time, the moments it
 * can change at, the cell edges to integrate between, and the units to sum in.
 *
 * One object rather than five positional arguments because they are one
 * decision — "how is the forward rate read?" — and a caller with an answer for
 * `rate` always has one for `moments`.
 */
export interface RateSampling {
  /** The first instant of each cell. Same length and order as the committed
   *  balances. See `monthStarts`. */
  readonly boundaries: readonly number[];
  /** The rate in force from a moment onward — `rateAt` bound to a scenario, or
   *  `() => rate` for a flat projection, which is the same one code path. */
  readonly rate: (time: number) => number;
  /** The moments the rate is allowed to change at. */
  readonly moments: readonly number[];
  /** The unit the rate is quoted in. */
  readonly unit: BoardUnit;
  /** The unit the spans are measured in. Defaults to `unit`. */
  readonly sampleIn?: BoardUnit;
}

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward by
 * INTEGRATING the sampled rate from the pivot.
 *
 *     balance(m) = balance(now) + accruedOver(now, m, …)
 *
 * This is the wire from the dials to the chart. A drag changes the rate, the
 * rate changes every cell after now, and the line visibly pivots about the now
 * point. Before now nothing moves, because the past is not a forecast.
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
        sampling.unit,
        sampling.sampleIn ?? sampling.unit,
      )
    );
  }, committed);

/** The fan's half-width at a cell: ZERO at now, widening with the SQUARE of the
 *  cells since — a forecast is surer about next month than next year. */
export const fanOf =
  (perCellSquared: number) =>
  (index: number, nowIndex: number): number => {
    const steps = index - nowIndex;
    return steps <= 0 ? 0 : perCellSquared * steps * steps;
  };

/**
 * The chart's PINNED y-domain ceiling. Computed once from what the fixture
 * COULD reach, so dragging a dial moves the LINE and never the axis under it —
 * the worst case being the projection starting as early as possible at the
 * highest rate, plus the fan's upper edge at that cell.
 */
export const pinnedCeiling = (
  unit: BoardUnit,
  balances: readonly number[],
  maxRate: number,
  fan: (cellsAfterNow: number) => number,
  tick: number,
): number => {
  const monthly = monthlyFrom(unit, maxRate);
  let highest = 0;
  for (const [index] of balances.entries()) {
    const projected = (balances[0] ?? 0) + monthly * index + fan(index);
    highest = Math.max(highest, projected, balances[index] ?? 0);
  }
  return Math.ceil(highest / tick) * tick;
};

// ── The mix chart ────────────────────────────────────────────────────────────

/**
 * The points for one measure of one entity, across every moment. CHANGES only,
 * opening at the span's left edge.
 *
 * It walks every moment (`momentsOf`), so a segment's start or end lands in the
 * slot it happens even when no flag sits there. A slot repeating the previous
 * one's value spends a transition on nothing, so a flat stretch costs one point.
 * Dropping to ZERO is a change and IS emitted, because that is what collapses a
 * band onto the edge below it.
 *
 * Every series opens at the left edge, including one at zero: a band starting
 * later would leave the bands above it with no floor to sit on until it
 * appeared.
 */
export const pointsFor = (
  config: Pick<BoardConfig, "grain" | "domain">,
  entity: BoardEntity,
  measure: number,
  mutations: readonly Mutation[],
): { at: Date; value: number }[] => {
  const points: { at: Date; value: number }[] = [];
  let previous: number | null = null;
  for (const time of momentsOf(config, mutations)) {
    const value = levelsAt(entity, time, mutations)?.[measure] ?? 0;
    if (previous !== null && value === previous) continue;
    points.push({ at: new Date(time), value });
    previous = value;
  }
  return points;
};

/** Population standard deviation — the measure of "how big are the bumps". */
const stdDev = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const mean = sum(values) / values.length;
  return Math.sqrt(
    sum(map((value: number) => (value - mean) ** 2, values)) / values.length,
  );
};

/**
 * ONE ENTITY'S VARIABILITY: the standard deviation of one measure across every
 * slot in the span, read from the LIVE history — so a scenario that makes an
 * entity swing harder moves it up the stack the moment the reader makes that
 * change.
 *
 * Std dev rather than peak-to-trough, which would see only the two extremes: a
 * one-slot blip would rank as high as a whole season at a different level.
 */
export const variabilityOf = (
  config: Pick<BoardConfig, "grain" | "domain">,
  entity: BoardEntity,
  measure: number,
  mutations: readonly Mutation[],
): number =>
  stdDev(
    map(
      (at: number) => levelsAt(entity, at, mutations)?.[measure] ?? 0,
      gridOf(config),
    ),
  );

/**
 * Entities ordered ASCENDING by variability — so the MOST variable is LAST,
 * which a stacked mark draws as the TOP band (array order is stacking order).
 *
 * `sortBy` is STABLE, so two entities whose variability ties keep the FIXTURE'S
 * OWN order rather than swapping as the reader edits toward and away from the tie.
 */
export const byVariability = (
  config: Pick<BoardConfig, "grain" | "domain">,
  entities: readonly BoardEntity[],
  measure: number,
  mutations: readonly Mutation[],
): BoardEntity[] =>
  sortBy(
    (entity: BoardEntity) =>
      variabilityOf(config, entity, measure, mutations),
    entities,
  );

// ── Money words ──────────────────────────────────────────────────────────────

/** A REAL minus sign (U+2212), not a hyphen. These are numbers, and a hyphen is
 *  a different glyph at a different height. */
export const MINUS = "−";

/**
 * An amount in abbreviated dollars — `$60k`, `$8.5k`, `$1.2M`, `$999`.
 *
 * NOT a new rounding policy: `formatCompactNumber` is the library's canonical
 * compact scaler, the one the charts' axes are built on. This adds the two
 * things it has no business knowing about — a currency symbol and a typographic
 * minus — and nothing else. The sign goes BEFORE the `$`, never between it and
 * the digits, and zero is unsigned because a signed zero says a direction that
 * did not happen.
 */
export const abbreviateDollars = (amount: number): string =>
  `${amount < 0 ? MINUS : ""}$${formatCompactNumber(Math.abs(amount))}`;

/** The suffix a board's unit reads as. */
export const unitSuffix = (unit: BoardUnit): string => `/${unit}`;

/** An amount as a RATE in the board's own unit — `$4.9k/wk`, `$60k/yr`. */
export const dollarsPerUnit = (unit: BoardUnit, amount: number): string =>
  `${abbreviateDollars(amount)}${unitSuffix(unit)}`;

/**
 * A SIGNED rate — `+$1.3k/wk`, `−$309/wk`. Distinct from `dollarsPerUnit`
 * because the plus is not decoration: a reading that names a CHANGE has to say
 * which way, and one that names an AMOUNT must not.
 */
export const signedDollarsPerUnit = (unit: BoardUnit, amount: number): string =>
  `${amount < 0 ? "" : "+"}${dollarsPerUnit(unit, amount)}`;

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * The scenario reduced to the thing Save would persist. A DIGEST rather than a
 * deep comparison, because "is this dirty?" is one question asked on every
 * render and a stable string answers it with no traversal at the call site.
 * Keys are emitted in a fixed order, so two equal scenarios cannot digest
 * differently.
 */
export const scenarioDigest = (
  entities: readonly BoardEntity[],
  mutations: readonly Mutation[],
): string =>
  JSON.stringify({
    mutations: map(
      (mutation: Mutation) => [mutation.id, timeOf(mutation.at)],
      orderedMutations(mutations),
    ),
    entities: map(
      (entity: BoardEntity) => [
        entity.id,
        entity.committed,
        map(
          (mutation: Mutation) => entity.changes[mutation.id] ?? null,
          orderedMutations(mutations),
        ),
      ],
      entities,
    ),
  });

/** Has anything moved since the last save? */
export const isDirty = (
  entities: readonly BoardEntity[],
  mutations: readonly Mutation[],
  savedDigest: string,
): boolean => scenarioDigest(entities, mutations) !== savedDigest;

/** The quarter starts inside a span — an x-axis's tick values. */
export const quarterTicks = (start: TimeValue, end: TimeValue): number[] =>
  slotsIn("quarter", timeOf(start), timeOf(end));

/** The span, as the two numbers everything above takes. */
export const spanOf = (domain: TimeDomain): [number, number] => [
  timeOf(domain[0]),
  timeOf(domain[1]),
];
