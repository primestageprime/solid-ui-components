/**
 * Hourly Board model — the whole board, argued with from a terminal.
 *
 * The calibration is the point of this file: four readings Peter named, each
 * derived from the constants rather than asserted against a screenshot, plus
 * the four inequalities that FIX those constants — so a later edit that moves
 * one of them fails here and not in a review of a dial.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../src/fn";
import { timeOf } from "../../../src";
import type {
  Mutation,
  StackedAreaPoint,
  StackedAreaSeriesData,
} from "../../../src";
// The MARK's own core, so the crowding of two weekly changes inside one
// transition is asserted against the geometry that draws them rather than
// against a screenshot.
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
  FIXED_ANNUAL_COST,
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
  WEEKS_PER_YEAR,
  addMutation,
  addService,
  addedAt,
  annualOf,
  annualOfPair,
  accruedOver,
  averageRate,
  averageRateOver,
  bandOfRate,
  canAdd,
  drawnRate,
  ensureMutation,
  isOffDial,
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
  segmentLabelsOf,
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
} from "./hourly-board-model";

const START = DOMAIN_START.getTime();
const END = DOMAIN_END.getTime();

/** Q1 2025, where `nextFreeSlot` puts a first interaction. */
const Q1: Mutation = { id: "q1", at: new Date("2025-01-01"), label: "1" };
/** Q2 2025 — three quarters of the year left to run. */
const Q2: Mutation = { id: "q2", at: new Date("2025-04-01"), label: "2" };

// ── The fixture ──────────────────────────────────────────────────────────────

