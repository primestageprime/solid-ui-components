/**
 * Hourly Board model — the whole board, argued with from a terminal.
 *
 * Two things are the point of this file. The CALIBRATION: four readings Peter
 * named, each derived from the constants rather than asserted against a
 * screenshot, plus the four inequalities that FIX those constants — so a later
 * edit that moves one of them fails here and not in a review of a dial. And the
 * SEASON: the committed schedule is printed week by week, all 53 of them, because
 * a curve is exactly the kind of thing that looks plausible in a picture and
 * wrong in a column of numbers.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../src/fn";
import { timeOf } from "../../../src";
import type {
  Mutation,
  StackedAreaPoint,
  StackedAreaSeriesData,
} from "../../../src";
// The MARK's own core, so the crowding of weekly changes inside one transition
// is asserted against the geometry that draws them rather than against a
// screenshot.
import {
  buildStackedArea,
  transitionWidth,
} from "../../../src/components/Chart/stackedArea";
import {
  COMFORTABLE,
  COMMITTED_RATE,
  DEFAULT_WORK_CAP,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FIXED_WEEKLY_COST,
  FULL_TIME_HOURS,
  HOURS,
  HOURS_DOMAIN,
  MIN_WORK_CAP,
  MONTHLY_NET,
  OPENING_BALANCE,
  RATE,
  RATE_DOMAIN,
  RATE_DOMAIN_PER_HOUR,
  SEED_MUTATIONS,
  SERVICES,
  SPIKE_SLOTS,
  TIME_DOMAIN,
  WEEKS_PER_MONTH,
  WEEKS_PER_YEAR,
  WEEK_COUNT,
  WEEK_SLOTS,
  addMutation,
  addService,
  addedAt,
  weeklyOf,
  weeklyOfPair,
  accruedOver,
  averageRate,
  averageRateOver,
  bandOfRate,
  canAdd,
  drawnRate,
  ensureMutation,
  flatShape,
  isOffDial,
  isSpikeWeek,
  hourPointsFor,
  isDirty,
  isSoldAt,
  maxReachableRate,
  minReachableRate,
  fanAt,
  momentsOf,
  monthStarts,
  monthlyFrom,
  monthsBetween,
  nextFreeSlot,
  offerAt,
  offerBefore,
  offerFrom,
  pairsForMutation,
  pairsWithoutMutation,
  peakWeek,
  pinnedCeiling,
  projectedBalances,
  projectionTable,
  quarterLabelOf,
  quarterTicks,
  rateAt,
  rateBandTable,
  rateFromRevenue,
  removeMutation,
  revenueAt,
  runningBalances,
  scenarioDigest,
  scheduleTable,
  scheduledHours,
  seasonalHours,
  segmentLabelsOf,
  slotOfTime,
  totalHoursAt,
  weekLabel,
  weekOfPick,
  weeksBetween,
  weightFrom,
  weightToReach,
  withChange,
  withDrop,
  withoutChange,
  workMixSeries,
  type RateSampling,
  type Service,
  type WeekRow,
} from "./hourly-board-model";

const START = DOMAIN_START.getTime();
const END = DOMAIN_END.getTime();

/** Week slot 0, where `nextFreeSlot` puts a first interaction. */
const Q1: Mutation = { id: "q1", at: new Date("2025-01-01"), label: "1" };
/** 1 April 2025 — three quarters of the year left to run. It is a TUESDAY, so
 *  it is deliberately OFF the week grid: `slotOfTime` has to place it (slot 13,
 *  the week opening 31 March) rather than miss. */
const Q2: Mutation = { id: "q2", at: new Date("2025-04-01"), label: "2" };

/** Both services' rates at their own floors, from `at` onward. */
const bothAtFloor = (at: Mutation): Service[] =>
  withChange(
    withChange(SERVICES, "service-a", at.id, RATE, 100, [at]),
    "service-b",
    at.id,
    RATE,
    80,
    [at],
  );

// ── The fixture ──────────────────────────────────────────────────────────────

describe("the opening scenario", () => {
  it("opens with two services and NOTHING proposed", () => {
    expect(map((service: Service) => service.label, SERVICES)).toEqual([
      "Service A",
      "Service B",
    ]);
    expect(SEED_MUTATIONS).toEqual([]);
    // "Changes: {}" is the whole of "nothing proposed" — an absent key already
    // means unchanged, so an empty map is a history with nothing in it. The
    // SEASON is not a change: it is the schedule those changes are proposed
    // against, and it is in `seasonal` rather than in here.
    for (const service of SERVICES) {
      expect(Object.keys(service.changes)).toEqual([]);
    }
  });

  it("is Peter's fixture — 20 h/wk @ $150 and 15 h/wk @ $120, now as SEASONS", () => {
    expect(SERVICES[0]?.seasonal.base).toBe(20);
    expect(SERVICES[0]?.committed).toEqual({ rate: 150 });
    expect(SERVICES[1]?.seasonal.base).toBe(15);
    expect(SERVICES[1]?.committed).toEqual({ rate: 120 });
    // Service B peaks LATER than Service A, which is what makes the stack read
    // as two shapes rather than one drawn twice.
    expect(SERVICES[1]!.seasonal.peakSlot).toBeGreaterThan(
      SERVICES[0]!.seasonal.peakSlot,
    );
  });

  it("bills $3.8k in its FIRST week, which is near the trough", () => {
    expect(weeklyOf({ hours: 20, rate: 150 })).toBe(3_000);
    // No ×52 anywhere: the week IS the unit.
    expect(weeklyOf({ hours: 20, rate: 150 })).toBe(20 * 150);
    // The opening week is January, so the schedule reads below its own base.
    expect(revenueAt(SERVICES, START, [])).toBe(15 * 150 + 13 * 120);
    expect(revenueAt(SERVICES, START, [])).toBe(3_810);
  });

  it("gives every service a range INSIDE the shared tracks", () => {
    // The axes are the shared track; a service's range is its own allowance,
    // and an allowance outside the track would draw a shaded box off the end.
    for (const service of SERVICES) {
      expect(service.hoursRange[0]).toBeGreaterThanOrEqual(HOURS_DOMAIN[0]);
      expect(service.hoursRange[1]).toBeLessThanOrEqual(HOURS_DOMAIN[1]);
      expect(service.rateRange[0]).toBeGreaterThanOrEqual(
        RATE_DOMAIN_PER_HOUR[0],
      );
      expect(service.rateRange[1]).toBeLessThanOrEqual(RATE_DOMAIN_PER_HOUR[1]);
    }
  });

  it("holds the COMMITTED SCHEDULE inside each allowance, spikes and all", () => {
    // The widened allowances are not cosmetic: Service A's own schedule reaches
    // 35 h/wk in a spike week, so an allowance of 30 would have clamped the
    // BASELINE and the spike would have read as a plateau.
    for (const service of SERVICES) {
      for (const at of WEEK_SLOTS) {
        const hours = seasonalHours(service.seasonal, slotOfTime(at));
        expect(hours).toBeLessThanOrEqual(service.hoursRange[1]);
        expect(hours).toBeGreaterThanOrEqual(service.hoursRange[0]);
      }
    }
    expect(SERVICES[0]?.hoursRange).toEqual([0, 45]);
    expect(SERVICES[1]?.hoursRange).toEqual([0, 32]);
  });
});

// ── The week grid ────────────────────────────────────────────────────────────

describe("the week grid the season is quoted on", () => {
  it("IS the pick grid — 53 slots, the first clamped to the span's start", () => {
    expect(WEEK_COUNT).toBe(53);
    expect(WEEK_SLOTS[0]).toBe(START);
    expect(new Date(WEEK_SLOTS[52]!).toISOString().slice(0, 10)).toBe(
      "2025-12-29",
    );
    // Every slot is a slot `nextFreeSlot` would hand out, because that is where
    // the list came from.
    expect(nextFreeSlot(START, END, [])).toBe(WEEK_SLOTS[0]);
    expect(
      nextFreeSlot(START, END, [{ id: "a", at: new Date(START), label: "" }]),
    ).toBe(WEEK_SLOTS[1]);
  });

  it("places any moment on a slot, CLAMPED at both ends", () => {
    expect(slotOfTime(START)).toBe(0);
    // Inside the truncated first week.
    expect(slotOfTime(new Date("2025-01-03T09:00:00Z").getTime())).toBe(0);
    expect(slotOfTime(WEEK_SLOTS[1]!)).toBe(1);
    // OFF THE GRID: a Tuesday belongs to the week that opened the day before.
    expect(slotOfTime(timeOf(Q2.at))).toBe(13);
    expect(new Date(WEEK_SLOTS[13]!).toISOString().slice(0, 10)).toBe(
      "2025-03-31",
    );
    // Outside the span, both ways. A silent miss here would put a July reading
    // on January's hours.
    expect(slotOfTime(START - 10 * 24 * 3600 * 1000)).toBe(0);
    expect(slotOfTime(END)).toBe(WEEK_COUNT - 1);
    expect(slotOfTime(END + 400 * 24 * 3600 * 1000)).toBe(WEEK_COUNT - 1);
  });

  it("samples EVERY WEEK, not only the flags", () => {
    // The season moves the rate every week whether or not anybody proposed
    // anything, so the moments are the slots plus whatever flags exist.
    expect(momentsOf([])).toEqual([...WEEK_SLOTS]);
    const withFlag = momentsOf([Q2]);
    expect(withFlag).toHaveLength(WEEK_COUNT + 1);
    expect(withFlag).toContain(timeOf(Q2.at));
    expect(withFlag[0]).toBe(START);
    // A flag already ON the grid adds nothing — the union is a set.
    expect(momentsOf([Q1])).toHaveLength(WEEK_COUNT);
  });
});

