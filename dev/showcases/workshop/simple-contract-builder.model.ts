/**
 * Simple Contract Builder bench — the pure model on top of Contract Builder's.
 *
 * A CONTRACT here is Contract Builder's `Job` plus two things the Jobs table
 * shows: a STATUS (an `Estimate` is a quote; a `Confirmed` job is signed) and a
 * LOCK. A Confirmed job always consumes the hope; an Estimate counts only while
 * its include toggle is on. That rule is `asPlan`: the consumption fold
 * (`contract-builder-model.ts`) only knows `use`, so a contract becomes a job
 * whose `use` says whether it counts.
 *
 * THE CASH FLOW is a running balance from payment DATES across the year:
 *   actual   payments already invoiced (before NOW) on Confirmed jobs
 *   outlook  everything still expected from NOW on: signed-not-invoiced
 *            payments, the included Estimates' payments, and each future
 *            month's UNFILLED hope (its remainder after consumption), spread
 *            evenly over that month's days from NOW on.
 * Pure functions of (contracts, hopes, today): nothing carried between days
 * except the sum the running balance is.
 */
import { filter, flatMap, map, sum } from "../../../src/fn";
import {
  type Config,
  type Job,
  type JobType,
  type Payment,
  MONTH_INDICES,
  YEAR,
  cellsOfType,
  monthOf,
} from "./contract-builder-model";

export type Status = "Estimate" | "Confirmed";

export interface Contract extends Job {
  readonly status: Status;
  readonly locked: boolean;
}

/** Whether a contract counts toward the plan: Confirmed always, an Estimate when on. */
export const counts = (c: Contract): boolean => c.status === "Confirmed" || c.use;

/** The consumption fold's config: contracts become jobs whose `use` is `counts`. */
export const asPlan = (types: readonly JobType[], contracts: readonly Contract[]): Config => ({
  types,
  jobs: map((c: Contract): Job => ({ ...c, use: counts(c) }), contracts),
});

const DAY_MS = 86_400_000;
const dayIndex = (iso: string): number =>
  Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(YEAR, 0, 1)) / DAY_MS);
export const DAYS_IN_YEAR = 365;

const monthStartDay = (m: number): number =>
  Math.round((Date.UTC(YEAR, m, 1) - Date.UTC(YEAR, 0, 1)) / DAY_MS);
const monthEndDay = (m: number): number =>
  Math.round((Date.UTC(YEAR, m + 1, 1) - Date.UTC(YEAR, 0, 1)) / DAY_MS);

export interface DayFlow {
  /** Day of the year, 0 = Jan 1. */
  readonly day: number;
  /** Invoiced money on Confirmed jobs (only ever before NOW). */
  readonly actual: number;
  /** Money still expected that day: signed, included estimates, unfilled hope. */
  readonly outlook: number;
}

/** Every payment that counts, with whether it is already money in hand. */
const countedPayments = (contracts: readonly Contract[]): readonly Payment[] =>
  flatMap((c: Contract) => (counts(c) ? c.payments : []), contracts);

/** Each day's money across the year. */
export const dailyFlows = (
  types: readonly JobType[],
  contracts: readonly Contract[],
  today: string,
): readonly DayFlow[] => {
  const now = dayIndex(today);
  const plan = asPlan(types, contracts);
  const paid = countedPayments(contracts);
  /* A future month's unfilled hope, per day from max(NOW, month start). */
  const hopePerDay = map((m: number) => {
    const from = Math.max(now, monthStartDay(m));
    const to = monthEndDay(m);
    if (to <= from || m < monthOf(today)) return 0;
    const remainder = sum(
      map((t: JobType) => cellsOfType(plan, t.id)[m].remainder, types),
    );
    return remainder / (to - from);
  }, MONTH_INDICES);
  const monthOfDay = (d: number): number => new Date(Date.UTC(YEAR, 0, 1) + d * DAY_MS).getUTCMonth();
  return Array.from({ length: DAYS_IN_YEAR }, (_v, day): DayFlow => {
    const onDay = filter((p: Payment) => dayIndex(p.on) === day, paid);
    const actual = sum(map((p: Payment) => p.amount, filter((p: Payment) => p.invoiced, onDay)));
    const signed = sum(map((p: Payment) => p.amount, filter((p: Payment) => !p.invoiced, onDay)));
    const hope = day >= now ? hopePerDay[monthOfDay(day)] : 0;
    return { day, actual, outlook: signed + hope };
  });
};

/**
 * THE DIAL'S READING — the same one the Hourly Board's "Rate, right now" gives
 * (Peter, 2026-10-08: the dial is a constant across builders): the year's
 * expected revenue averaged per WEEK, less the fixed weekly cost, so 0 is
 * breakeven. "Expected" is exactly what Cash flow (panel A) ends the year at —
 * banked + signed + included estimates + the hope not yet filled.
 */
export const ratePerWeek = (
  types: readonly JobType[],
  contracts: readonly Contract[],
  today: string,
  fixedWeeklyCost: number,
): number =>
  sum(map((f: DayFlow) => f.actual + f.outlook, dailyFlows(types, contracts, today))) / 52 -
  fixedWeeklyCost;
