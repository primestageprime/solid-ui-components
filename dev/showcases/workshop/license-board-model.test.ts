/**
 * License Board — the model's claims, asserted without a browser.
 *
 * The bench is four readings of one scenario, so what this file pins is that
 * they are readings of the SAME scenario: the calibration table the header
 * states, the collapse that makes it solvable, the coupling between the fee and
 * the annual price, the history walk every figure is built on, the invariant
 * that the two dial rows are one product list, and the projection integral the
 * balance line draws.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../src/fn";
import { timeOf } from "../../../src";
import type { Mutation } from "../../../src";
import {
  ANNUAL_FIELDS,
  BREAKEVEN_MRR,
  COMFORTABLE,
  COMMITTED_RATE,
  DEFAULT_MRR_CAP,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FEE_DOMAIN,
  FIXED_MONTHLY_COST,
  LICENSE_DOMAIN,
  MIN_MRR_CAP,
  MONTHLY_FIELDS,
  MONTHLY_NET,
  MONTHS_PER_YEAR,
  MONTH_COUNT,
  MONTH_SLOTS,
  OPENING_BALANCE,
  PCT_DOMAIN,
  PRODUCTS,
  RATE_DOMAIN,
  SEED_MUTATIONS,
  TIME_DOMAIN,
  accruedOver,
  addMutation,
  addProduct,
  addedAt,
  annualPairs,
  annualPriceOf,
  averageRate,
  bandOfRate,
  billingTable,
  byVariability,
  canAdd,
  drawnRate,
  ensureMutation,
  hasAnyChange,
  isDirty,
  isOffDial,
  isSoldAt,
  licenseMixSeries,
  maxReachableRate,
  minReachableRate,
  momentsOf,
  monthOfPick,
  monthRangeOf,
  monthStarts,
  monthlyOf,
  monthlyPairs,
  mrrAt,
  nearestMutation,
  peakMonth,
  pinnedCeiling,
  planAt,
  planBefore,
  planFrom,
  projectedBalances,
  projectionTable,
  rateAt,
  rateBandTable,
  rateFromMrr,
  removeMutation,
  runningBalances,
  scenarioDigest,
  segmentLabelsOf,
  shownPlanOf,
  stackOrderTable,
  uniqueId,
  variabilityOf,
  weightFrom,
  weightToReach,
  withChange,
  withDiscontinue,
  withoutChange,
  type Product,
} from "./license-board-model";
import {
  againstBreakeven,
  dollarsPerMonth,
  formatFee,
  formatLicenses,
  revenueShift,
  signedDollarsPerMonth,
} from "./license-board-money";

const JAN = DOMAIN_START.getTime();
const at = (iso: string): number => new Date(iso).getTime();

/** A one-mutation scenario, for the walks that need a flag to edit. */
const oneChange = (iso = "2025-07-01"): Mutation[] =>
  addMutation([], new Date(iso)).mutations;

/** The two fields each row's measure 0 and measure 1 write. */
const MO_COUNT = MONTHLY_FIELDS[0];
const MO_FEE = MONTHLY_FIELDS[1];
const YR_COUNT = ANNUAL_FIELDS[0];
const YR_PCT = ANNUAL_FIELDS[1];

