/**
 * Scenario Board — the rate model, as plain functions.
 *
 * Lives beside the bench rather than inside it so the calibration can be
 * asserted without a browser or a render (precedent: `workshop-layout.ts` +
 * `workshop-layout.test.ts`). The bench imports these; nothing here imports
 * Solid, so the test is arithmetic only.
 *
 * ── THE CALIBRATION ────────────────────────────────────────────────────────
 *
 * Peter's requirement (2026-09-16, RE-SOLVED for the two-engineer board): the
 * board opens AT the baseline and reads green, because it opens with no change
 * at all; raising BOTH engineers by a plausible ~$20k each drops it into the
 * yellow band; putting both on their role's CEILING drives it red, below zero.
 *
 * Pay is an OUTFLOW, so a raise LOWERS the company's rate:
 *
 *     rate = BASELINE − total pay increase
 *
 * With BASELINE = 60,000, COMFORTABLE = 30,000, a raise of $20,000/yr and a
 * role that runs $80k→$200k, every one of those readings falls out of one line:
 *
 *     raises   pay change     rate       band     why
 *     ------   ----------   ---------   ------    -----------------------------
 *        0             0      60,000    green     the board as it opens
 *        1        20,000      40,000    green     ≥ 30,000, one raise is fine
 *        2        40,000      20,000    yellow    0 < 20,000 < 30,000
 *     both
 *  at ceiling    240,000    −180,000    red       2 × (200k − 80k) crosses zero
 *
 * The constants are not independent — they are the solution to four
 * inequalities, which is why they are derived here and not picked:
 *
 *     BASELINE                  ≥ COMFORTABLE   an unchanged board is green
 *     BASELINE − 1×20,000       ≥ COMFORTABLE   one raise must stay green
 *     BASELINE − 2×20,000       <  COMFORTABLE  both must fall under it
 *     BASELINE − 2×20,000       >  0            …but not all the way to red
 *     BASELINE − 2×120,000      <  0            both at the ceiling crosses zero
 *
 * The last one is free for any positive BASELINE below 240,000, so what binds
 * is the middle pair: 40,000 < BASELINE and BASELINE − 40,000 < COMFORTABLE ≤
 * BASELINE − 20,000. 60,000 and 30,000 sit inside both with room either side —
 * COMFORTABLE could be anywhere in (20,000, 40,000] and the four readings would
 * not move band — so nothing here is balanced on a knife edge.
 * `rateBandTable()` prints exactly the table above, and the test asserts it.
 *
 * ── WHEN, NOT ONLY HOW MUCH (2026-09-16, second pass) ──────────────────────
 *
 * Every row of that table is a change made at the START of the year. The gauge
 * reads the COMPOSITE — the rate averaged over the whole year the board draws
 * — so a change is worth its own rate times the share of the year it is in
 * force for, and the table is the w = 1 case rather than the only case.
 *
 * The binding consequence, derived in `weightToReachYellow`: both engineers
 * raised reaches yellow only from Q1, because it needs three quarters of the
 * year to pull the average under the comfortable line. The same two raises
 * made in October leave the gauge green, and both at the ceiling in October
 * land exactly ON zero. Those are not miscalibrations — they are the reading
 * saying that a change made in the last quarter costs this year a quarter as
 * much, which is the whole reason Peter asked for the composite.
 */

import { map } from "../../../src/fn";
import {
  timeOf,
  type Mutation,
  type TimeValue,
} from "../../../src/components/LevelsTimeline/geometry";
import { type Person, payChangeAt } from "./scenario-board-people";

/**
 * What the company nets per YEAR before the scenario's changes — its surplus,
 * not its revenue, which is why it is small beside a payroll of six salaries.
 *
 * EVERY figure on this board is $/yr: pay, the bands, the rate, the gauge's
 * domain. One unit throughout means no conversion can be got wrong, and it is
 * the unit a salary is quoted in.
 */
export const RATE_BASELINE = 60_000;

/**
 * The comfortable gain. The gauge splits its gain half here: at or above it
 * the band lights green, below it yellow. Below ZERO is red, and that split is
 * the gauge's own, not ours.
 */
export const COMFORTABLE = 30_000;

/** The gauge's domain. Wide enough to hold every reading in the table above. */
export const RATE_DOMAIN: readonly [number, number] = [-240_000, 120_000];

