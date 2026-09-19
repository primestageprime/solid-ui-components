/**
 * License Board — the model's claims, asserted without a browser.
 *
 * The bench is four readings of one forecast, so what this file pins is that
 * they are readings of the SAME forecast: the three regimes Δ produces, the
 * annual cohort rule (including Peter's own worked example, exactly), the two
 * calibration tables, and the running balance the Cash Flow line draws.
 *
 * It also PRINTS the 24-month cash forecast, because the whole board is a
 * picture of that table and a lumpy forecast is exactly the kind of thing that
 * looks plausible in a chart and wrong in a column of numbers.
 */
import { describe, expect, it } from "vitest";
import { map, sum } from "../../../src/fn";
import { timeOf } from "../../../src";
import type { Mutation } from "../../../src";
import type { GroupedMutationEntity } from "../../../src/components/GroupedMutationSliders";
import {
  ANNUAL_COUNT,
  ANNUAL_DELTA,
  ANNUAL_PCT,
  PCT_DOMAIN,
  APPS,
  COMFORTABLE,
  COMMITTED_RATE,
  COUNT_DOMAIN,
  DELTA_DOMAIN,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FIELDS,
  FIXED_MONTHLY_COST,
  FIXTURE,
  MONTHLY_COUNT,
  MONTHLY_DELTA,
  MONTHLY_FEE,
  MONTHLY_FEE_DOMAIN,
  MONTHS_PER_YEAR,
  MONTH_COUNT,
  MONTH_SLOTS,
  OPENING_BALANCE,
  PRODUCTS,
  RATE_DOMAIN,
  SEED_MUTATIONS,
  TIERS,
  addMutation,
  addProduct,
  addedAt,
  annualCashByMonth,
  annualFeeOf,
  annualLumpOfEntity,
  annualPriceOfEntity,
  annualPayments,
  averageCash,
  averageNetCash,
  balancesByMonth,
  bandOfRate,
  byVariability,
  variabilityOf,
  canAdd,
  cashByMonth,
  cashSources,
  cashTable,
  cohortSizeAt,
  cohortsOf,
  countAfter,
  drawnRate,
  ensureMutation,
  entitiesFor,
  hasAnyChange,
  isDirty,
  isOffDial,
  licenseMixSeries,
  monthIndexOf,
  monthOfPick,
  monthRangeOf,
  monthlyCashByMonth,
  monthlyCashOfEntity,
  nearestMutation,
  netCashByMonth,
  rateBandTable,
  removeMutation,
  scenarioDigest,
  segmentLabelsOf,
  segmentsOf,
  uniqueId,
  withChange,
  withDiscontinue,
  withoutChange,
  type CashRow,
  type CashSource,
  type Fixture,
  type Product,
} from "./license-board-model";
import {
  againstBreakeven,
  dollarsPerMonth,
  formatDelta,
  formatFee,
  formatLicenses,
  revenueShift,
} from "./license-board-money";

const JAN = DOMAIN_START.getTime();
const at = (iso: string): number => new Date(iso).getTime();

const AMYGDALA = PRODUCTS[0] as Product;
const JTF = PRODUCTS[1] as Product;

/** A one-mutation scenario, for the walks that need a flag to edit. */
const oneChange = (iso = "2025-07-01"): Mutation[] =>
  addMutation([], new Date(iso)).mutations;

/** A product with one variant rewritten — the shortest way to state a case. */
const withVariant = (
  product: Product,
  side: "monthly" | "annual",
  variant:
    | { count: number; delta: number; fee: number }
    | { count: number; delta: number; pct: number },
): Product => ({
  ...product,
  committed:
    product.committed === null
      ? null
      : { ...product.committed, [side]: variant },
});

describe("the span", () => {
  it("runs 24 months, so every annual cohort pays twice", () => {
    expect(MONTH_COUNT).toBe(24);
    expect(MONTH_SLOTS[0]).toBe(JAN);
    expect(MONTH_SLOTS[12]).toBe(at("2026-01-01"));
    expect(MONTH_SLOTS[23]).toBe(at("2026-12-01"));
  });

  it("snaps a pick to the first of its month, clamped into the span", () => {
    expect(monthOfPick(new Date("2025-08-19")).getTime()).toBe(
      at("2025-08-01"),
    );
    expect(monthOfPick(new Date("2024-11-20")).getTime()).toBe(JAN);
  });

  it("indexes a moment into the month it falls in", () => {
    expect(monthIndexOf(JAN)).toBe(0);
    expect(monthIndexOf(at("2026-01-15"))).toBe(12);
  });

  it("reads a month back as its own first and last day", () => {
    expect(monthRangeOf(at("2025-08-19")).label).toBe(
      "2025-08-01 to 2025-08-31",
    );
  });

  it("puts a first change in January, so it is in force all span", () => {
    const ensured = ensureMutation(
      { mutations: [], selected: null },
      JAN,
      DOMAIN_END.getTime(),
    );
    expect(ensured.created).toBe(true);
    const [first] = ensured.mutations;
    expect(first === undefined ? 0 : timeOf(first.at)).toBe(JAN);
  });

  it("labels its chips by month, always suffixed", () => {
    expect(
      map(
        (segment) => segment.label,
        segmentLabelsOf([
          { id: "a", at: new Date("2025-01-01"), label: "1" },
          { id: "b", at: new Date("2026-08-01"), label: "2" },
        ]),
      ),
    ).toEqual(["2025-Q1 · Jan", "2026-Q3 · Aug"]);
  });
});