describe("the span and its month grid", () => {
  it("holds twelve month slots, the first being the span's own start", () => {
    expect(MONTH_COUNT).toBe(12);
    expect(MONTH_SLOTS[0]).toBe(JAN);
    expect(MONTH_SLOTS[11]).toBe(at("2025-12-01"));
  });

  it("snaps a pick to the first of its month", () => {
    expect(monthOfPick(new Date("2025-08-19")).getTime()).toBe(at("2025-08-01"));
    // Before the span opens, the clamp holds the pick at the span's start.
    expect(monthOfPick(new Date("2024-11-20")).getTime()).toBe(JAN);
  });

  it("reads a month back as its own first and last day", () => {
    expect(monthRangeOf(at("2025-08-19")).label).toBe(
      "2025-08-01 to 2025-08-31",
    );
    // December is cut at the span's end rather than running into January.
    expect(monthRangeOf(at("2025-12-15")).label).toBe(
      "2025-12-01 to 2025-12-31",
    );
  });

  it("samples every month, plus any flag that is not on the grid", () => {
    expect(momentsOf([]).length).toBe(MONTH_COUNT);
    const offGrid: Mutation[] = [
      { id: "x", at: new Date("2025-08-19"), label: "1" },
    ];
    expect(momentsOf(offGrid).length).toBe(MONTH_COUNT + 1);
    expect(momentsOf(offGrid)).toContain(at("2025-08-19"));
  });

  it("puts a first change in January, so it is in force all year", () => {
    const ensured = ensureMutation(
      { mutations: [], selected: null },
      JAN,
      DOMAIN_END.getTime(),
    );
    expect(ensured.created).toBe(true);
    const [first] = ensured.mutations;
    expect(first === undefined ? 0 : timeOf(first.at)).toBe(JAN);
    expect(weightFrom(JAN, DOMAIN_END.getTime(), JAN)).toBe(1);
  });

  it("labels its chips by month, always suffixed", () => {
    const labels = map(
      (segment) => segment.label,
      segmentLabelsOf([
        { id: "a", at: new Date("2025-01-01"), label: "1" },
        { id: "b", at: new Date("2025-02-01"), label: "2" },
        { id: "c", at: new Date("2025-08-01"), label: "3" },
      ]),
    );
    // Two chips inside one quarter and one alone: the format does not change.
    expect(labels).toEqual(["2025-Q1 · Jan", "2025-Q1 · Feb", "2025-Q3 · Aug"]);
  });

  it("labels a LONE chip the same way — the format never changes shape", () => {
    const [only] = segmentLabelsOf([
      { id: "a", at: new Date("2025-05-01"), label: "1" },
    ]);
    expect(only?.label).toBe("2025-Q2 · May");
    expect(only?.month).toBe("2025-05");
  });
});

describe("the opening fixture", () => {
  it("is three products, flat, with no changes at all", () => {
    expect(SEED_MUTATIONS).toEqual([]);
    expect(hasAnyChange(PRODUCTS)).toBe(false);
    expect(map((product) => product.label, PRODUCTS)).toEqual([
      "Starter",
      "Team",
      "Enterprise",
    ]);
  });

  it("bills 2,565 + 3,062.50 + 2,720 = $8,347.50 a month", () => {
    const monthly = map(
      (product: Product) => monthlyOf(planAt(product, JAN, [])),
      PRODUCTS,
    );
    expect(monthly).toEqual([2_565, 3_062.5, 2_720]);
    expect(mrrAt(PRODUCTS, JAN, [])).toBe(8_347.5);
  });

  it("counts an annual licence at fee × pct a month, NOT at fee", () => {
    const plan = planAt(PRODUCTS[0] as Product, JAN, []);
    // 120 monthly seats at $15, plus 60 annual ones at 85% of $15.
    expect(120 * 15).toBe(1_800);
    expect(60 * 15 * 0.85).toBe(765);
    expect(monthlyOf(plan)).toBe(2_565);
  });

  it("prices an annual licence at fee × 12 × pct a YEAR", () => {
    const starter = planAt(PRODUCTS[0] as Product, JAN, []);
    expect(annualPriceOf(starter as NonNullable<typeof starter>)).toBe(153);
    // The header's own worked example: $1,000/mo at 90% is $10,800/yr.
    expect(
      annualPriceOf({
        monthlyLicenses: 0,
        fee: 1_000,
        annualLicenses: 1,
        annualPct: 90,
      }),
    ).toBe(10_800);
    expect(MONTHS_PER_YEAR).toBe(12);
  });

  it("bills the same in EVERY month — the flat schedule the header claims", () => {
    const rows = billingTable(PRODUCTS, []);
    expect(rows.length).toBe(12);
    expect(new Set(map((row) => row.mrr, rows))).toEqual(new Set([8_347.5]));
    expect(rows[0]?.label).toBe("2025-01");
    expect(rows[0]?.monthly).toEqual([120, 40, 2]);
    expect(rows[0]?.annual).toEqual([60, 25, 6]);
    expect(rows[0]?.breakeven).toBe("over");
  });

  it("keeps every product's allowance inside the shared tracks", () => {
    for (const product of PRODUCTS) {
      expect(product.monthlyRange[1]).toBeLessThanOrEqual(LICENSE_DOMAIN[1]);
      expect(product.annualRange[1]).toBeLessThanOrEqual(LICENSE_DOMAIN[1]);
      expect(product.feeRange[0]).toBeGreaterThanOrEqual(FEE_DOMAIN[0]);
      expect(product.feeRange[1]).toBeLessThanOrEqual(FEE_DOMAIN[1]);
      expect(product.pctRange[0]).toBeGreaterThanOrEqual(PCT_DOMAIN[0]);
      expect(product.pctRange[1]).toBeLessThanOrEqual(PCT_DOMAIN[1]);
    }
  });

  it("peaks nowhere in particular, because nothing moves", () => {
    expect(peakMonth(PRODUCTS, []).mrr).toBe(8_347.5);
  });
});

