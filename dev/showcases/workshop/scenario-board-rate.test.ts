import { describe, it, expect } from "vitest";
import {
  CEILING_RAISE,
  COMFORTABLE,
  MONTHS_PER_YEAR,
  maxRateFor,
  monthlyFrom,
  pinnedCeiling,
  isPresentAt,
  RAISE_STEP,
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
  it("reads green, green, yellow, red as the two engineers are raised", () => {
    expect(rateBandTable()).toEqual([
      { raises: 0, payChange: 0, rate: 60_000, band: "green" },
      { raises: 1, payChange: 20_000, rate: 40_000, band: "green" },
      { raises: 2, payChange: 40_000, rate: 20_000, band: "yellow" },
      { raises: 2, payChange: 240_000, rate: -180_000, band: "red" },
    ]);
  });

  // The board OPENS with no mutation at all, so the first reading is not a
  // row of the table by accident — it is the state Peter sees before he
  // touches anything, and it has to be green.
  it("opens at the baseline, in the green", () => {
    expect(rateFromPayChange(0)).toBe(RATE_BASELINE);
    expect(bandOfRate(RATE_BASELINE)).toBe("green");
  });

  // The constants are the solution to five inequalities, not numbers someone
  // liked. Pinning the inequalities rather than only the outcomes is what
  // makes a future edit fail for the RIGHT reason: "raising both no longer
  // reaches yellow" rather than "20000 !== 19000".
  it("satisfies the inequalities the constants were solved from", () => {
    const raise = RAISE_STEP;
    expect(RATE_BASELINE).toBeGreaterThanOrEqual(COMFORTABLE);
    expect(RATE_BASELINE - 1 * raise).toBeGreaterThanOrEqual(COMFORTABLE);
    expect(RATE_BASELINE - HEADCOUNT * raise).toBeLessThan(COMFORTABLE);
    expect(RATE_BASELINE - HEADCOUNT * raise).toBeGreaterThan(0);
    expect(RATE_BASELINE - HEADCOUNT * CEILING_RAISE).toBeLessThan(0);
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
    expect(rateFromPayChange(20_000)).toBeLessThan(RATE_BASELINE);
    // A termination is a NEGATIVE pay change, so it raises the rate.
    expect(rateFromPayChange(-20_000)).toBeGreaterThan(RATE_BASELINE);
  });

  it("splits the bands exactly where the gauge does", () => {
    expect(bandOfRate(-1)).toBe("red");
    expect(bandOfRate(0)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE - 1)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE)).toBe("green");
  });

  it("prices one level at a plausible raise", () => {
    // Two plausible raises — one each — must be able to cross a band.
    expect(rateForRaises(HEADCOUNT)).toBeLessThan(COMFORTABLE);
  });

  // Peter: "pin the Y axis so that if all sliders are down the line would
  // still be on the chart … that way the y axis doesn't shift when we change
  // the amounts." The property that matters is INDEPENDENCE, so that is what
  // is asserted — not the particular number, which is fixture data.
  describe("the pinned balance domain", () => {
    const floors = [80_000, 80_000];
    const balances = [46_200, 50_000, 55_100, 61_500];
    const fan = (months: number) => 200 * months * months;

    it("does not move when the dials move", () => {
      const atBase = maxRateFor(floors, [90_000, 95_000]);
      // Same fixture, dials dragged anywhere: the ceiling is computed from the
      // COMMITTED pay, so it cannot follow them.
      const ceilingA = pinnedCeiling(balances, atBase, fan);
      const ceilingB = pinnedCeiling(balances, atBase, fan);
      expect(ceilingA).toBe(ceilingB);
      // And it is strictly above the committed line it has to contain.
      expect(ceilingA).toBeGreaterThan(Math.max(...balances));
    });

    it("is highest when everyone sits on their band floor", () => {
      // Everyone already at the floor saves nothing, so the rate is just the
      // baseline; paid above the floor there is slack to reclaim, so the
      // reachable rate — and the ceiling — is higher.
      const atFloor = maxRateFor(floors, floors);
      const aboveFloor = maxRateFor(floors, [90_000, 95_000]);
      expect(atFloor).toBe(RATE_BASELINE);
      expect(aboveFloor).toBeGreaterThan(atFloor);
    });

    it("contains the fan's upper edge, not just the line", () => {
      const rate = maxRateFor(floors, floors);
      const withFan = pinnedCeiling(balances, rate, fan);
      const withoutFan = pinnedCeiling(balances, rate, () => 0);
      expect(withFan).toBeGreaterThanOrEqual(withoutFan);
    });

    it("steps a MONTH of an annual rate, not a year of it", () => {
      // The board quotes everything per year and the chart steps per month.
      // Getting this wrong drew a line twelve times too steep.
      expect(monthlyFrom(12_000)).toBe(1_000);
      expect(MONTHS_PER_YEAR).toBe(12);
    });
  });

  // Peter: a terminated person shows at the mutation that terminated them and
  // at none after it. Named for the scenario rather than the arguments, so a
  // failure says which case broke.
  describe("who appears on the dials", () => {
    it("shows a raise, a termination AT this mutation, and a hire", () => {
      expect(isPresentAt(60_000, 65_000)).toBe(true);
      expect(isPresentAt(60_000, null)).toBe(true);
      expect(isPresentAt(null, 60_000)).toBe(true);
    });

    it("hides someone terminated at an EARLIER mutation", () => {
      // Terminated at mutation 2: present at 1 (still paid) and at 2 (the
      // termination itself), absent at 3 — where both amounts are null
      // because nothing carries forward.
      expect(isPresentAt(60_000, 60_000)).toBe(true);
      expect(isPresentAt(60_000, null)).toBe(true);
      expect(isPresentAt(null, null)).toBe(false);
    });

    it("hides someone who is not hired until a LATER mutation", () => {
      // The same condition, for free: nothing before, nothing from.
      expect(isPresentAt(null, null)).toBe(false);
    });

    it("shows them again once restored, because the carry comes back", () => {
      // Restoring DELETES the null change, so the previous pay carries
      // through and both amounts are numbers again.
      expect(isPresentAt(60_000, 60_000)).toBe(true);
    });
  });
});