describe("Δ produces three regimes", () => {
  it("LEAKY BUCKET — a positive Δ ramps the count", () => {
    const variant = { count: 40, delta: 2 };
    expect(countAfter(variant, 0)).toBe(40);
    expect(countAfter(variant, 12)).toBe(64);
  });

  it("STABLE BASE — a zero Δ holds it", () => {
    const variant = { count: 12, delta: 0 };
    expect(countAfter(variant, 0)).toBe(12);
    expect(countAfter(variant, 23)).toBe(12);
  });

  it("DYING BASE — a negative Δ falls, and CLAMPS at zero", () => {
    const variant = { count: 8, delta: -1 };
    expect(countAfter(variant, 7)).toBe(1);
    expect(countAfter(variant, 8)).toBe(0);
    // It never goes through the floor, however long the span runs.
    expect(countAfter(variant, 23)).toBe(0);
  });

  it("holds a STABLE base flat across the whole span", () => {
    // Every Δ in the active fixture starts at zero — Peter's own opening state.
    expect(monthlyCashByMonth(AMYGDALA, [])[0]).toBe(13 * 900);
    expect(monthlyCashByMonth(AMYGDALA, [])[23]).toBe(13 * 900);
    expect(monthlyCashByMonth(JTF, [])[23]).toBe(1 * 5_000);
  });

  it("stops billing once a dying monthly base reaches zero", () => {
    const dying = withVariant(AMYGDALA, "monthly", {
      count: 13,
      delta: -1,
      fee: 900,
    });
    const cash = monthlyCashByMonth(dying, []);
    expect(cash[0]).toBe(13 * 900);
    expect(cash[12]).toBe(1 * 900);
    expect(cash[13]).toBe(0);
    expect(cash[23]).toBe(0);
  });
});