describe("the time-weighted average collapses on a flat schedule", () => {
  it("reads exactly MRR less the fixed cost", () => {
    expect(averageRate(TIME_DOMAIN, [], PRODUCTS)).toBe(rateFromMrr(8_347.5));
    expect(COMMITTED_RATE).toBe(1_747.5);
  });

  it("is the SAME call the gauge makes, so the opening delta is zero", () => {
    const gauge = averageRate(TIME_DOMAIN, SEED_MUTATIONS, PRODUCTS);
    expect(gauge - COMMITTED_RATE).toBe(0);
    expect(revenueShift(gauge - COMMITTED_RATE)).toBe("no change to revenue");
  });

  it("stops being a constant the moment a change is made", () => {
    const mutations = oneChange("2025-07-01");
    const [flag] = mutations;
    const cut = withChange(
      PRODUCTS,
      "team",
      flag?.id ?? "",
      MO_FEE,
      29,
      mutations,
    );
    const average = averageRate(TIME_DOMAIN, mutations, cut);
    // Half a year at $1,747.50 and half at $497.50 — between the two.
    expect(average).toBeLessThan(COMMITTED_RATE);
    expect(average).toBeGreaterThan(497.5);
    expect(Math.round(average)).toBe(1_123);
  });
});

describe("the calibration — the four inequalities, solved", () => {
  const rows = rateBandTable();

  it("prints exactly the header's table", () => {
    expect(rows).toEqual([
      { scenario: "as it opens", mrr: 8_347.5, rate: 1_747.5, band: "green" },
      {
        scenario: "Starter +50 monthly licences",
        mrr: 9_097.5,
        rate: 2_497.5,
        band: "green",
      },
      {
        scenario: "Team's fee at its floor",
        mrr: 7_097.5,
        rate: 497.5,
        band: "yellow",
      },
      {
        scenario: "Team AND Enterprise at their fee floors",
        mrr: 6_077.5,
        rate: -522.5,
        band: "red",
      },
    ]);
  });

  it("satisfies the four inequalities the constants were solved from", () => {
    const [opens, more, team, both] = rows;
    expect(opens?.rate).toBeGreaterThanOrEqual(COMFORTABLE);
    expect(team?.rate).toBeGreaterThan(0);
    expect(team?.rate).toBeLessThan(COMFORTABLE);
    expect(both?.rate).toBeLessThan(0);
    // Row 2 constrains nothing; it catches a sign error instead.
    expect(more?.rate).toBeGreaterThan(opens?.rate ?? 0);
  });

  it("places FIXED and COMFORTABLE inside the intervals the rows leave", () => {
    const [opens, , team, both] = rows;
    // FIXED ∈ (MRRboth, MRRteam) = (6077.5, 7097.5); 6600 is its midpoint to 100.
    expect(FIXED_MONTHLY_COST).toBeGreaterThan(both?.mrr ?? 0);
    expect(FIXED_MONTHLY_COST).toBeLessThan(team?.mrr ?? 0);
    // COMFORTABLE ∈ (rate@team, rate@opens] = (497.5, 1747.5].
    expect(COMFORTABLE).toBeGreaterThan(team?.rate ?? 0);
    expect(COMFORTABLE).toBeLessThanOrEqual(opens?.rate ?? 0);
  });

  it("cuts a fee TWICE over, which is why two floors reach red", () => {
    // Team's $49 → $29 costs 40 monthly seats × $20 AND 25 annual ones ×
    // $20 × 0.9. A board that priced annual seats independently would need a
    // deeper cut to cross zero.
    expect(40 * 20).toBe(800);
    expect(25 * 20 * 0.9).toBe(450);
    expect((rows[0]?.mrr ?? 0) - (rows[2]?.mrr ?? 0)).toBe(1_250);
  });

  it("bands a rate the way the gauge's own split does", () => {
    expect(bandOfRate(-1)).toBe("red");
    expect(bandOfRate(0)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE - 1)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE)).toBe("green");
  });
});

