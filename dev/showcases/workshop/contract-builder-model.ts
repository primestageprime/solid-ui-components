/**
 * Contract Builder bench — the pure model.
 *
 * A tradesperson's year composited from two things:
 *
 *   HOPED (projected) — per job type, how many jobs a month they usually do,
 *   and what one job is typically worth. Seasonal: a painter's exterior work
 *   goes to zero under snow while interior picks up.
 *
 *   KNOWN (planned) — signed estimates. Each carries its own PAYMENT schedule
 *   (deposit, phase payments, final), and a job's money lands in the month
 *   each payment falls — never by its start date or its duration.
 *
 * THE UNIT IS DOLLARS. Projected $ = qty × typical $; planned $ = the payments
 * that fall in the month. A count would need a rule for which month a job
 * "counts" in when its payments span three — and any such rule is start-date
 * attribution, which the payment rule forbids. Dollars are the only unit in
 * which "money lands where payments fall" holds. (Assumption — not yet
 * confirmed by Peter; the bench states it.)
 *
 * PLANNED CONSUMES PROJECTED, per type per month:
 *   within     = min(planned, projected)    a planned win: booked inside the hope
 *   unplanned  = max(0, planned − projected) an unplanned win: the hope was low
 *   remainder  = max(0, projected − planned) still hoped for, not yet booked
 *   shown      = planned + remainder         = max(planned, projected)
 *   delta      = planned − projected         ahead (+) / behind (−), unclamped
 *
 * INVOICED IS A SUBSET OF PLANNED. A payment is signed-but-not-billed until it
 * is invoiced. Invoiced money consumes the projection FIRST, so inside the
 * outline the invoiced part sits at the base and the not-yet-invoiced part
 * above it:
 *   invoicedWithin = min(invoiced, projected)
 *   plannedWithin  = within − invoicedWithin
 * Money above the projection is one mark whether invoiced or not (Peter did
 * not say how an invoiced overage differs; assumption, stated in the report).
 *
 * Every function here is a pure f(config, month) — no registers, nothing
 * carried from one month to the next (Peter, 2026-09-30: "There can be
 * registers for the UI, but not for the projection fold"). A cumulative view
 * is a sum of months, never a running state.
 *
 * The laws the tests pin (`contract-builder-model.test.ts`):
 *   1. within + unplanned = planned, and within + remainder = projected;
 *   2. unplanned and remainder are never both above zero;
 *   3. a job's money sits in its payment months, not its start month;
 *   4. a job that is not in use contributes nothing;
 *   5. invoicedWithin + plannedWithin = within.
 */
import { filter, flatMap, join, map, pipe, sum } from "../../../src/fn";

// ── vocabulary ──────────────────────────────────────────────────────────────

export const YEAR = 2026;
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
/** Month indices 0..11 of `YEAR`. */
export const MONTH_INDICES: readonly number[] = map((_m, i) => i, MONTHS);

export type TypeId = "O" | "I" | "F";

export interface JobType {
  readonly id: TypeId;
  readonly name: string;
  /** What one job of this type is typically worth. */
  readonly typical: number;
  /** Jobs a month this type usually brings in, one entry per month. */
  readonly qty: readonly number[];
}

export interface Payment {
  readonly label: string;
  /** ISO date the money lands. */
  readonly on: string;
  readonly amount: number;
  /** Billed. Unbilled money is still planned, just not yet invoiced. */
  readonly invoiced: boolean;
}

export interface Job {
  readonly id: string;
  readonly name: string;
  readonly type: TypeId;
  /** Whether the job counts toward the plan (the Known table's toggle). */
  readonly use: boolean;
  /** ISO date the work starts — shown, never used to place money. */
  readonly start: string;
  /** Working days. */
  readonly duration: number;
  readonly payments: readonly Payment[];
}

export interface Config {
  readonly types: readonly JobType[];
  readonly jobs: readonly Job[];
}

// ── the consumption fold ────────────────────────────────────────────────────

export interface Cell {
  readonly type: TypeId;
  readonly month: number;
  readonly projected: number;
  readonly planned: number;
  /** The invoiced part of `planned`. */
  readonly invoiced: number;
  readonly within: number;
  /** Inside the projection and invoiced — the base of the bar. */
  readonly invoicedWithin: number;
  /** Inside the projection, signed but not yet invoiced. */
  readonly plannedWithin: number;
  readonly unplanned: number;
  readonly remainder: number;
  /** max(planned, projected): the height the bar stands to. */
  readonly shown: number;
  /** planned − projected: ahead (+) or behind (−). */
  readonly delta: number;
}

