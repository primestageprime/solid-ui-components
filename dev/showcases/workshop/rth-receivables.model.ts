/**
 * RTH receivables bench — the pure expectation model.
 *
 * Each invoice is EXPECTED to be paid `terms` days after its invoice date.
 * The CUMULATIVE DEVIATION is the running sum of actual minus expected:
 *   at each expected date   −amount   (what was expected to arrive)
 *   at each actual payment  +amount   (what did arrive)
 * so an invoice paid in full nets to 0 once paid, and an open invoice past its
 * expected date holds the running total below zero by its amount.
 *
 * Everything stops at LAST DATA, not today: the export says nothing after it,
 * so no expected step is taken past it either. The x range runs from
 * 2026-04-01 to last data + 4 days, so the final level reads clearly.
 *
 * Pure functions of (invoices, payments, terms, last data). No dates are read
 * from the clock.
 */
import { filter, find, flatMap, join, map, sortBy, sum } from "../../../src/fn";
import type { Invoice, Payment } from "./rth-receivables.fixtures";

export const DAY_MS = 86_400_000;

/** Epoch ms at UTC midnight of an ISO date. */
export const dayMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

/** The ISO date of an epoch ms. */
export const isoOf = (t: number): string =>
  new Date(t).toISOString().slice(0, 10);

export const addDays = (t: number, days: number): number => t + days * DAY_MS;

export const daysBetween = (from: number, to: number): number =>
  Math.round((to - from) / DAY_MS);

export const X_START = dayMs("2026-04-01");

/** The x range drawn: April 1 to last data plus four days. */
export const xRange = (lastData: string): readonly [number, number] => [
  X_START,
  addDays(dayMs(lastData), 4),
];

// ---------------------------------------------------------------- money

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** "$27,990.00". */
export const money = (n: number): string => USD.format(Math.abs(n));

/** "−$18,200.00" with a true minus sign, "+$5.00", "$0.00". */
export const signedMoney = (n: number): string =>
  n < 0 ? `−${money(n)}` : n > 0 ? `+${money(n)}` : money(0);

// ---------------------------------------------------------------- per invoice

export type Status = "paid" | "due" | "overdue";

export interface Expectation {
  readonly id: string;
  readonly invoiced: number;
  readonly amount: number;
  readonly expected: number;
  readonly paid: number;
  /** The last payment against this invoice on or before last data, if any. */
  readonly paidOn: number | undefined;
  readonly status: Status;
  /** Days past the expected date at last data; 0 unless overdue. */
  readonly daysOverdue: number;
  /** Days the payment landed after (+) or before (−) its expected date. */
  readonly lateDays: number | undefined;
}

const paymentsOf = (
  id: string,
  payments: readonly Payment[],
  last: number,
): readonly Payment[] =>
  filter((p) => p.invoice === id && dayMs(p.date) <= last, payments);

const statusOf = (
  paid: number,
  amount: number,
  expected: number,
  last: number,
): Status => (paid >= amount ? "paid" : expected < last ? "overdue" : "due");

export const expectationOf =
  (payments: readonly Payment[], termsDays: number, lastData: string) =>
  (inv: Invoice): Expectation => {
    const last = dayMs(lastData);
    const invoiced = dayMs(inv.date);
    const expected = addDays(invoiced, termsDays);
    const mine = paymentsOf(inv.id, payments, last);
    const paid = sum(map((p) => p.amount, mine));
    const dates = map((p) => dayMs(p.date), mine);
    const paidOn = dates.length > 0 ? Math.max(...dates) : undefined;
    const status = statusOf(paid, inv.amount, expected, last);
    return {
      id: inv.id,
      invoiced,
      amount: inv.amount,
      expected,
      paid,
      paidOn,
      status,
      daysOverdue: status === "overdue" ? daysBetween(expected, last) : 0,
      lateDays:
        paidOn === undefined ? undefined : daysBetween(expected, paidOn),
    };
  };

export const expectations = (
  invoices: readonly Invoice[],
  payments: readonly Payment[],
  termsDays: number,
  lastData: string,
): readonly Expectation[] =>
  map(expectationOf(payments, termsDays, lastData), invoices);

// ---------------------------------------------------------------- the series

export interface Step {
  readonly x: number;
  readonly delta: number;
  readonly why: string;
}

export interface SeriesPoint {
  readonly x: number;
  readonly y: number;
  /** What moved the total at this x ("expected 1158", "paid 1151"). */
  readonly why: string;
}

const expectedStep = (e: Expectation): Step => ({
  x: e.expected,
  delta: -e.amount,
  why: `expected ${e.id}`,
});

const paymentStep = (p: Payment): Step => ({
  x: dayMs(p.date),
  delta: p.amount,
  why: `paid ${p.invoice}`,
});

/** Every move of the running total on or before last data, in date order. */
export const stepsOf = (
  exps: readonly Expectation[],
  payments: readonly Payment[],
  lastData: string,
): readonly Step[] => {
  const last = dayMs(lastData);
  const all = [...map(expectedStep, exps), ...map(paymentStep, payments)];
  return sortBy(
    (s) => s.x,
    filter((s) => s.x <= last, all),
  );
};

const uniqueXs = (steps: readonly Step[]): readonly number[] => [
  ...new Set(map((s) => s.x, steps)),
];

