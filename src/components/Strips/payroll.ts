// Payroll strips — the engine-neutral VALUES and pure rules behind
// HourlyWageAmountStrip (rate x hours a week) and PayrollTaxStrip (a read-only
// derived employer tax). No Solid, no DOM, no engine vocabulary. Money is
// integer cents.

import { sum } from "../../fn";
import { perPaymentCents } from "./values";

/** Weeks a year an hourly wage is estimated over. */
export const WEEKS_PER_YEAR = 52;
/** No one works more than the hours in a week. */
export const MAX_HOURS_PER_WEEK = 168;
/** Hours snap to the strip's own step. */
export const HOURS_STEP = 0.25;

/** An hourly wage: a rate and the hours worked each week. Overtime is not
 *  modelled yet. */
export interface HourlyWageValue {
  /** Pay for one hour, in cents. */
  rateCents: number;
  /** Hours worked each week. */
  hoursPerWeek: number;
}

/** The estimated annual amount: rate x hours x 52, to whole cents. */
export const hourlyAnnualCents = (wage: HourlyWageValue): number =>
  Math.round(wage.rateCents * wage.hoursPerWeek * WEEKS_PER_YEAR);

/** One paycheck of the estimate, `periodsPerYear` to the year, half-even. */
export const hourlyPaycheckCents = (wage: HourlyWageValue, periodsPerYear: number): number =>
  perPaymentCents(hourlyAnnualCents(wage), periodsPerYear);

/** Move the annual estimate to `annualCents` by scaling HOURS and keeping the
 *  rate: a rate is a contract term, hours are the estimate. Hours snap to
 *  0.25 and stay within 0..168, so the result lands within a quarter hour of
 *  the ask. A zero rate cannot be scaled and is returned unchanged. */
export const setHourlyAnnualCents = (wage: HourlyWageValue, annualCents: number): HourlyWageValue => {
  if (wage.rateCents <= 0) return wage;
  const hours = Math.max(0, annualCents) / (wage.rateCents * WEEKS_PER_YEAR);
  const snapped = Math.round(hours / HOURS_STEP) * HOURS_STEP;
  return { ...wage, hoursPerWeek: Math.min(MAX_HOURS_PER_WEEK, snapped) };
};

/** Employer payroll tax, derived and never edited. */
export interface PayrollTaxValue {
  /** The rate in basis points (765 = 7.65%). */
  rateBps: number;
  /** Annual payroll the tax applies to, in cents. */
  baseCents: number;
  /** Tax for the year, in cents. */
  perYearCents: number;
  /** Tax for one pay period, in cents. */
  perPeriodCents: number;
  /** Pay periods a year. */
  periodsPerYear: number;
}

/** Tax on the sum of the payroll lines' annual amounts, rounded half-even to
 *  whole cents each time. */
export const derivePayrollTax = (
  lineAnnualCents: readonly number[],
  rateBps: number,
  periodsPerYear: number,
): PayrollTaxValue => {
  const baseCents = sum(lineAnnualCents);
  const perYearCents = perPaymentCents(baseCents * rateBps, 10_000);
  return {
    rateBps,
    baseCents,
    perYearCents,
    perPeriodCents: perPaymentCents(perYearCents, periodsPerYear),
    periodsPerYear,
  };
};

/** "7.65%". */
export const rateText = (rateBps: number): string => `${(rateBps / 100).toFixed(2)}%`;