// ── The season ───────────────────────────────────────────────────────────────

describe("seasonalHours — the committed schedule", () => {
  /** Every week of the fixture's schedule, as rows. */
  const rows: WeekRow[] = scheduleTable();

  it("PRINTS all 53 weeks, so the curve can be read as numbers", () => {
    // `process.stdout.write` and not `console.table`: vitest's reporter
    // swallows a passing test's console output under a non-TTY (nothing at all
    // reaches the terminal in CI or under an agent), and a table nobody can see
    // is not an observation. This writes the table itself, so
    // `npx vitest run dev/showcases/workshop -t "PRINTS all 53"` really prints
    // the season.
    const column = (text: string, width: number): string =>
      text.padStart(width, " ");
    const lines = map(
      (row: WeekRow) =>
        [
          column(String(row.week), 4),
          column(row.label, 13),
          column(String(row.hours[0]), 4),
          column(String(row.hours[1]), 4),
          column(String(row.total), 6),
          column(row.fullTime, 6),
          column(row.spike, 6),
          column(`$${row.revenue}`, 8),
        ].join(" "),
      rows,
    );
    process.stdout.write(
      [
        "",
        "The COMMITTED weekly schedule — the baseline, with nothing proposed",
        [
          column("wk", 4),
          column("chip", 13),
          column("A", 4),
          column("B", 4),
          column("total", 6),
          column("40h", 6),
          column("spike", 6),
          column("$/wk", 8),
        ].join(" "),
        ...lines,
        `peak ${peakWeek().total} h/wk in ${peakWeek().label}`,
        "",
      ].join("\n"),
    );
    expect(rows).toHaveLength(WEEK_COUNT);
    expect(lines).toHaveLength(53);
  });

  it("peaks in July / August and troughs in January / February", () => {
    const hoursOf = (index: number): number[] =>
      map((row: WeekRow) => row.hours[index] ?? 0, rows);
    for (const index of [0, 1]) {
      const hours = hoursOf(index);
      const highest = Math.max(...hours);
      const lowest = Math.min(...hours);
      // The peak of the CURVE, ignoring the three spike weeks, which are
      // holidays rather than a season.
      const smooth = map(
        (row: WeekRow) => (row.spike === "" ? (row.hours[index] ?? 0) : 0),
        rows,
      );
      const peakAt = smooth.indexOf(Math.max(...smooth));
      const troughAt = hours.indexOf(lowest);
      const peakMonth = new Date(WEEK_SLOTS[peakAt]!).getUTCMonth();
      const troughMonth = new Date(WEEK_SLOTS[troughAt]!).getUTCMonth();
      expect([6, 7]).toContain(peakMonth);
      expect([0, 1]).toContain(troughMonth);
      expect(highest).toBeGreaterThan(lowest);
    }
  });

  it("spikes for exactly ONE week, on the three dates Peter named", () => {
    // Spring break (mid-March, chosen), Independence Day, Labor Day.
    expect(
      map(
        (slot: number) =>
          new Date(WEEK_SLOTS[slot]!).toISOString().slice(0, 10),
        SPIKE_SLOTS,
      ),
    ).toEqual(["2025-03-10", "2025-06-30", "2025-09-01"]);
    // The 4th of July 2025 is a Friday and 1 September is the first MONDAY of
    // September — the two are calendar facts, not slot numbers somebody typed.
    expect(new Date("2025-07-04").getTime()).toBeGreaterThan(WEEK_SLOTS[26]!);
    expect(new Date("2025-07-04").getTime()).toBeLessThan(WEEK_SLOTS[27]!);
    expect(new Date("2025-09-01").getUTCDay()).toBe(1);
    for (const slot of SPIKE_SLOTS) {
      expect(isSpikeWeek(slot)).toBe(true);
      // Half again on the base, for that week alone.
      const shape = SERVICES[0]!.seasonal;
      expect(
        seasonalHours(shape, slot) -
          seasonalHours({ ...shape, spike: 0 }, slot),
      ).toBe(shape.base * shape.spike);
      expect(isSpikeWeek(slot + 1)).toBe(false);
      expect(isSpikeWeek(slot - 1)).toBe(false);
    }
  });

  it("stacks to 61 h/wk at its PEAK — over full time, under the cap", () => {
    const peak = peakWeek();
    expect(peak.total).toBe(61);
    expect(peak.label).toBe("W36 · Sep 1");
    expect(peak.spike).toBe("spike");
    expect(peak.total).toBeGreaterThan(FULL_TIME_HOURS);
    expect(peak.total).toBeLessThan(DEFAULT_WORK_CAP);
    // And the whole schedule is inside the cap, which is the claim the fixed
    // y-domain rests on.
    for (const row of rows)
      expect(row.total).toBeLessThanOrEqual(DEFAULT_WORK_CAP);
    // The trough is UNDER full time, so the dashed rule is crossed rather than
    // permanently exceeded — the reading Peter asked the rule for.
    expect(Math.min(...map((row: WeekRow) => row.total, rows))).toBe(25);
  });

  it("is WHOLE HOURS, because the dial snaps to one", () => {
    for (const row of rows)
      for (const hours of row.hours) expect(hours).toBe(Math.round(hours));
  });

  it("gives an ADDED service a flat shape, and no season at all", () => {
    expect(flatShape(8)).toEqual({ base: 8, swing: 0, peakSlot: 0, spike: 0 });
    for (const week of [0, 10, 26, 30, 52])
      expect(seasonalHours(flatShape(8), week)).toBe(8);
  });

  it("reads the schedule with no proposal in it through `scheduledHours`", () => {
    expect(scheduledHours(SERVICES[0]!, START)).toBe(15);
    expect(scheduledHours(SERVICES[1]!, START)).toBe(13);
    expect(scheduledHours(SERVICES[0]!, WEEK_SLOTS[35]!)).toBe(35);
  });
});

// ── The calibration ──────────────────────────────────────────────────────────

