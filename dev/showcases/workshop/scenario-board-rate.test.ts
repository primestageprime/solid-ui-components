import { describe, it, expect } from "vitest";
import {
  COMFORTABLE,
  DOLLARS_PER_LEVEL,
  HEADCOUNT,
  RATE_BASELINE,
  RATE_DOMAIN,
  bandOfRate,
  rateBandTable,
  rateForRaises,
  rateFromPayChange,
} from "./scenario-board-rate";

// The calibration is four readings that have to hold together, so the test is
// written as the table rather than as four unrelated assertions — a change to
// any constant that breaks one row breaks it here, with the whole table in the
// failure message.
describe("scenario board rate calibration", () => {
  it("reads green, green, yellow, red at 0 / 1 / 3 / all raises", () => {
    expect(rateBandTable()).toEqual([
      { raises: 0, payChange: 0, rate: 24_000, band: "green" },
      { raises: 1, payChange: 5_000, rate: 19_000, band: "green" },
      { raises: 3, payChange: 15_000, rate: 9_000, band: "yellow" },
      { raises: 6, payChange: 30_000, rate: -6_000, band: "red" },
    ]);
  });

  // The constants are the solution to four inequalities, not four numbers
  // someone liked. Pinning the inequalities rather than only the outcomes is
  // what makes a future edit fail for the RIGHT reason: "three raises no
  // longer reach yellow" rather than "9000 !== 8000".
  it("satisfies the inequalities the constants were solved from", () => {
    const raise = DOLLARS_PER_LEVEL;
    expect(RATE_BASELINE - 1 * raise).toBeGreaterThanOrEqual(COMFORTABLE);
    expect(RATE_BASELINE - 3 * raise).toBeLessThan(COMFORTABLE);
    expect(RATE_BASELINE - 3 * raise).toBeGreaterThan(0);
    expect(RATE_BASELINE - HEADCOUNT * raise).toBeLessThan(0);
  });

  // A reading that leaves the domain is drawn at a pole, which would make the
  // needle lie about the number the table says.
  it("keeps every calibrated reading inside the gauge's domain", () => {
    for (const row of rateBandTable()) {
      expect(row.rate).toBeGreaterThanOrEqual(RATE_DOMAIN[0]);
      expect(row.rate).toBeLessThanOrEqual(RATE_DOMAIN[1]);
    }
  });

  // Pay is an OUTFLOW. This is the sign that was inverted once already, so it
  // gets an assertion of its own rather than riding on the table.
  it("lowers the rate when the scenario pays people more", () => {
    expect(rateFromPayChange(0)).toBe(RATE_BASELINE);
    expect(rateFromPayChange(5_000)).toBeLessThan(RATE_BASELINE);
    // A termination is a NEGATIVE pay change, so it raises the rate.
    expect(rateFromPayChange(-5_000)).toBeGreaterThan(RATE_BASELINE);
  });

  it("splits the bands exactly where the gauge does", () => {
    expect(bandOfRate(-1)).toBe("red");
    expect(bandOfRate(0)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE - 1)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE)).toBe("green");
  });

  it("prices one level at a plausible raise", () => {
    // Three single-level drags must be able to cross a band. At $1,000 they
    // could not, which is why this is $5,000.
    expect(rateForRaises(3)).toBeLessThan(COMFORTABLE);
  });
});