describe("the opening scenario", () => {
  it("opens with two services and NOTHING proposed", () => {
    expect(map((service: Service) => service.label, SERVICES)).toEqual([
      "Service A",
      "Service B",
    ]);
    expect(SEED_MUTATIONS).toEqual([]);
    // "Changes: {}" is the whole of "nothing proposed" — an absent key already
    // means unchanged, so an empty map is a history with nothing in it.
    for (const service of SERVICES) {
      expect(Object.keys(service.changes)).toEqual([]);
    }
  });

  it("is Peter's fixture — 20 h/wk @ $150 and 15 h/wk @ $120", () => {
    expect(SERVICES[0]?.committed).toEqual({ hours: 20, rate: 150 });
    expect(SERVICES[1]?.committed).toEqual({ hours: 15, rate: 120 });
  });

  it("bills $249.6k a year before anything is proposed", () => {
    expect(annualOf({ hours: 20, rate: 150 })).toBe(20 * 150 * WEEKS_PER_YEAR);
    expect(revenueAt(SERVICES, START, [])).toBe(249_600);
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
});

// ── The calibration ──────────────────────────────────────────────────────────

describe("the calibration table — every change made at the START of the year", () => {
  it("prints exactly the four readings the header states", () => {
    expect(rateBandTable()).toEqual([
      {
        scenario: "as it opens",
        revenue: 249_600,
        rate: 69_600,
        band: "green",
      },
      {
        scenario: "first service's hours +10",
        revenue: 327_600,
        rate: 147_600,
        band: "green",
      },
      {
        scenario: "first service's rate at its floor",
        revenue: 197_600,
        rate: 17_600,
        band: "yellow",
      },
      {
        scenario: "every rate at its floor",
        revenue: 166_400,
        rate: -13_600,
        band: "red",
      },
    ]);
  });

  it("solves the four inequalities that FIX the two constants", () => {
    const rev0 = 249_600;
    const revAfloor = 197_600;
    const revFloor = 166_400;
    // The board opens green.
    expect(rev0 - FIXED_ANNUAL_COST).toBeGreaterThanOrEqual(COMFORTABLE);
    // Cutting ONE rate is not yet a loss…
    expect(revAfloor - FIXED_ANNUAL_COST).toBeGreaterThan(0);
    // …but it is no longer comfortable.
    expect(revAfloor - FIXED_ANNUAL_COST).toBeLessThan(COMFORTABLE);
    // Cutting BOTH crosses zero.
    expect(revFloor - FIXED_ANNUAL_COST).toBeLessThan(0);
  });

  it("is not balanced on a knife edge — the solution has room either side", () => {
    // FIXED ∈ (166,400, 189,600): every reading holds anywhere in there.
    for (const fixed of [170_000, 180_000, 189_000]) {
      expect(249_600 - fixed).toBeGreaterThan(0);
      expect(166_400 - fixed).toBeLessThan(0);
    }
    expect(FIXED_ANNUAL_COST).toBeGreaterThan(166_400);
    expect(FIXED_ANNUAL_COST).toBeLessThan(189_600);
    // COMFORTABLE ∈ (17,600, 69,600] at that fixed cost.
    expect(COMFORTABLE).toBeGreaterThan(17_600);
    expect(COMFORTABLE).toBeLessThanOrEqual(69_600);
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
    expect(minReachableRate()).toBe(-FIXED_ANNUAL_COST);
    expect(minReachableRate()).toBeGreaterThanOrEqual(RATE_DOMAIN[0]);
    expect(maxReachableRate(SERVICES)).toBe(340_000);
    expect(maxReachableRate(SERVICES)).toBeLessThanOrEqual(RATE_DOMAIN[1]);
  });

  it("cannot hold an ADDED service, so the clamp is named instead", () => {
    // `addService` gives a service the whole track — it has negotiated no band
    // of its own — so one added service alone reaches 80 x 300 x 52 = $1.248M
    // and the count is unbounded. No per-service range can fix that, so the
    // promise is kept the other way round: the clamp is a named function and
    // the DEBUG line prints the DRAWN figure beside the raw one.
    const { services } = addService(
      SERVICES,
      { name: "Runaway", hours: 80, rate: 300 },
      Q1.id,
    );
    const runaway = maxReachableRate(services);
    expect(runaway).toBe(340_000 + 80 * 300 * WEEKS_PER_YEAR);
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

  it("puts the committed rate where the table's first row says", () => {
    expect(COMMITTED_RATE).toBe(69_600);
    expect(rateFromRevenue(249_600)).toBe(COMMITTED_RATE);
  });
});

// ── When, not only how much ──────────────────────────────────────────────────

describe("the composite reading — WHEN a change lands", () => {
  it("puts the FIRST interaction at weight 1, which is what the table describes", () => {
    // This is the fact that makes the calibration table a statement about the
    // opening move rather than about an arbitrary date: the span starts on a
    // quarter boundary, so the first free quarter IS the span's left edge.
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

  it("reaches RED only from the first 16.4% of the year", () => {
    // COMMITTED + w × (floorCut − COMMITTED) < 0  ⇒  w > 0.836
    const needed = weightToReach(-13_600, 0);
    expect(needed).toBeCloseTo(69_600 / 83_200, 10);
    expect(needed).toBeCloseTo(0.8365, 4);
    // So the same cut made in April leaves the gauge YELLOW, not red — the
    // composite reading doing its job, not a miscalibration.
    const floored = map(
      (service: Service) => ({
        ...service,
        changes: {
          [Q2.id]: {
            hours: service.committed?.hours ?? 0,
            rate: service.rateRange[0],
          },
        },
      }),
      SERVICES,
    );
    // The gauge reads in WEEKS (this board's grain), so the weight is the
    // share of the 365 days left after 1 April rather than nine twelfths.
    const weeks = weightFrom(START, END, timeOf(Q2.at), "week");
    expect(weeks).toBeCloseTo(275 / 365, 10);
    const average = averageRate(TIME_DOMAIN, [Q2], floored);
    expect(average).toBeCloseTo(69_600 + weeks * -83_200, 6);
    // The month reading is still there for comparison, and still yellow: the
    // unit moves the figure by a few hundred dollars, not the verdict.
    expect(averageRate(TIME_DOMAIN, [Q2], floored, "month")).toBeCloseTo(
      69_600 + 0.75 * -83_200,
      6,
    );
    expect(bandOfRate(average)).toBe("yellow");
  });

  it("agrees with the instantaneous rate when the change is at the left edge", () => {
    const floored = map(
      (service: Service) => ({
        ...service,
        changes: {
          [Q1.id]: {
            hours: service.committed?.hours ?? 0,
            rate: service.rateRange[0],
          },
        },
      }),
      SERVICES,
    );
    expect(averageRate(TIME_DOMAIN, [Q1], floored)).toBe(-13_600);
    expect(rateAt(START, [Q1], floored)).toBe(-13_600);
    expect(bandOfRate(averageRate(TIME_DOMAIN, [Q1], floored))).toBe("red");
  });

  it("reads exactly the baseline with no mutation at all", () => {
    expect(averageRate(TIME_DOMAIN, [], SERVICES)).toBe(COMMITTED_RATE);
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
    expect(offerBefore(raised[0] as Service, Q2.id, [Q2])).toEqual({
      hours: 20,
      rate: 150,
    });
  });

  it("leaves every other service and every other mutation untouched", () => {
    expect(raised[1]?.changes).toEqual({});
    expect(offerAt(raised[0] as Service, START, [Q2])).toEqual({
      hours: 20,
      rate: 150,
    });
    expect(offerAt(raised[0] as Service, END, [Q2])).toEqual({
      hours: 25,
      rate: 150,
    });
  });

  it("walks in TIME order, not key order", () => {
    // Raised at Q1, untouched at Q2: the prior while editing Q2 is the Q1
    // figure, not the committed one.
    const twice = withChange(SERVICES, "service-a", Q1.id, RATE, 180, [Q1, Q2]);
    expect(offerBefore(twice[0] as Service, Q2.id, [Q1, Q2])).toEqual({
      hours: 20,
      rate: 180,
    });
  });

  it("makes a DROP both measures null, and nothing else", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    expect(offerFrom(dropped[1] as Service, Q2.id, [Q2])).toBeNull();
    expect(offerBefore(dropped[1] as Service, Q2.id, [Q2])).toEqual({
      hours: 15,
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
    expect(offerFrom(back[1] as Service, Q2.id, [Q2])).toEqual({
      hours: 15,
      rate: 120,
    });
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
});

describe("the dials with no mutation", () => {
  it("puts prior and value on the same figure, so every delta is zero", () => {
    const pairs = pairsWithoutMutation(SERVICES);
    expect(pairs).toHaveLength(2);
    for (const pair of pairs) {
      expect(pair.measures[HOURS].prior).toBe(pair.measures[HOURS].value);
      expect(pair.measures[RATE].prior).toBe(pair.measures[RATE].value);
    }
  });

  it("reads the summary as annual revenue", () => {
    expect(annualOfPair(pairsWithoutMutation(SERVICES)[0]!)).toBe(156_000);
    expect(annualOfPair(pairsWithoutMutation(SERVICES)[1]!)).toBe(93_600);
  });

  it("reads a removed pair as zero rather than as arithmetic on an absence", () => {
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    const pair = pairsForMutation(dropped, Q2.id, [Q2])[1]!;
    expect(annualOfPair(pair)).toBe(0);
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

  it("gives a negotiated-nothing service the whole track as its range", () => {
    const { services } = addService(SERVICES, draft, Q2.id);
    expect(services[2]?.hoursRange).toEqual(HOURS_DOMAIN);
    expect(services[2]?.rateRange).toEqual(RATE_DOMAIN_PER_HOUR);
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

  it("makes the first change at the first free quarter", () => {
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

  it("opens every band at the span's left edge", () => {
    const series = workMixSeries(SERVICES, []);
    expect(map((one) => one.id, series)).toEqual(["service-a", "service-b"]);
    for (const one of series) {
      expect(timeOf(one.points[0]!.at)).toBe(START);
    }
    expect(series[0]?.points).toEqual([{ at: DOMAIN_START, value: 20 }]);
  });

  it("emits ONLY changes, and emits a drop to zero because that IS one", () => {
    const raised = withChange(SERVICES, "service-a", Q2.id, HOURS, 25, [Q2]);
    expect(hourPointsFor(raised[0] as Service, [Q2])).toEqual([
      { at: DOMAIN_START, value: 20 },
      { at: new Date("2025-04-01"), value: 25 },
    ]);
    // A rate-only change moves no hours, so the band emits no second point.
    const repriced = withChange(SERVICES, "service-a", Q2.id, RATE, 180, [Q2]);
    expect(hourPointsFor(repriced[0] as Service, [Q2])).toHaveLength(1);
    const dropped = withDrop(SERVICES, "service-b", Q2.id);
    expect(hourPointsFor(dropped[1] as Service, [Q2])).toEqual([
      { at: DOMAIN_START, value: 15 },
      { at: new Date("2025-04-01"), value: 0 },
    ]);
  });

  it("makes the top of the stack the total, under the default cap", () => {
    expect(totalHoursAt(SERVICES, START, [])).toBe(35);
    expect(totalHoursAt(SERVICES, START, [])).toBeLessThan(DEFAULT_WORK_CAP);
    // Both services at the top of their own ranges is 55 h/wk — over full time,
    // which is the reading the 40-hour rule exists to give, and still inside 80.
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
    expect(totalHoursAt(maxed, END, [Q1])).toBe(55);
    expect(totalHoursAt(maxed, END, [Q1])).toBeGreaterThan(FULL_TIME_HOURS);
    expect(totalHoursAt(maxed, END, [Q1])).toBeLessThanOrEqual(
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

  it("puts a moment at the span's edge and at every flag", () => {
    expect(momentsOf([Q2])).toEqual([START, new Date("2025-04-01").getTime()]);
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
    const fast = projectedBalances(committed, flat(120_000), 6);
    for (let index = 0; index <= 6; index += 1) {
      expect(slow[index]).toBe(committed[index]);
      expect(fast[index]).toBe(committed[index]);
    }
    // $120k/yr is $10k a month, so one month past the pivot is $10k above it.
    expect(fast[7]! - (committed[6] ?? 0)).toBeCloseTo(10_000, 6);
    expect(slow[7]).toBe(committed[6]);
  });

  // THE EQUIVALENCE. Integrating a FLAT rate in MONTHS reproduces the straight
  // slope `projectedBalances` drew before it integrated anything, and EXACTLY
  // rather than nearly: `monthsBetween` is integral on month boundaries and the
  // cell edges ARE month boundaries, so the sum of one-month stretches collapses
  // to `rate/12 × (m − now)`. Exact equality is the whole point — a
  // `toBeCloseTo` here would hide an integrator that drifts.
  it("integrated flat in MONTHS is the old straight slope, exactly", () => {
    const rate = 120_000;
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
  // 1/52 of the rate over each of them accrues slightly MORE than twelve
  // twelfths. The model says the same thing about the gauge's own weight (a
  // change on 1 April is 0.75 of the year in months and 0.7534 in weeks): the
  // unit is a statement about what the reader counts, not a correction.
  it("integrated flat in WEEKS differs by the calendar, not by an error", () => {
    const rate = 120_000;
    const inMonths = accruedOver(START, END, [], () => rate, "month");
    const inWeeks = accruedOver(START, END, [], () => rate, "week");
    expect(inMonths).toBeCloseTo(rate, 6);
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
        annual: annualOfPair(pair),
      }),
      pairsWithoutMutation(SERVICES),
    );
    expect(dials).toEqual([
      { service: "Service A", hours: 20, rate: 150, annual: 156_000 },
      { service: "Service B", hours: 15, rate: 120, annual: 93_600 },
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
    expect(slots[0]).toBe(START);
    expect(new Date(slots[52]!).toISOString().slice(0, 10)).toBe("2025-12-29");
    // BOTH ENDS OF THE SPAN READ W01, and that is ISO-8601 rather than a bug:
    // a week belongs to the year of its THURSDAY, and 2025-12-29's Thursday is
    // 2026-01-01. The chips stay unique because the date differs, so the
    // control stays operable — do NOT "fix" this into W53.
    expect(weekLabel(new Date(slots[0]!))).toBe("W01 \u00b7 Jan 1");
    expect(weekLabel(new Date(slots[52]!))).toBe("W01 \u00b7 Dec 29");
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

// ── Weekly seasonality ───────────────────────────────────────────────────────

describe("weekly seasonality is representable", () => {
  /** Four consecutive weeks from the span's start, on the board's own grid. */
  const WEEKS = map(
    (iso: string) => ({ id: `w-${iso}`, at: new Date(iso), label: "" }),
    ["2025-01-01", "2025-01-06", "2025-01-13", "2025-01-20"],
  ) as Mutation[];

  /** Service A's hours alternating 30 / 10 week to week; B untouched. */
  const alternating = (): Service[] =>
    map((service: Service, index: number) => {
      if (index !== 0) return service;
      const changes: Record<string, { hours: number; rate: number }> = {};
      for (const [step, week] of WEEKS.entries()) {
        changes[week.id] = {
          hours: step % 2 === 0 ? 30 : 10,
          rate: service.committed?.rate ?? 0,
        };
      }
      return { ...service, changes: { ...service.changes, ...changes } };
    }, SERVICES);

  /** The same four weeks, every one of them at `hours`. */
  const flatAt = (hours: number): Service[] =>
    map((service: Service, index: number) => {
      if (index !== 0) return service;
      const changes: Record<string, { hours: number; rate: number }> = {};
      for (const week of WEEKS) {
        changes[week.id] = { hours, rate: service.committed?.rate ?? 0 };
      }
      return { ...service, changes: { ...service.changes, ...changes } };
    }, SERVICES);

  it("samples the rate at EACH week, not once for the month", () => {
    const services = alternating();
    const sampled = map(
      (week: Mutation) => rateAt(timeOf(week.at), WEEKS, services),
      WEEKS,
    );
    // Two distinct readings, alternating — which is the whole of "the model
    // can hold week-to-week variation".
    expect(new Set(sampled).size).toBe(2);
    expect(sampled[0]).toBe(sampled[2]);
    expect(sampled[1]).toBe(sampled[3]);
    expect(sampled[0]).toBeGreaterThan(sampled[1]!);
  });

  it("weights each week's own rate into the composite", () => {
    const services = alternating();
    // One week at a time: the average over a single week IS that week's rate.
    for (const [step, week] of WEEKS.entries()) {
      const next = WEEKS[step + 1];
      if (next === undefined) continue;
      const only = averageRateOver(
        timeOf(week.at),
        timeOf(next.at),
        map((w: Mutation) => timeOf(w.at), WEEKS),
        (time: number) => revenueAt(services, time, WEEKS),
        "week",
      );
      expect(only).toBe(rateAt(timeOf(week.at), WEEKS, services));
    }
    // And over the whole year the alternating scenario sits strictly between
    // the two flat ones it alternates between.
    const swung = averageRate(TIME_DOMAIN, WEEKS, services);
    const high = averageRate(TIME_DOMAIN, WEEKS, flatAt(30));
    const low = averageRate(TIME_DOMAIN, WEEKS, flatAt(10));
    expect(swung).toBeLessThan(high);
    expect(swung).toBeGreaterThan(low);
    expect(rateFromRevenue(0)).toBeLessThan(high);
  });

  // THE GAP, now CLOSED (Peter's ruling, 2026-09-17). It used to read "does
  // NOT reach the balance chart, which projects one flat slope", and pinned the
  // scalar-rate limitation: whatever the weeks did, one rate times the elapsed
  // months drew one straight line. The prediction in that note held — the cells
  // being monthly was never the limitation, and no chart contract had to change
  // (`CashflowScrubChart` takes pre-computed `balanceCents` per cell, so this is
  // arithmetic on the bench side of the wire). `projectedBalances` now takes a
  // `RateSampling` and integrates it, and these are the tests of that.
  const committed = runningBalances(MONTHLY_NET, OPENING_BALANCE);
  const BOUNDARIES = monthStarts(DOMAIN_START, committed.length);

  /** The board's own sampling: `rateAt` at every change, summed in WEEKS. */
  const samplingFor = (services: readonly Service[]): RateSampling => ({
    boundaries: BOUNDARIES,
    rate: (time: number) => rateAt(time, WEEKS, services),
    moments: map((week: Mutation) => timeOf(week.at), WEEKS),
    unit: "week",
  });

  it("REACHES the balance chart: the monthly deltas differ", () => {
    const projected = projectedBalances(
      committed,
      samplingFor(alternating()),
      0,
    );
    const deltas = map(
      (balance: number, index: number) =>
        index === 0 ? 0 : balance - (projected[index - 1] ?? 0),
      projected,
    ).slice(1);
    // The alternation lands inside JANUARY — four weekly changes from the
    // span's start — so the first month's delta is the mixed one and every
    // later month runs at the last change's rate. Two distinct deltas is
    // therefore exactly what the fixture should produce, and ONE (what the old
    // scalar projection gave for every scenario) is what it must not.
    const distinct = new Set(map((d: number) => Math.round(d), deltas));
    expect(distinct.size).toBeGreaterThan(1);
    // WHAT THE FLAT SCENARIO DOES, and it is not "one delta": summed in WEEKS,
    // a 31-day month accrues more than a 28-day one, so its monthly steps differ
    // too. That is the calendar being counted honestly rather than seasonality,
    // and the two are told apart by DIVIDING each step by the weeks in its own
    // month — flat, that quotient is one constant; alternating, it is not.
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
    const level = projectedBalances(committed, samplingFor(flatAt(30)), 0);
    expect(new Set(perWeek(level)).size).toBe(1);
    expect(new Set(perWeek(projected)).size).toBeGreaterThan(1);
  });

  it("ends the year on the closed form, week by week", () => {
    const services = alternating();
    const projected = projectedBalances(committed, samplingFor(services), 0);
    // THE CLOSED FORM, restated independently: Σ over each stretch between
    // changes of that stretch's weeks × the rate in force × 1/52. The middle
    // two stretches are exactly one week each (Jan 6 → 13 → 20, Mondays), so
    // those terms ARE `rateAt(week) / 52` — Peter's sum verbatim. The first is
    // the five days from Wednesday 1 January to Monday 6 January and the last
    // runs to the end of the span, and the edge walk weighs both by the
    // fraction of a week they hold rather than rounding them onto a sample.
    const rateOf = (iso: string): number =>
      rateAt(new Date(iso).getTime(), WEEKS, services);
    const stretch = (from: string, to: string): number =>
      (weeksBetween(new Date(from).getTime(), new Date(to).getTime()) *
        rateOf(from)) /
      52;
    const closedForm =
      stretch("2025-01-01", "2025-01-06") +
      stretch("2025-01-06", "2025-01-13") +
      stretch("2025-01-13", "2025-01-20") +
      stretch("2025-01-20", "2026-01-01");
    expect(projected[projected.length - 1]! - (committed[0] ?? 0)).toBeCloseTo(
      closedForm,
      6,
    );
    // And the alternation is worth strictly less than four weeks at 30 hours
    // and strictly more than four at 10 — the seasonality is IN the number.
    const high = projectedBalances(committed, samplingFor(flatAt(30)), 0);
    const low = projectedBalances(committed, samplingFor(flatAt(10)), 0);
    expect(projected[projected.length - 1]!).toBeLessThan(
      high[high.length - 1]!,
    );
    expect(projected[projected.length - 1]!).toBeGreaterThan(
      low[low.length - 1]!,
    );
  });

  it("carries the bend into the FAN, which is an offset from the line", () => {
    // The board draws the fan as `cell.balanceCents + sign × fanAt(index,
    // nowIndex)` (`fanSeries` in `hourly-board.tsx`), so it integrates by
    // construction — the same balance with a width added. Asserting the
    // RELATIONSHIP rather than building a second integration is the point: a
    // parallel computation could drift from the line it is drawn around.
    const projected = projectedBalances(
      committed,
      samplingFor(alternating()),
      0,
    );
    const optimistic = map(
      (balance: number, index: number) => balance + fanAt(index, 0),
      projected,
    );
    for (const [index, balance] of projected.entries()) {
      expect(optimistic[index]! - balance).toBeCloseTo(fanAt(index, 0), 6);
    }
    // The fan's own month-on-month steps differ too, because the line's do.
    const deltas = map(
      (balance: number, index: number) =>
        index === 0 ? 0 : balance - (optimistic[index - 1] ?? 0),
      optimistic,
    ).slice(1);
    expect(
      new Set(map((d: number) => Math.round(d), deltas)).size,
    ).toBeGreaterThan(1);
  });

  // WHICH INSTANT "NOW" IS, stated rather than implied — the one thing the
  // exact-equality test above is structurally blind to, because under a FLAT
  // rate any consistent window start gives the same span.
  //
  // The integral runs from the PIVOT CELL'S START, which is the window the
  // scalar version used too (`committed[nowIndex]` already holds that month's
  // net flow, and the old line added `rate/12 × 1` on top of it for the next
  // cell). What CHANGED is the sampling inside that first month: the old line
  // charged the whole of it at the post-change rate, and the integral splits it
  // at the change's own moment. So a change made LATE in its month moves the
  // first projected step less than it used to and every step after it exactly
  // as much — which is the change being honest about a date it previously
  // rounded, and it is the one visible difference for a flat scenario too.
  it("runs its window from the PIVOT CELL'S START, splitting at the change", () => {
    const W14: Mutation = { id: "w14", at: new Date("2025-03-31"), label: "1" };
    const W27: Mutation = { id: "w27", at: new Date("2025-06-30"), label: "2" };
    const twoWeeks = [W14, W27];
    const services = withChange(
      withChange(SERVICES, "service-a", W14.id, HOURS, 30, twoWeeks),
      "service-a",
      W27.id,
      HOURS,
      10,
      twoWeeks,
    );
    const sampling: RateSampling = {
      boundaries: BOUNDARIES,
      rate: (time: number) => rateAt(time, twoWeeks, services),
      moments: map((mutation: Mutation) => timeOf(mutation.at), twoWeeks),
      unit: "week",
    };
    // March is the pivot cell — `W14` falls on its last day.
    const projected = projectedBalances(committed, sampling, 2);
    const marchStart = new Date("2025-03-01").getTime();
    const changeAt = timeOf(W14.at);
    const aprilStart = new Date("2025-04-01").getTime();
    const before = rateAt(marchStart, twoWeeks, services);
    const after = rateAt(changeAt, twoWeeks, services);
    expect(after).toBeGreaterThan(before);
    // The first projected step is the two stretches either side of the change,
    // NOT one month at the new rate — thirty of March's thirty-one days still
    // run at the old one.
    const firstStep =
      (weeksBetween(marchStart, changeAt) * before) / 52 +
      (weeksBetween(changeAt, aprilStart) * after) / 52;
    expect(projected[3]! - (committed[2] ?? 0)).toBeCloseTo(firstStep, 6);
    // And it is strictly smaller than the step after it, which runs the whole
    // month at the new rate. The old scalar line made the two equal.
    expect(projected[3]! - (committed[2] ?? 0)).toBeLessThan(
      projected[4]! - projected[3]!,
    );
  });

  it("prints the sampled rate per cell in the DEBUG table", () => {
    const rows = projectionTable(committed, samplingFor(alternating()), 0);
    expect(rows).toHaveLength(committed.length);
    expect(rows[0]?.month).toBe("2025-01");
    // The per-cell PROJECTED RATE — the number that did not exist while the
    // projection took one scalar. January's sample is the Jan 1 change's rate.
    expect(rows[0]?.projectedRate).toBe(
      Math.round(rateAt(START, WEEKS, alternating())),
    );
    expect(map((row) => row.part, rows)[0]).toBe("committed");
    expect(map((row) => row.part, rows)[1]).toBe("projected");
  });
});

// ── A week is 1/52 of the x-domain ───────────────────────────────────────────

describe("two weekly changes inside one transition", () => {
  const PLOT_WIDTH = 640;

  it("crowd, so the mark's existing shortening is always in play", () => {
    const perWeek = PLOT_WIDTH / weeksBetween(START, END);
    // 12.3px of plot per week against a 28px full transition: adjacent weekly
    // changes are ALWAYS closer together than a full transition apart, so the
    // shortening is the normal case here rather than an edge one.
    expect(perWeek).toBeCloseTo(12.27, 1);
    expect(transitionWidth(PLOT_WIDTH)).toBe(28);
    expect(perWeek).toBeLessThan(transitionWidth(PLOT_WIDTH));
  });

  it("still read as two changes — three stretches, no collapse", () => {
    const weeks: Mutation[] = map(
      (iso: string) => ({ id: `w-${iso}`, at: new Date(iso), label: "" }),
      ["2025-04-07", "2025-04-14"],
    );
    const services = map((service: Service, index: number) => {
      if (index !== 0) return service;
      return {
        ...service,
        changes: {
          [weeks[0]!.id]: { hours: 30, rate: service.committed?.rate ?? 0 },
          [weeks[1]!.id]: { hours: 10, rate: service.committed?.rate ?? 0 },
        },
      };
    }, SERVICES);
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
      workMixSeries(services, weeks),
    );
    const geometry = buildStackedArea(
      series,
      (v: number) => ((v - START) / (END - START)) * PLOT_WIDTH,
      (v: number) => 200 - (v / 80) * 200,
      [START, END],
    );
    // Opening stretch, the 30h week, the 10h week.
    expect(geometry.segments).toHaveLength(3);
    expect(geometry.transition).toBe(28);
    for (const band of geometry.bands) {
      expect(band.path).not.toContain("NaN");
    }
  });
});