describe("the gauge's domain", () => {
  it("floors at exactly the fixed cost — nothing can go below it", () => {
    expect(minReachableRate()).toBe(-FIXED_MONTHLY_COST);
    expect(RATE_DOMAIN[0]).toBe(minReachableRate());
  });

  it("does NOT cover every dial at maximum, and says so through the clamp", () => {
    expect(maxReachableRate(PRODUCTS)).toBe(52_500 - FIXED_MONTHLY_COST);
    expect(maxReachableRate(PRODUCTS)).toBeGreaterThan(RATE_DOMAIN[1]);
    expect(isOffDial(maxReachableRate(PRODUCTS))).toBe(true);
    expect(drawnRate(maxReachableRate(PRODUCTS))).toBe(RATE_DOMAIN[1]);
  });

  it("DOES cover the growth story it was sized for: counts at ceiling", () => {
    // Every count at its allowance ceiling, on the CURRENT fee and percentage.
    const growth = rateFromMrr(
      300 * 15 +
        200 * 15 * 0.85 +
        (120 * 49 + 80 * 49 * 0.9) +
        (20 * 400 + 20 * 400 * 0.8),
    );
    expect(growth).toBe(24_258);
    expect(isOffDial(growth)).toBe(false);
    expect(RATE_DOMAIN[1]).toBeGreaterThanOrEqual(growth);
  });

  it("holds the board's opening reading comfortably inside itself", () => {
    expect(isOffDial(COMMITTED_RATE)).toBe(false);
  });
});

describe("the y cap contains the rule it has to draw", () => {
  it("never sits below breakeven", () => {
    expect(BREAKEVEN_MRR).toBe(FIXED_MONTHLY_COST);
    expect(MIN_MRR_CAP).toBe(BREAKEVEN_MRR);
    expect(DEFAULT_MRR_CAP).toBeGreaterThan(MIN_MRR_CAP);
  });

  it("seats the opening stack around half the plot", () => {
    const top = mrrAt(PRODUCTS, JAN, []);
    expect(top / DEFAULT_MRR_CAP).toBeGreaterThan(0.4);
    expect(top / DEFAULT_MRR_CAP).toBeLessThan(0.6);
  });
});

describe("the history walk", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";

  it("reads a change as an ABSOLUTE plan holding until the next", () => {
    const raised = withChange(
      PRODUCTS,
      "starter",
      flag,
      MO_COUNT,
      200,
      mutations,
    );
    const starter = raised[0] as Product;
    expect(planAt(starter, at("2025-06-01"), mutations)?.monthlyLicenses).toBe(
      120,
    );
    expect(planAt(starter, at("2025-07-01"), mutations)?.monthlyLicenses).toBe(
      200,
    );
    // The three fields it did not touch are carried forward, not reset.
    const later = planAt(starter, at("2025-12-01"), mutations);
    expect(later?.monthlyLicenses).toBe(200);
    expect(later?.fee).toBe(15);
    expect(later?.annualLicenses).toBe(60);
    expect(later?.annualPct).toBe(85);
  });

  it("writes each row's measure into its OWN field", () => {
    const moved = withChange(PRODUCTS, "team", flag, YR_PCT, 75, mutations);
    const after = planAt(moved[1] as Product, at("2025-08-01"), mutations);
    expect(after?.annualPct).toBe(75);
    // The Monthly row's measure 1 is a FEE and must be untouched by it.
    expect(after?.fee).toBe(49);
  });

  it("clamps every measure into the product's own allowance", () => {
    const over = withChange(
      PRODUCTS,
      "enterprise",
      flag,
      MO_COUNT,
      500,
      mutations,
    );
    expect(
      planAt(over[2] as Product, at("2025-08-01"), mutations)?.monthlyLicenses,
    ).toBe(20);
    const cheap = withChange(PRODUCTS, "team", flag, YR_PCT, 10, mutations);
    expect(
      planAt(cheap[1] as Product, at("2025-08-01"), mutations)?.annualPct,
    ).toBe(70);
  });

  it("discontinues a product to ABSENCE, not to zero", () => {
    const gone = withDiscontinue(PRODUCTS, "team", flag);
    const team = gone[1] as Product;
    expect(planAt(team, at("2025-06-01"), mutations)?.monthlyLicenses).toBe(40);
    expect(planAt(team, at("2025-08-01"), mutations)).toBeNull();
    expect(mrrAt(gone, at("2025-08-01"), mutations)).toBe(8_347.5 - 3_062.5);
  });

  it("hides a discontinued product at LATER dates and shows it at its own", () => {
    const later = addMutation(mutations, new Date("2025-10-01")).mutations;
    const second = later[1]?.id ?? "";
    const gone = withDiscontinue(PRODUCTS, "team", flag);
    const team = gone[1] as Product;
    expect(
      isSoldAt(planBefore(team, flag, later), planFrom(team, flag, later)),
    ).toBe(true);
    expect(
      isSoldAt(planBefore(team, second, later), planFrom(team, second, later)),
    ).toBe(false);
  });

  it("relaunches by DELETING the change, not by inventing a plan", () => {
    const gone = withDiscontinue(PRODUCTS, "team", flag);
    const back = withoutChange(gone, "team", flag);
    expect((back[1] as Product).changes).toEqual({});
    expect(planAt(back[1] as Product, at("2025-08-01"), mutations)?.fee).toBe(
      49,
    );
  });
});

