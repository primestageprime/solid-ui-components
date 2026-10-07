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
export const TODAY = "2026-04-15";

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
 * Signed exterior work, placed by payment date (step 6b, Peter: exterior
 * overperforming should make the running total "hokey-pokey back and forth"
 * across zero against interior's shortfall). Winter DEPOSITS for spring jobs
 * land in Jan/Feb against a $0 hope; then the season alternates over and
 * under:
 *   Jan $6,000 / Feb $10,000 against $0 (deposits — all above the hope)
 *   Mar 300%  Apr 83%  May 150%  Jun 79%  Jul 145%  Aug 58%  Sep 163%
 *   Oct 100%  Nov 0% (nothing signed)  Dec — ($0 hope)
 */
export const EXTERIOR_JOBS: readonly Job[] = [
  exteriorJob("westfield", "Westfield Plaza storefronts", "2026-03-09", 15, [
    pay("Deposit", "2026-01-20", 3000),
    pay("Final", "2026-03-27", 12000),
  ]),
  exteriorJob("alvarez", "Alvarez colonial", "2026-03-23", 14, [
    pay("Deposit", "2026-01-28", 3000),
    pay("Progress", "2026-03-31", 6000),
    pay("Final", "2026-04-10", 4000),
  ]),
  exteriorJob("marsh", "Marsh Rd siding", "2026-04-06", 12, [
    pay("Deposit", "2026-02-10", 4000),
    pay("Final", "2026-04-24", 5600),
  ]),
  exteriorJob("garner", "Garner barn", "2026-05-04", 14, [
    pay("Deposit", "2026-02-24", 6000),
    pay("Final", "2026-05-22", 14000),
  ]),
  exteriorJob("okafor", "Okafor porch + trim", "2026-05-25", 4, [
    pay("On completion", "2026-05-29", 10000),
  ]),
  exteriorJob("hollis", "Hollis Ave fence", "2026-06-08", 9, [
    pay("Deposit", "2026-06-03", 5000),
    pay("Final", "2026-06-19", 10200),
  ]),
  exteriorJob("lindqvist", "Lindqvist cedar shake", "2026-07-06", 15, [
    pay("Deposit", "2026-07-06", 9000),
    pay("Final", "2026-07-24", 20000),
  ]),
  exteriorJob("reyes", "Reyes garage + trim", "2026-08-10", 4, [
    pay("On completion", "2026-08-14", 11200),
  ]),
  exteriorJob("brook", "Brook St Victorian", "2026-09-02", 18, [
    pay("Deposit", "2026-09-02", 8000),
    pay("Final", "2026-09-25", 18000),
  ]),
  exteriorJob("hartley", "Hartley condo trim", "2026-10-05", 4, [
    pay("On completion", "2026-10-09", 7600),
  ]),
  exteriorJob("mill", "Mill Lofts railings", "2026-10-26", 2, [
    pay("On completion", "2026-10-28", 4000),
  ]),
];

export const STEP4: Config = {
  types: [EXTERIOR, INTERIOR, FURNITURE],
  jobs: EXTERIOR_JOBS,
};

// ── step 5: + booked interior jobs ──────────────────────────────────────────

const interiorJob = (
  id: string,
  name: string,
  start: string,
  duration: number,
  payments: readonly Payment[],
): Job => ({ id, name, type: "I", use: true, start, duration, payments });

/**
 * Signed interior work, placed by payment date. An improving year against the
 * hope: a weak winter and spring (40–60%), climbing to ~80% by autumn, with
 * ONE month over the hope — August, 115%. November and December hold signed
 * winter work not yet invoiced: 70% and 50% of a high snow-month hope.
 */
export const INTERIOR_JOBS: readonly Job[] = [
  interiorJob("i-okafor", "Okafor whole-house interior", "2026-01-05", 14, [
    pay("Deposit", "2026-01-05", 2500),
    pay("Final", "2026-01-23", 4250),
  ]),
  interiorJob("i-basement", "Lindqvist basement", "2026-02-09", 4, [
    pay("On completion", "2026-02-13", 3500),
  ]),
  interiorJob("i-dental", "Dental office repaint", "2026-03-02", 8, [
    pay("Deposit", "2026-02-25", 2500),
    pay("Final", "2026-03-12", 4000),
  ]),
  interiorJob("i-nursery", "Patel nursery + hall", "2026-03-23", 4, [
    pay("On completion", "2026-03-27", 2750),
  ]),
  interiorJob("i-office", "Grange St offices", "2026-04-13", 8, [
    pay("Deposit", "2026-04-06", 2000),
    pay("Final", "2026-04-24", 4000),
  ]),
  interiorJob("i-cabinets", "Moreau kitchen cabinets", "2026-05-11", 6, [
    pay("On completion", "2026-05-19", 4500),
  ]),
  interiorJob("i-stair", "Fenwick stairwell", "2026-06-10", 4, [
    pay("On completion", "2026-06-16", 3500),
  ]),
  interiorJob("i-loft", "Mill Lofts unit 4", "2026-07-13", 8, [
    pay("Deposit", "2026-07-08", 1250),
    pay("Final", "2026-07-24", 2500),
  ]),
  interiorJob("i-salon", "Bloom salon refresh", "2026-08-06", 4, [
    pay("On completion", "2026-08-12", 3250),
  ]),
  interiorJob("i-library", "Branch library reading room", "2026-08-31", 7, [
    pay("Deposit", "2026-08-27", 2500),
    pay("Final", "2026-09-09", 5200),
  ]),
  interiorJob("i-church", "St. Anne's parish hall", "2026-10-05", 11, [
    pay("Deposit", "2026-10-01", 3000),
    pay("Final", "2026-10-20", 5000),
  ]),
  interiorJob("i-condo", "Hartley condo building halls", "2026-11-09", 25, [
    pay("Deposit", "2026-11-04", 3000),
    pay("Progress", "2026-11-25", 6450),
    pay("Final", "2026-12-11", 4000),
  ]),
  interiorJob("i-den", "Reyes den + dining", "2026-12-14", 4, [
    pay("On completion", "2026-12-18", 3500),
  ]),
];

export const STEP5: Config = {
  types: [EXTERIOR, INTERIOR, FURNITURE],
  jobs: [...EXTERIOR_JOBS, ...INTERIOR_JOBS],
};