/** The month (0..11) an ISO date falls in, or −1 outside `YEAR`. */
export const monthOf = (iso: string): number => {
  const [y, m] = map(Number, iso.split("-"));
  return y === YEAR ? m - 1 : -1;
};

const paymentsIn = (job: Job, month: number): readonly Payment[] =>
  filter((p: Payment) => monthOf(p.on) === month, job.payments);

const landing = (config: Config, type: TypeId, month: number): readonly Payment[] =>
  pipe(
    config.jobs,
    filter((j: Job) => j.use && j.type === type),
    flatMap((j: Job) => paymentsIn(j, month)),
  );

const total = (ps: readonly Payment[]): number =>
  sum(map((p: Payment) => p.amount, ps));

/** Planned $ for a type in a month: the in-use jobs' payments that land there. */
export const plannedOf = (config: Config, type: TypeId, month: number): number =>
  total(landing(config, type, month));

/** The invoiced part of `plannedOf`. */
export const invoicedOf = (config: Config, type: TypeId, month: number): number =>
  total(filter((p: Payment) => p.invoiced, landing(config, type, month)));

/** Projected $ for a type in a month: qty × typical. */
export const projectedOf = (t: JobType, month: number): number =>
  (t.qty[month] ?? 0) * t.typical;

/** One type in one month, consumption applied. */
export const cellOf = (config: Config, t: JobType, month: number): Cell => {
  const projected = projectedOf(t, month);
  const planned = plannedOf(config, t.id, month);
  const invoiced = invoicedOf(config, t.id, month);
  const within = Math.min(planned, projected);
  const invoicedWithin = Math.min(invoiced, projected);
  return {
    type: t.id,
    month,
    projected,
    planned,
    invoiced,
    within,
    invoicedWithin,
    plannedWithin: within - invoicedWithin,
    unplanned: Math.max(0, planned - projected),
    remainder: Math.max(0, projected - planned),
    shown: Math.max(planned, projected),
    delta: planned - projected,
  };
};

export interface Period {
  readonly month: number;
  readonly cells: readonly Cell[];
}

/** Every type in one month, in the config's type order. */
export const periodOf = (config: Config, month: number): Period => ({
  month,
  cells: map((t: JobType) => cellOf(config, t, month), config.types),
});

/** The year, month by month. */
export const periodsOf = (config: Config): readonly Period[] =>
  map((m: number) => periodOf(config, m), MONTH_INDICES);

/** One type's cells across the year. */
export const cellsOfType = (config: Config, type: TypeId): readonly Cell[] =>
  pipe(
    periodsOf(config),
    flatMap((p: Period) => p.cells),
    filter((c: Cell) => c.type === type),
  );

/** The tallest bar of the year — the chart's y top. */
export const tallest = (config: Config): number =>
  Math.max(
    0,
    ...pipe(
      periodsOf(config),
      flatMap((p: Period) => p.cells),
      map((c: Cell) => c.shown),
    ),
  );

// ── headless observation ────────────────────────────────────────────────────

/** `$4.5k`-style money for tables and ticks. */
export const money = (v: number): string =>
  Math.abs(v) >= 1000
    ? `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v) / 100) / 10}k`
    : `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v))}`;

const signed = (v: number): string => (v > 0 ? `+${money(v)}` : money(v));

const pad = (s: string, n: number): string => s.padStart(n);

const COLUMNS = [
  "month",
  "type",
  "projected",
  "planned",
  "invoiced",
  "inv-within",
  "plan-within",
  "unplanned",
  "remainder",
  "ahead/behind",
] as const;

const rowOf = (c: Cell): readonly string[] => [
  MONTHS[c.month],
  c.type,
  money(c.projected),
  money(c.planned),
  money(c.invoiced),
  money(c.invoicedWithin),
  money(c.plannedWithin),
  money(c.unplanned),
  money(c.remainder),
  signed(c.delta),
];

/** The year as a fixed-width text table: one row per month × type. */
export const observe = (config: Config): string => {
  const rows = pipe(
    periodsOf(config),
    flatMap((p: Period) => p.cells),
    map(rowOf),
  );
  const line = (cells: readonly string[]) =>
    join(" ", map((s: string) => pad(s, 12), cells));
  return join("\n", [line(COLUMNS), ...map(line, rows)]);
};