describe("the two dial rows are ONE product list", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";

  it("lists the same products, in the same order, on both rows", () => {
    const monthly = monthlyPairs(PRODUCTS, flag, mutations);
    const annual = annualPairs(PRODUCTS, flag, mutations);
    expect(map((pair) => pair.id, monthly)).toEqual(
      map((pair) => pair.id, annual),
    );
    expect(map((pair) => pair.id, monthly)).toEqual([
      "starter",
      "team",
      "enterprise",
    ]);
  });

  it("drops a discontinued product from BOTH rows at a later date", () => {
    const later = addMutation(mutations, new Date("2025-10-01")).mutations;
    const second = later[1]?.id ?? "";
    const gone = withDiscontinue(PRODUCTS, "team", flag);
    expect(map((pair) => pair.id, monthlyPairs(gone, second, later))).toEqual([
      "starter",
      "enterprise",
    ]);
    expect(map((pair) => pair.id, annualPairs(gone, second, later))).toEqual([
      "starter",
      "enterprise",
    ]);
  });

  it("gives each row its OWN two measures and ranges", () => {
    const [starterMonthly] = monthlyPairs(PRODUCTS, flag, mutations);
    const [starterAnnual] = annualPairs(PRODUCTS, flag, mutations);
    expect(starterMonthly?.measures[0].value).toBe(120);
    expect(starterMonthly?.measures[1].value).toBe(15);
    expect(starterAnnual?.measures[0].value).toBe(60);
    expect(starterAnnual?.measures[1].value).toBe(85);
    // Measure 1's range is a FEE band on one row and a PERCENTAGE band on the
    // other — the reason a bare measure index is never handed to the model.
    expect(starterMonthly?.measures[1].range).toEqual([9, 25]);
    expect(starterAnnual?.measures[1].range).toEqual([70, 100]);
  });

  it("shows prior === value when there is no change to show", () => {
    for (const pair of [
      ...monthlyPairs(PRODUCTS, null, []),
      ...annualPairs(PRODUCTS, null, []),
    ]) {
      expect(pair.measures[0].prior).toBe(pair.measures[0].value);
      expect(pair.measures[1].prior).toBe(pair.measures[1].value);
    }
  });

  it("answers BOTH rows' summaries from one plan, looked up by id", () => {
    const plan = shownPlanOf(PRODUCTS, "team", null, []);
    expect(plan).not.toBeNull();
    expect(monthlyOf(plan)).toBe(3_062.5);
    expect(annualPriceOf(plan as NonNullable<typeof plan>)).toBe(529.2);
    // A product not on the books reads null, which is the empty summary line.
    expect(shownPlanOf(PRODUCTS, "nope", null, [])).toBeNull();
  });
});