describe("the calibration table — every change made at the START of the year", () => {
  it("prints exactly the four readings the header states", () => {
    const rows = rateBandTable();
    expect(map((row) => row.scenario, rows)).toEqual([
      "as it opens",
      "first service's hours +10",
      "first service's rate at its floor",
      "every rate at its floor",
    ]);
    expect(map((row) => row.band, rows)).toEqual([
      "green",
      "green",
      "yellow",
      "red",
    ]);
    // The rows are the GAUGE's reading — the time-weighted average of the whole
    // seasonal year — so they carry the calendar's own fractions.
    expect(rows[0]?.revenue).toBeCloseTo(4_936.52, 2);
    expect(rows[0]?.rate).toBeCloseTo(1_336.52, 2);
    expect(rows[1]?.revenue).toBeCloseTo(6_436.52, 2);
    expect(rows[1]?.rate).toBeCloseTo(2_836.52, 2);
    expect(rows[2]?.revenue).toBeCloseTo(3_908.44, 2);
    expect(rows[2]?.rate).toBeCloseTo(308.44, 2);
    expect(rows[3]?.revenue).toBeCloseTo(3_291.01, 2);
    expect(rows[3]?.rate).toBeCloseTo(-308.99, 2);
  });

  it("makes the +10 row EXACTLY ten hours at $150, every week", () => {
    // The offset rides the whole curve without ever meeting the allowance, which
    // is what keeps this row a statement about the constants rather than about
    // where a clamp happens to bite. It is why Service A's range is 45.
    const rows = rateBandTable();
    expect(rows[1]!.rate - rows[0]!.rate).toBeCloseTo(10 * 150, 9);
  });

  it("solves the four inequalities that FIX the two constants", () => {
    const rev0 = 4_936.520547945205;
    const revAfloor = 3_908.4383561643835;
    const revFloor = 3_291.0136986301363;
    // The board opens green.
    expect(rev0 - FIXED_WEEKLY_COST).toBeGreaterThanOrEqual(COMFORTABLE);
    // Cutting ONE rate is not yet a loss…
    expect(revAfloor - FIXED_WEEKLY_COST).toBeGreaterThan(0);
    // …but it is no longer comfortable.
    expect(revAfloor - FIXED_WEEKLY_COST).toBeLessThan(COMFORTABLE);
    // Cutting BOTH crosses zero.
    expect(revFloor - FIXED_WEEKLY_COST).toBeLessThan(0);
    // And those three revenues ARE the table's, so the inequalities are about
    // this fixture and not about three numbers typed twice.
    const rows = rateBandTable();
    expect(rows[0]?.revenue).toBeCloseTo(rev0, 9);
    expect(rows[2]?.revenue).toBeCloseTo(revAfloor, 9);
    expect(rows[3]?.revenue).toBeCloseTo(revFloor, 9);
  });

  it("is not balanced on a knife edge — the solution has room either side", () => {
    // FIXED ∈ (3,291.01, 3,908.44): every reading holds anywhere in there.
    for (const fixed of [3_350, 3_600, 3_850]) {
      expect(3_908.44 - fixed).toBeGreaterThan(0);
      expect(3_291.01 - fixed).toBeLessThan(0);
    }
    expect(FIXED_WEEKLY_COST).toBeGreaterThan(3_291.01);
    expect(FIXED_WEEKLY_COST).toBeLessThan(3_908.44);
    // 3,600 is within a dollar of the middle of that interval.
    expect(FIXED_WEEKLY_COST).toBeCloseTo((3_291.01 + 3_908.44) / 2, -1);
    // COMFORTABLE ∈ (308.44, 1,336.52] at that fixed cost.
    expect(COMFORTABLE).toBeGreaterThan(308.44);
    expect(COMFORTABLE).toBeLessThanOrEqual(1_336.52);
  });

  it("names the band the way the gauge splits it", () => {
    expect(bandOfRate(-1)).toBe("red");
    expect(bandOfRate(0)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE - 1)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE)).toBe("green");
  });

  it("holds the FIXTURE's whole reachable range inside the gauge's domain", () => {
    // RateGauge CLAMPS value to its domain and announces the DRAWN figure, so
    // a reachable reading outside the domain makes the dial contradict the
    // table in front of the reader.
    expect(minReachableRate()).toBe(-FIXED_WEEKLY_COST);
    expect(minReachableRate()).toBeGreaterThanOrEqual(RATE_DOMAIN[0]);
    expect(maxReachableRate(SERVICES)).toBe(45 * 200 + 32 * 160 - 3_600);
    expect(maxReachableRate(SERVICES)).toBe(10_520);
    expect(maxReachableRate(SERVICES)).toBeLessThanOrEqual(RATE_DOMAIN[1]);
  });

  it("cannot hold an ADDED service, so the clamp is named instead", () => {
    // `addService` gives a service the whole track — it has negotiated no band
    // of its own — so one added service alone reaches 80 × 300 = $24k/wk and
    // the count is unbounded. No per-service range can fix that, so the promise
    // is kept the other way round: the clamp is a named function and the DEBUG
    // line prints the DRAWN figure beside the raw one.
    const { services } = addService(
      SERVICES,
      { name: "Runaway", hours: 80, rate: 300 },
      Q1.id,
    );
    const runaway = maxReachableRate(services);
    expect(runaway).toBe(10_520 + 80 * 300);
    expect(runaway).toBeGreaterThan(RATE_DOMAIN[1]);
    expect(isOffDial(runaway)).toBe(true);
    expect(drawnRate(runaway)).toBe(RATE_DOMAIN[1]);
  });

  it("clamps at both ends and leaves everything between alone", () => {
    expect(drawnRate(RATE_DOMAIN[0] - 1)).toBe(RATE_DOMAIN[0]);
    expect(drawnRate(RATE_DOMAIN[1] + 1)).toBe(RATE_DOMAIN[1]);
    expect(drawnRate(COMMITTED_RATE)).toBe(COMMITTED_RATE);
    expect(isOffDial(COMMITTED_RATE)).toBe(false);
    // Every row of the calibration table is on the dial, which is the whole
    // reason the table can be quoted as what the reader sees.
    for (const row of rateBandTable()) expect(isOffDial(row.rate)).toBe(false);
  });

  it("puts the committed rate where the table's first row says, by construction", () => {
    // THE SAME CALL the gauge makes for its baseline, so exact equality rather
    // than a second arithmetic that could drift — and with it, "no change to
    // revenue" on a board that opens with nothing proposed.
    expect(COMMITTED_RATE).toBe(averageRate(TIME_DOMAIN, [], SERVICES));
    expect(rateBandTable()[0]?.rate).toBe(COMMITTED_RATE);
    expect(COMMITTED_RATE).toBeCloseTo(1_336.52, 2);
    // It is NOT the opening week's rate: the opening week is January, near the
    // trough. That gap is the whole reason the table is solved on the average.
    expect(rateAt(START, [], SERVICES)).toBe(3_810 - FIXED_WEEKLY_COST);
    expect(rateFromRevenue(4_936.520547945205)).toBeCloseTo(COMMITTED_RATE, 9);
  });
});

// ── When, not only how much ──────────────────────────────────────────────────

describe("the composite reading — WHEN a change lands", () => {
  it("puts the FIRST interaction at weight 1, which is what the table describes", () => {
    // This is the fact that makes the calibration table a statement about the
    // opening move rather than about an arbitrary date: the first week slot is
    // clamped to the span's left edge.
    expect(nextFreeSlot(START, END, [])).toBe(START);
    expect(weightFrom(START, END, START)).toBe(1);
  });

  it("weighs a change by the share of the year it is in force for", () => {
    expect(
      weightFrom(START, END, new Date("2025-04-01").getTime()),
    ).toBeCloseTo(0.75, 10);
    expect(
      weightFrom(START, END, new Date("2025-10-01").getTime()),
    ).toBeCloseTo(0.25, 10);
    expect(monthsBetween(START, END)).toBe(12);
  });

  // The two units, side by side, on the SAME date. Months are the tidier
  // number and weeks are the one this board counts in — the difference is a
  // statement about the reader's grid, not a correction.
  it("weighs in WEEKS when asked, and a week is not a twelfth of a year", () => {
    expect(weeksBetween(START, END)).toBeCloseTo(365 / 7, 10);
    expect(
      weightFrom(START, END, new Date("2025-04-01").getTime(), "week"),
    ).toBeCloseTo(275 / 365, 10);
    // 90 days in, not three months in.
    expect(
      weightFrom(START, END, new Date("2025-04-01").getTime(), "week"),
    ).not.toBeCloseTo(0.75, 6);
  });

  it("states the flat-level algebra, and keeps it honest about the season", () => {
    // `weightToReach` is exact for a change between two FLAT levels, which is
    // what its two arguments are — two rates.
    const needed = weightToReach(-308.98630136986367, 0);
    expect(needed).toBeCloseTo(
      COMMITTED_RATE / (COMMITTED_RATE + 308.98630136986367),
      9,
    );
    expect(needed).toBeCloseTo(0.8122, 4);
    // Under a seasonal baseline neither level is flat, so the claim that counts
    // is the EMPIRICAL one, and it runs the other way from the flat algebra: a
    // cut made in April is in force for exactly the weeks that bill the most,
    // so it bites harder than its share of the year — three dollars a week
    // above breakeven rather than the $250 the flat reading would give.
    const inApril = averageRate(TIME_DOMAIN, [Q2], bothAtFloor(Q2));
    expect(inApril).toBeCloseTo(3.37, 2);
    expect(bandOfRate(inApril)).toBe("yellow");
    const flatReading =
      COMMITTED_RATE +
      weightFrom(START, END, timeOf(Q2.at), "week") *
        (-308.98630136986367 - COMMITTED_RATE);
    expect(inApril).toBeLessThan(flatReading);
    // The same cut in JANUARY is in force for the whole span and reads red.
    const inJanuary = averageRate(TIME_DOMAIN, [Q1], bothAtFloor(Q1));
    expect(inJanuary).toBeCloseTo(-308.99, 2);
    expect(bandOfRate(inJanuary)).toBe("red");
    expect(inJanuary).toBeLessThan(inApril);
  });

  it("reads the AVERAGE and not the week, even for a change at the left edge", () => {
    const floored = bothAtFloor(Q1);
    // The table's last row, exactly — same change, same weight.
    expect(averageRate(TIME_DOMAIN, [Q1], floored)).toBe(
      rateBandTable()[3]?.rate,
    );
    // And the opening WEEK is a different, much worse number, because January
    // is near the trough. Both are red; only one of them is what the dial says.
    expect(rateAt(START, [Q1], floored)).toBe(15 * 100 + 13 * 80 - 3_600);
    expect(rateAt(START, [Q1], floored)).toBe(-1_060);
    expect(bandOfRate(averageRate(TIME_DOMAIN, [Q1], floored))).toBe("red");
  });

  it("reads exactly the baseline with no mutation at all", () => {
    expect(averageRate(TIME_DOMAIN, [], SERVICES)).toBe(COMMITTED_RATE);
  });

  it("moves the figure and not the verdict when the unit changes", () => {
    // The month reading is still there for comparison: the unit is a statement
    // about what the reader counts, worth a few dollars a week, not a verdict.
    const inWeeks = averageRate(TIME_DOMAIN, [], SERVICES);
    const inMonths = averageRate(TIME_DOMAIN, [], SERVICES, "month");
    expect(inMonths).toBeCloseTo(1_327.64, 2);
    expect(bandOfRate(inMonths)).toBe(bandOfRate(inWeeks));
    expect(Math.abs(inMonths - inWeeks)).toBeLessThan(15);
  });
});

