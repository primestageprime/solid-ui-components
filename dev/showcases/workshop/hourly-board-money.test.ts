/**
 * Hourly Board money — the two gauge sentences and the two dial units.
 *
 * These ARE the words the gauge says, so they are asserted here rather than
 * read off a dial: `RateGauge` supplies no wording of its own around them, and
 * a sentence that only a browser could check is a sentence nothing checks.
 */
import { describe, expect, it } from "vitest";
import {
  abbreviateDollars,
  againstBreakeven,
  dollarsPerYear,
  formatHours,
  formatRate,
  revenueShift,
  signedDollarsPerYear,
} from "./hourly-board-money";

describe("the annual unit", () => {
  it("spells /yr once", () => {
    expect(dollarsPerYear(249_600)).toBe("$249.6k/yr");
    expect(dollarsPerYear(69_600)).toBe("$69.6k/yr");
  });

  it("does not fork the abbreviator", () => {
    // The whole reason the module imports rather than rewrites: one rounding
    // policy for the workshop.
    expect(dollarsPerYear(1_200_000)).toBe(
      `${abbreviateDollars(1_200_000)}/yr`,
    );
  });

  it("signs a CHANGE and not an amount", () => {
    expect(signedDollarsPerYear(20_000)).toBe("+$20k/yr");
    expect(signedDollarsPerYear(-40_000)).toBe("−$40k/yr");
    // The unsigned form is what "over breakeven" is built on — see below.
    expect(dollarsPerYear(20_000)).toBe("$20k/yr");
  });
});

describe("againstBreakeven — the second callout line", () => {
  it("reads OVER above zero and BELOW under it, with no sign flip", () => {
    expect(againstBreakeven(69_600)).toBe("$69.6k/yr over breakeven");
    expect(againstBreakeven(-13_600)).toBe("$13.6k/yr below breakeven");
  });

  it("says what a person would say at zero", () => {
    expect(againstBreakeven(0)).toBe("at breakeven");
  });

  it("never prints a sign inside the sentence", () => {
    // The words carry the direction; a sign would say it twice.
    expect(againstBreakeven(-13_600)).not.toContain("−$");
    expect(againstBreakeven(69_600)).not.toContain("+");
  });
});

describe("revenueShift — the brace line", () => {
  it("reads MORE for a rise and LESS for a fall — revenue-side, unflipped", () => {
    expect(revenueShift(78_000)).toBe("$78k/yr more revenue");
    expect(revenueShift(-52_000)).toBe("$52k/yr less revenue");
  });

  it("has its own line for no change", () => {
    expect(revenueShift(0)).toBe("no change to revenue");
  });
});

describe("the dials' two units", () => {
  it("prints whole hours, because the axis snaps to one", () => {
    expect(formatHours(20)).toBe("20h");
    expect(formatHours(19.6)).toBe("20h");
  });

  it("groups an hourly rate rather than abbreviating it", () => {
    expect(formatRate(150)).toBe("$150");
    expect(formatRate(1_200)).toBe("$1,200");
    // The distinction the comment claims: the compact scaler would say $1.2k.
    expect(formatRate(1_200)).not.toBe(abbreviateDollars(1_200));
  });
});