const runningTotalAt = (steps: readonly Step[], x: number): number =>
  sum(
    map(
      (s: Step) => s.delta,
      filter((s: Step) => s.x <= x, steps),
    ),
  );

const whyAt = (steps: readonly Step[], x: number): string =>
  join(
    ", ",
    map(
      (s: Step) => s.why,
      filter((s: Step) => s.x === x, steps),
    ),
  );

/**
 * The cumulative deviation as a step series: 0 at the start of the range, one
 * point per date the total moved (same-day moves merged), and the final level
 * held to LAST DATA, where the line stops (the axis runs on past it). Draw it
 * with `curve="step"`.
 */
export const deviationSeries = (
  steps: readonly Step[],
  lastData: string,
): readonly SeriesPoint[] => {
  const last = dayMs(lastData);
  const moves = map(
    (x) => ({ x, y: runningTotalAt(steps, x), why: whyAt(steps, x) }),
    uniqueXs(steps),
  );
  return [
    { x: X_START, y: 0, why: "start" },
    ...moves,
    { x: last, y: runningTotalAt(steps, last), why: "last data" },
  ];
};

/** The final level: actual minus expected at last data. */
export const driftOf = (series: readonly SeriesPoint[]): number =>
  series[series.length - 1]?.y ?? 0;

// ---------------------------------------------------------------- slots & dots

export type SlotState = "filled" | "partial" | "empty";

export interface Slot {
  readonly id: string;
  readonly at: number;
  readonly state: SlotState;
  readonly title: string;
}

const slotState = (e: Expectation): SlotState =>
  e.paid >= e.amount ? "filled" : e.paid > 0 ? "partial" : "empty";

const slotTitle = (e: Expectation): string =>
  e.paid >= e.amount
    ? `Invoice ${e.id}: ${money(e.amount)} expected ${isoOf(e.expected)}, paid ${isoOf(e.paidOn ?? e.expected)}`
    : e.paid > 0
      ? `Invoice ${e.id}: ${money(e.amount)} expected ${isoOf(e.expected)}, ${money(e.paid)} arrived`
      : `Invoice ${e.id}: ${money(e.amount)} expected ${isoOf(e.expected)}, nothing arrived`;

/**
 * One slot per invoice whose expected date has passed by last data. An
 * invoice not yet expected has no slot: nothing is owed yet, and the track has
 * no "pending" state.
 */
export const slotsOf = (
  exps: readonly Expectation[],
  lastData: string,
): readonly Slot[] =>
  map(
    (e: Expectation) => ({
      id: e.id,
      at: e.expected,
      state: slotState(e),
      title: slotTitle(e),
    }),
    filter((e: Expectation) => e.expected <= dayMs(lastData), exps),
  );

export interface Dot {
  readonly invoice: string;
  readonly x: number;
  readonly amount: number;
  readonly onTime: boolean;
  /** "19d late" / "3d early"; undefined when on its expected date. */
  readonly timing: string | undefined;
  readonly title: string;
}

const timingOf = (late: number): string | undefined =>
  late > 0 ? `${late}d late` : late < 0 ? `${-late}d early` : undefined;

/** One dot per actual payment on or before last data. */
export const dotsOf = (
  exps: readonly Expectation[],
  payments: readonly Payment[],
  lastData: string,
): readonly Dot[] =>
  flatMap((p) => {
    const e = find((x: Expectation) => x.id === p.invoice, exps);
    if (e === undefined || dayMs(p.date) > dayMs(lastData)) return [];
    const late = daysBetween(e.expected, dayMs(p.date));
    const timing = timingOf(late);
    return [
      {
        invoice: p.invoice,
        x: dayMs(p.date),
        amount: p.amount,
        onTime: late === 0,
        timing,
        title: `${p.date}: ${money(p.amount)} paid on invoice ${p.invoice}${timing ? ` (${timing})` : ""}`,
      },
    ];
  }, payments);

// ---------------------------------------------------------------- headless observation

const pad = (s: string, n: number): string => s.padEnd(n);
const padL = (s: string, n: number): string => s.padStart(n);

/** The series as a text table: date, running total, what moved it. */
export const seriesTable = (series: readonly SeriesPoint[]): string =>
  join("\n", [
    `${pad("date", 11)} ${padL("actual − expected", 18)}  moved by`,
    ...map(
      (p) => `${pad(isoOf(p.x), 11)} ${padL(signedMoney(p.y), 18)}  ${p.why}`,
      series,
    ),
  ]);

/** The per-invoice expectations as a text table. */
export const expectationTable = (exps: readonly Expectation[]): string =>
  join("\n", [
    `${pad("invoice", 8)}${pad("invoiced", 11)}${padL("amount", 12)}  ${pad("expected", 11)}${pad("status", 8)}${padL("overdue", 8)}`,
    ...map(
      (e) =>
        `${pad(e.id, 8)}${pad(isoOf(e.invoiced), 11)}${padL(money(e.amount), 12)}  ${pad(isoOf(e.expected), 11)}${pad(e.status, 8)}${padL(e.daysOverdue > 0 ? `${e.daysOverdue}d` : "", 8)}`,
      exps,
    ),
  ]);
