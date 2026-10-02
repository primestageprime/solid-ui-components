import { describe, expect, it } from "vitest";
import {
  type HourlyWageValue,
  derivePayrollTax,
  hourlyAnnualCents,
  hourlyPaycheckCents,
  rateText,
  setHourlyAnnualCents,
} from "./payroll";

const wage: HourlyWageValue = { rateCents: 4_500, hoursPerWeek: 40 };

describe("hourly wage", () => {
  it("annual is rate x hours x 52 and each paycheck divides half-even", () => {
    const rows = [
      { rate: 4_500, hours: 40 },
      { rate: 3_333, hours: 37.5 },
      { rate: 2_000, hours: 12.25 },
      { rate: 0, hours: 40 },
    ].map(({ rate, hours }) => {
      const w = { rateCents: rate, hoursPerWeek: hours };
      return {
        rate: rate / 100,
        hours,
        annual: hourlyAnnualCents(w),
        biweekly: hourlyPaycheckCents(w, 26),
        semimonthly: hourlyPaycheckCents(w, 24),
        monthly: hourlyPaycheckCents(w, 12),
      };
    });
    console.table(rows);
    expect(hourlyAnnualCents(wage)).toBe(9_360_000);
    expect(hourlyPaycheckCents(wage, 26)).toBe(360_000);
    expect(hourlyPaycheckCents(wage, 24)).toBe(390_000);
    expect(hourlyPaycheckCents(wage, 12)).toBe(780_000);
    expect(hourlyAnnualCents({ rateCents: 3_333, hoursPerWeek: 37.5 })).toBe(6_499_350);
    expect(hourlyPaycheckCents({ rateCents: 3_333, hoursPerWeek: 37.5 }, 26)).toBe(249_975);
  });

  it("the annual slider scales hours and keeps the rate", () => {
    const rows = [0, 5_000_000, 9_360_000, 12_345_600, 99_999_999].map((ask) => {
      const next = setHourlyAnnualCents(wage, ask);
      return { ask, hours: next.hoursPerWeek, rate: next.rateCents, annual: hourlyAnnualCents(next) };
    });
    console.table(rows);
    expect(setHourlyAnnualCents(wage, 9_360_000)).toEqual(wage);
    expect(setHourlyAnnualCents(wage, 0).hoursPerWeek).toBe(0);
    expect(setHourlyAnnualCents(wage, 99_999_999).hoursPerWeek).toBe(168);
    expect(setHourlyAnnualCents(wage, 12_345_600).rateCents).toBe(4_500);
    // within a quarter hour of the ask
    expect(
      Math.abs(hourlyAnnualCents(setHourlyAnnualCents(wage, 5_000_000)) - 5_000_000),
    ).toBeLessThanOrEqual(4_500 * 52 * 0.125);
  });

  it("a zero rate cannot be scaled", () => {
    const free = { rateCents: 0, hoursPerWeek: 10 };
    expect(setHourlyAnnualCents(free, 1_000_000)).toBe(free);
  });
});

describe("payroll tax", () => {
  it("is rate x the payroll base, per year and per period", () => {
    const rows = [
      { lines: [10_289_110], bps: 765, periods: 26 },
      { lines: [10_289_110, 9_360_000], bps: 765, periods: 26 },
      { lines: [9_360_000], bps: 620, periods: 12 },
      { lines: [], bps: 765, periods: 26 },
    ].map(({ lines, bps, periods }) => {
      const t = derivePayrollTax(lines, bps, periods);
      return { rate: rateText(bps), base: t.baseCents, perYear: t.perYearCents, perPeriod: t.perPeriodCents, periods };
    });
    console.table(rows);
    const t = derivePayrollTax([10_289_110], 765, 26);
    expect(t.baseCents).toBe(10_289_110);
    expect(t.perYearCents).toBe(787_117);
    expect(t.perPeriodCents).toBe(30_274);
    expect(derivePayrollTax([], 765, 26).perYearCents).toBe(0);
    expect(derivePayrollTax([9_360_000], 765, 12).perYearCents).toBe(716_040);
  });

  it("rounds half-even to whole cents", () => {
    // 1 cent x 50% = 0.5 -> 0 (even); 3 cents x 50% = 1.5 -> 2 (even)
    expect(derivePayrollTax([1], 5_000, 1).perYearCents).toBe(0);
    expect(derivePayrollTax([3], 5_000, 1).perYearCents).toBe(2);
  });

  it("rate text", () => {
    expect(rateText(765)).toBe("7.65%");
  });
});