describe("annual licences pay once a year, in cohorts", () => {
  it("PETER'S WORKED EXAMPLE: ten at Δ −1 pays 10× at m0 and 9× at m12", () => {
    // A monthly fee of $100 at 100% derives an annual price of exactly $1,200,
    // so the worked example reads in round numbers.
    // $1,000/mo at 100% derives exactly $12,000 a year. (JTF's fee band floors
    // at $1,000, and `clamped` holds every plan inside its product's own
    // allowance — a cheaper fee here would have been silently raised to it.)
    const priced = withVariant(JTF, "monthly", {
      count: 1,
      delta: 0,
      fee: 1_000,
    });
    const ten = withVariant(priced, "annual", {
      count: 10,
      delta: -1,
      pct: 100,
    });
    expect(annualFeeOf(ten.committed as never)).toBe(12_000);
    expect(annualPayments(ten, [])).toEqual([
      { month: 0, amount: 10 * 12_000 },
      { month: 12, amount: 9 * 12_000 },
    ]);
  });

  it("charges the counted base in the FIRST month and renews at twelve", () => {
    // JTF: ONE annual licence at 20% of 12 × $5,000 = $12,000 a year, Δ 0 — a
    // stable base renews IN FULL.
    expect(annualFeeOf(JTF.committed as never)).toBe(12_000);
    expect(annualPayments(JTF, [])).toEqual([
      { month: 0, amount: 12_000 },
      { month: 12, amount: 12_000 },
    ]);
  });

  it("opens NO cohort for a product with no annual licences yet", () => {
    // Amygdala sells none, which is a real state rather than a gap: the `yr`
    // band is flat at nothing and its two `yr` dials wait to be moved.
    expect(AMYGDALA.committed?.annual.count).toBe(0);
    expect(cohortsOf(AMYGDALA, []).length).toBe(0);
    expect(annualPayments(AMYGDALA, [])).toEqual([]);
    expect(sum(annualCashByMonth(AMYGDALA, []))).toBe(0);
  });

  it("churns a dying annual base at its renewal", () => {
    const dying = withVariant(JTF, "annual", { count: 6, delta: -1, pct: 20 });
    const payments = annualPayments(dying, []);
    expect(payments[0]?.amount).toBe(6 * 12_000);
    expect(payments[1]?.amount).toBe(5 * 12_000);
  });

  it("opens a cohort EVERY MONTH when Δ is positive, paid in the month sold", () => {
    // $200/mo at 100% derives $2,400 a year (Amygdala's fee band floors at
    // $200), so each sale is a round lump.
    const priced = withVariant(AMYGDALA, "monthly", {
      count: 13,
      delta: 0,
      fee: 200,
    });
    const growing = withVariant(priced, "annual", {
      count: 4,
      delta: 1,
      pct: 100,
    });
    const cash = annualCashByMonth(growing, []);
    // Month 0: the base of four. Months 1–11: one new sale each, paid then.
    expect(cash[0]).toBe(4 * 2_400);
    expect(cash[1]).toBe(2_400);
    expect(cash[11]).toBe(2_400);
    // Month 12: the base renews (400) AND the month-0… no — the base's own
    // anniversary only. The month-1 cohort renews at month 13.
    expect(cash[12]).toBe(4 * 2_400 + 2_400);
    expect(cash[13]).toBe(2_400 + 2_400);
  });

  it("shrinks a cohort ONCE PER ANNIVERSARY, never per month", () => {
    const cohort = { size: 10, bornAt: 0, churn: -1 };
    expect(cohortSizeAt(cohort, 0)).toBe(10);
    expect(cohortSizeAt(cohort, 1)).toBe(9);
    expect(cohortSizeAt(cohort, 2)).toBe(8);
    // And it clamps rather than going negative.
    expect(cohortSizeAt({ size: 2, bornAt: 0, churn: -5 }, 1)).toBe(0);
  });

  it("never grows a cohort — a positive Δ opens new ones instead", () => {
    const cohort = { size: 10, bornAt: 0, churn: 3 };
    expect(cohortSizeAt(cohort, 1)).toBe(10);
    const growing = withVariant(AMYGDALA, "annual", {
      count: 4,
      delta: 1,
      pct: 90,
    });
    const born = map((cohort) => cohort.bornAt, cohortsOf(growing, []));
    expect(born.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it("opens ONE cohort for a stable or dying base, and none for an empty one", () => {
    expect(cohortsOf(JTF, []).length).toBe(1);
    expect(cohortsOf(AMYGDALA, []).length).toBe(0);
  });

  it("renews at the price in force THEN, not the one it was sold at", () => {
    const mutations = oneChange("2025-07-01");
    const flag = mutations[0]?.id ?? "";
    const raised = withChange([JTF], "jtf", flag, "annualPct", 40, mutations);
    const cash = annualCashByMonth(raised[0] as Product, mutations);
    expect(cash[0]).toBe(12_000);
    expect(cash[12]).toBe(24_000);
  });

  it("THE MONTHLY $ DIAL PRICES THE ANNUAL SIDE TOO", () => {
    const mutations = oneChange("2025-07-01");
    const flag = mutations[0]?.id ?? "";
    // Nothing on the annual group moved — only the monthly fee — and the
    // month-12 renewal costs more because of it. That coupling is the whole
    // reason the annual side is a percentage rather than a price.
    const dearer = withChange(
      [JTF],
      "jtf",
      flag,
      "monthlyFee",
      6_000,
      mutations,
    );
    const cash = annualCashByMonth(dearer[0] as Product, mutations);
    expect(cash[0]).toBe(12_000);
    expect(cash[12]).toBe(6_000 * 12 * 0.2);
  });
});

describe("the opening forecast", () => {
  it("is two products, with no changes and every Δ at zero", () => {
    expect(SEED_MUTATIONS).toEqual([]);
    expect(hasAnyChange(PRODUCTS)).toBe(false);
    expect(map((product) => product.label, PRODUCTS)).toEqual([
      "Amygdala",
      "JTF",
    ]);
    for (const product of PRODUCTS) {
      expect(product.committed?.monthly.delta).toBe(0);
      expect(product.committed?.annual.delta).toBe(0);
    }
  });

  it("takes $28,700 in the first month — the annual lump lands with it", () => {
    const cash = cashByMonth(PRODUCTS, []);
    expect(cash[0]).toBe(13 * 900 + 1 * 5_000 + 12_000);
    expect(cash[0]).toBe(28_700);
  });

  it("drops to $16,700 once the lump is past, and holds there", () => {
    expect(cashByMonth(PRODUCTS, [])[1]).toBe(16_700);
    expect(cashByMonth(PRODUCTS, [])[11]).toBe(16_700);
  });

  it("spikes again at the twelve-month anniversary", () => {
    expect(cashByMonth(PRODUCTS, [])[12]).toBe(28_700);
  });

  it("takes $424,800 across the span, averaging $17,700 a month", () => {
    expect(sum(cashByMonth(PRODUCTS, []))).toBe(424_800);
    expect(averageCash(PRODUCTS, [])).toBe(17_700);
  });

  it("nets the fixed cost off every month", () => {
    const net = netCashByMonth(PRODUCTS, []);
    expect(net[0]).toBe(28_700 - FIXED_MONTHLY_COST);
    expect(averageNetCash(PRODUCTS, [])).toBe(17_700 - FIXED_MONTHLY_COST);
    expect(COMMITTED_RATE).toBe(6_700);
  });

  it("keeps every allowance inside the shared tracks", () => {
    for (const product of PRODUCTS) {
      expect(product.ranges.monthlyCount[1]).toBeLessThanOrEqual(
        COUNT_DOMAIN[1],
      );
      expect(product.ranges.monthlyDelta[0]).toBeGreaterThanOrEqual(
        DELTA_DOMAIN[0],
      );
      expect(product.ranges.monthlyFee[1]).toBeLessThanOrEqual(
        MONTHLY_FEE_DOMAIN[1],
      );
      expect(product.ranges.monthlyDelta[1]).toBeLessThanOrEqual(
        DELTA_DOMAIN[1],
      );
      expect(product.ranges.annualPct[0]).toBeGreaterThanOrEqual(PCT_DOMAIN[0]);
      expect(product.ranges.annualPct[1]).toBeLessThanOrEqual(PCT_DOMAIN[1]);
    }
  });
});

describe("the sources", () => {
  it("is one band per product PER BILLING VARIANT", () => {
    expect(map((source) => source.id, cashSources(PRODUCTS, []))).toEqual([
      "amygdala-mo",
      "amygdala-yr",
      "jtf-mo",
      "jtf-yr",
    ]);
    expect(map((source) => source.label, cashSources(PRODUCTS, []))).toEqual([
      "Amygdala · mo",
      "Amygdala · yr",
      "JTF · mo",
      "JTF · yr",
    ]);
  });

  it("puts the SPIKY annual source on top, and keeps flat ties in fixture order", () => {
    const ordered = byVariability(cashSources(PRODUCTS, []));
    // JTF's two lumps are the most variable thing on the board.
    expect(ordered[ordered.length - 1]?.id).toBe("jtf-yr");
    // EVERY OTHER BAND IS PERFECTLY FLAT on the opening fixture — every Δ is
    // zero, and Amygdala sells no annual licences at all — so three sources tie
    // at a standard deviation of zero. `sortBy` is STABLE, so they keep the
    // fixture's own order rather than shuffling between renders, which is the
    // reason stability matters here and not a detail.
    expect(map((source) => variabilityOf(source), ordered).slice(0, 3)).toEqual(
      [0, 0, 0],
    );
    expect(map((source) => source.id, ordered).slice(0, 3)).toEqual([
      "amygdala-mo",
      "amygdala-yr",
      "jtf-mo",
    ]);
  });

  it("stacks to a top edge that IS the month's total cash", () => {
    const series = licenseMixSeries(PRODUCTS, []);
    const firstMonth = sum(map((band) => band.points[0]?.value ?? 0, series));
    expect(firstMonth).toBe(cashByMonth(PRODUCTS, [])[0]);
    expect(series.length).toBe(4);
    // Every band carries a point per month, so a lump is one month wide.
    for (const band of series) expect(band.points.length).toBe(MONTH_COUNT);
  });
});

describe("the chart's cells and the forecast are ONE calendar", () => {
  it("has exactly one balance per month slot — the off-by-one that drew a lie", () => {
    // `monthlyCells(start, end)` is INCLUSIVE of the end month and would give
    // 25 cells for this span; the board builds its cells from MONTH_SLOTS so
    // the counts agree by construction. A 25th cell read `balances[24]`,
    // found undefined, fell back to zero and dropped the Cash Flow line off a
    // cliff at the right-hand edge without throwing.
    expect(balancesByMonth(PRODUCTS, []).length).toBe(MONTH_SLOTS.length);
    expect(netCashByMonth(PRODUCTS, []).length).toBe(MONTH_SLOTS.length);
    expect(cashByMonth(PRODUCTS, []).length).toBe(MONTH_SLOTS.length);
    expect(cashTable(PRODUCTS, []).length).toBe(MONTH_SLOTS.length);
    for (const band of licenseMixSeries(PRODUCTS, [])) {
      expect(band.points.length).toBe(MONTH_SLOTS.length);
    }
  });

  it("never reads past the end of the forecast", () => {
    const balances = balancesByMonth(PRODUCTS, []);
    expect(balances[MONTH_SLOTS.length - 1]).toBeGreaterThan(0);
    expect(balances[MONTH_SLOTS.length]).toBeUndefined();
  });
});

describe("the running balance", () => {
  it("opens at the opening balance plus the first month's net", () => {
    const balances = balancesByMonth(PRODUCTS, []);
    expect(balances[0]).toBe(OPENING_BALANCE + 28_700 - FIXED_MONTHLY_COST);
    expect(balances.length).toBe(MONTH_COUNT);
  });

  it("STEPS at the anniversary rather than sloping", () => {
    const balances = balancesByMonth(PRODUCTS, []);
    const quietStep = (balances[11] ?? 0) - (balances[10] ?? 0);
    const lumpStep = (balances[12] ?? 0) - (balances[11] ?? 0);
    // The lump month adds $12,000 of annual cash on top of the steady $16,700,
    // so the step is three times the quiet one rather than a slope.
    expect(lumpStep).toBeGreaterThan(quietStep * 2);
    expect(lumpStep - quietStep).toBe(12_000);
  });

  it("ends where the whole forecast puts it", () => {
    const balances = balancesByMonth(PRODUCTS, []);
    expect(balances[MONTH_COUNT - 1]).toBe(
      OPENING_BALANCE + 424_800 - FIXED_MONTHLY_COST * MONTH_COUNT,
    );
  });
});

describe("the calibration — three regimes, solved", () => {
  it("prints exactly the header's table for the ACTIVE fixture", () => {
    const rows = rateBandTable(APPS);
    expect(map((row) => [row.scenario, row.band], rows)).toEqual([
      ["as it opens", "green"],
      ["JTF's monthly licences are lost", "yellow"],
      ["Amygdala's monthly Δ goes to −1", "red"],
    ]);
    expect(rows[0]?.cash).toBe(17_700);
    expect(rows[0]?.net).toBe(6_700);
    expect(rows[1]?.cash).toBe(12_700);
    expect(rows[1]?.net).toBe(1_700);
    expect(rows[2]?.cash).toBe(9_412.5);
    expect(rows[2]?.net).toBe(-1_587.5);
  });

  it("satisfies the four inequalities APPS' constants were solved from", () => {
    const [opens, stall, dying] = rateBandTable(APPS);
    expect(opens?.net).toBeGreaterThanOrEqual(APPS.comfortable);
    expect(stall?.net).toBeGreaterThan(0);
    expect(stall?.net).toBeLessThan(APPS.comfortable);
    expect(dying?.net).toBeLessThan(0);
    expect(APPS.fixedMonthlyCost).toBeGreaterThan(dying?.cash ?? 0);
    expect(APPS.fixedMonthlyCost).toBeLessThan(stall?.cash ?? 0);
  });

  it("satisfies them for the INACTIVE fixture too, so it cannot rot", () => {
    const rows = rateBandTable(TIERS);
    const [opens, stall, dying] = rows;
    expect(map((row) => row.band, rows)).toEqual(["green", "yellow", "red"]);
    expect(opens?.net).toBeGreaterThanOrEqual(TIERS.comfortable);
    expect(stall?.net).toBeGreaterThan(0);
    expect(stall?.net).toBeLessThan(TIERS.comfortable);
    expect(dying?.net).toBeLessThan(0);
    expect(TIERS.fixedMonthlyCost).toBeGreaterThan(dying?.cash ?? 0);
    expect(TIERS.fixedMonthlyCost).toBeLessThan(stall?.cash ?? 0);
  });

  it("lets each fixture name its OWN two moves, in its own order", () => {
    // APPS goes yellow by LOSING a product and red by a dying Δ; TIERS is the
    // other way round, because Enterprise carries the expensive licences on
    // that ladder where JTF carries them on this one. A fixed recipe could not
    // express both.
    expect(rateBandTable(TIERS)[1]?.scenario).toBe(
      "Starter's monthly Δ goes to −6",
    );
    expect(rateBandTable(TIERS)[2]?.scenario).toBe(
      "Enterprise's monthly licences are lost",
    );
  });

  it("prices each catalogue against ITS OWN overheads", () => {
    // The two fixtures have different fixed costs, so a row's net is not
    // comparable across them — which is why the table takes a whole fixture.
    expect(APPS.fixedMonthlyCost).not.toBe(TIERS.fixedMonthlyCost);
    expect(rateBandTable(APPS)[0]?.net).not.toBe(
      (rateBandTable(APPS)[0]?.cash ?? 0) - TIERS.fixedMonthlyCost,
    );
  });

  it("bands a rate the way the gauge's own split does", () => {
    expect(bandOfRate(-1)).toBe("red");
    expect(bandOfRate(0)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE - 1)).toBe("yellow");
    expect(bandOfRate(COMFORTABLE)).toBe("green");
  });

  it("holds the opening reading inside the gauge's domain", () => {
    expect(isOffDial(COMMITTED_RATE)).toBe(false);
    expect(RATE_DOMAIN[0]).toBe(-FIXED_MONTHLY_COST);
    expect(drawnRate(RATE_DOMAIN[1] + 1_000)).toBe(RATE_DOMAIN[1]);
  });

  it("is the fixture the board actually opens on", () => {
    expect(FIXTURE).toBe(APPS);
    expect(PRODUCTS).toBe(APPS.products);
  });
});

describe("one CARD per product, six dials", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";

  it("carries all six measures in FIELDS order", () => {
    const [amygdala] = entitiesFor(PRODUCTS, flag, mutations);
    expect(amygdala?.measures.length).toBe(6);
    expect(amygdala?.measures[MONTHLY_COUNT]?.value).toBe(13);
    expect(amygdala?.measures[MONTHLY_DELTA]?.value).toBe(0);
    expect(amygdala?.measures[MONTHLY_FEE]?.value).toBe(900);
    expect(amygdala?.measures[ANNUAL_COUNT]?.value).toBe(0);
    expect(amygdala?.measures[ANNUAL_DELTA]?.value).toBe(0);
    expect(amygdala?.measures[ANNUAL_PCT]?.value).toBe(85);
  });

  it("maps every measure index to its own plan field", () => {
    expect(FIELDS).toEqual([
      "monthlyCount",
      "monthlyDelta",
      "monthlyFee",
      "annualCount",
      "annualDelta",
      "annualPct",
    ]);
    expect(new Set(FIELDS).size).toBe(6);
  });

  it("gives Δ a band that crosses zero and counts a band that does not", () => {
    const [amygdala] = entitiesFor(PRODUCTS, flag, mutations);
    expect(amygdala?.measures[MONTHLY_DELTA]?.range[0]).toBeLessThan(0);
    expect(amygdala?.measures[MONTHLY_COUNT]?.range[0]).toBe(0);
  });

  it("reads its summary FROM THE CARD", () => {
    const [amygdala] = entitiesFor(PRODUCTS, null, []);
    expect(monthlyCashOfEntity(amygdala as GroupedMutationEntity)).toBe(
      13 * 900,
    );
    // The derived price exists even with no licences sold on it yet.
    expect(annualPriceOfEntity(amygdala as GroupedMutationEntity)).toBe(
      900 * 12 * 0.85,
    );
    expect(annualLumpOfEntity(amygdala as GroupedMutationEntity)).toBe(0);
  });

  it("shows prior === value when there is no change to show", () => {
    for (const card of entitiesFor(PRODUCTS, null, [])) {
      for (const measure of card.measures) {
        expect(measure.prior).toBe(measure.value);
      }
    }
  });

  it("nulls ALL SIX measures when a product is discontinued", () => {
    const gone = withDiscontinue(PRODUCTS, "jtf", flag);
    const card = entitiesFor(gone, flag, mutations).find(
      (one) => one.id === "jtf",
    );
    expect(map((measure) => measure.value, card?.measures ?? [])).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(monthlyCashOfEntity(card as GroupedMutationEntity)).toBeNull();
  });

  it("drops a discontinued product at LATER dates", () => {
    const later = addMutation(mutations, new Date("2025-10-01")).mutations;
    const second = later[1]?.id ?? "";
    const gone = withDiscontinue(PRODUCTS, "jtf", flag);
    expect(map((card) => card.id, entitiesFor(gone, second, later))).toEqual([
      "amygdala",
    ]);
  });
});

describe("a change re-bases the forecast", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";

  it("starts a new segment at the month of the change", () => {
    const raised = withChange(
      PRODUCTS,
      "amygdala",
      flag,
      "monthlyCount",
      30,
      mutations,
    );
    const segments = segmentsOf(raised[0] as Product, mutations);
    expect(map((segment) => segment.from, segments)).toEqual([0, 6]);
  });

  it("runs Δ from the CHANGE, not from month zero", () => {
    const raised = withChange(
      withChange(PRODUCTS, "amygdala", flag, "monthlyCount", 30, mutations),
      "amygdala",
      flag,
      "monthlyDelta",
      2,
      mutations,
    );
    const cash = monthlyCashByMonth(raised[0] as Product, mutations);
    // Month 5 is still the flat opening base; month 6 re-bases at 30 and ramps.
    expect(cash[5]).toBe(13 * 900);
    expect(cash[6]).toBe(30 * 900);
    expect(cash[7]).toBe(32 * 900);
  });

  it("carries the five fields it did not touch", () => {
    const raised = withChange(
      PRODUCTS,
      "amygdala",
      flag,
      "monthlyDelta",
      5,
      mutations,
    );
    const segment = segmentsOf(raised[0] as Product, mutations)[1];
    expect(segment?.plan?.monthly.delta).toBe(5);
    expect(segment?.plan?.monthly.count).toBe(13);
    expect(segment?.plan?.monthly.fee).toBe(900);
    expect(segment?.plan?.annual.count).toBe(0);
    expect(segment?.plan?.annual.pct).toBe(85);
  });

  it("clamps a change into the product's own allowance", () => {
    const over = withChange(
      PRODUCTS,
      "jtf",
      flag,
      "monthlyCount",
      50,
      mutations,
    );
    expect(
      segmentsOf(over[1] as Product, mutations)[1]?.plan?.monthly.count,
    ).toBe(10);
  });

  it("relaunches by DELETING the change", () => {
    const gone = withDiscontinue(PRODUCTS, "jtf", flag);
    const back = withoutChange(gone, "jtf", flag);
    expect((back[1] as Product).changes).toEqual({});
  });
});

