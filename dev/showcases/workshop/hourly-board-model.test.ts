/**
 * Hourly Board model — the whole board, argued with from a terminal.
 *
 * Two things are the point of this file. The CALIBRATION: four readings Peter
 * named, each derived from the constants rather than asserted against a
 * screenshot, plus the four inequalities that FIX those constants — so a later
 * edit that moves one of them fails here and not in a review of a dial. And the
 * HISTORY: a service is a segment or a ray whose year is change events, read
 * the way the payroll board reads pay — so the schedule is printed week by
 * week, because a stepped history is exactly the kind of thing that looks
 * plausible in a picture and wrong in a column of numbers.
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
  byVariability,
  canAdd,
  drawnRate,
  ensureMutation,
  isOffDial,
  hourPointsFor,
  isDirty,
  isLiveAt,
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
  segmentLabelsOf,
  slotOfTime,
  stackOrderTable,
  totalHoursAt,
  weekLabel,
  weekOfPick,
  weekRangeOf,
  weeksBetween,
  weightFrom,
  weightToReach,
  variabilityOf,
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

/** The board's opening history. */
const SEEDED: readonly Mutation[] = SEED_MUTATIONS;
/** The two seeded changes, by name. */
const JUNE = SEED_MUTATIONS[0]!;
const SEPTEMBER = SEED_MUTATIONS[1]!;

/** A history with more changes in it. Order does not matter: every walk sorts. */
const plus = (...extra: Mutation[]): Mutation[] => [...SEEDED, ...extra];

// ── The fixture ──────────────────────────────────────────────────────────────

describe("the opening scenario", () => {
  it("opens with two RAYS and Service A's two seeded changes", () => {
    expect(map((service: Service) => service.label, SERVICES)).toEqual([
      "Service A",
      "Service B",
    ]);
    expect(map((mutation: Mutation) => timeOf(mutation.at), SEEDED)).toEqual([
      Date.UTC(2025, 5, 2),
      Date.UTC(2025, 8, 1),
    ]);
    // Both begin at the span's start and neither ends: two rays.
    for (const service of SERVICES) {
      expect(service.start).toBe(START);
      expect(service.end).toBeUndefined();
    }
    // Service B carries no events at all — one level all year.
    expect(SERVICES[1]?.changes).toEqual({});
  });

  it("is Peter's Service A — 20 h @ $18, then 30 h @ $18 in June, then 15 h @ $20", () => {
    const a = SERVICES[0]!;
    expect(a.committed).toEqual({ hours: 20, rate: 18 });
    expect(a.changes[JUNE.id]).toEqual({ hours: 30, rate: 18 });
    expect(a.changes[SEPTEMBER.id]).toEqual({ hours: 15, rate: 20 });
    expect(SERVICES[1]?.committed).toEqual({ hours: 15, rate: 120 });
  });

  it("bills THREE weekly amounts across the year — $360, $540, $300", () => {
    const a = SERVICES[0]!;
    const weekly = (time: number): number => weeklyOf(offerAt(a, time, SEEDED));
    expect(weekly(START)).toBe(360);
    expect(weekly(timeOf(JUNE.at))).toBe(540);
    expect(weekly(timeOf(SEPTEMBER.at))).toBe(300);
    // No ×52 anywhere: the week IS the unit.
    expect(weeklyOf({ hours: 20, rate: 18 })).toBe(20 * 18);
    // The whole business, week one.
    expect(revenueAt(SERVICES, START, SEEDED)).toBe(360 + 1_800);
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

  it("holds every offer in the history inside its own allowance", () => {
    // A clamp that bit a SEEDED offer would draw a level the fixture never
    // stated, so every one of them sits inside the box its dial draws.
    for (const service of SERVICES) {
      const offers = [service.committed, ...Object.values(service.changes)];
      for (const offer of offers) {
        if (offer === null) continue;
        expect(offer.hours).toBeGreaterThanOrEqual(service.hoursRange[0]);
        expect(offer.hours).toBeLessThanOrEqual(service.hoursRange[1]);
        expect(offer.rate).toBeGreaterThanOrEqual(service.rateRange[0]);
        expect(offer.rate).toBeLessThanOrEqual(service.rateRange[1]);
      }
    }
  });
});

// ── The week grid ────────────────────────────────────────────────────────────

describe("the week grid the schedule is read on", () => {
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
    // A segment can begin or end in a week with no flag in it, so the moments
    // are the slots plus whatever flags exist.
    expect(momentsOf([])).toEqual([...WEEK_SLOTS]);
    const withFlag = momentsOf([Q2]);
    expect(withFlag).toHaveLength(WEEK_COUNT + 1);
    expect(withFlag).toContain(timeOf(Q2.at));
    expect(withFlag[0]).toBe(START);
    // A flag already ON the grid adds nothing — the union is a set.
    expect(momentsOf([Q1])).toHaveLength(WEEK_COUNT);
  });
});

