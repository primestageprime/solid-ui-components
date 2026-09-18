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
import type { Mutation } from "../../../src";
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
  averageRate,
  bandOfRate,
  canAdd,
  ensureMutation,
  hourPointsFor,
  isDirty,
  isSoldAt,
  maxReachableRate,
  minReachableRate,
  momentsOf,
  monthsBetween,
  nextFreeSlot,
  offerAt,
  offerBefore,
  offerFrom,
  pairsForMutation,
  pairsWithoutMutation,
  pinnedCeiling,
  projectedBalances,
  quarterLabelOf,
  quarterTicks,
  rateAt,
  rateBandTable,
  rateFromRevenue,
  removeMutation,
  revenueAt,
  runningBalances,
  scenarioDigest,
  totalHoursAt,
  weightFrom,
  weightToReach,
  withChange,
  withDrop,
  withoutChange,
  workMixSeries,
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

  it("holds the whole reachable range inside the gauge's domain", () => {
    // RateGauge CLAMPS value to its domain and announces the DRAWN figure, so
    // a reachable reading outside the domain makes the dial contradict the
    // table in front of the reader.
    expect(minReachableRate()).toBe(-FIXED_ANNUAL_COST);
    expect(minReachableRate()).toBeGreaterThanOrEqual(RATE_DOMAIN[0]);
    expect(maxReachableRate(SERVICES)).toBe(340_000);
    expect(maxReachableRate(SERVICES)).toBeLessThanOrEqual(RATE_DOMAIN[1]);
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
    const average = averageRate(TIME_DOMAIN, [Q2], floored);
    expect(average).toBeCloseTo(69_600 + 0.75 * -83_200, 6);
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

  it("runs the committed flows forward from the opening balance", () => {
    expect(committed[0]).toBe(OPENING_BALANCE + (MONTHLY_NET[0] ?? 0));
    expect(committed).toHaveLength(MONTHLY_NET.length);
  });

  it("pivots about NOW and leaves the past alone", () => {
    const slow = projectedBalances(committed, 0, 6);
    const fast = projectedBalances(committed, 120_000, 6);
    for (let index = 0; index <= 6; index += 1) {
      expect(slow[index]).toBe(committed[index]);
      expect(fast[index]).toBe(committed[index]);
    }
    // $120k/yr is $10k a month, so one month past the pivot is $10k above it.
    expect(fast[7]! - (committed[6] ?? 0)).toBeCloseTo(10_000, 6);
    expect(slow[7]).toBe(committed[6]);
  });

  it("pins the ceiling above anything the dials can reach", () => {
    const ceiling = pinnedCeiling(
      committed,
      maxReachableRate(SERVICES),
      (months) => months * months * 200,
    );
    const steepest = projectedBalances(
      committed,
      maxReachableRate(SERVICES),
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