describe("a change in the FIRST month replaces rather than duplicates", () => {
  // ⚠ A change at month 0 sits at the same month index as the committed plan.
  // The walk used to emit BOTH, and `cohortsOf` opened the annual base twice —
  // so the product billed its whole annual base twice at month 0 and twice at
  // the renewal. Invisible in the table, loud in the gauge: a one-point nudge
  // of Amygdala's `%` moved the reading by +$512/mo instead of about +$6/mo.
  const january = addMutation([], new Date("2025-01-01")).mutations;
  const flag = january[0]?.id ?? "";

  const nudge = () =>
    withChange(PRODUCTS, "jtf", flag, "annualPct", 21, january);

  it("keeps ONE segment for the month, the later declaration winning", () => {
    const segments = segmentsOf(nudge()[1] as Product, january);
    expect(segments.length).toBe(1);
    expect(segments[0]?.from).toBe(0);
    expect(segments[0]?.plan?.annual.pct).toBe(21);
  });

  it("opens ONE annual cohort, not two", () => {
    expect(cohortsOf(nudge()[1] as Product, january).length).toBe(1);
    // One licence at 21% of 12 x $5,000 = $12,600, ONCE.
    expect(annualPayments(nudge()[1] as Product, january)[0]?.amount).toBe(
      12_600,
    );
  });

  it("moves the gauge by a believable amount", () => {
    const delta = averageNetCash(nudge(), january) - COMMITTED_RATE;
    // Two payments $600 dearer across 24 months - $50 a month, not the doubled
    // base's five-figure jump.
    expect(delta).toBeCloseTo((2 * 600) / MONTH_COUNT, 6);
    expect(delta).toBeLessThan(100);
  });
});