// ── Segments and rays ────────────────────────────────────────────────────────

describe("a service is a SEGMENT or a RAY", () => {
  /** A summer-only service: live from 2 June up to (not including) 1 Sept. */
  const SUMMER: Service = {
    id: "summer",
    label: "Summer",
    start: timeOf(JUNE.at),
    end: timeOf(SEPTEMBER.at),
    committed: { hours: 10, rate: 50 },
    hoursRange: [0, 20],
    rateRange: [0, 100],
    changes: {},
  };

  it("reads a RAY as live from its start to the end of the span", () => {
    const ray = SERVICES[1]!;
    expect(isLiveAt(ray, START - 1)).toBe(false);
    expect(isLiveAt(ray, START)).toBe(true);
    expect(isLiveAt(ray, END)).toBe(true);
  });

  it("reads a SEGMENT as live on [start, end) — the end is exclusive", () => {
    expect(isLiveAt(SUMMER, timeOf(JUNE.at) - 1)).toBe(false);
    expect(isLiveAt(SUMMER, timeOf(JUNE.at))).toBe(true);
    expect(isLiveAt(SUMMER, timeOf(SEPTEMBER.at) - 1)).toBe(true);
    expect(isLiveAt(SUMMER, timeOf(SEPTEMBER.at))).toBe(false);
  });

  it("bills nothing outside its life — absence, not zero hours", () => {
    expect(offerAt(SUMMER, START, SEEDED)).toBeNull();
    expect(offerAt(SUMMER, WEEK_SLOTS[26]!, SEEDED)).toEqual({
      hours: 10,
      rate: 50,
    });
    expect(offerAt(SUMMER, END, SEEDED)).toBeNull();
    const withSummer = [...SERVICES, SUMMER];
    expect(revenueAt(withSummer, START, SEEDED)).toBe(
      revenueAt(SERVICES, START, SEEDED),
    );
    expect(revenueAt(withSummer, WEEK_SLOTS[26]!, SEEDED)).toBe(
      revenueAt(SERVICES, WEEK_SLOTS[26]!, SEEDED) + 500,
    );
  });

  it("reads a mutation AT a segment's end as the service ENDING there", () => {
    // Live just before, gone from it — the dial's "dropped here" row.
    expect(offerBefore(SUMMER, SEPTEMBER.id, SEEDED)).toEqual({
      hours: 10,
      rate: 50,
    });
    expect(offerFrom(SUMMER, SEPTEMBER.id, SEEDED)).toBeNull();
    // And it is not on the dials at all before it began.
    const early: Mutation = { id: "early", at: new Date("2025-03-03"), label: "" };
    const history = plus(early);
    expect(offerBefore(SUMMER, early.id, history)).toBeNull();
    expect(offerFrom(SUMMER, early.id, history)).toBeNull();
    expect(
      map((pair) => pair.id, pairsForMutation([SUMMER], early.id, history)),
    ).toEqual([]);
  });

  it("stops a segment's band in the week it ends, with no flag there", () => {
    const quiet = [...SERVICES, { ...SUMMER, end: Date.UTC(2025, 6, 14) }];
    const summerBand = workMixSeries(quiet, SEEDED).find(
      (band) => band.id === "summer",
    )!;
    expect(
      map((point) => [timeOf(point.at), point.value], summerBand.points),
    ).toEqual([
      [START, 0],
      [timeOf(JUNE.at), 10],
      [Date.UTC(2025, 6, 14), 0],
    ]);
  });
});

// ── The schedule ─────────────────────────────────────────────────────────────