/**
 * The size of a "plausible raise" the calibration is solved around, in $/yr.
 *
 * Pay is a CONTINUOUS dollar amount — a drag can land anywhere — so this is
 * not a quantum and nothing snaps to it. It is the raise size the four
 * readings below are computed at, so that "three raises" names a definite
 * point on the dial rather than an arbitrary one.
 */
export const RAISE_STEP = 20_000;

/** Which band a rate falls in. The gauge draws this; we name it for the table. */
export type RateBand = "red" | "yellow" | "green";

/**
 * The band a rate reads as. Mirrors the gauge's own split so the headless
 * table and the drawn dial cannot disagree: below zero is a loss (red), below
 * the comfortable gain is a gain that is not yet enough (yellow), and at or
 * above it is green.
 */
export const bandOfRate = (rate: number): RateBand => {
  if (rate < 0) return "red";
  if (rate < COMFORTABLE) return "yellow";
  return "green";
};

/** The company's rate, given what the scenario's pay changes cost per month. */
export const rateFromPayChange = (payChange: number): number =>
  RATE_BASELINE - payChange;

/** The rate after `raises` people each move up one level. The calibration model. */
export const rateForRaises = (raises: number): number =>
  rateFromPayChange(raises * RAISE_STEP);

/** One row of the calibration table. */
export interface RateRow {
  readonly raises: number;
  readonly payChange: number;
  readonly rate: number;
  readonly band: RateBand;
}

/** How many people the board's fixture starts with. */
export const HEADCOUNT = 2;

/**
 * What ONE person moving from their role's floor to its ceiling costs, in
 * $/yr — `200,000 − 80,000` for the engineers the board opens with.
 *
 * The red reading is the only one that is not a multiple of `RAISE_STEP`, and
 * that is the point of naming it: "both at the ceiling" is a place on the dial
 * a reader can actually drag to, not a number of notional raises.
 */
export const CEILING_RAISE = 120_000;

/**
 * The calibration, as data: the board as it opens, one raise, both raised, and
 * both dragged to their ceiling. Printed by the bench's DEBUG table and
 * asserted by the test, so the numbers are checkable without a browser.
 */
/**
 * The calibration, as data — AT THE START OF THE YEAR.
 *
 * Every row below is a change made at the domain's own left edge, where the
 * weight is 1 and the average equals the instantaneous rate. That is the one
 * moment at which the table is a statement about the constants rather than
 * about a date, which is why it is the moment the table fixes. What a LATER
 * change does is `weightToReachYellow`'s business, and it has a test of its
 * own.
 */
export const rateBandTable = (): RateRow[] => {
  const rows = [0, 1, HEADCOUNT].map((raises) => ({
    raises,
    payChange: raises * RAISE_STEP,
    rate: rateForRaises(raises),
    band: bandOfRate(rateForRaises(raises)),
  }));
  // The last row is not a count of raises but a POSITION: everybody dragged to
  // the top of their band. `raises` carries the headcount so the row still
  // reads as "both of them", and `payChange` is what that actually costs.
  const ceiling = HEADCOUNT * CEILING_RAISE;
  return [
    ...rows,
    {
      raises: HEADCOUNT,
      payChange: ceiling,
      rate: rateFromPayChange(ceiling),
      band: bandOfRate(rateFromPayChange(ceiling)),
    },
  ];
};

// ── The COMPOSITE rate ───────────────────────────────────────────────────────
//
// Peter, 2026-09-16: "the Rate gauge reads the composite over the whole
// represented period, not the selected change."
//
// A change made in December costs the year one month of itself; the same
// change made in January costs it twelve. A gauge that read the selected
// change's own rate said those were the same scenario, which is the one thing
// a scenario board must not do. So the reading is the TIME-WEIGHTED AVERAGE of
// the rate across the timeline's whole domain: each interval between mutations
// carries its own rate, weighted by how long it lasts.
//
// What follows from that, and is worth knowing before reading the numbers:
// editing one change moves the gauge by that change's SHARE OF THE YEAR, not
// by its full rate. See `weightToReachYellow` for where that bites the
// calibration.

/**
 * MONTHS IN A YEAR. Every figure on this board is $/yr, and the balance chart
 * steps a MONTH at a time, so a projection that added the annual rate per
 * month would run twelve times too steep. The conversion has exactly one home.
 */
export const MONTHS_PER_YEAR = 12;