describe("launching and deleting", () => {
  const mutations = oneChange("2025-07-01");
  const flag = mutations[0]?.id ?? "";
  const PRO = {
    name: "Pro",
    monthlyCount: 20,
    monthlyDelta: 3,
    monthlyFee: 800,
    annualCount: 5,
    annualDelta: 1,
    annualPct: 90,
  };

  it("refuses a draft with no name, and one outside a track", () => {
    expect(canAdd(EMPTY_DRAFT)).toBe(false);
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro" })).toBe(true);
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", monthlyDelta: 99 })).toBe(
      false,
    );
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", monthlyCount: 99 })).toBe(
      false,
    );
    // 10% IS now a figure the track admits — JTF sells at 20%.
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", annualPct: 10 })).toBe(true);
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", annualPct: 101 })).toBe(false);
  });

  it("accepts a NEGATIVE Δ, because a dying product is a real one", () => {
    expect(canAdd({ ...EMPTY_DRAFT, name: "Pro", monthlyDelta: -5 })).toBe(
      true,
    );
  });

  it("gives a stable id from the name", () => {
    expect(uniqueId("Pro Tier", [])).toBe("pro-tier");
    expect(uniqueId("Pro Tier", ["pro-tier"])).toBe("pro-tier-2");
  });

  it("launches a product that did not exist before its change", () => {
    const { products, id } = addProduct(PRODUCTS, PRO, flag, mutations);
    const pro = products[2] as Product;
    expect(id).toBe("pro");
    expect(pro.committed).toBeNull();
    expect(addedAt(pro, mutations)).toBe(flag);
    // It bills nothing before its launch month and its full base at it.
    const cash = monthlyCashByMonth(pro, mutations);
    expect(cash[5]).toBe(0);
    expect(cash[6]).toBe(20 * 800);
    // 5 annual at 90% of 12 × $800 = $8,640 each.
    expect(annualPayments(pro, mutations)[0]?.month).toBe(6);
    expect(annualPayments(pro, mutations)[0]?.amount).toBe(5 * 8_640);
  });

  it("deletes a change and everything launched at it", () => {
    const { products } = addProduct(PRODUCTS, PRO, flag, mutations);
    const next = removeMutation({ mutations, products }, flag);
    expect(next.mutations).toEqual([]);
    expect(map((product) => product.id, next.products)).toEqual([
      "amygdala",
      "jtf",
    ]);
    expect(next.selected).toBeNull();
  });

  it("moves the selection to a survivor", () => {
    const two = addMutation(mutations, new Date("2025-10-01")).mutations;
    expect(nearestMutation(two, two[0]?.id ?? "")).toBe(two[1]?.id);
  });
});

