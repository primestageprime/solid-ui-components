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
  dollarsPerWeek,
  formatHours,
  formatRate,
  revenueShift,
  signedDollarsPerWeek,
} from "./hourly-board-money";

describe("the weekly unit", () => {
  it("spells /wk once, and never a year", () => {
    // Peter, 2026-09-18: every money figure on this board reads /wk.
    expect(dollarsPerWeek(4_936.52)).toBe("$4.9k/wk");
    expect(dollarsPerWeek(1_336.52)).toBe("$1.3k/wk");
    // A service summary: 20 h/wk at $150 is the hours times the rate, with no
    // ×52 anywhere in it.
    expect(dollarsPerWeek(20 * 150)).toBe("$3k/wk");
    expect(dollarsPerWeek(1_336.52)).not.toContain("/yr");
  });

  it("does not fork the abbreviator", () => {
    // The whole reason the module imports rather than rewrites: one rounding
    // policy for the workshop.
    expect(dollarsPerWeek(1_200_000)).toBe(
      `${abbreviateDollars(1_200_000)}/wk`,
    );
    // A figure below the k tier, which is where a weekly board spends a good
    // deal of its time: the abbreviator groups rather than scaling it.
    expect(dollarsPerWeek(308.44)).toBe("$308/wk");
  });

  it("signs a CHANGE and not an amount", () => {
    expect(signedDollarsPerWeek(1_500)).toBe("+$1.5k/wk");
    expect(signedDollarsPerWeek(-309)).toBe("−$309/wk");
    // The unsigned form is what "over breakeven" is built on — see below.
    expect(dollarsPerWeek(1_500)).toBe("$1.5k/wk");
  });
});

describe("againstBreakeven — the second callout line", () => {
  it("reads OVER above zero and BELOW under it, with no sign flip", () => {
    // The board as it opens, and both rates cut to their floors — the first
    // and last rows of the calibration table, in the gauge's own words.
    expect(againstBreakeven(1_336.52)).toBe("$1.3k/wk over breakeven");
    expect(againstBreakeven(-308.99)).toBe("$309/wk below breakeven");
  });

  it("says what a person would say at zero", () => {
    expect(againstBreakeven(0)).toBe("at breakeven");
  });

  it("never prints a sign inside the sentence", () => {
    // The words carry the direction; a sign would say it twice.
    expect(againstBreakeven(-308.99)).not.toContain("−$");
    expect(againstBreakeven(1_336.52)).not.toContain("+");
  });
});

describe("revenueShift — the brace line", () => {
  it("reads MORE for a rise and LESS for a fall — revenue-side, unflipped", () => {
    // Ten hours more at $150 every week, and one rate cut to its floor.
    expect(revenueShift(1_500)).toBe("$1.5k/wk more revenue");
    expect(revenueShift(-1_028.08)).toBe("$1k/wk less revenue");
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