// ── Walking the history ──────────────────────────────────────────────────────

describe("the history", () => {
  const raised = withChange(SERVICES, "service-a", Q2.id, HOURS, 25, [Q2]);

  it("carries the measure that did NOT move forward", () => {
    // PairedMutationSliders emits one measure at a time; a change in the
    // history is a whole offer, so the other half is carried, not invented.
    expect(offerFrom(raised[0] as Service, Q2.id, [Q2])).toEqual({
      hours: 25,
      rate: 150,
    });
    // The PRIOR is the SCHEDULE in that same week — 17 h/wk in the week of 31
    // March — so the dial's delta is the eight hours the reader added and never
    // the season's own drift between two dates.
    expect(offerBefore(raised[0] as Service, Q2.id, [Q2])).toEqual({
      hours: 17,
      rate: 150,
    });
    expect(scheduledHours(SERVICES[0]!, timeOf(Q2.at))).toBe(17);
  });

  it("CARRIES THE OFFSET forward, not the level", () => {
    // Peter's composition rule, and the whole of it: +8 h/wk in the week of 31
    // March is +8 h/wk for the rest of the year, riding the season rather than
    // flattening it. The last week of the span is back near the trough (15
    // h/wk committed), so the offset shows as 23 rather than as 25.
    expect(offerAt(raised[0] as Service, END, [Q2])).toEqual({
      hours: 23,
      rate: 150,
    });
    expect(scheduledHours(SERVICES[0]!, END)).toBe(15);
    // In August the same offset sits on a much higher curve.
    expect(offerAt(raised[0] as Service, WEEK_SLOTS[31]!, [Q2])?.hours).toBe(
      26 + 8,
    );
    // BEFORE the change nothing moved at all.
    expect(offerAt(raised[0] as Service, START, [Q2])).toEqual({
      hours: 15,
      rate: 150,
    });
  });

  it("leaves every other service and every other mutation untouched", () => {
    expect(raised[1]?.changes).toEqual({});
    expect(offerAt(raised[1] as Service, START, [Q2])).toEqual({
      hours: 13,
      rate: 120,
    });
  });

  it("walks in TIME order, not key order", () => {
    // Repriced at Q1, untouched at Q2: the prior while editing Q2 is the Q1
    // rate, on the week of Q2's own schedule.
    const twice = withChange(SERVICES, "service-a", Q1.id, RATE, 180, [Q1, Q2]);
    expect(offerBefore(twice[0] as Service, Q2.id, [Q1, Q2])).toEqual({
      hours: 17,
      rate: 180,
    });
  });

  it("makes a DROP both measures null, and nothing else", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    expect(offerFrom(dropped[1] as Service, Q2.id, [Q2])).toBeNull();
    expect(offerBefore(dropped[1] as Service, Q2.id, [Q2])).toEqual({
      hours: 12,
      rate: 120,
    });
    const pair = pairsForMutation(dropped, Q2.id, [Q2])[1];
    expect(pair?.measures[HOURS].value).toBeNull();
    expect(pair?.measures[RATE].value).toBeNull();
  });

  it("reinstates by DELETING the change rather than inventing an offer", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const back = withoutChange(dropped, "service-b", Q2.id);
    expect(back[1]?.changes).toEqual({});
    // Back on the SCHEDULE, which is what "whatever the previous change left it
    // on" means when nothing came before: the season itself.
    expect(offerFrom(back[1] as Service, Q2.id, [Q2])).toEqual({
      hours: 12,
      rate: 120,
    });
    expect(offerAt(back[1] as Service, END, [Q2])?.hours).toBe(
      scheduledHours(SERVICES[1]!, END),
    );
  });

  it("hides a service dropped EARLIER at every later mutation", () => {
    // The fourth row of isSoldAt's truth table, which is Peter's "terminated
    // services hidden at later dates".
    const dropped = withDrop(SERVICES, "service-b", Q1.id);
    const atQ1 = pairsForMutation(dropped, Q1.id, [Q1, Q2]);
    const atQ2 = pairsForMutation(dropped, Q2.id, [Q1, Q2]);
    expect(map((pair) => pair.id, atQ1)).toEqual(["service-a", "service-b"]);
    expect(map((pair) => pair.id, atQ2)).toEqual(["service-a"]);
  });

  it("covers the four cases of isSoldAt with one condition", () => {
    const offer = { hours: 1, rate: 1 };
    expect(isSoldAt(offer, offer)).toBe(true); // a change
    expect(isSoldAt(offer, null)).toBe(true); // dropped HERE
    expect(isSoldAt(null, offer)).toBe(true); // added HERE
    expect(isSoldAt(null, null)).toBe(false); // gone, or not yet
  });

  it("clamps a change to the allowance, exactly as the dial does", () => {
    const over = withChange(SERVICES, "service-a", Q1.id, HOURS, 60, [Q1]);
    expect(offerFrom(over[0] as Service, Q1.id, [Q1])?.hours).toBe(45);
    // And the offset a clamped change implies cannot lift a later week past it
    // either, which is what keeps the STACK inside the cap.
    for (const at of WEEK_SLOTS)
      expect(offerAt(over[0] as Service, at, [Q1])?.hours).toBeLessThanOrEqual(
        45,
      );
  });
});

describe("the dials with no mutation", () => {
  it("reads the SPAN'S FIRST WEEK, prior and value the same figures", () => {
    const pairs = pairsWithoutMutation(SERVICES);
    expect(pairs).toHaveLength(2);
    for (const pair of pairs) {
      expect(pair.measures[HOURS].prior).toBe(pair.measures[HOURS].value);
      expect(pair.measures[RATE].prior).toBe(pair.measures[RATE].value);
    }
    // The first week and not the curve's BASE: the first free slot IS that week,
    // so the reader's first click proposes a change whose dials already read
    // these figures and nothing jumps.
    expect(pairs[0]?.measures[HOURS].value).toBe(15);
    expect(pairs[1]?.measures[HOURS].value).toBe(13);
    const atFirstSlot = pairsForMutation(SERVICES, Q1.id, [Q1]);
    expect(map((pair) => pair.measures[HOURS].value, atFirstSlot)).toEqual([
      15, 13,
    ]);
    expect(map((pair) => pair.measures[RATE].value, atFirstSlot)).toEqual([
      150, 120,
    ]);
  });

  it("reads the summary as WEEKLY revenue", () => {
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[0]!)).toBe(15 * 150);
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[1]!)).toBe(13 * 120);
    // Hours × rate, with no year in it at all.
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[0]!)).toBe(2_250);
  });

  it("reads a removed pair as zero rather than as arithmetic on an absence", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const pair = pairsForMutation(dropped, Q2.id, [Q2])[1]!;
    expect(weeklyOfPair(pair)).toBe(0);
  });
});

// ── Adding a service ─────────────────────────────────────────────────────────