describe("the schedule, week by week", () => {
  /** Every week of the opening scenario, as rows. */
  const rows: WeekRow[] = scheduleTable(SERVICES, SEEDED);

  it("PRINTS all 53 weeks, so the steps can be read as numbers", () => {
    expect(rows).toHaveLength(WEEK_COUNT);
    // Only the weeks where something moved — the table the header describes.
    const steps = rows.filter(
      (row, index) => index === 0 || row.revenue !== rows[index - 1]!.revenue,
    );
    expect(
      map((row) => [row.label, row.hours, row.revenue], steps),
    ).toEqual([
      ["W01 · Jan 1", [20, 15], 2_160],
      ["W23 · Jun 2", [30, 15], 2_340],
      ["W36 · Sep 1", [15, 15], 2_100],
    ]);
  });

  it("peaks at 45 h/wk from June — over full time, under the cap", () => {
    const peak = peakWeek(SERVICES, SEEDED);
    expect(peak.total).toBe(45);
    expect(peak.label).toBe("W23 · Jun 2");
    expect(peak.fullTime).toBe("over");
    expect(peak.total).toBeLessThan(DEFAULT_WORK_CAP);
  });

  it("ignores a change whose mutation is not in the history", () => {
    // `changes` is keyed by mutation id, so a history without the June and
    // September flags reads Service A flat at its opening offer all year —
    // exactly what the payroll board does with a person's orphaned key.
    expect(offerAt(SERVICES[0]!, END, [])).toEqual({ hours: 20, rate: 18 });
    expect(offerAt(SERVICES[0]!, END, SEEDED)).toEqual({ hours: 15, rate: 20 });
  });
});

// ── The calibration ──────────────────────────────────────────────────────────