/** A year's rate as a month's worth of it. */
export const monthlyFrom = (ratePerYear: number): number =>
  ratePerYear / MONTHS_PER_YEAR;

/**
 * A moment as a position on the MONTH line — `2025-07-01` is 24_306.0, and a
 * date inside a month carries the fraction of that month elapsed.
 *
 * Time is weighted in MONTHS rather than in milliseconds, and that is a
 * decision rather than a convenience: a calendar month is not 1/12 of a year,
 * so a change made on 1 July weighs 0.4959 of a year in milliseconds and
 * exactly half of it in months. Every figure on this board is quoted per year
 * and every mutation is snapped to a month boundary, so months are the unit
 * the reader is actually counting in — "half the year" should mean half.
 */
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
 * `payChangeAt` is asked what the scenario costs AT A MOMENT — the sum of
 * everyone's pay then against their committed pay — and the average is taken
 * over the domain, so an interval's weight is simply how long it lasts.
 *
 * It takes a FUNCTION rather than the people, and the moments rather than the
 * mutations, because neither the people model nor the chart's Date handling is
 * anything this arithmetic needs: given "what does it cost at time t" and
 * "when can it change", the average is decided. `averageRate` below is the
 * board-shaped wrapper that answers both from a scenario.
 *
 * Moments outside the domain are IGNORED rather than clamped: a mutation
 * before the span is already in the cost at the span's start, and one after it
 * never happens inside the period being read.
 */
export const averageRateOver = (
  start: number,
  end: number,
  moments: readonly number[],
  payChangeAt: (time: number) => number,
): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return RATE_BASELINE;
  const inside = moments.filter((moment) => moment > start && moment < end);
  const edges = [start, ...inside.sort((a, b) => a - b), end];
  let weighted = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const from = edges[index] ?? start;
    const to = edges[index + 1] ?? end;
    weighted += monthsBetween(from, to) * payChangeAt(from);
  }
  return rateFromPayChange(weighted / span);
};

/**
 * The balance a rate ACCRUES between two moments — the projection's integral.
 *
 *     accrued = Σ over each stretch between changes of
 *                   months(stretch) × rate(at its start) / 12
 *
 * A SUM rather than one multiplication, so a rate that CHANGES inside the
 * projected span shows as differing month-on-month deltas rather than as one
 * straight slope at whichever rate happened to be in force at the pivot. On
 * THIS board the two agree numerically whenever there is a single change ahead
 * of the pivot — the rate is piecewise-constant per mutation, and one constant
 * stretch integrates to exactly `rate/12 × months`. It stops agreeing the
 * moment two mutations sit ahead of the pivot, which is the case the old
 * scalar drew wrong and nobody had noticed.
 *
 * MONTHS, with no unit parameter: this board's mutations land on quarters and
 * every figure it quotes is monthly, so there is no caller for a weekly sum.
 * The Hourly Board has one and parametrizes its own copy (`RateUnit` in
 * `hourly-board-model.ts`). The duplication is the same deliberate one
 * `averageRateOver` carries: importing across would drag the people model and
 * three payroll constants into that board's module graph.
 *
 * Moments outside the stretch are IGNORED, the rule `averageRateOver` follows.
 */
export const accruedOver = (
  from: number,
  to: number,
  moments: readonly number[],
  rate: (time: number) => number,
): number => {
  if (to <= from) return 0;
  const inside = moments.filter((moment) => moment > from && moment < to);
  const edges = [from, ...inside.sort((a, b) => a - b), to];
  let accrued = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index] ?? from;
    const end = edges[index + 1] ?? to;
    accrued += monthsBetween(start, end) * monthlyFrom(rate(start));
  }
  return accrued;
};

/**
 * The share of the span that a change made at `at` is in force for.
 *
 * The number the calibration is really about: a raise is only ever worth its
 * own rate times this.
 */
export const weightFrom = (start: number, end: number, at: number): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return 0;
  return Math.min(Math.max(monthsBetween(at, end) / span, 0), 1);
};

/**
 * The share of the year a change must still have ahead of it for `raises`
 * raises to pull the average under the comfortable line.
 *
 *     BASELINE − weight × raises × RAISE_STEP < COMFORTABLE
 *
 * With the board's constants and both engineers raised that is 0.75 — so BOTH
 * RAISED REACHES YELLOW ONLY FROM Q1. The same two raises made in October are
 * in force for a quarter of the year, cost the average a quarter as much, and
 * leave the gauge green. That is not a miscalibration; it is the composite
 * reading doing its job, and it is the reason the table below states the
 * moment its rows are computed at.
 */