describe("adding a service", () => {
  const draft = { name: "Service C", hours: 8, rate: 200 };

  it("refuses a draft with no name or a figure off the track", () => {
    expect(canAdd(EMPTY_DRAFT)).toBe(false);
    expect(canAdd(draft)).toBe(true);
    expect(canAdd({ ...draft, hours: 81 })).toBe(false);
    expect(canAdd({ ...draft, rate: 301 })).toBe(false);
    expect(canAdd({ ...draft, hours: undefined })).toBe(false);
  });

  it("starts its existence AT the mutation and nowhere earlier", () => {
    const { services, id } = addService(SERVICES, draft, Q2.id);
    const added = services[2] as Service;
    expect(id).toBe("service-c");
    expect(added.committed).toBeNull();
    expect(offerBefore(added, Q2.id, [Q1, Q2])).toBeNull();
    expect(offerFrom(added, Q2.id, [Q1, Q2])).toEqual({ hours: 8, rate: 200 });
    // Absent from the mutation before it.
    expect(
      isSoldAt(
        offerBefore(added, Q1.id, [Q1, Q2]),
        offerFrom(added, Q1.id, [Q1, Q2]),
      ),
    ).toBe(false);
    expect(addedAt(added, [Q1, Q2])).toBe(Q2.id);
  });

  it("gives a negotiated-nothing service no season and the whole track", () => {
    const { services } = addService(SERVICES, draft, Q2.id);
    expect(services[2]?.hoursRange).toEqual(HOURS_DOMAIN);
    expect(services[2]?.rateRange).toEqual(RATE_DOMAIN_PER_HOUR);
    expect(services[2]?.seasonal).toEqual(flatShape(8));
    // So it holds the figure it was added at, every week to the end of the span
    // — a summer it never agreed to would be the board inventing a fact.
    for (const at of [WEEK_SLOTS[20]!, WEEK_SLOTS[35]!, END])
      expect(offerAt(services[2] as Service, at, [Q1, Q2])).toEqual({
        hours: 8,
        rate: 200,
      });
  });

  it("derives the id from the NAME, so the same add twice is the same result", () => {
    const once = addService(SERVICES, draft, Q2.id);
    const twice = addService(once.services, draft, Q2.id);
    expect(twice.id).toBe("service-c-2");
  });
});

// ── Removing a change ────────────────────────────────────────────────────────

describe("deleting a change", () => {
  it("takes the flag, every entry at it, and anything added there", () => {
    const withC = addService(
      SERVICES,
      { name: "C", hours: 5, rate: 100 },
      Q2.id,
    );
    const raised = withChange(withC.services, "service-a", Q2.id, HOURS, 25, [
      Q2,
    ]);
    const next = removeMutation({ mutations: [Q2], services: raised }, Q2.id);
    expect(next.mutations).toEqual([]);
    expect(map((service: Service) => service.id, next.services)).toEqual([
      "service-a",
      "service-b",
    ]);
    expect(next.services[0]?.changes).toEqual({});
    // Back to the board's opening state, so the empty-state sentence returns.
    expect(next.selected).toBeNull();
  });

  it("moves the selection to a survivor when there is one", () => {
    const next = removeMutation(
      { mutations: [Q1, Q2], services: SERVICES },
      Q1.id,
    );
    expect(next.selected).toBe(Q2.id);
  });

  it("undoes a DROP by the same deletion, with no special case", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const next = removeMutation({ mutations: [Q2], services: dropped }, Q2.id);
    // Back on its own schedule, which for the span's last week is 13 h/wk.
    expect(offerAt(next.services[1] as Service, END, [])).toEqual({
      hours: 13,
      rate: 120,
    });
  });
});

// ── The mutation calendar (reused, so pinned at the seam) ────────────────────

describe("the mutation calendar", () => {
  it("snaps and numbers, and SELECTS rather than duplicates", () => {
    const first = addMutation([], new Date("2025-04-01"));
    const again = addMutation(first.mutations, new Date("2025-04-01"));
    expect(again.mutations).toHaveLength(1);
    expect(again.selected).toBe(first.selected);
    const second = addMutation(first.mutations, new Date("2025-01-01"));
    // Numbered by POSITION, so inserting earlier renumbers.
    expect(
      map((mutation: Mutation) => mutation.label, second.mutations),
    ).toEqual(["1", "2"]);
  });

  it("makes the first change at the first free slot", () => {
    const ensured = ensureMutation(
      { mutations: [], selected: null },
      START,
      END,
    );
    expect(ensured.created).toBe(true);
    expect(timeOf(ensured.mutations[0]!.at)).toBe(START);
  });

  it("keeps the selection when there already is one", () => {
    const ensured = ensureMutation(
      { mutations: [Q2], selected: Q2.id },
      START,
      END,
    );
    expect(ensured.created).toBe(false);
    expect(ensured.selected).toBe(Q2.id);
  });
});

// ── The Work Mix chart ───────────────────────────────────────────────────────

describe("the Work Mix stack", () => {
  it("defaults the cap to 80 and can never sit below the full-time rule", () => {
    expect(DEFAULT_WORK_CAP).toBe(80);
    expect(FULL_TIME_HOURS).toBe(40);
    expect(MIN_WORK_CAP).toBe(FULL_TIME_HOURS);
  });

  it("opens every band at the span's left edge, on its own schedule", () => {
    const series = workMixSeries(SERVICES, []);
    expect(map((one) => one.id, series)).toEqual(["service-a", "service-b"]);
    for (const one of series) {
      expect(timeOf(one.points[0]!.at)).toBe(START);
    }
    expect(series[0]?.points[0]).toEqual({ at: DOMAIN_START, value: 15 });
  });

  it("DRAWS THE SEASON, and still emits only changes", () => {
    const series = workMixSeries(SERVICES, []);
    for (const band of series) {
      // Far more than the one point a flat year gave, and fewer than 53: a week
      // repeating the previous week's whole hours spends no transition.
      expect(band.points.length).toBeGreaterThan(20);
      expect(band.points.length).toBeLessThan(WEEK_COUNT);
      const values = map((point) => point.value, band.points);
      // Consecutive points always differ — that IS "only changes".
      for (const [index, value] of values.entries())
        if (index > 0) expect(value).not.toBe(values[index - 1]);
      // The shape: the summer weeks sit above the winter ones.
      expect(Math.max(...values)).toBeGreaterThan(Math.min(...values));
    }
    // Service A's spike weeks are the three highest points of its band.
    const aValues = map((point) => point.value, series[0]!.points);
    expect(Math.max(...aValues)).toBe(35);
  });

  it("emits a rate-only change as NO new hours point, and a drop to zero", () => {
    // A rate-only change moves no hours, so the band is the schedule's own.
    const repriced = withChange(SERVICES, "service-a", Q2.id, RATE, 180, [Q2]);
    expect(hourPointsFor(repriced[0] as Service, [Q2])).toEqual(
      hourPointsFor(SERVICES[0] as Service, [Q2]),
    );
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const points = hourPointsFor(dropped[1] as Service, [Q2]);
    const last = points[points.length - 1];
    expect(last).toEqual({ at: new Date("2025-04-01"), value: 0 });
    // Nothing after it: every later week is zero, which is not a change.
    expect(map((point) => point.value, points).lastIndexOf(0)).toBe(
      points.length - 1,
    );
  });

  it("makes the top of the stack the total, under the default cap", () => {
    expect(totalHoursAt(SERVICES, START, [])).toBe(28);
    expect(totalHoursAt(SERVICES, START, [])).toBeLessThan(DEFAULT_WORK_CAP);
    // Both services held at the top of their own ranges is 77 h/wk — well over
    // full time, which is the reading the 40-hour rule exists to give, and
    // still inside 80. That inequality is what the allowances are chosen for.
    const maxed = map(
      (service: Service) => ({
        ...service,
        changes: {
          [Q1.id]: {
            hours: service.hoursRange[1],
            rate: service.committed?.rate ?? 0,
          },
        },
      }),
      SERVICES,
    );
    expect(totalHoursAt(maxed, END, [Q1])).toBe(77);
    expect(totalHoursAt(maxed, END, [Q1])).toBeGreaterThan(FULL_TIME_HOURS);
    expect(totalHoursAt(maxed, END, [Q1])).toBeLessThanOrEqual(
      DEFAULT_WORK_CAP,
    );
    // And it holds in EVERY week, including the spikes, because the clamp is on
    // the materialised hours rather than on the curve.
    for (const at of WEEK_SLOTS)
      expect(totalHoursAt(maxed, at, [Q1])).toBeLessThanOrEqual(
        DEFAULT_WORK_CAP,
      );
  });

  it("reads the x axis in the same vocabulary as the as-of chips", () => {
    expect(quarterTicks()).toEqual([
      Date.UTC(2025, 0, 1),
      Date.UTC(2025, 3, 1),
      Date.UTC(2025, 6, 1),
      Date.UTC(2025, 9, 1),
    ]);
    expect(map((tick: number) => quarterLabelOf(tick), quarterTicks())).toEqual(
      ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"],
    );
  });
});

// ── The Cash Flow chart ──────────────────────────────────────────────────────

