/**
 * Simple Contract Builder bench — example data, reused from Contract Builder:
 * the same three hopes and the same jobs, NOW = April 15, plus four quotes.
 * Status (Peter, 2026-10-08): the first two rows by start and two others are
 * CONFIRMED; every other contract is PLANNED. Every contract starts switched
 * on, and every toggle works.
 */
import { map } from "../../../src/fn";
import type { Job } from "./contract-builder-model";
import {
  EXTERIOR,
  EXTERIOR_JOBS,
  FURNITURE,
  INTERIOR,
  INTERIOR_JOBS,
  TODAY,
} from "./contract-builder.step1.fixtures";
import type { Contract } from "./simple-contract-builder.model";

export { TODAY };
export const TYPES = [EXTERIOR, INTERIOR, FURNITURE] as const;

/** The Confirmed few: the first two by start, and two others. */
const CONFIRMED_IDS = new Set(["i-okafor", "i-basement", "westfield", "alvarez"]);

const contractOf = (j: Job): Contract => ({
  ...j,
  use: true,
  status: CONFIRMED_IDS.has(j.id) ? "Confirmed" : "Planned",
  locked: false,
});

const planned = (
  id: string,
  name: string,
  type: Job["type"],
  use: boolean,
  start: string,
  duration: number,
  payments: readonly [string, number][],
): Contract => ({
  id,
  name,
  type,
  use,
  start,
  duration,
  status: "Planned",
  locked: false,
  payments: map(
    ([on, amount]: [string, number], i: number) => ({
      label: i === 0 && payments.length > 1 ? "Deposit" : "Final",
      on,
      amount,
      invoiced: false,
    }),
    payments,
  ),
});

export const CONTRACTS: readonly Contract[] = [
  ...map(contractOf, EXTERIOR_JOBS),
  ...map(contractOf, INTERIOR_JOBS),
  planned("e-harbor", "Harbor Point condos (quote)", "O", true, "2026-06-15", 20, [
    ["2026-06-08", 6000],
    ["2026-07-10", 12000],
  ]),
  planned("e-elm", "Elm St two-family (quote)", "O", true, "2026-08-17", 10, [
    ["2026-08-10", 4000],
    ["2026-08-28", 9000],
  ]),
  planned("e-clinic", "Westside clinic interior (quote)", "I", true, "2026-11-02", 12, [
    ["2026-10-26", 3000],
    ["2026-11-20", 6000],
  ]),
  planned("e-armoire", "Antique armoire (quote)", "F", true, "2026-05-11", 5, [
    ["2026-05-18", 1400],
  ]),
];

/**
 * What the painter pays out in a WEEK regardless of jobs — crew, van,
 * insurance, the shop. It is what makes breakeven a number at all. An example
 * figure (not from Peter): set so the opening board runs a little over
 * breakeven, which leaves both halves of the dial reachable.
 */
export const FIXED_WEEKLY_COST = 5_000;

/** The dial's domain, in $/wk: every job gone is −the fixed cost. */
export const RATE_DOMAIN: readonly [number, number] = [-5_000, 5_000];

/**
 * Cash in the bank on January 1. An example figure (not from Peter), like the
 * Hourly Board's OPENING_BALANCE: enough that the slow snow months dip the
 * balance without taking it below zero.
 */
export const OPENING_BALANCE = 25_000;