describe("the calibration table — the opening scenario, changed all year", () => {
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
    // The rows are the GAUGE's reading — the time-weighted average of the
    // seeded year — so they carry the calendar's own fractions.
    expect(rows[0]?.revenue).toBeCloseTo(2_184.82, 2);
    expect(rows[0]?.rate).toBeCloseTo(484.82, 2);
    expect(rows[1]?.revenue).toBeCloseTo(2_371.51, 2);
    expect(rows[1]?.rate).toBeCloseTo(671.51, 2);
    expect(rows[2]?.revenue).toBeCloseTo(2_008.22, 2);
    expect(rows[2]?.rate).toBeCloseTo(308.22, 2);
    expect(rows[3]?.revenue).toBeCloseTo(1_408.22, 2);
    expect(rows[3]?.rate).toBeCloseTo(-291.78, 2);
  });

  it("applies a row's change to EVERY offer in the history, not only the first", () => {
    // +10 hours is +$180/wk while A bills $18 and +$200/wk once September
    // moves it to $20 — so the row's delta sits strictly between the two. A
    // change made to the opening offer alone would be undone by June.
    const rows = rateBandTable();
    const delta = rows[1]!.rate - rows[0]!.rate;
    expect(delta).toBeGreaterThan(10 * 18);
    expect(delta).toBeLessThan(10 * 20);
    // At the floor, A bills $10 an hour all year, whatever September said —
    // so the row is B's $1,800 plus ten dollars for each of A's average hours.
    const aHoursAverage = (rows[2]!.revenue - 15 * 120) / 10;
    expect(aHoursAverage).toBeCloseTo(20.82, 2);
  });

  it("leaves an ADDED service alone, and counts it from where it starts", () => {
    const history = plus(Q2);
    const { services } = addService(
      SERVICES,
      { name: "C", hours: 8, rate: 200 },
      Q2.id,
      history,
    );
    expect(services[2]?.start).toBe(timeOf(Q2.at));
    // Q2 is not in the seeded history, so the table reads the fixture alone.
    expect(map((row) => row.rate, rateBandTable(services))).toEqual(
      map((row) => row.rate, rateBandTable()),
    );
  });

  it("solves the four inequalities that FIX the two constants", () => {
    const rev0 = 2_184.821917808219;
    const revAfloor = 2_008.2191780821915;
    const revFloor = 1_408.2191780821918;
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
    // FIXED ∈ (1,408.22, 2,008.22): every reading holds anywhere in there.
    for (const fixed of [1_450, 1_700, 1_950]) {
      expect(2_008.22 - fixed).toBeGreaterThan(0);
      expect(1_408.22 - fixed).toBeLessThan(0);
    }
    expect(FIXED_WEEKLY_COST).toBeGreaterThan(1_408.22);
    expect(FIXED_WEEKLY_COST).toBeLessThan(2_008.22);
    // 1,700 is within ten dollars of the middle of that interval (1,708.22).
    expect(Math.abs(FIXED_WEEKLY_COST - (1_408.22 + 2_008.22) / 2)).toBeLessThan(
      10,
    );
    // COMFORTABLE ∈ (308.22, 484.82] at that fixed cost.
    expect(COMFORTABLE).toBeGreaterThan(308.22);
    expect(COMFORTABLE).toBeLessThanOrEqual(484.82);
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
    expect(maxReachableRate(SERVICES)).toBe(45 * 40 + 32 * 160 - 1_700);
    expect(maxReachableRate(SERVICES)).toBe(5_220);
    expect(maxReachableRate(SERVICES)).toBeLessThanOrEqual(RATE_DOMAIN[1]);
  });

  it("cannot hold an ADDED service, so the clamp is named instead", () => {
    // `addService` gives a service the whole track — it has negotiated no band
    // of its own — so one added service alone reaches 80 × 300 = $24k/wk and
    // the count is unbounded. The clamp is a named function and the DEBUG line
    // prints the DRAWN figure beside the raw one.
    const { services } = addService(
      SERVICES,
      { name: "Runaway", hours: 80, rate: 300 },
      Q1.id,
      plus(Q1),
    );
    const runaway = maxReachableRate(services);
    expect(runaway).toBe(5_220 + 80 * 300);
    expect(runaway).toBeGreaterThan(RATE_DOMAIN[1]);
    expect(isOffDial(runaway)).toBe(true);
    expect(drawnRate(runaway)).toBe(RATE_DOMAIN[1]);
  });

  it("clamps at both ends and leaves everything between alone", () => {
    expect(drawnRate(RATE_DOMAIN[0] - 1)).toBe(RATE_DOMAIN[0]);
    expect(drawnRate(RATE_DOMAIN[1] + 1)).toBe(RATE_DOMAIN[1]);
    expect(drawnRate(COMMITTED_RATE)).toBe(COMMITTED_RATE);
    expect(isOffDial(COMMITTED_RATE)).toBe(false);
    for (const row of rateBandTable()) expect(isOffDial(row.rate)).toBe(false);
  });

  it("puts the committed rate where the table's first row says, by construction", () => {
    // THE SAME CALL the gauge makes on the opening scenario, so exact equality
    // — and with it, "no change to revenue" on the board as it opens.
    expect(COMMITTED_RATE).toBe(averageRate(TIME_DOMAIN, SEEDED, SERVICES));
    expect(rateBandTable()[0]?.rate).toBe(COMMITTED_RATE);
    expect(COMMITTED_RATE).toBeCloseTo(484.82, 2);
    // It is NOT the opening week's rate: January bills $360 for A, summer $540.
    expect(rateAt(START, SEEDED, SERVICES)).toBe(2_160 - FIXED_WEEKLY_COST);
    expect(rateFromRevenue(2_184.821917808219)).toBeCloseTo(COMMITTED_RATE, 9);
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

  it("states the flat-level algebra EXACTLY for a service with no events", () => {
    // Service B carries no change events, so cutting its rate is a change
    // between two FLAT levels — the case `weightToReach` is exact for. $120 to
    // $80 at 15 h/wk is $600/wk less.
    const cutAt = (at: Mutation): number => {
      const history = plus(at);
      const cut = withChange(SERVICES, "service-b", at.id, RATE, 80, history);
      return averageRate(TIME_DOMAIN, history, cut);
    };
    for (const at of [Q1, Q2]) {
      expect(cutAt(at)).toBeCloseTo(
        COMMITTED_RATE - 600 * weightFrom(START, END, timeOf(at.at), "week"),
        9,
      );
    }
    // A cut in January is in force for the whole span, April's for less of it.
    expect(cutAt(Q1)).toBeLessThan(cutAt(Q2));
    // And the algebra's own answer: to pull the year to breakeven the cut must
    // be in force for about four fifths of it.
    const needed = weightToReach(COMMITTED_RATE - 600, 0);
    expect(needed).toBeCloseTo(COMMITTED_RATE / 600, 9);
    expect(needed).toBeCloseTo(0.808, 3);
  });

  it("lets a LATER event win — a change holds only until the next one", () => {
    // Payroll semantics: A's rate cut to $10 in April is replaced by June's
    // own $18, so it bites for nine weeks and not for the rest of the year.
    const history = plus(Q2);
    const cut = withChange(SERVICES, "service-a", Q2.id, RATE, 10, history);
    expect(offerAt(cut[0]!, timeOf(Q2.at), history)?.rate).toBe(10);
    expect(offerAt(cut[0]!, timeOf(JUNE.at), history)?.rate).toBe(18);
    expect(averageRate(TIME_DOMAIN, history, cut)).toBeGreaterThan(
      rateBandTable()[2]!.rate,
    );
  });

  it("reads exactly the baseline on the opening scenario", () => {
    expect(averageRate(TIME_DOMAIN, SEEDED, SERVICES)).toBe(COMMITTED_RATE);
  });

  it("moves the figure and not the verdict when the unit changes", () => {
    // The month reading is still there for comparison: the unit is a statement
    // about what the reader counts, worth a few dollars a week, not a verdict.
    const inWeeks = averageRate(TIME_DOMAIN, SEEDED, SERVICES);
    const inMonths = averageRate(TIME_DOMAIN, SEEDED, SERVICES, "month");
    expect(bandOfRate(inMonths)).toBe(bandOfRate(inWeeks));
    expect(Math.abs(inMonths - inWeeks)).toBeLessThan(15);
  });
});