describe("launching and deleting", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";
  const PRO = {
    name: "Pro",
    monthlyLicenses: 25,
    fee: 99,
    annualLicenses: 10,
    annualPct: 80,
  };

  it("refuses a draft with no name, and accepts one with figures in track", () => {
    expect(canAdd(EMPTY_DRAFT)).toBe(false);
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro" })).toBe(true);
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", fee: 601 })).toBe(false);
    // The percentage track starts at 50, so 20% is not a figure the dial admits.
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", annualPct: 20 })).toBe(false);
  });

  it("gives a stable id from the name", () => {
    expect(uniqueId("Pro Tier", [])).toBe("pro-tier");
    expect(uniqueId("Pro Tier", ["pro-tier"])).toBe("pro-tier-2");
  });

  it("launches a product that did not exist before its change", () => {
    const { products, id } = addProduct(PRODUCTS, PRO, flag, mutations);
    const pro = products[3] as Product;
    expect(id).toBe("pro");
    expect(pro.committed).toBeNull();
    expect(addedAt(pro, mutations)).toBe(flag);
    expect(planAt(pro, at("2025-06-01"), mutations)).toBeNull();
    // 25 × 99 + 10 × 99 × 0.8
    expect(monthlyOf(planAt(pro, at("2025-08-01"), mutations))).toBe(3_267);
  });

  it("deletes a change and everything launched at it", () => {
    const { products } = addProduct(PRODUCTS, PRO, flag, mutations);
    const next = removeMutation({ mutations, products }, flag);
    expect(next.mutations).toEqual([]);
    expect(map((product) => product.id, next.products)).toEqual([
      "starter",
      "team",
      "enterprise",
    ]);
    expect(next.selected).toBeNull();
  });

  it("moves the selection to a survivor", () => {
    const two = addMutation(mutations, new Date("2025-10-01")).mutations;
    expect(nearestMutation(two, two[0]?.id ?? "")).toBe(two[1]?.id);
  });
});

describe("the stack", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";

  it("opens with every band flat, in fixture order (sortBy is stable)", () => {
    expect(map((product) => product.id, byVariability(PRODUCTS, []))).toEqual([
      "starter",
      "team",
      "enterprise",
    ]);
    expect(
      map((row) => row.stdDevDollarsPerMonth, stackOrderTable(PRODUCTS, [])),
    ).toEqual([0, 0, 0]);
  });

  it("measures variability in MRR, NOT in licence count", () => {
    // Starter swings 50 monthly SEATS at $15 = $750 of MRR.
    // Enterprise swings 6 at $400 = $2,400 — a far smaller count, a far bigger
    // bump, which is the case a count-based sort would get backwards.
    const swung = withChange(
      withChange(PRODUCTS, "starter", flag, MO_COUNT, 170, mutations),
      "enterprise",
      flag,
      MO_COUNT,
      8,
      mutations,
    );
    expect(variabilityOf(swung[2] as Product, mutations)).toBeGreaterThan(
      variabilityOf(swung[0] as Product, mutations),
    );
    const order = stackOrderTable(swung, mutations);
    expect(order[order.length - 1]?.product).toBe("Enterprise");
    expect(order[order.length - 1]?.band).toBe("top");
  });

  it("emits one point per CHANGE, opening at the left edge", () => {
    const series = licenseMixSeries(PRODUCTS, []);
    expect(map((band) => band.id, series)).toEqual([
      "starter",
      "team",
      "enterprise",
    ]);
    // A flat year is ONE point, at the span's start.
    for (const band of series) {
      expect(band.points.length).toBe(1);
    }
    const raised = withChange(
      PRODUCTS,
      "starter",
      flag,
      MO_COUNT,
      200,
      mutations,
    );
    const starterBand = licenseMixSeries(raised, mutations).find(
      (band) => band.id === "starter",
    );
    expect(starterBand?.points.length).toBe(2);
    // 200 × 15 + 60 × 15 × 0.85
    expect(starterBand?.points[1]?.value).toBe(3_765);
  });

  it("stacks to a top edge that IS total MRR", () => {
    const tops = map(
      (band) => band.points[0]?.value ?? 0,
      licenseMixSeries(PRODUCTS, []),
    );
    expect(tops.reduce((a, b) => a + b, 0)).toBe(mrrAt(PRODUCTS, JAN, []));
  });

  it("moves an ANNUAL dial and the band moves with it", () => {
    const more = withChange(PRODUCTS, "team", flag, YR_COUNT, 45, mutations);
    expect(mrrAt(more, at("2025-08-01"), mutations)).toBe(
      8_347.5 - 3_062.5 + (40 * 49 + 45 * 49 * 0.9),
    );
  });
});