describe("the wording", () => {
  it("keeps the SIGN on Δ, with a real minus", () => {
    expect(formatDelta(2)).toBe("+2");
    expect(formatDelta(-1)).toBe("−1");
    expect(formatDelta(0)).toBe("0");
    // U+2212, not a hyphen.
    expect(formatDelta(-1).charCodeAt(0)).toBe(0x2212);
  });

  it("quotes cash per month, and reads the gauge revenue-side", () => {
    expect(dollarsPerMonth(6_700)).toBe("$6.7k/mo");
    expect(againstBreakeven(6_700)).toBe("$6.7k/mo over breakeven");
    expect(againstBreakeven(-1_587.5)).toBe("$1.6k/mo below breakeven");
    expect(revenueShift(0)).toBe("no change to revenue");
  });

  it("reads counts and fees in their own terms", () => {
    expect(formatLicenses(13)).toBe("13");
    expect(formatFee(900)).toBe("$900");
    expect(formatFee(5_000)).toBe("$5,000");
  });
});

describe("save", () => {
  it("opens clean and goes dirty on a change", () => {
    const saved = scenarioDigest(PRODUCTS, SEED_MUTATIONS);
    expect(isDirty(PRODUCTS, SEED_MUTATIONS, saved)).toBe(false);
    const mutations = oneChange("2025-07-01");
    const flag = mutations[0]?.id ?? "";
    const moved = withChange(
      PRODUCTS,
      "amygdala",
      flag,
      "monthlyDelta",
      2,
      mutations,
    );
    expect(isDirty(moved, mutations, saved)).toBe(true);
  });
});