// ── Walking the history ──────────────────────────────────────────────────────

describe("the history", () => {
  const history = plus(Q2);
  const raised = withChange(SERVICES, "service-a", Q2.id, HOURS, 25, history);

  it("carries the measure that did NOT move forward", () => {
    // PairedMutationSliders emits one measure at a time; a change in the
    // history is a whole offer, so the other half is carried, not invented.
    expect(offerFrom(raised[0] as Service, Q2.id, history)).toEqual({
      hours: 25,
      rate: 18,
    });
    expect(offerBefore(raised[0] as Service, Q2.id, history)).toEqual({
      hours: 20,
      rate: 18,
    });
  });

  it("CARRIES THE LEVEL forward until the next event, like payroll", () => {
    const a = raised[0] as Service;
    // In force from April…
    expect(offerAt(a, WEEK_SLOTS[18]!, history)).toEqual({ hours: 25, rate: 18 });
    // …until June's own event, which says 30 and so reads 30.
    expect(offerAt(a, timeOf(JUNE.at), history)).toEqual({ hours: 30, rate: 18 });
    expect(offerAt(a, END, history)).toEqual({ hours: 15, rate: 20 });
    // BEFORE the change nothing moved at all.
    expect(offerAt(a, START, history)).toEqual({ hours: 20, rate: 18 });
  });

  it("leaves every other service and every other mutation untouched", () => {
    expect(raised[1]?.changes).toEqual({});
    expect(raised[0]?.changes[JUNE.id]).toEqual({ hours: 30, rate: 18 });
    expect(raised[0]?.changes[SEPTEMBER.id]).toEqual({ hours: 15, rate: 20 });
  });

  it("walks in TIME order, not key order", () => {
    // Repriced at Q1, untouched at Q2: the prior while editing Q2 is the Q1
    // rate — and so is the prior at June, two changes later.
    const both = plus(Q1, Q2);
    const twice = withChange(SERVICES, "service-a", Q1.id, RATE, 30, both);
    expect(offerBefore(twice[0] as Service, Q2.id, both)).toEqual({
      hours: 20,
      rate: 30,
    });
    expect(offerBefore(twice[0] as Service, JUNE.id, both)).toEqual({
      hours: 20,
      rate: 30,
    });
  });

  it("makes a DROP both measures null, and nothing else", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    expect(offerFrom(dropped[1] as Service, Q2.id, history)).toBeNull();
    expect(offerBefore(dropped[1] as Service, Q2.id, history)).toEqual({
      hours: 15,
      rate: 120,
    });
    const pair = pairsForMutation(dropped, Q2.id, history)[1];
    expect(pair?.measures[HOURS].value).toBeNull();
    expect(pair?.measures[RATE].value).toBeNull();
  });

  it("reinstates by DELETING the change rather than inventing an offer", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const back = withoutChange(dropped, "service-b", Q2.id);
    expect(back[1]?.changes).toEqual({});
    expect(offerFrom(back[1] as Service, Q2.id, history)).toEqual({
      hours: 15,
      rate: 120,
    });
    expect(offerAt(back[1] as Service, END, history)).toEqual({
      hours: 15,
      rate: 120,
    });
  });

  it("hides a service dropped EARLIER at every later mutation", () => {
    // The fourth row of isSoldAt's truth table, which is Peter's "terminated
    // services hidden at later dates".
    const dropped = withDrop(SERVICES, "service-b", Q1.id);
    const both = plus(Q1, Q2);
    const atQ1 = pairsForMutation(dropped, Q1.id, both);
    const atQ2 = pairsForMutation(dropped, Q2.id, both);
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
    // The first week: the first free slot IS that week, so the reader's first
    // click proposes a change whose dials already read these figures.
    expect(pairs[0]?.measures[HOURS].value).toBe(20);
    expect(pairs[1]?.measures[HOURS].value).toBe(15);
    const atFirstSlot = pairsForMutation(SERVICES, Q1.id, plus(Q1));
    expect(map((pair) => pair.measures[HOURS].value, atFirstSlot)).toEqual([
      20, 15,
    ]);
    expect(map((pair) => pair.measures[RATE].value, atFirstSlot)).toEqual([
      18, 120,
    ]);
  });

  it("reads the summary as WEEKLY revenue", () => {
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[0]!)).toBe(20 * 18);
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[1]!)).toBe(15 * 120);
    // Hours × rate, with no year in it at all.
    expect(weeklyOfPair(pairsWithoutMutation(SERVICES)[0]!)).toBe(360);
  });

  it("reads the June change as 20 → 30 hours, and September as 30 → 15 at $20", () => {
    const june = pairsForMutation(SERVICES, JUNE.id, SEEDED)[0]!;
    expect(june.measures[HOURS]).toMatchObject({ prior: 20, value: 30 });
    expect(june.measures[RATE]).toMatchObject({ prior: 18, value: 18 });
    expect(weeklyOfPair(june)).toBe(540);
    const september = pairsForMutation(SERVICES, SEPTEMBER.id, SEEDED)[0]!;
    expect(september.measures[HOURS]).toMatchObject({ prior: 30, value: 15 });
    expect(september.measures[RATE]).toMatchObject({ prior: 18, value: 20 });
    expect(weeklyOfPair(september)).toBe(300);
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
    const history = plus(Q1, Q2);
    const { services, id } = addService(SERVICES, draft, Q2.id, history);
    const added = services[2] as Service;
    expect(id).toBe("service-c");
    expect(added.committed).toBeNull();
    // A RAY from the mutation it was added at.
    expect(added.start).toBe(timeOf(Q2.at));
    expect(added.end).toBeUndefined();
    expect(offerBefore(added, Q2.id, history)).toBeNull();
    expect(offerFrom(added, Q2.id, history)).toEqual({ hours: 8, rate: 200 });
    // Absent from the mutation before it.
    expect(
      isSoldAt(
        offerBefore(added, Q1.id, history),
        offerFrom(added, Q1.id, history),
      ),
    ).toBe(false);
    expect(addedAt(added, history)).toBe(Q2.id);
  });

  it("gives a negotiated-nothing service the whole track and one level", () => {
    const history = plus(Q2);
    const { services } = addService(SERVICES, draft, Q2.id, history);
    expect(services[2]?.hoursRange).toEqual(HOURS_DOMAIN);
    expect(services[2]?.rateRange).toEqual(RATE_DOMAIN_PER_HOUR);
    // It holds the figure it was added at to the end of the span — June and
    // September are Service A's events, not this one's.
    for (const at of [WEEK_SLOTS[20]!, WEEK_SLOTS[35]!, END])
      expect(offerAt(services[2] as Service, at, history)).toEqual({
        hours: 8,
        rate: 200,
      });
  });

  it("derives the id from the NAME, so the same add twice is the same result", () => {
    const history = plus(Q2);
    const once = addService(SERVICES, draft, Q2.id, history);
    const twice = addService(once.services, draft, Q2.id, history);
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
      [Q2],
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
    // Only the entry AT Q2 goes; the seeded June and September entries stay.
    expect(Object.keys(next.services[0]!.changes)).toEqual([
      JUNE.id,
      SEPTEMBER.id,
    ]);
    // No change left in THIS history, so the empty-state sentence returns.
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
    // Back on its own level.
    expect(offerAt(next.services[1] as Service, END, [])).toEqual({
      hours: 15,
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

  it("opens every band at the span's left edge, on its own history", () => {
    const series = workMixSeries(SERVICES, SEEDED);
    // ORDERED BY VARIABILITY, not fixture order: Service B never moves, so it
    // is the BOTTOM band and Service A, which steps twice, is the TOP.
    expect(map((one) => one.id, series)).toEqual(["service-b", "service-a"]);
    for (const one of series) {
      expect(timeOf(one.points[0]!.at)).toBe(START);
    }
    expect(series[0]?.points).toEqual([{ at: DOMAIN_START, value: 15 }]);
  });

  it("draws Service A's THREE levels as three points — changes only", () => {
    const a = workMixSeries(SERVICES, SEEDED)[1]!;
    expect(map((point) => [timeOf(point.at), point.value], a.points)).toEqual([
      [START, 20],
      [timeOf(JUNE.at), 30],
      [timeOf(SEPTEMBER.at), 15],
    ]);
  });

  describe("the stack, ordered by variability", () => {
    it("puts the STEADIER service on the bottom and the MORE VARIABLE one on top", () => {
      // Peter, 2026-09-18: "Sort by variability. So the one with the biggest
      // bumps is on top." Service B never moves; Service A steps 20 → 30 → 15.
      const stdDevA = variabilityOf(SERVICES[0] as Service, SEEDED);
      const stdDevB = variabilityOf(SERVICES[1] as Service, SEEDED);
      expect(stdDevB).toBe(0);
      expect(stdDevA).toBeGreaterThan(0);
      expect(
        map((service) => service.id, byVariability(SERVICES, SEEDED)),
      ).toEqual(["service-b", "service-a"]);
    });

    it("flips when a scenario makes the steadier service swing harder", () => {
      // Pushed to the top of its allowance from Q1 and dropped to zero at Q3,
      // B's hours run 32 then 0 — a bigger bump than A's 20 / 30 / 15.
      const Q3: Mutation = { id: "q3", at: new Date("2025-07-01"), label: "3" };
      const mutations = plus(Q1, Q3);
      const raised = withDrop(
        withChange(SERVICES, "service-b", Q1.id, HOURS, 32, mutations),
        "service-b",
        Q3.id,
      );
      const stdDevA = variabilityOf(raised[0] as Service, mutations);
      const stdDevB = variabilityOf(raised[1] as Service, mutations);
      expect(stdDevB).toBeGreaterThan(stdDevA);
      expect(
        map((service) => service.id, byVariability(raised, mutations)),
      ).toEqual(["service-a", "service-b"]);
    });

    it("keeps the FIXTURE'S OWN order when variability ties", () => {
      // Read with no history, Service A's June and September keys are
      // orphans, so both services are one flat level all year.
      expect(variabilityOf(SERVICES[0] as Service, [])).toBe(0);
      expect(variabilityOf(SERVICES[1] as Service, [])).toBe(0);
      expect(map((service) => service.id, byVariability(SERVICES, []))).toEqual([
        "service-a",
        "service-b",
      ]);
    });

    it("prints the stack order table the DEBUG panel shows", () => {
      const table = stackOrderTable(SERVICES, SEEDED);
      expect(map((row) => row.service, table)).toEqual([
        "Service B",
        "Service A",
      ]);
      expect(map((row) => row.band, table)).toEqual(["bottom", "top"]);
      expect(table[0]?.position).toBe(0);
      expect(table[1]?.position).toBe(1);
      expect(table[0]!.stdDevHoursPerWeek).toBeLessThan(
        table[1]!.stdDevHoursPerWeek,
      );
    });
  });

  it("emits a rate-only change as NO new hours point, and a drop to zero", () => {
    // A rate-only change moves no hours, so the band is the history's own.
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
    expect(totalHoursAt(SERVICES, START, SEEDED)).toBe(35);
    expect(totalHoursAt(SERVICES, timeOf(JUNE.at), SEEDED)).toBe(45);
    expect(totalHoursAt(SERVICES, START, SEEDED)).toBeLessThan(DEFAULT_WORK_CAP);
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
    // And it holds in EVERY week, because the clamp is on every offer.
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
      { service: "Service A", hours: 20, rate: 18, weekly: 360 },
      { service: "Service B", hours: 15, rate: 120, weekly: 1_800 },
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

describe("the hovered week, as a range of days", () => {
  it("names the Monday-to-Sunday week a moment falls in", () => {
    // Wednesday 6 August 2025, mid-afternoon.
    expect(weekRangeOf(Date.UTC(2025, 7, 6, 15)).label).toBe(
      "2025-08-04 to 2025-08-10",
    );
    // The Monday and the Sunday are both inside their own week.
    expect(weekRangeOf(Date.UTC(2025, 7, 4)).label).toBe(
      "2025-08-04 to 2025-08-10",
    );
    expect(weekRangeOf(Date.UTC(2025, 7, 10, 23)).label).toBe(
      "2025-08-04 to 2025-08-10",
    );
  });

  it("cuts the first and last weeks at the span's own edges", () => {
    expect(weekRangeOf(START).label).toBe("2025-01-01 to 2025-01-05");
    expect(weekRangeOf(END - 1).label).toBe("2025-12-29 to 2025-12-31");
  });

  it("is the same week a click there adds a change to", () => {
    const at = Date.UTC(2025, 3, 9, 13);
    expect(weekRangeOf(at).start).toBe(weekOfPick(at).getTime());
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
  /** The 27th slot: `nextFreeSlot` walked 26 times. */
  const WEEK_27 = new Date("2025-06-30");

  it("is where the 27th slot actually falls", () => {
    expect(weekOfPick(WEEK_27).getTime()).toBe(WEEK_27.getTime());
    expect(weekLabel(WEEK_27)).toBe("W27 · Jun 30");
    expect(slotOfTime(WEEK_27.getTime())).toBe(26);
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

// ── The history reaches every reading ────────────────────────────────────────

describe("Service A's changes reach the gauge and the projection", () => {
  const committed = runningBalances(MONTHLY_NET, OPENING_BALANCE);
  const BOUNDARIES = monthStarts(DOMAIN_START, committed.length);

  /** The board's own sampling: `rateAt` at every week, summed in WEEKS. */
  const samplingFor = (
    services: readonly Service[],
    mutations: readonly Mutation[] = SEEDED,
  ): RateSampling => ({
    boundaries: BOUNDARIES,
    rate: (time: number) => rateAt(time, mutations, services),
    moments: momentsOf(mutations),
    unit: "week",
  });

  it("samples exactly THREE rates across the year — one per level", () => {
    const sampled = map((at: number) => rateAt(at, SEEDED, SERVICES), WEEK_SLOTS);
    expect([...new Set(sampled)]).toEqual([460, 640, 400]);
  });

  it("BENDS the projection at June and at September", () => {
    const projected = projectedBalances(committed, samplingFor(SERVICES), 0);
    // Dividing each step by the weeks in its own month is what tells a change
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
    const steps = perWeek(projected);
    // January at $460/wk, July at $640, October at $400.
    expect(steps[0]).toBe(460);
    expect(steps[6]).toBe(640);
    expect(steps[9]).toBe(400);
  });

  it("ends the span on the closed form, week by week", () => {
    // THE CLOSED FORM, restated independently: Σ over each week of that week's
    // length × the rate in force.
    const projected = projectedBalances(committed, samplingFor(SERVICES), 0);
    let closedForm = 0;
    for (const [index, at] of WEEK_SLOTS.entries()) {
      const to = WEEK_SLOTS[index + 1] ?? END;
      closedForm += weeksBetween(at, to) * rateAt(at, SEEDED, SERVICES);
    }
    expect(projected[projected.length - 1]! - (committed[0] ?? 0)).toBeCloseTo(
      closedForm,
      6,
    );
    // The same span at the committed AVERAGE rate accrues the same total —
    // that is what an average is — but gets there in a straight line.
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
    const twoWeeks = plus(W14);
    // +15 h/wk from the week of 31 March, in force until June's own event.
    const services = withChange(
      SERVICES,
      "service-a",
      W14.id,
      HOURS,
      offerAt(SERVICES[0]!, timeOf(W14.at), SEEDED)!.hours + 15,
      twoWeeks,
    );
    const sampling = samplingFor(services, twoWeeks);
    // March is the pivot cell — `W14` falls on its last day.
    const projected = projectedBalances(committed, sampling, 2);
    const marchStart = new Date("2025-03-01").getTime();
    const changeAt = timeOf(W14.at);
    const aprilStart = new Date("2025-04-01").getTime();
    expect(rateAt(changeAt, twoWeeks, services)).toBeGreaterThan(
      rateAt(changeAt, SEEDED, SERVICES),
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
    // month with the change in force.
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
      Math.round(rateAt(START, SEEDED, SERVICES)),
    );
    // Three sampled rates, one per level of Service A — the history in a column.
    expect([...new Set(map((row) => row.projectedRate, rows))]).toEqual([
      460, 640, 400,
    ]);
    expect(map((row) => row.part, rows)[0]).toBe("committed");
    expect(map((row) => row.part, rows)[1]).toBe("projected");
  });

  it("holds a PROPOSED week-to-week swing", () => {
    // Four weekly changes alternating high and low hours, each in force until
    // the next — a season composed from changes, which is the whole model.
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

describe("weekly changes inside one transition width", () => {
  const PLOT_WIDTH = 640;

  it("crowds, so the mark's existing shortening is always in play", () => {
    const perWeek = PLOT_WIDTH / weeksBetween(START, END);
    // 12.3px of plot per week against a 28px full transition: adjacent weekly
    // points are ALWAYS closer together than a full transition apart, so the
    // shortening is the normal case whenever two changes land in neighbouring
    // weeks.
    expect(perWeek).toBeCloseTo(12.27, 1);
    expect(transitionWidth(PLOT_WIDTH)).toBe(28);
    expect(perWeek).toBeLessThan(transitionWidth(PLOT_WIDTH));
  });

  it("draws the opening stack without collapsing or going NaN", () => {
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
      workMixSeries(SERVICES, SEEDED),
    );
    const geometry = buildStackedArea(
      series,
      (v: number) => ((v - START) / (END - START)) * PLOT_WIDTH,
      (v: number) => 200 - (v / 80) * 200,
      [START, END],
    );
    // One segment per emitted point of the widest band — Service A's three.
    expect(geometry.segments.length).toBe(3);
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
