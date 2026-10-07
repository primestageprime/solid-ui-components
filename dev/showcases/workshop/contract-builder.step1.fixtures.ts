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
import type { Config, JobType } from "./contract-builder-model";

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
