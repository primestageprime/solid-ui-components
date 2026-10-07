/**
 * Contract Builder bench — STEP 1 of rebuilding the example data one
 * expectation at a time (Peter, 2026-10-07): EXTERIOR's expectation only.
 * No other types, no signed or invoiced jobs.
 *
 * The curve: a half sine over the nine snow-free months, peaking at five
 * jobs in July and touching exactly zero in the three snow months —
 * December, January and February. Jobs are rounded to tenths, so each month's
 * dollars are a whole multiple of $400.
 *
 * The earlier all-types fixtures (`contract-builder.fixtures.ts`) stay as the
 * model tests' data; the bench renders this file instead.
 */
import { map } from "../../../src/fn";
import type { Config, Job, JobType, Payment } from "./contract-builder-model";

/** Jobs a month at the summer peak. */
const PEAK = 5;
/** The snow months, as month indices: Dec, Jan, Feb. */
export const SNOW_MONTHS: readonly number[] = [11, 0, 1];

/** Feb (1) and Dec (11) are the curve's zeros; July (6) its peak. */
const seasonal = (month: number): number =>
  month <= 1 || month >= 11
    ? 0
    : Math.round(PEAK * Math.sin((Math.PI * (month - 1)) / 10) * 10) / 10;

export const EXTERIOR: JobType = {
  id: "O",
  name: "Exterior",
  typical: 4000,
  qty: map((_m, i) => seasonal(i), Array.from({ length: 12 })),
};

export const STEP1: Config = { types: [EXTERIOR], jobs: [] };

// ── step 2: + interior ──────────────────────────────────────────────────────

/** Interior jobs a month at the summer low and through the snow months. */
const INTERIOR_LOW = 2;
const INTERIOR_HIGH = 6;

/** Months from mid-January, around the year: Jan 0, Dec/Feb 1, … Jul 6. */
const fromJanuary = (month: number): number => Math.min(month, 12 - month);

/**
 * The mirror of exterior: high through the snow months (within one month of
 * January), easing down through spring on a half cosine to the summer low by
 * June, and rising back through autumn the same way.
 */
const interiorQty = (month: number): number => {
  const d = fromJanuary(month);
  const w = d <= 1 ? 1 : d >= 5 ? 0 : 0.5 * (1 + Math.cos((Math.PI * (d - 1)) / 4));
  return Math.round((INTERIOR_LOW + (INTERIOR_HIGH - INTERIOR_LOW) * w) * 10) / 10;
};

/** Low in summer, rising through autumn, high in the snow months. */
export const INTERIOR: JobType = {
  id: "I",
  name: "Interior",
  typical: 2500,
  qty: map((_m, i) => interiorQty(i), Array.from({ length: 12 })),
};

export const STEP2: Config = { types: [EXTERIOR, INTERIOR], jobs: [] };

// ── step 3: + furniture ─────────────────────────────────────────────────────

/** Occasional small pieces: mostly none, a few scattered single jobs, one month of two. */
export const FURNITURE: JobType = {
  id: "F",
  name: "Furniture",
  typical: 1200,
  //    J  F  M  A  M  J  J  A  S  O  N  D
  qty: [0, 1, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0],
};

export const STEP3: Config = { types: [EXTERIOR, INTERIOR, FURNITURE], jobs: [] };

// ── step 4: + booked exterior jobs ──────────────────────────────────────────

/** The bench's "now": a payment before it is invoiced, on or after it is not. */
export const TODAY = "2026-10-07";

const pay = (label: string, on: string, amount: number): Payment => ({
  label,
  on,
  amount,
  invoiced: on < TODAY,
});

const exteriorJob = (
  id: string,
  name: string,
  start: string,
  duration: number,
  payments: readonly Payment[],
): Job => ({ id, name, type: "O", use: true, start, duration, payments });

/**
 * Signed exterior work, placed by payment date. Month totals against the hope:
 *   Mar  $5,100 of  $6,000  (85% — a remainder left empty)
 *   Apr $13,340 of $11,600 (115% — $1,740 above the hope)
 *   May–Oct exactly 100%; Nov–Dec nothing signed yet.
 * October straddles TODAY: $4,000 already invoiced, $7,600 signed but not yet.
 */
export const EXTERIOR_JOBS: readonly Job[] = [
  exteriorJob("alvarez", "Alvarez colonial", "2026-03-16", 12, [
    pay("Deposit", "2026-03-10", 2000),
    pay("Final", "2026-04-08", 6000),
  ]),
  exteriorJob("marsh", "Marsh Rd siding", "2026-03-30", 10, [
    pay("Deposit", "2026-03-24", 3100),
    pay("Final", "2026-04-22", 4340),
  ]),
  exteriorJob("okafor", "Okafor porch + trim", "2026-05-04", 9, [
    pay("Deposit", "2026-04-28", 3000),
    pay("Final", "2026-05-15", 9000),
  ]),
  exteriorJob("hollis", "Hollis Ave fence", "2026-06-01", 8, [
    pay("Deposit", "2026-05-27", 7000),
    pay("Final", "2026-06-12", 8000),
  ]),
  exteriorJob("reyes", "Reyes garage", "2026-06-22", 4, [
    pay("On completion", "2026-06-26", 7200),
  ]),
  exteriorJob("garner", "Garner barn", "2026-07-06", 9, [
    pay("Deposit", "2026-06-29", 4000),
    pay("Final", "2026-07-17", 10000),
  ]),
  exteriorJob("lindqvist", "Lindqvist cedar shake", "2026-07-27", 9, [
    pay("Deposit", "2026-07-20", 5000),
    pay("Final", "2026-08-07", 11200),
  ]),
  exteriorJob("pemberton", "Pemberton shed + deck", "2026-07-27", 4, [
    pay("On completion", "2026-07-31", 5000),
  ]),
  exteriorJob("brook", "Brook St Victorian", "2026-08-31", 25, [
    pay("Deposit", "2026-08-24", 8000),
    pay("Progress", "2026-09-11", 6000),
    pay("Final", "2026-10-02", 4000),
  ]),
  exteriorJob("dentist", "Dental office exterior", "2026-09-14", 4, [
    pay("Net 10", "2026-09-18", 6400),
  ]),
  exteriorJob("hartley", "Hartley condo trim", "2026-10-05", 9, [
    pay("Deposit", "2026-09-29", 3600),
    pay("Final", "2026-10-16", 5600),
  ]),
  exteriorJob("mill", "Mill Lofts railings", "2026-10-26", 3, [
    pay("On completion", "2026-10-30", 2000),
  ]),
];

export const STEP4: Config = {
  types: [EXTERIOR, INTERIOR, FURNITURE],
  jobs: EXTERIOR_JOBS,
};