/**
 * THE HEADLESS OBSERVATION — the 24-month forecast, printed.
 *
 * Not an assertion: a table an agent or a person can read in a terminal and
 * argue with before anyone opens a browser. It is the thing both charts draw.
 */
describe("the forecast, printed", () => {
  it("prints 24 months of cash per source, net and balance", () => {
    const sources = cashSources(PRODUCTS, []);
    const widths = [5, ...map(() => 12, sources), 10, 10, 12];
    const cell = (value: string, index: number): string =>
      value.padStart(widths[index] ?? 10);
    const header = [
      "month",
      ...map((source: CashSource) => source.label, sources),
      "cash",
      "net",
      "balance",
    ];
    const lines = [
      map((value: string, index: number) => cell(value, index), header).join(
        " ",
      ),
    ];
    for (const row of cashTable(PRODUCTS, [])) {
      lines.push(
        map(
          (value: string, index: number) => cell(value, index),
          [
            row.label,
            ...map((value: number) => String(value), row.bySource),
            String(row.cash),
            String(row.net),
            String(Math.round(row.balance)),
          ],
        ).join(" "),
      );
    }
    const table = lines.join("\n");
    process.stdout.write(`\n${table}\n\n`);
    // The table is the point, but assert its shape so it cannot quietly stop
    // being printed: 24 rows plus a header, and the renewal month is in it.
    expect(lines.length).toBe(MONTH_COUNT + 1);
    expect(table).toContain("2026-01");
    expect(MONTHS_PER_YEAR).toBe(12);
  });

  it("prints each fixture's calibration", () => {
    for (const fixture of [APPS, TIERS] as readonly Fixture[]) {
      const rows = rateBandTable(fixture);
      process.stdout.write(
        `\n${fixture.label} (fixed ${fixture.fixedMonthlyCost}, comfortable ${fixture.comfortable})\n`,
      );
      for (const row of rows) {
        process.stdout.write(
          `  ${row.scenario.padEnd(40)} cash ${String(row.cash).padStart(10)}  net ${String(row.net).padStart(10)}  ${row.band}\n`,
        );
      }
      expect(rows.length).toBe(3);
    }
  });

  it("prints the annual payment schedule per product", () => {
    for (const product of PRODUCTS) {
      const payments = annualPayments(product, []);
      process.stdout.write(
        `${product.label} annual: ${map(
          (row: { month: number; amount: number }) =>
            `m${row.month}=$${row.amount}`,
          payments,
        ).join("  ")}\n`,
      );
      // JTF's annual base pays twice across 24 months; Amygdala sells none.
      expect(payments.length).toBe(product.id === "amygdala" ? 0 : 2);
    }
  });
});

describe("the forecast rows themselves", () => {
  it("carries one column per source and agrees with the totals", () => {
    const rows = cashTable(PRODUCTS, []);
    expect(rows.length).toBe(MONTH_COUNT);
    const first = rows[0] as CashRow;
    expect(first.bySource.length).toBe(4);
    expect(sum([...first.bySource])).toBe(first.cash);
    expect(first.net).toBe(first.cash - FIXED_MONTHLY_COST);
    expect(first.balance).toBe(OPENING_BALANCE + first.net);
  });
});