describe("the balance line", () => {
  const committed = runningBalances(MONTHLY_NET, OPENING_BALANCE);
  /** The chart's cell edges — the same months `monthlyCells` draws. */
  const BOUNDARIES = monthStarts(DOMAIN_START, committed.length);

  /** A projection with NO seasonality in it: one rate, everywhere, summed in
   *  MONTHS. The same single code path a sampled scenario takes — which is what
   *  makes "identical to the old straight slope" an equivalence rather than a
   *  preserved branch. */
  const flat = (
    rate: number,
    unit: "month" | "week" = "month",
  ): RateSampling => ({
    boundaries: BOUNDARIES,
    rate: () => rate,
    moments: [],
    unit,
  });

  it("runs the committed flows forward from the opening balance", () => {
    expect(committed[0]).toBe(OPENING_BALANCE + (MONTHLY_NET[0] ?? 0));
    expect(committed).toHaveLength(MONTHLY_NET.length);
  });

  it("pivots about NOW and leaves the past alone", () => {
    const slow = projectedBalances(committed, flat(0), 6);
    const fast = projectedBalances(committed, flat(1_200), 6);
    for (let index = 0; index <= 6; index += 1) {
      expect(slow[index]).toBe(committed[index]);
      expect(fast[index]).toBe(committed[index]);
    }
    // $1.2k/wk is $5,200 a month (52/12 weeks in it), so one month past the
    // pivot is $5,200 above it.
    expect(monthlyFrom(1_200)).toBe(5_200);
    expect(fast[7]! - (committed[6] ?? 0)).toBeCloseTo(5_200, 6);
    expect(slow[7]).toBe(committed[6]);
  });

  // THE EQUIVALENCE. Integrating a FLAT rate in MONTHS reproduces the straight
  // slope `projectedBalances` drew before it integrated anything, and EXACTLY
  // rather than nearly: `monthsBetween` is integral on month boundaries and the
  // cell edges ARE month boundaries, so the sum of one-month stretches collapses
  // to `monthlyFrom(rate) × (m − now)`. Exact equality is the whole point — a
  // `toBeCloseTo` here would hide an integrator that drifts.
  it("integrated flat in MONTHS is the old straight slope, exactly", () => {
    const rate = 1_200;
    const nowIndex = 3;
    const projected = projectedBalances(committed, flat(rate), nowIndex);
    const pivot = committed[nowIndex] ?? 0;
    for (let index = nowIndex + 1; index < committed.length; index += 1) {
      expect(projected[index]).toBe(
        pivot + monthlyFrom(rate) * (index - nowIndex),
      );
    }
  });

  // And in WEEKS it does NOT, by about a third of a percent — which is the
  // calendar and not a bug. The span holds 52 and a seventh weeks, so summing
  // the rate over each of them accrues slightly MORE than twelve twelfths. The
  // model says the same thing about the gauge's own weight (a change on 1 April
  // is 0.75 of the year in months and 0.7534 in weeks): the unit is a statement
  // about what the reader counts, not a correction.
  it("integrated flat in WEEKS differs by the calendar, not by an error", () => {
    const rate = 1_200;
    const inMonths = accruedOver(START, END, [], () => rate, "month");
    const inWeeks = accruedOver(START, END, [], () => rate, "week");
    // Twelve months of a weekly rate IS 52 weeks of it, by WEEKS_PER_MONTH.
    expect(inMonths).toBeCloseTo(rate * WEEKS_PER_YEAR, 6);
    expect(inMonths).toBeCloseTo(rate * 12 * WEEKS_PER_MONTH, 6);
    // And the span's own weeks are the honest count: 52 and a seventh of them.
    expect(inWeeks).toBeCloseTo(rate * weeksBetween(START, END), 6);
    expect(inWeeks / inMonths).toBeCloseTo(weeksBetween(START, END) / 52, 10);
    expect(inWeeks).toBeGreaterThan(inMonths);
    expect(inWeeks / inMonths).toBeCloseTo(1, 2);
  });

  it("pins the ceiling above anything the dials can reach", () => {
    const ceiling = pinnedCeiling(
      committed,
      maxReachableRate(SERVICES),
      (months) => months * months * 200,
    );
    const steepest = projectedBalances(
      committed,
      flat(maxReachableRate(SERVICES)),
      0,
    );
    for (const balance of steepest)
      expect(balance).toBeLessThanOrEqual(ceiling);
  });
});

// ── Save ─────────────────────────────────────────────────────────────────────

describe("dirty", () => {
  const clean = scenarioDigest(SERVICES, SEED_MUTATIONS);

  it("is clean on load and dirty after any change", () => {
    expect(isDirty(SERVICES, SEED_MUTATIONS, clean)).toBe(false);
    const raised = withChange(SERVICES, "service-a", Q2.id, HOURS, 25, [Q2]);
    expect(isDirty(raised, [Q2], clean)).toBe(true);
  });

  it("sees an added flag even before any dial moves", () => {
    // Adding a change IS a change to the scenario: the chip, the flag and the
    // rule on the Work Mix chart are all new.
    expect(isDirty(SERVICES, [Q2], clean)).toBe(true);
  });

  it("goes clean again on the digest of whatever was saved", () => {
    const raised = withChange(SERVICES, "service-a", Q2.id, HOURS, 25, [Q2]);
    expect(isDirty(raised, [Q2], scenarioDigest(raised, [Q2]))).toBe(false);
  });
});

// ── The printed tables (headless observation) ───────────────────────────────

describe("the board as tables", () => {
  it("prints the calibration and the dials without a browser", () => {
    // The same rows the bench's DEBUG console.tables print — asserted here so
    // the terminal reading and the drawn board cannot drift.
    const rows = map(
      (row) => ({ ...row, band: bandOfRate(row.rate) }),
      rateBandTable(),
    );
    expect(map((row) => row.band, rows)).toEqual([
      "green",
      "green",
      "yellow",
      "red",
    ]);
    const dials = map(
      (pair) => ({
        service: pair.label,
        hours: pair.measures[HOURS].value,
        rate: pair.measures[RATE].value,
        weekly: weeklyOfPair(pair),
      }),
      pairsWithoutMutation(SERVICES),
    );
    expect(dials).toEqual([
      { service: "Service A", hours: 15, rate: 150, weekly: 2_250 },
      { service: "Service B", hours: 13, rate: 120, weekly: 1_560 },
    ]);
  });
});

// ── Weekly change dates ──────────────────────────────────────────────────────
//
// Peter, 2026-09-17: "You should still have clicks on the chart at a weekly
// granularity. That allows for weekly seasonality in projections." `Chart`
// grew an `onPick` that reports the RAW date under the pointer; everything
// below is the board's own grid, which is what a pick lands on.

describe("the week a pick lands in", () => {
  it("snaps a mid-week pick back to its ISO Monday", () => {
    // Wednesday 9 April 2025 -> Monday 7 April 2025.
    expect(weekOfPick(new Date("2025-04-09T13:22:00Z")).toISOString()).toBe(
      "2025-04-07T00:00:00.000Z",
    );
    // A pick already ON a Monday does not move.
    expect(weekOfPick(new Date("2025-04-07T00:00:00Z")).toISOString()).toBe(
      "2025-04-07T00:00:00.000Z",
    );
  });

  it("CLAMPS the span's first, truncated week to the span's own start", () => {
    // The span opens on Wednesday 1 January 2025, so the ISO Monday of its
    // first week is 29 December 2024 — outside the span. Without the clamp the
    // first pickable slot would be Monday the 6th, five days in, and a change
    // at the left edge could no longer be in force for the WHOLE span — which
    // is the only claim `rateBandTable()` makes.
    expect(DOMAIN_START.getUTCDay()).toBe(3);
    for (const iso of [
      "2025-01-01T00:00:00Z",
      "2025-01-03T09:00:00Z",
      "2025-01-05T23:59:00Z",
    ]) {
      expect(weekOfPick(new Date(iso)).getTime()).toBe(START);
    }
    // The next Monday is a slot of its own.
    expect(weekOfPick(new Date("2025-01-06T00:00:00Z")).getTime()).toBe(
      new Date("2025-01-06").getTime(),
    );
    expect(weightFrom(START, END, START, "week")).toBe(1);
  });

  it("DEDUPES by week — a second pick in one week selects what is there", () => {
    const monday = weekOfPick(new Date("2025-04-07T00:00:00Z"));
    const first = addMutation([], monday);
    expect(first.mutations).toHaveLength(1);
    // Thursday of the same week, snapped: the same slot, so the same timestamp.
    const again = addMutation(
      first.mutations,
      weekOfPick(new Date("2025-04-10T16:40:00Z")),
    );
    expect(again.mutations).toHaveLength(1);
    expect(again.selected).toBe(first.selected);
    // The NEXT week is a different change.
    const next = addMutation(
      again.mutations,
      weekOfPick(new Date("2025-04-14T08:00:00Z")),
    );
    expect(next.mutations).toHaveLength(2);
    expect(next.selected).not.toBe(first.selected);
  });
});

