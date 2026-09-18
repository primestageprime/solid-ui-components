import { describe, it, expect } from "vitest";
import type { Mutation } from "../../../src/components/LevelsTimeline/geometry";
import type { Person } from "./scenario-board-people";
import {
  accruedOver,
  averageRate,
  averageRateOver,
  monthsBetween,
  weightFrom,
  weightToReachYellow,
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

// Peter, 2026-09-16: "the Rate gauge reads the COMPOSITE over the whole
// represented period, not the selected change." A raise made in December costs
// the year one month of itself; the same raise in January costs it twelve, and
// a gauge that called those the same scenario would be the one thing a
// scenario board must not do.
describe("the composite rate", () => {
  const YEAR_START = new Date("2025-01-01").getTime();
  const YEAR_END = new Date("2026-01-01").getTime();
  const MID_YEAR = new Date("2025-07-01").getTime();

  // A step function of time: it costs nothing until `from`, and `amount`
  // after. The shape every one-change scenario has.
  const stepAt = (from: number, amount: number) => (time: number) =>
    time >= from ? amount : 0;

  // Months, not milliseconds: a calendar month is not a twelfth of a year, so
  // weighting by elapsed time would make "half the year" mean 0.4959 of it and
  // leave every figure below 80-odd dollars out.
  it("counts the span in whole months", () => {
    expect(monthsBetween(YEAR_START, YEAR_END)).toBe(12);
    expect(monthsBetween(YEAR_START, MID_YEAR)).toBe(6);
    expect(monthsBetween(MID_YEAR, YEAR_END)).toBe(6);
    expect(monthsBetween(YEAR_END, YEAR_START)).toBe(-12);
  });

  it("reads the baseline when nothing is proposed", () => {
    expect(averageRateOver(YEAR_START, YEAR_END, [], () => 0)).toBe(
      RATE_BASELINE,
    );
  });

  // Peter's own worked example: a change worth −$20k/yr made at mid-year
  // averages to −$10k/yr over the year.
  it("halves a change made at mid-year", () => {
    expect(
      averageRateOver(
        YEAR_START,
        YEAR_END,
        [MID_YEAR],
        stepAt(MID_YEAR, 20_000),
      ),
    ).toBe(RATE_BASELINE - 10_000);
  });

  it("charges a change made at the start for the whole year", () => {
    expect(
      averageRateOver(
        YEAR_START,
        YEAR_END,
        [YEAR_START],
        stepAt(YEAR_START, 20_000),
      ),
    ).toBe(RATE_BASELINE - 20_000);
  });

  it("weights two changes by their own spans", () => {
    // +20k from the quarter mark (three quarters of the year) and another
    // +20k from three-quarters through (one quarter):
    //   0.75 × 20,000 + 0.25 × 20,000 = 20,000 … so 15,000 + 5,000.
    const q1 = new Date("2025-04-01").getTime();
    const q3 = new Date("2025-10-01").getTime();
    const cost = (time: number) =>
      (time >= q1 ? 20_000 : 0) + (time >= q3 ? 20_000 : 0);
    expect(averageRateOver(YEAR_START, YEAR_END, [q1, q3], cost)).toBe(
      RATE_BASELINE - 20_000,
    );
  });

  it("ignores a moment outside the span rather than clamping it", () => {
    // A change before the span is already in the cost at the span's start; one
    // after it never happens inside the period being read.
    const before = new Date("2024-06-01").getTime();
    expect(
      averageRateOver(YEAR_START, YEAR_END, [before], stepAt(before, 20_000)),
    ).toBe(RATE_BASELINE - 20_000);
    const after = new Date("2026-06-01").getTime();
    expect(
      averageRateOver(YEAR_START, YEAR_END, [after], stepAt(after, 20_000)),
    ).toBe(RATE_BASELINE);
  });

  // ── The projection's integral ────────────────────────────────────────────
  //
  // `accruedOver` is what the balance line projects with. The reason it is a
  // SUM and not one multiplication is the two-mutation case below: the scalar
  // version read the rate ONCE, at the pivot, and drew the rest of the span at
  // it — so a raise landing in October was drawn as though it had been in force
  // since the pivot.
  it("accrues ONE constant stretch as the rate times the months over twelve", () => {
    // With nothing changing inside the span the integral is the old scalar
    // arithmetic exactly, which is why this board's line does not move.
    expect(accruedOver(YEAR_START, YEAR_END, [], () => 120_000)).toBeCloseTo(
      120_000,
      6,
    );
    expect(accruedOver(YEAR_START, MID_YEAR, [], () => 120_000)).toBeCloseTo(
      monthlyFrom(120_000) * 6,
      6,
    );
    expect(accruedOver(YEAR_END, YEAR_START, [], () => 120_000)).toBe(0);
  });

  it("stops back-dating a LATER change to the pivot", () => {
    // $120k/yr until mid-year and $240k/yr after it. The integral accrues six
    // months of each; the scalar version read the pivot's rate and accrued
    // twelve months of $120k, which is $60k short and a whole quarter's cash.
    const stepped = (time: number) => (time >= MID_YEAR ? 240_000 : 120_000);
    const integrated = accruedOver(YEAR_START, YEAR_END, [MID_YEAR], stepped);
    expect(integrated).toBeCloseTo(
      monthlyFrom(120_000) * 6 + monthlyFrom(240_000) * 6,
      6,
    );
    expect(integrated).toBeCloseTo(180_000, 6);
    // What the scalar version drew, for contrast.
    expect(accruedOver(YEAR_START, YEAR_END, [], () => 120_000)).toBeCloseTo(
      120_000,
      6,
    );
  });

  it("ignores a moment outside the projected stretch, as the average does", () => {
    const before = new Date("2024-06-01").getTime();
    const after = new Date("2026-06-01").getTime();
    const flat = () => 120_000;
    expect(
      accruedOver(YEAR_START, YEAR_END, [before, after], flat),
    ).toBeCloseTo(120_000, 6);
  });

  it("says what share of the year a change still has ahead of it", () => {
    expect(weightFrom(YEAR_START, YEAR_END, YEAR_START)).toBe(1);
    expect(weightFrom(YEAR_START, YEAR_END, MID_YEAR)).toBe(0.5);
    expect(weightFrom(YEAR_START, YEAR_END, YEAR_END)).toBe(0);
  });
});

// The calibration table is computed at the START of the year, where the weight
// is 1. What a LATER change does is a different statement, and this is it.
describe("the calibration under the composite reading", () => {
  const YEAR_START = new Date("2025-01-01").getTime();
  const YEAR_END = new Date("2026-01-01").getTime();

  it("needs three quarters of the year for both raises to reach yellow", () => {
    expect(weightToReachYellow(HEADCOUNT)).toBeCloseTo(0.75, 5);
  });

  it("reaches yellow from Q1 and not from Q4", () => {
    const bothRaised = HEADCOUNT * RAISE_STEP;
    const readAt = (iso: string): number => {
      const at = new Date(iso).getTime();
      return RATE_BASELINE - weightFrom(YEAR_START, YEAR_END, at) * bothRaised;
    };
    // The same two raises, made in three different months.
    expect(bandOfRate(readAt("2025-01-01"))).toBe("yellow");
    expect(bandOfRate(readAt("2025-03-01"))).toBe("yellow");
    // A Q4 change is in force for a quarter of the year and costs the average
    // a quarter as much, so the gauge stays green. That is the composite
    // reading working, not a miscalibration.
    expect(bandOfRate(readAt("2025-10-01"))).toBe("green");
  });

  it("still crosses zero when both go to their ceiling, from before October", () => {
    const bothAtCeiling = HEADCOUNT * CEILING_RAISE;
    const readAt = (iso: string): number =>
      RATE_BASELINE -
      weightFrom(YEAR_START, YEAR_END, new Date(iso).getTime()) * bothAtCeiling;
    expect(bandOfRate(readAt("2025-01-01"))).toBe("red");
    expect(bandOfRate(readAt("2025-07-01"))).toBe("red");
    // At exactly three months left the ceiling case lands ON zero, which the
    // gauge reads as the bottom of yellow rather than as a loss.
    expect(readAt("2025-10-01")).toBe(0);
  });
});

// The wrapper, against the board's own shapes — so a change to the people
// model that broke the walk would fail here rather than only in a browser.
describe("averageRate, from a scenario", () => {
  const DOMAIN: readonly [Date, Date] = [
    new Date("2025-01-01"),
    new Date("2026-01-01"),
  ];
  const MID: readonly Mutation[] = [
    { id: "mid", at: new Date("2025-07-01"), label: "1" },
  ];
  const PAIR: readonly Person[] = [
    { id: "a", label: "A", roleId: "engineer", base: 80_000, changes: {} },
    { id: "b", label: "B", roleId: "engineer", base: 80_000, changes: {} },
  ];

  it("reads the baseline when nobody moves", () => {
    expect(averageRate(DOMAIN, MID, PAIR)).toBe(RATE_BASELINE);
    expect(averageRate(DOMAIN, [], PAIR)).toBe(RATE_BASELINE);
  });

  it("halves a mid-year raise on both of them", () => {
    const raised = PAIR.map((person) => ({
      ...person,
      changes: { mid: 100_000 },
    }));
    // +20k each from July: 40,000 in force for half the year → 20,000.
    expect(averageRate(DOMAIN, MID, raised)).toBe(RATE_BASELINE - 20_000);
  });

  it("counts a hire's whole salary, from the moment they are hired", () => {
    const hired = [
      ...PAIR,
      {
        id: "sam",
        label: "Sam",
        roleId: "intern",
        base: null,
        changes: { mid: 4_000 },
      },
    ];
    expect(averageRate(DOMAIN, MID, hired)).toBe(RATE_BASELINE - 2_000);
  });

  it("gives the rate BACK when somebody is terminated", () => {
    const gone = [
      { ...PAIR[0], changes: { mid: null } } as Person,
      PAIR[1] as Person,
    ];
    // −80,000 for half the year raises the average by 40,000.
    expect(averageRate(DOMAIN, MID, gone)).toBe(RATE_BASELINE + 40_000);
  });
});
