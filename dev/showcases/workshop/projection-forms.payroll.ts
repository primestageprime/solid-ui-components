// Payroll fixtures and the thorcasting adapter for the hourly employee. The
// engine has NO hourly-wage kind yet, so the JSON below is a PROPOSED kind:
// field names follow `salary` (person, paid_from, schedule, label, window) with
// the wage's own two terms, rate and hours. Peter, 2026-10-01: hourly lives in
// Payroll beside salary; the scenario slider is the estimated annual for both.
import type { HourlyWageValue } from "../../../src/components/Strips";
import { type Json, scheduleOf, windowKeys } from "./projection-forms.adapter";
import type { StripValues } from "./projection-forms.adapter";

/** Employer payroll tax rate, basis points (7.65%: Social Security + Medicare). */
export const PAYROLL_TAX_BPS = 765;

export const HOURLY_START: HourlyWageValue = { rateCents: 4_500, hoursPerWeek: 40 };

export const HOURLY_LABEL = "Jordan Lee";

export type HourlyValues = Omit<StripValues, "amount"> & { wage: HourlyWageValue };

export const HOURLY_VALUES: HourlyValues = {
  label: HOURLY_LABEL,
  wage: HOURLY_START,
  cadence: { shape: "biweekly", anchor: "2026-09-04" },
  window: { start: "2026-10-05" },
};

/** PROPOSED kind `hourly_wage`: not in the engine. */
export const hourlyWageJson = (v: HourlyValues): Json => ({
  kind: "hourly_wage",
  _proposed: "the engine has no hourly-wage kind yet; these keys are a proposal",
  person: "person:per-0123456789abcdef0123456789abcdef",
  paid_from: "account:Checking",
  schedule: scheduleOf(v.cadence),
  rate_cents: v.wage.rateCents,
  hours_x100_per_week: Math.round(v.wage.hoursPerWeek * 100),
  label: v.label,
  ...windowKeys(v.window),
});