describe("the first free WEEK", () => {
  const atWeek = (iso: string): Mutation => ({
    id: iso,
    at: new Date(iso),
    label: "",
  });

  it("puts a first interaction on the span's own start, at weight 1", () => {
    expect(nextFreeSlot(START, END, [])).toBe(START);
  });

  it("moves a week at a time as slots are taken", () => {
    expect(nextFreeSlot(START, END, [atWeek("2025-01-01")])).toBe(
      new Date("2025-01-06").getTime(),
    );
    expect(
      nextFreeSlot(START, END, [atWeek("2025-01-01"), atWeek("2025-01-06")]),
    ).toBe(new Date("2025-01-13").getTime());
  });

  it("steps over a taken week rather than stopping at it", () => {
    expect(nextFreeSlot(START, END, [atWeek("2025-01-06")])).toBe(START);
  });

  it("offers 53 slots across the year, and none once they are all taken", () => {
    const slots: number[] = [];
    let taken: Mutation[] = [];
    for (;;) {
      const at = nextFreeSlot(START, END, taken);
      if (at === undefined) break;
      slots.push(at);
      taken = [...taken, { id: String(at), at: new Date(at), label: "" }];
    }
    // A 365-day span opening mid-week: one truncated week plus 52 whole ones.
    expect(slots).toHaveLength(53);
    expect(slots).toEqual([...WEEK_SLOTS]);
    expect(slots[0]).toBe(START);
    expect(new Date(slots[52]!).toISOString().slice(0, 10)).toBe("2025-12-29");
    // BOTH ENDS OF THE SPAN READ W01, and that is ISO-8601 rather than a bug:
    // a week belongs to the year of its THURSDAY, and 2025-12-29's Thursday is
    // 2026-01-01. The chips stay unique because the date differs, so the
    // control stays operable — do NOT "fix" this into W53.
    expect(weekLabel(new Date(slots[0]!))).toBe("W01 · Jan 1");
    expect(weekLabel(new Date(slots[52]!))).toBe("W01 · Dec 29");
    expect(nextFreeSlot(START, END, taken)).toBeUndefined();
  });

  it("creates its change at the first free week, not the first quarter", () => {
    const ensured = ensureMutation(
      { mutations: [], selected: null },
      START,
      END,
    );
    expect(ensured.created).toBe(true);
    expect(timeOf(ensured.mutations[0]!.at)).toBe(START);
    const second = ensureMutation(
      { mutations: ensured.mutations, selected: null },
      START,
      END,
    );
    expect(timeOf(second.mutations[1]!.at)).toBe(
      new Date("2025-01-06").getTime(),
    );
  });
});

describe("a change at week 27 of the year", () => {
  /** The 27th slot: `nextFreeSlot` walked 26 times. It is also the week that
   *  holds the 4th of July, so it is a SPIKE week. */
  const WEEK_27 = new Date("2025-06-30");

  it("is where the 27th slot actually falls", () => {
    expect(weekOfPick(WEEK_27).getTime()).toBe(WEEK_27.getTime());
    expect(weekLabel(WEEK_27)).toBe("W27 · Jun 30");
    expect(slotOfTime(WEEK_27.getTime())).toBe(26);
    expect(isSpikeWeek(26)).toBe(true);
  });

  it("weighs about half the year — 185 of its 365 days", () => {
    const weight = weightFrom(START, END, WEEK_27.getTime(), "week");
    expect(weight).toBeCloseTo(185 / 365, 10);
    // "Week 27 of 52" is about half the year and not exactly half of it: the
    // span is 365 days, so it holds 52 and a seventh weeks and the 27th slot
    // has 185 of those days still to run.
    expect(weight).toBeCloseTo(0.5, 1);
  });
});

describe("the as-of chips read in WEEKS", () => {
  it("labels each chip by week number and date, and needs no disambiguation", () => {
    const weeks = map(
      (iso: string) => ({ id: iso, at: new Date(iso), label: "" }),
      ["2025-04-07", "2025-04-14", "2025-06-30"],
    );
    expect(map((s) => s.label, segmentLabelsOf(weeks))).toEqual([
      "W15 · Apr 7",
      "W16 · Apr 14",
      "W27 · Jun 30",
    ]);
    // Two chips in one QUARTER used to need a suffix. One per WEEK is unique
    // by construction — the grid is weekly and `addMutation` refuses a second
    // mutation on an existing timestamp — so no chip carries one.
    for (const chip of segmentLabelsOf(weeks)) {
      expect(chip.label).not.toContain("Q");
    }
    // The month the chip is filed under rides along unabridged, as before.
    expect(map((s) => s.month, segmentLabelsOf(weeks))).toEqual([
      "2025-04",
      "2025-04",
      "2025-06",
    ]);
  });
});

// ── The season reaches every reading ─────────────────────────────────────────

