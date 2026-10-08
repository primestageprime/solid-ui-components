/**
 * Simple Contract Builder bench — the pure model on top of Contract Builder's.
 *
 * A CONTRACT here is Contract Builder's `Job` plus two things the Jobs table
 * shows: a STATUS (`Planned` — expected, not yet signed; `Confirmed` — signed)
 * and a LOCK. EVERY contract has an include toggle (Peter, 2026-10-08), and a
 * contract counts only while
 * its include toggle is on. That rule is `asPlan`: the consumption fold
 * (`contract-builder-model.ts`) only knows `use`, so a contract becomes a job
 * whose `use` says whether it counts.
 *
 * THE CASH FLOW is a running balance from payment DATES across the year:
 *   actual   payments already invoiced (before NOW) on Confirmed jobs
 *   outlook  everything still expected from NOW on: signed-not-invoiced
 *            payments of included contracts, and each future
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

export type Status = "Planned" | "Confirmed";

export interface Contract extends Job {
  readonly status: Status;
  readonly locked: boolean;
}

/** Whether a contract counts toward the plan: while its toggle is on, whatever its status. */
export const counts = (c: Contract): boolean => c.use;

/** The consumption fold's config: contracts become jobs whose `use` is `counts`. */
export const asPlan = (types: readonly JobType[], contracts: readonly Contract[]): Config => ({
  types,
  jobs: map(
    (c: Contract): Job => ({ ...c, use: counts(c), estimate: c.status === "Planned" }),
    contracts,
  ),
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
  /** Money still expected that day: included contracts' unbilled payments, unfilled hope. */
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
 * banked + included contracts' unbilled payments + the hope not yet filled —
 * per type per month, max(hope, committed).
 */
export const ratePerWeek = (
  types: readonly JobType[],
  contracts: readonly Contract[],
  today: string,
  fixedWeeklyCost: number,
): number =>
  sum(map((f: DayFlow) => f.actual + f.outlook, dailyFlows(types, contracts, today))) / 52 -
  fixedWeeklyCost;

// ── editing a contract ──────────────────────────────────────────────────────

/** What the Edit form changes. */
export interface ContractEdit {
  readonly locked: boolean;
  readonly start: string;
  readonly status: Status;
  /** The contract's value: the sum of its payments. */
  readonly est: number;
}

const shiftIso = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** A contract's value: the sum of its payments. */
export const valueOf = (c: Contract): number => sum(map((p: Payment) => p.amount, c.payments));

/**
 * Apply an edit. A new START shifts every payment date by the same number of
 * days (a payment shifted past NOW is no longer invoiced, and one shifted
 * before it is). A new EST scales every payment by the same factor, so the
 * deposit / progress / final keep their shares; the last payment takes the
 * rounding so the payments still sum to the est exactly.
 */
export const applyEdit = (c: Contract, e: ContractEdit, today: string): Contract => {
  const delta = Math.round((Date.parse(`${e.start}T00:00:00Z`) - Date.parse(`${c.start}T00:00:00Z`)) / DAY_MS);
  const old = valueOf(c);
  const factor = old > 0 ? e.est / old : 0;
  const scaled = map((p: Payment) => Math.round(p.amount * factor), c.payments);
  const drift = e.est - sum(scaled);
  const last = c.payments.length - 1;
  return {
    ...c,
    locked: e.locked,
    status: e.status,
    start: e.start,
    payments: map((p: Payment, i: number) => {
      const on = shiftIso(p.on, delta);
      return {
        ...p,
        on,
        amount: scaled[i] + (i === last ? drift : 0),
        invoiced: delta === 0 ? p.invoiced : on < today,
      };
    }, c.payments),
  };
};