describe("the cash flow projection", () => {
  const committed = runningBalances(MONTHLY_NET, OPENING_BALANCE);
  const boundaries = monthStarts(DOMAIN_START, committed.length);

  it("runs the committed balance from the opening figure", () => {
    expect(committed[0]).toBe(OPENING_BALANCE + 1_500);
    expect(committed.length).toBe(13);
  });

  it("integrates a FLAT rate to exactly rate × months", () => {
    const flat = { boundaries, rate: () => 1_747.5, moments: [] as number[] };
    expect(
      accruedOver(boundaries[0] ?? 0, boundaries[6] ?? 0, [], () => 1_747.5),
    ).toBeCloseTo(1_747.5 * 6, 6);
    const balances = projectedBalances(committed, flat, 0);
    expect(balances[6]).toBeCloseTo((committed[0] ?? 0) + 1_747.5 * 6, 6);
  });

  it("BENDS when the sampled rate steps, which one scalar could not", () => {
    const cut = withChange(
      PRODUCTS,
      "team",
      oneChange("2025-07-01")[0]?.id ?? "",
      MO_FEE,
      29,
      oneChange("2025-07-01"),
    );
    const mutations = oneChange("2025-07-01");
    const sampling = {
      boundaries,
      rate: (time: number) => rateAt(time, mutations, cut),
      moments: momentsOf(mutations),
    };
    const rows = projectionTable(committed, sampling, 0);
    // Before July the projection accrues $1,747.50 a month; after it, $497.50.
    expect(rows[3]?.delta).toBe(1_748);
    expect(rows[9]?.delta).toBe(498);
    expect(rows[0]?.part).toBe("committed");
    expect(rows[1]?.part).toBe("projected");
  });

  it("leaves the past alone — nothing before the pivot moves", () => {
    const sampling = {
      boundaries,
      rate: () => 99_999,
      moments: [] as number[],
    };
    const balances = projectedBalances(committed, sampling, 5);
    expect(balances.slice(0, 6)).toEqual(committed.slice(0, 6));
  });

  it("computes a pinned ceiling the high-water mark is used INSTEAD of", () => {
    const ceiling = pinnedCeiling(committed, 24_258, () => 0);
    expect(ceiling).toBeGreaterThan((committed[committed.length - 1] ?? 0) * 2);
  });
});

describe("the wording", () => {
  it("quotes every figure per month", () => {
    expect(dollarsPerMonth(8_347.5)).toBe("$8.3k/mo");
    expect(dollarsPerMonth(3_062.5)).toBe("$3.1k/mo");
    expect(signedDollarsPerMonth(-522.5)).toBe("−$523/mo");
    expect(signedDollarsPerMonth(1_747.5)).toBe("+$1.7k/mo");
  });

  it("runs the gauge's sentences REVENUE-side, with no sign flip", () => {
    expect(againstBreakeven(1_747.5)).toBe("$1.7k/mo over breakeven");
    expect(againstBreakeven(-522.5)).toBe("$523/mo below breakeven");
    expect(againstBreakeven(0)).toBe("at breakeven");
    expect(revenueShift(1_100)).toBe("$1.1k/mo more revenue");
    expect(revenueShift(-1_100)).toBe("$1.1k/mo less revenue");
  });

  it("reads the two dial units in their own terms", () => {
    expect(formatLicenses(120)).toBe("120");
    expect(formatFee(49)).toBe("$49");
    expect(formatFee(1_200)).toBe("$1,200");
  });
});

describe("save", () => {
  it("opens clean and goes dirty on a change", () => {
    const saved = scenarioDigest(PRODUCTS, SEED_MUTATIONS);
    expect(isDirty(PRODUCTS, SEED_MUTATIONS, saved)).toBe(false);
    const mutations = oneChange("2025-07-01");
    const flag = mutations[0]?.id ?? "";
    const moved = withChange(PRODUCTS, "team", flag, MO_FEE, 39, mutations);
    expect(isDirty(moved, mutations, saved)).toBe(true);
  });
});

describe("the trade between WHEN and HOW MUCH", () => {
  it("says how much of the year a cut needs to pull the average under zero", () => {
    // Cutting Team AND Enterprise to their fee floors reads −$522.50 while in
    // force.
    const weight = weightToReach(-522.5, 0);
    expect(weight).toBeCloseTo(1_747.5 / 2_270, 6);
    // So it has to hold for about three quarters of the year to cross zero —
    // the same cut made in October does not.
    expect(weight).toBeGreaterThan(0.7);
    expect(weight).toBeLessThan(0.8);
    expect(weightFrom(JAN, DOMAIN_END.getTime(), at("2025-10-01"))).toBeCloseTo(
      0.25,
      6,
    );
  });
});