describe("the season reaches the gauge and the projection", () => {
  const committed = runningBalances(MONTHLY_NET, OPENING_BALANCE);
  const BOUNDARIES = monthStarts(DOMAIN_START, committed.length);

  /** The board's own sampling: `rateAt` at every week, summed in WEEKS. */
  const samplingFor = (
    services: readonly Service[],
    mutations: readonly Mutation[] = [],
  ): RateSampling => ({
    boundaries: BOUNDARIES,
    rate: (time: number) => rateAt(time, mutations, services),
    moments: momentsOf(mutations),
    unit: "week",
  });

  it("samples a DIFFERENT rate in every week of the committed year", () => {
    const sampled = map((at: number) => rateAt(at, [], SERVICES), WEEK_SLOTS);
    // Not one reading, and not two: a season.
    expect(new Set(sampled).size).toBeGreaterThan(10);
    // February is under breakeven and August is well over it — which is the
    // whole reason a weekly board is worth drawing.
    expect(sampled[6]!).toBeLessThan(0);
    expect(sampled[31]!).toBeGreaterThan(COMFORTABLE);
  });

  it("BENDS the projection: no two monthly deltas are the same", () => {
    const projected = projectedBalances(committed, samplingFor(SERVICES), 0);
    const deltas = map(
      (balance: number, index: number) =>
        index === 0 ? 0 : balance - (projected[index - 1] ?? 0),
      projected,
    ).slice(1);
    expect(new Set(map((d: number) => Math.round(d), deltas)).size).toBe(
      deltas.length,
    );
    // The winter months LOSE money and the summer months make it, so the line
    // dips before it climbs — a flat slope cannot draw that at all.
    expect(deltas[1]!).toBeLessThan(0);
    expect(deltas[6]!).toBeGreaterThan(0);
    // Dividing each step by the weeks in its own month is what tells a season
    // apart from the calendar: flat, that quotient is one constant.
    const perWeek = (balances: readonly number[]): number[] =>
      map((balance: number, index: number) => {
        if (index === 0) return 0;
        const from = BOUNDARIES[index - 1] ?? 0;
        const to = BOUNDARIES[index] ?? 0;
        return (
          Math.round(
            ((balance - (balances[index - 1] ?? 0)) / weeksBetween(from, to)) *
              100,
          ) / 100
        );
      }, balances).slice(1);
    const level = projectedBalances(
      committed,
      { ...samplingFor(SERVICES), rate: () => COMMITTED_RATE },
      0,
    );
    expect(new Set(perWeek(level)).size).toBe(1);
    expect(new Set(perWeek(projected)).size).toBeGreaterThan(1);
  });

  it("ends the span on the closed form, week by week", () => {
    // THE CLOSED FORM, restated independently: Σ over each week of that week's
    // length × the rate in force. Every stretch here is a whole week except the
    // first (five days) and the last (three), and the edge walk weighs both by
    // the fraction of a week they hold rather than rounding them onto a sample.
    const projected = projectedBalances(committed, samplingFor(SERVICES), 0);
    let closedForm = 0;
    for (const [index, at] of WEEK_SLOTS.entries()) {
      const to = WEEK_SLOTS[index + 1] ?? END;
      closedForm += weeksBetween(at, to) * rateAt(at, [], SERVICES);
    }
    expect(projected[projected.length - 1]! - (committed[0] ?? 0)).toBeCloseTo(
      closedForm,
      6,
    );
    // And the season is IN the number: the same span at the committed AVERAGE
    // rate accrues almost exactly the same total, because that is what an
    // average is — but it gets there in a straight line.
    expect(closedForm).toBeCloseTo(
      COMMITTED_RATE * weeksBetween(START, END),
      6,
    );
  });

  it("carries the bend into the FAN, which is an offset from the line", () => {
    // The board draws the fan as `cell.balanceCents + sign × fanAt(index,
    // nowIndex)` (`fanSeries` in `hourly-board.tsx`), so it integrates by
    // construction — the same balance with a width added. Asserting the
    // RELATIONSHIP rather than building a second integration is the point: a
    // parallel computation could drift from the line it is drawn around.
    const projected = projectedBalances(committed, samplingFor(SERVICES), 0);
    const optimistic = map(
      (balance: number, index: number) => balance + fanAt(index, 0),
      projected,
    );
    for (const [index, balance] of projected.entries()) {
      expect(optimistic[index]! - balance).toBeCloseTo(fanAt(index, 0), 6);
    }
  });

  // WHICH INSTANT "NOW" IS, stated rather than implied.
  //
  // The integral runs from the PIVOT CELL'S START, and the sampling inside that
  // first month splits at the change's own moment: a change made LATE in its
  // month moves the first projected step less than it does every step after it.
  it("runs its window from the PIVOT CELL'S START, splitting at the change", () => {
    const W14: Mutation = { id: "w14", at: new Date("2025-03-31"), label: "1" };
    const twoWeeks = [W14];
    // +15 h/wk from the week of 31 March, carried over the whole season after.
    const services = withChange(
      SERVICES,
      "service-a",
      W14.id,
      HOURS,
      scheduledHours(SERVICES[0]!, timeOf(W14.at)) + 15,
      twoWeeks,
    );
    const sampling = samplingFor(services, twoWeeks);
    // March is the pivot cell — `W14` falls on its last day.
    const projected = projectedBalances(committed, sampling, 2);
    const marchStart = new Date("2025-03-01").getTime();
    const changeAt = timeOf(W14.at);
    const aprilStart = new Date("2025-04-01").getTime();
    expect(rateAt(changeAt, twoWeeks, services)).toBeGreaterThan(
      rateAt(changeAt, [], SERVICES),
    );
    // The first projected step is the sum over MARCH'S OWN WEEKS either side of
    // the change, not one month at one rate.
    let firstStep = 0;
    const edges = [
      marchStart,
      ...map(
        (at: number) => at,
        [...momentsOf(twoWeeks)].filter(
          (at: number) => at > marchStart && at < aprilStart,
        ),
      ),
      aprilStart,
    ];
    for (const [index, at] of edges.entries()) {
      const to = edges[index + 1];
      if (to === undefined) continue;
      firstStep += weeksBetween(at, to) * rateAt(at, twoWeeks, services);
    }
    expect(projected[3]! - (committed[2] ?? 0)).toBeCloseTo(firstStep, 6);
    // And it is strictly smaller than the step after it: April runs the whole
    // month with the change in force, and on a rising season besides.
    expect(projected[3]! - (committed[2] ?? 0)).toBeLessThan(
      projected[4]! - projected[3]!,
    );
  });

  it("prints the sampled rate per cell in the DEBUG table", () => {
    const rows = projectionTable(committed, samplingFor(SERVICES), 0);
    expect(rows).toHaveLength(committed.length);
    expect(rows[0]?.month).toBe("2025-01");
    // The per-cell PROJECTED RATE — January's sample is the opening week's.
    expect(rows[0]?.projectedRate).toBe(
      Math.round(rateAt(START, [], SERVICES)),
    );
    // Twelve DIFFERENT sampled rates out of thirteen cells, which is the season
    // in a column. The one repeat is the thirteenth cell: it is January again,
    // and the season has come back round to where it started.
    expect(new Set(map((row) => row.projectedRate, rows)).size).toBe(
      rows.length - 1,
    );
    expect(rows[12]?.projectedRate).toBe(rows[0]?.projectedRate);
    expect(map((row) => row.part, rows)[0]).toBe("committed");
    expect(map((row) => row.part, rows)[1]).toBe("projected");
  });

  it("holds a PROPOSED week-to-week swing on top of the season", () => {
    // The offset rule composes: four weekly changes alternating high and low
    // hours, each read against its own week, and each in force until the next.
    const weeks = map(
      (iso: string) => ({ id: `w-${iso}`, at: new Date(iso), label: "" }),
      ["2025-01-01", "2025-01-06", "2025-01-13", "2025-01-20"],
    ) as Mutation[];
    let services: readonly Service[] = SERVICES;
    for (const [step, week] of weeks.entries())
      services = withChange(
        services,
        "service-a",
        week.id,
        HOURS,
        step % 2 === 0 ? 30 : 10,
        weeks,
      );
    // Each change is read back as the figure the dial wrote.
    for (const [step, week] of weeks.entries())
      expect(offerFrom(services[0] as Service, week.id, weeks)?.hours).toBe(
        step % 2 === 0 ? 30 : 10,
      );
    const sampled = map(
      (week: Mutation) => rateAt(timeOf(week.at), weeks, services),
      weeks,
    );
    expect(sampled[0]!).toBeGreaterThan(sampled[1]!);
    expect(sampled[2]!).toBeGreaterThan(sampled[3]!);
    // The composite sits strictly between the two scenarios that hold the high
    // and the low figure at every one of those weeks instead of alternating.
    const holding = (hours: number): readonly Service[] => {
      let held: readonly Service[] = SERVICES;
      for (const week of weeks)
        held = withChange(held, "service-a", week.id, HOURS, hours, weeks);
      return held;
    };
    const swung = averageRate(TIME_DOMAIN, weeks, services);
    expect(swung).toBeLessThan(averageRate(TIME_DOMAIN, weeks, holding(30)));
    expect(swung).toBeGreaterThan(averageRate(TIME_DOMAIN, weeks, holding(10)));
    // And a one-week window averages to that week's own rate, exactly.
    for (const [step, week] of weeks.entries()) {
      const next = weeks[step + 1];
      if (next === undefined) continue;
      expect(
        averageRateOver(
          timeOf(week.at),
          timeOf(next.at),
          map((one: Mutation) => timeOf(one.at), weeks),
          (time: number) => revenueAt(services, time, weeks),
          "week",
        ),
      ).toBe(rateAt(timeOf(week.at), weeks, services));
    }
  });
});

// ── A week is 1/52 of the x-domain ───────────────────────────────────────────

describe("the season inside one transition width", () => {
  const PLOT_WIDTH = 640;

  it("crowds, so the mark's existing shortening is always in play", () => {
    const perWeek = PLOT_WIDTH / weeksBetween(START, END);
    // 12.3px of plot per week against a 28px full transition: adjacent weekly
    // points are ALWAYS closer together than a full transition apart, so the
    // shortening is the normal case here rather than an edge one — and with a
    // seasonal baseline it is in play across the WHOLE year rather than at two
    // adjacent flags.
    expect(perWeek).toBeCloseTo(12.27, 1);
    expect(transitionWidth(PLOT_WIDTH)).toBe(28);
    expect(perWeek).toBeLessThan(transitionWidth(PLOT_WIDTH));
  });

  it("draws the whole seasonal stack without collapsing or going NaN", () => {
    const series = map(
      (band: StackedAreaSeriesData) => ({
        id: band.id,
        points: map(
          (point: StackedAreaPoint) => ({
            at: timeOf(point.at),
            value: point.value,
          }),
          band.points,
        ),
      }),
      workMixSeries(SERVICES, []),
    );
    const geometry = buildStackedArea(
      series,
      (v: number) => ((v - START) / (END - START)) * PLOT_WIDTH,
      (v: number) => 200 - (v / 80) * 200,
      [START, END],
    );
    // One segment per emitted point of the widest band — about thirty rather
    // than the three a two-flag scenario gave.
    expect(geometry.segments.length).toBeGreaterThan(20);
    expect(geometry.transition).toBe(28);
    for (const band of geometry.bands) {
      expect(band.path).not.toContain("NaN");
      expect(band.path.length).toBeGreaterThan(0);
    }
  });

  it("still reads two adjacent weekly CHANGES as two changes", () => {
    const weeks: Mutation[] = map(
      (iso: string) => ({ id: `w-${iso}`, at: new Date(iso), label: "" }),
      ["2025-04-07", "2025-04-14"],
    );
    const services = withChange(
      withChange(SERVICES, "service-a", weeks[0]!.id, HOURS, 30, weeks),
      "service-a",
      weeks[1]!.id,
      HOURS,
      10,
      weeks,
    );
    const points = hourPointsFor(services[0] as Service, weeks);
    const at = (iso: string): number => new Date(iso).getTime();
    const valueAt = (iso: string): number | undefined =>
      map(
        (point) => (timeOf(point.at) === at(iso) ? point.value : -1),
        points,
      ).find((value: number) => value !== -1);
    expect(valueAt("2025-04-07")).toBe(30);
    expect(valueAt("2025-04-14")).toBe(10);
  });
});