export const weightToReachYellow = (raises: number): number =>
  (RATE_BASELINE - COMFORTABLE) / (raises * RAISE_STEP);

/**
 * THE GAUGE'S READING: the scenario's rate averaged over the whole year the
 * board draws.
 *
 * The board-shaped wrapper around `averageRateOver` — it answers the two
 * questions that function asks from a scenario, and owns the only place where
 * the people model and the chart's dates meet the arithmetic.
 */
export const averageRate = (
  domain: readonly [TimeValue, TimeValue],
  mutations: readonly Mutation[],
  people: readonly Person[],
): number =>
  averageRateOver(
    timeOf(domain[0]),
    timeOf(domain[1]),
    map((mutation: Mutation) => timeOf(mutation.at), mutations),
    (time: number) => payChangeAt(people, time, mutations),
  );

/**
 * The INSTANTANEOUS rate from a moment onward — what the company runs at once
 * every change up to then is in force.
 *
 * Distinct from `averageRate` and both are wanted: the gauge reads the year as
 * a whole, and the balance chart projects FORWARD from the moment being
 * edited, which is a slope rather than an average.
 */
export const rateAt = (
  time: number,
  mutations: readonly Mutation[],
  people: readonly Person[],
): number => rateFromPayChange(payChangeAt(people, time, mutations));

/**
 * The HIGHEST rate this fixture can reach — everyone on their band FLOOR.
 *
 * Paying everybody as little as their role permits is the cheapest the payroll
 * can be, so it leaves the most surplus, so it draws the steepest line. That
 * is the top of the balance chart's pinned domain.
 *
 * Takes the pay figures rather than reading a fixture, so the test can assert
 * the one property that matters — that the answer does not depend on where the
 * dials happen to be right now.
 */
export const maxRateFor = (
  floors: readonly number[],
  committedPay: readonly number[],
): number => {
  let saving = 0;
  for (const [i, floor] of floors.entries())
    saving += (committedPay[i] ?? floor) - floor;
  return RATE_BASELINE + saving;
};

/**
 * The balance chart's PINNED ceiling, in dollars.
 *
 * Peter, 2026-09-16: "Running balance should pin the Y axis so that if all
 * sliders are down the line would still be on the chart… that way the y axis
 * doesn't shift when we change the amounts." So the domain is computed from
 * what the fixture COULD reach, once, and never from what the dials read now.
 *
 * The worst case for the ceiling is the projection starting as early as
 * possible (so it has the most months to climb) at the highest rate, plus the
 * fan's upper edge at that month — the fan is drawn, so it has to fit too.
 * Rounded UP to a whole `tick` so the axis lands on a readable number.
 */
export const pinnedCeiling = (
  balances: readonly number[],
  maxRate: number,
  fanAt: (monthsAfterNow: number) => number,
  tick = 20_000,
): number => {
  const monthly = monthlyFrom(maxRate);
  let highest = 0;
  for (const [index] of balances.entries()) {
    // `now` at month 0 gives the projection the most room to climb.
    const projected = (balances[0] ?? 0) + monthly * index + fanAt(index);
    highest = Math.max(highest, projected, balances[index] ?? 0);
  }
  return Math.ceil(highest / tick) * tick;
};

/**
 * Is this person on the payroll at the mutation being edited?
 *
 * ONE condition covers four cases, which is why it is worth having as a named
 * rule rather than inline: given their pay just BEFORE the mutation and their
 * pay FROM it,
 *
 *   before   from    who they are                      shown?
 *   ------   -----   -------------------------------   ------
 *   $60k     $65k    a raise (or no change)            yes
 *   $60k     null    TERMINATED at this mutation       yes — struck through
 *   null     $60k    HIRED at this mutation            yes
 *   null     null    terminated EARLIER, or not yet
 *                    hired at all                      no
 *
 * Peter, 2026-09-16: a terminated person shows at the mutation that terminated
 * them and at none after it. The last row is that rule — and it gives "not
 * hired yet" for free, since somebody who joins at a later mutation is equally
 * absent from this one.
 */
export const isPresentAt = (
  payBefore: number | null,
  payFrom: number | null,
): boolean => payBefore !== null || payFrom !== null;
