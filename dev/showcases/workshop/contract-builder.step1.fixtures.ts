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

/** Interior's steady baseline, and its level in the snow months. */
const INTERIOR_BASE = 3;
const INTERIOR_SNOW = 6;

/** Steady year-round, spiking in the snow months when exterior is $0. */
export const INTERIOR: JobType = {
  id: "I",
  name: "Interior",
  typical: 2500,
  qty: map(
    (_m, i) => (SNOW_MONTHS.includes(i) ? INTERIOR_SNOW : INTERIOR_BASE),
    Array.from({ length: 12 }),
  ),
};

export const STEP2: Config = { types: [EXTERIOR, INTERIOR], jobs: [] };
