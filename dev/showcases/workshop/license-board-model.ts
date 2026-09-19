/**
 * License Board — the model, as plain functions. No Solid, no DOM, no CSS.
 *
 * A CASH FORECASTING model for a business that sells licences. Peter,
 * 2026-09-18: "intrinsically simplified, like AC in D&D". It is NOT accounting:
 * there is no revenue recognition anywhere, and cash lands in the month it is
 * PAID. An annual licence pays a year up front and the whole lump shows up in
 * that month, which is the thing this board exists to draw.
 *
 * The wiring, stated once:
 *
 *   products ──entitiesFor─────▶ GroupedMutationSliders.entities (one CARD each)
 *   products ──cashSources─────▶ StackedTimelineChart (one band per SOURCE)
 *   products ──balancesByMonth─▶ the running balance, month by month
 *   products ──averageNetCash──▶ RateGauge.value  ($/mo over breakeven)
 *   month pick ────────────────▶ which mutation the dials edit
 *
 * ── SIX DIALS, TWO GROUPS (Peter's sketch, 2026-09-18) ──────────────────────
 *
 * One product is ONE CARD, and a card carries six numbers in two captioned
 * groups — the same three questions asked of each billing variant:
 *
 *     mo:  #  licences now     Δ  net change a month     $  the monthly fee
 *     yr:  #  licences now     Δ  net change a month     %  of twelve monthly
 *
 * THE COUNTS AND THE DELTAS ARE RAW NUMBERS on both sides; only the annual PRICE
 * is a percentage (Peter, 2026-09-18). An annual licence costs
 * `monthly $ × 12 × % / 100` a year — `annualFeeOf` — so the MONTHLY `$` DIAL
 * PRICES BOTH VARIANTS. Raising it raises what every annual renewal brings in
 * without the reader having to move a second dial to keep the two in step, and a
 * fee changed at month 6 is what a cohort renewing at month 12 pays. That
 * coupling is the reason the annual side is a discount rather than a price, and
 * the test pins it.
 *
 * ── Δ IS THE WHOLE SALES MODEL ─────────────────────────────────────────────
 *
 * THREE REGIMES FALL OUT OF ONE NUMBER, which is the "like AC" part:
 *
 *   • LEAKY BUCKET  (Δ ≠ 0) — customers arrive through sales and leave through
 *     churn, and only the NET is modelled. One dial, not two, because a forecast
 *     that asked for gross sales and gross churn separately would ask for two
 *     numbers nobody has in order to use their difference.
 *   • STABLE BASE   (Δ = 0) — loyal customers, assumed to renew in full.
 *   • DYING BASE    (Δ < 0) — the count falls until it reaches zero and CLAMPS
 *     there. A negative count is not a state a business can be in.
 *
 * ── MONTHLY LICENCES: A COUNT TIMES A FEE ──────────────────────────────────
 *
 *     count(m) = max(0, # + Δ × m)      m = months since that count took effect
 *     cash(m)  = count(m) × monthly fee
 *
 * Smooth, and it clamps. JTF opens at 8 monthly licences losing one a month, so
 * it bills nothing from month 8 onward — the clamp is why that band stops at the
 * floor instead of going through it.
 *
 * ── ANNUAL LICENCES: CASH ARRIVES ONCE A YEAR, IN COHORTS ──────────────────
 *
 * This is the part worth reading twice, because it is what makes the board
 * lumpy. An annual licence pays ONCE per licence per year, at ITS OWN
 * anniversary — so the model is a list of COHORTS, each with a birth month, each
 * paying then and every twelve months after.
 *
 *   • THE COUNTED BASE pays in the FIRST month. `#` annual licences bill
 *     `# × annual fee` at month 0, and renew at month 12.
 *   • Δ > 0 — NEW SALES LAND AS CASH IN THE MONTH SOLD. Peter: "if you're making
 *     annual sales every month, you get the full financial benefit all in that
 *     first month." So each later month opens a cohort of Δ, which pays
 *     `Δ × fee` that month and renews twelve months later.
 *   • Δ < 0 — CHURN BITES AT RENEWAL, not monthly. Peter's worked example: ten
 *     licences at Δ = −1 "will show 10 × fee for the first month and 9 × fee for
 *     the 12th month". So a cohort renews at `max(0, size + Δ × k)` on its k-th
 *     anniversary, and no new cohorts are opened.
 *
 * ⚠ THE FIRST READING I HAD TO CHOOSE. A negative Δ is quoted "per month" on the
 * dial, and Peter's example applies it ONCE PER YEAR at renewal (−1 gives 9 at
 * month 12, not 12 − 11). Those are different models and both are defensible:
 * annual customers can only leave when they are asked to pay again, which is the
 * renewal reading — but a dial labelled per month, sitting beside a monthly Δ
 * that really is per month, invites the other one. I went with PETER'S WORKED
 * EXAMPLE, because the example is the specification. It lives in `cohortSizeAt`
 * and the test pins the 10 → 9 case exactly; the monthly reading is a one-line
 * change there.
 *
 * ── THE SPAN IS 24 MONTHS, SO AN ANNIVERSARY IS VISIBLE ────────────────────
 *
 * Twelve would draw the opening lump and no renewal at all, which is the half of
 * the model that is hard to believe without seeing it. Twenty-four shows every
 * cohort pay twice.
 *
 * ── A SOURCE IS A PRODUCT × A BILLING VARIANT ──────────────────────────────
 *
 * The License Mix chart is, in Peter's words, "just the contribution of CASH
 * from the different sources", so a band is `Amygdala · mo` or `JTF · yr` rather
 * than a whole product: the two variants of one product behave nothing alike —
 * one is a smooth ramp, the other is two spikes — and one band holding both
 * would average away exactly the shape the board is for.
 *
 * NO BREAKEVEN RULE ON THAT CHART. It carried one while every band was a smooth
 * MRR, and a horizontal line across a stack whose top edge swings from $2.9k to
 * $16.1k in one month is a line the reader has to ignore eleven months in
 * twelve. Breakeven still exists and is still drawn — on the GAUGE, where zero
 * is breakeven by construction, and in the Cash Flow line, which is already net
 * of it. The rule was decoration once the stack went lumpy.
 *
 * ── THE FIXTURE, AND THE CALIBRATION ───────────────────────────────────────
 *
 * ACTIVE: Peter's own two products, on his own figures.
 *
 *     product      #mo   Δmo     $mo     #yr   Δyr    %yr   → $/yr each
 *     ----------   ---   ----   ------   ---   ----   ----   ----------
 *     Amygdala      13     0      $900     0     0     85%    (none yet)
 *     JTF            1     0    $5,000     1     0     20%      $12,000
 *
 * EVERY Δ STARTS AT ZERO — a stable base that renews, which Peter will move
 * himself. That is worth saying because it changes what a calibration row can
 * be: "stall Δ to 0" is a no-op on this fixture and would have printed a yellow
 * row identical to the green one.
 *
 * AMYGDALA HAS NO ANNUAL LICENCES YET. A count of zero opens no cohort, so its
 * `yr` band is flat at nothing and its two `yr` dials wait to be moved. JTF's
 * single annual licence costs $12,000 a year against its $5,000 monthly fee —
 * 20% of twelve months, which is the price that forced the percentage track
 * down to zero.
 *
 * So the board bills $16,700 every month (13 × $900 + 1 × $5,000), plus a
 * $12,000 lump in month 0 and its renewal in month 12: $424,800 over 24 months,
 * averaging $17,700/mo.
 *
 * The two rows below "as it opens" are MOVES the fixture names, because the two
 * catalogues fail differently:
 *
 *     scenario                            cash/mo    net/mo     band
 *     ---------------------------------   --------   --------   ------
 *     as it opens                         17,700.00  6,700.00   green
 *     JTF's monthly licences are lost     12,700.00  1,700.00   yellow
 *     Amygdala's monthly Δ goes to −1      9,412.50  −1,587.50  red
 *
 * Solving the four inequalities the same way as ever:
 *
 *     opens  − FIXED ≥ COMFORTABLE    the board opens green
 *     yellow − FIXED > 0              losing JTF's monthly book is not yet a loss
 *     yellow − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     red    − FIXED < 0              a dying Amygdala crosses zero
 *
 * FIXED ∈ (9,412.50, 12,700) → 11,000; COMFORTABLE ∈ (1,700, 6,700] → 4,000.
 * `rateBandTable()` prints that table and the test asserts every cell. The
 * Starter/Team/Enterprise ladder is kept as `TIERS`, with its own solved
 * constants and its own two moves, one const away.
 */
import {
  filter,
  find,
  findIndex,
  map,
  some,
  sortBy,
  sum,
} from "../../../src/fn";
import { timeOf } from "../../../src";
import type { Mutation, StackedAreaSeriesData, TimeValue } from "../../../src";
// NOT ON THE PACKAGE BARREL YET. `GroupedMutationSliders` is still on its own
// workshop bench, so it is imported by RELATIVE PATH rather than from
// `../../../src` — which says "this is not published" at the call site.
import type {
  GroupedMeasureIndex,
  GroupedMutationEntity,
} from "../../../src/components/GroupedMutationSliders";
// The mutation calendar is REUSED, not re-derived — the same snapping, the same
// numbering and the same chips as the Scenario and Hourly Boards.
import {
  addMutation,
  ensureMutation as ensureMutationOn,
  monthLabel,
  monthSlotOf,
  nextFreeSlot as nextFreeSlotOn,
  orderedMutations,
  type SegmentLabel,
  segmentLabelsOf as segmentLabelsOn,
} from "./scenario-board-people";

export { addMutation, monthLabel, orderedMutations };
export type { SegmentLabel };

// ── The span ─────────────────────────────────────────────────────────────────

/** TWO YEARS, so every annual cohort pays twice and a renewal is visible. */
export const DOMAIN_START = new Date("2025-01-01");
export const DOMAIN_END = new Date("2027-01-01");
export const TIME_DOMAIN: readonly [Date, Date] = [DOMAIN_START, DOMAIN_END];

/** Months in a year — the renewal period, and the only place 12 appears. */
export const MONTHS_PER_YEAR = 12;

// ── This board's grain is the MONTH ──────────────────────────────────────────

/** The first free MONTH from the span's start. */
export const nextFreeSlot = (
  domainStart: number,
  domainEnd: number,
  mutations: readonly Mutation[],
): number | undefined =>
  nextFreeSlotOn(domainStart, domainEnd, mutations, "month");

/** The selected change, or a new one at the next free MONTH. */
export const ensureMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly selected: string | null;
  },
  domainStart: number,
  domainEnd: number,
): { mutations: Mutation[]; selected: string | null; created: boolean } =>
  ensureMutationOn(scenario, domainStart, domainEnd, "month");

/** The as-of chips, labelled by MONTH — `2025-Q3 · Aug`. */
export const segmentLabelsOf = (
  mutations: readonly Mutation[],
): SegmentLabel[] => segmentLabelsOn(mutations, "month");

/** The month slot a picked date belongs to. A click on the License Mix plot
 *  arrives unsnapped and goes through here. */
export const monthOfPick = (at: Date | number): Date =>
  new Date(
    monthSlotOf(
      typeof at === "number" ? at : at.getTime(),
      timeOf(DOMAIN_START),
    ),
  );

/** Every month slot in the span, in order — 24 of them. */
export const MONTH_SLOTS: readonly number[] = ((): number[] => {
  const slots: number[] = [];
  const taken: Mutation[] = [];
  for (;;) {
    const at = nextFreeSlot(
      DOMAIN_START.getTime(),
      DOMAIN_END.getTime(),
      taken,
    );
    if (at === undefined) break;
    slots.push(at);
    taken.push({ id: String(at), at: new Date(at), label: "" });
  }
  return slots;
})();

/** How many months the forecast runs. 24. */
export const MONTH_COUNT = MONTH_SLOTS.length;

/** The month INDEX a moment falls in, clamped into the span. */
export const monthIndexOf = (time: number): number => {
  const at = monthSlotOf(time, DOMAIN_START.getTime());
  const index = findIndex((slot: number) => slot === at, MONTH_SLOTS);
  if (index >= 0) return index;
  return time <= DOMAIN_START.getTime() ? 0 : MONTH_COUNT - 1;
};

/** A day, in ms. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** A timestamp as its UTC calendar date. */
const isoDate = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

/** A month as its first and last DAY — what the License Mix hover reads. */
export const monthRangeOf = (
  time: number,
): { start: number; end: number; label: string } => {
  const start = monthSlotOf(time, DOMAIN_START.getTime());
  const at = new Date(start);
  const nextMonth = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
  const end = Math.min(nextMonth, DOMAIN_END.getTime()) - DAY_MS;
  return { start, end, label: `${isoDate(start)} to ${isoDate(end)}` };
};

// ── The products ─────────────────────────────────────────────────────────────

/** How many licences, moving how fast. Both variants answer this the same
 *  way — RAW NUMBERS, not percentages (Peter, 2026-09-18). */
export interface Population {
  /** Licences in force when this plan takes effect. */
  readonly count: number;
  /** NET change a month — sales less churn. See the header's three regimes. */
  readonly delta: number;
}

/** The MONTHLY variant: a population and the price one licence pays a month. */
export interface MonthlyVariant extends Population {
  /** Dollars a month, per licence. */
  readonly fee: number;
}

/**
 * The ANNUAL variant: a population and a DISCOUNT, not a price.
 *
 * `pct` is what an annual licence is sold for as a percentage of twelve monthly
 * ones, so the annual price is DERIVED (`annualFeeOf`) rather than stored. The
 * count and the Δ are raw numbers exactly as the monthly ones are; only the
 * price is a percentage.
 */
export interface AnnualVariant extends Population {
  /** The annual price, as a percentage of twelve monthly fees. */
  readonly pct: number;
}

/** What one product is worth: its two billing variants, six numbers. */
export interface Plan {
  readonly monthly: MonthlyVariant;
  readonly annual: AnnualVariant;
}

/**
 * WHAT ONE ANNUAL LICENCE COSTS A YEAR — derived, never stored.
 *
 *     annual fee = monthly fee × 12 × pct / 100
 *
 * THE MONTHLY `$` DIAL THEREFORE PRICES BOTH VARIANTS, and that coupling is the
 * point of expressing the annual side as a discount: raising the monthly fee
 * raises what every annual renewal brings in, without the reader having to
 * remember to move a second dial to keep the two in step. It also means a change
 * to the monthly fee at month 6 changes the cash of an annual cohort renewing at
 * month 12 — which the test pins, because it is the kind of coupling that is
 * easy to write and easy to lose.
 */
export const annualFeeOf = (plan: Plan): number =>
  (plan.monthly.fee * MONTHS_PER_YEAR * plan.annual.pct) / 100;

/** The six shaded boxes, in dial order. */
export interface PlanRanges {
  readonly monthlyCount: readonly [number, number];
  readonly monthlyDelta: readonly [number, number];
  readonly monthlyFee: readonly [number, number];
  readonly annualCount: readonly [number, number];
  readonly annualDelta: readonly [number, number];
  readonly annualPct: readonly [number, number];
}

/** A product the business sells — a SEGMENT or a RAY on the time axis. */
export interface Product {
  readonly id: string;
  readonly label: string;
  readonly start: number;
  readonly end?: number;
  /** The plan it opens on. `null` = launched at a mutation instead. */
  readonly committed: Plan | null;
  readonly ranges: PlanRanges;
  readonly changes: Readonly<Record<string, Plan | null>>;
}

/** Is `time` inside the product's own life? */
export const isLiveAt = (product: Product, time: number): boolean =>
  time >= product.start && (product.end === undefined || time < product.end);

/**
 * THE SIX DIALS OF ONE CARD, and their positions — the only place this order is
 * written down. `axes` at the bench is positioned against it, and `FIELDS`
 * translates a measure index back into the plan field it writes.
 */
export type PlanField =
  | "monthlyCount"
  | "monthlyDelta"
  | "monthlyFee"
  | "annualCount"
  | "annualDelta"
  | "annualPct";

export const FIELDS: readonly PlanField[] = [
  "monthlyCount",
  "monthlyDelta",
  "monthlyFee",
  "annualCount",
  "annualDelta",
  "annualPct",
];

export const MONTHLY_COUNT: GroupedMeasureIndex = 0;
export const MONTHLY_DELTA: GroupedMeasureIndex = 1;
export const MONTHLY_FEE: GroupedMeasureIndex = 2;
export const ANNUAL_COUNT: GroupedMeasureIndex = 3;
export const ANNUAL_DELTA: GroupedMeasureIndex = 4;
export const ANNUAL_PCT: GroupedMeasureIndex = 5;

/**
 * The shared tracks every card is drawn on.
 *
 * SIZED TO THE REAL BUSINESS (Peter's own figures, 2026-09-18): Amygdala sells
 * thirteen monthly licences and JTF sells one. On a 0–500 track those are
 * slivers a pointer cannot aim at and an eye cannot read, so the count track
 * stops at 50 — every figure in the fixture sits in the lower half of it with
 * room to double, which is what a track is for.
 */
export const COUNT_DOMAIN: readonly [number, number] = [0, 50];
/** Δ runs BOTH WAYS around zero, because that is the whole point of it: the
 *  same dial says growing, stable and dying depending which side it sits. */
export const DELTA_DOMAIN: readonly [number, number] = [-5, 5];
export const MONTHLY_FEE_DOMAIN: readonly [number, number] = [0, 6_000];
/**
 * The percentage track runs the WHOLE range, 0 to 100.
 *
 * An earlier pass floored it at 50, on the argument that half price is already
 * an aggressive prepay discount. Peter's own figures killed that: JTF's annual
 * licence costs $12,000 a year against a $5,000 monthly fee, which is 20% of
 * twelve months — a deep multi-year-style discount that a 50–100 track cannot
 * express at all. The rule was a guess about what a business would offer, and
 * the business offers otherwise.
 *
 * 100 is still the ceiling: an annual licence sold for MORE than twelve monthly
 * ones is a penalty for paying up front, and a dial that could express it would
 * invite it.
 */
export const PCT_DOMAIN: readonly [number, number] = [0, 100];

/** Read one field out of a plan. */
export const fieldValue = (plan: Plan, field: PlanField): number => {
  if (field === "monthlyCount") return plan.monthly.count;
  if (field === "monthlyDelta") return plan.monthly.delta;
  if (field === "monthlyFee") return plan.monthly.fee;
  if (field === "annualCount") return plan.annual.count;
  if (field === "annualDelta") return plan.annual.delta;
  return plan.annual.pct;
};

/** One field of a plan, replaced; the other five carried forward untouched. */
export const withField = (
  plan: Plan,
  field: PlanField,
  value: number,
): Plan => {
  if (field === "monthlyCount")
    return { ...plan, monthly: { ...plan.monthly, count: value } };
  if (field === "monthlyDelta")
    return { ...plan, monthly: { ...plan.monthly, delta: value } };
  if (field === "monthlyFee")
    return { ...plan, monthly: { ...plan.monthly, fee: value } };
  if (field === "annualCount")
    return { ...plan, annual: { ...plan.annual, count: value } };
  if (field === "annualDelta")
    return { ...plan, annual: { ...plan.annual, delta: value } };
  return { ...plan, annual: { ...plan.annual, pct: value } };
};

/** The range one field is held inside. */
export const rangeOf = (
  ranges: PlanRanges,
  field: PlanField,
): readonly [number, number] => ranges[field];

/** A number held inside a range. */
const held = (value: number, range: readonly [number, number]): number =>
  Math.min(Math.max(value, range[0]), range[1]);

/** A plan inside the product's allowance — all six measures at once. */
const clamped = (product: Product, plan: Plan | null): Plan | null => {
  if (plan === null) return null;
  let inside = plan;
  for (const field of FIELDS) {
    inside = withField(
      inside,
      field,
      held(fieldValue(inside, field), rangeOf(product.ranges, field)),
    );
  }
  return inside;
};

// ── The fixtures ─────────────────────────────────────────────────────────────

/**
 * ONE CALIBRATION ROW'S MOVE.
 *
 *   • `lost`  — this product's MONTHLY licences go to zero. The cliff a business
 *               falls off when one big customer leaves.
 *   • `delta` — this product's monthly Δ becomes `to`, turning a stable base
 *               into a dying one.
 *
 * Two shapes rather than one because the two catalogues fail differently, and a
 * calibration that could only express one of them would have to pretend.
 */
export type CalibrationMove =
  | { readonly kind: "lost"; readonly product: string }
  | { readonly kind: "delta"; readonly product: string; readonly to: number };

/** Everything a catalogue needs: the products, and the constants solved against
 *  them. Flip `FIXTURE` below to swap the whole board over. */
export interface Fixture {
  readonly label: string;
  readonly products: readonly Product[];
  readonly fixedMonthlyCost: number;
  readonly comfortable: number;
  readonly rateDomain: readonly [number, number];
  readonly cashCap: number;
  /**
   * THE TWO ROWS BELOW "as it opens": what each one does, to which product.
   *
   * IT IS NO LONGER "stall Δ to 0, then take it negative". Peter's own fixture
   * opens with EVERY Δ at zero — a stable base he will move himself — so
   * stalling one to zero is a no-op and would have printed a yellow row
   * identical to the green one. The rows have to be moves that actually bite,
   * and WHICH move bites depends on the catalogue: losing JTF's single $5,000
   * licence costs more than Amygdala's whole annual side.
   *
   * So a row is a MOVE, and the fixture names both. `yellow` must land above
   * zero and below `comfortable`; `red` must cross zero. The test asserts
   * exactly that for both fixtures.
   */
  readonly calibration: {
    readonly yellow: CalibrationMove;
    readonly red: CalibrationMove;
  };
}

/**
 * APPS — Peter's own two products, and the ACTIVE fixture.
 *
 * Amygdala is a growing monthly base (Δ +2) with a stable annual one; JTF is
 * dying on both (Δ −1 each). Between them the board shows all three regimes at
 * once, which is what makes the picture worth drawing: one band ramps, one falls
 * to zero and stops, and two are pure spikes twelve months apart.
 */
export const APPS: Fixture = {
  label: "Apps",
  fixedMonthlyCost: 11_000,
  comfortable: 4_000,
  rateDomain: [-11_000, 30_000],
  cashCap: 35_000,
  calibration: {
    yellow: { kind: "lost", product: "jtf" },
    red: { kind: "delta", product: "amygdala", to: -1 },
  },
  products: [
    {
      id: "amygdala",
      label: "Amygdala",
      start: DOMAIN_START.getTime(),
      committed: {
        monthly: { count: 13, delta: 0, fee: 900 },
        // NO ANNUAL LICENCES YET, and that is a real state rather than a gap:
        // a count of zero opens no cohort, so the `yr` band is flat at nothing
        // and the two `yr` dials sit there waiting to be moved. It is also the
        // case most likely to be got wrong, so the test pins it.
        annual: { count: 0, delta: 0, pct: 85 },
      },
      ranges: {
        monthlyCount: [0, 50],
        monthlyDelta: [-5, 5],
        monthlyFee: [200, 2_000],
        annualCount: [0, 30],
        annualDelta: [-5, 5],
        annualPct: [0, 100],
      },
      changes: {},
    },
    {
      id: "jtf",
      label: "JTF",
      start: DOMAIN_START.getTime(),
      committed: {
        monthly: { count: 1, delta: 0, fee: 5_000 },
        // ONE annual licence at 20% of twelve monthly fees — $12,000 a year
        // against a $5,000 monthly one. That 20% is why the percentage track
        // had to reach the floor: it is a real price, and a 50–100 track could
        // not express it.
        annual: { count: 1, delta: 0, pct: 20 },
      },
      ranges: {
        monthlyCount: [0, 10],
        monthlyDelta: [-5, 5],
        monthlyFee: [1_000, 6_000],
        annualCount: [0, 10],
        annualDelta: [-5, 5],
        annualPct: [0, 100],
      },
      changes: {},
    },
  ],
};

/**
 * TIERS — one card per price point, the alternative catalogue, kept so the board
 * can be read as one app's pricing ladder rather than a portfolio.
 *
 * Re-scaled onto the same tracks as APPS (counts under 50, fees under $6,000),
 * because the tracks are the board's and a fixture that needed its own would be
 * two boards. Its four constants are solved the same way against its own two
 * moves, and the test asserts them too, so this fixture cannot rot while it is
 * not the active one:
 *
 *     scenario                          cash/mo     net/mo    band
 *     -------------------------------   ---------   -------   ------
 *     as it opens                       37,820.00   8,320.00  green
 *     Starter's monthly Δ goes to −6    31,103.33   1,603.33  yellow
 *     Enterprise's monthly licences go  27,820.00  −1,680.00  red
 *
 * FIXED ∈ (27,820, 31,103.33) → 29,500; COMFORTABLE ∈ (1,603.33, 8,320] →
 * 5,000. NOTE WHICH MOVE IS WHICH: here a dying Starter is the YELLOW row and
 * losing Enterprise is RED, the opposite way round from APPS — because
 * Enterprise carries the expensive licences on this ladder while JTF carries
 * them on the other. That is the whole reason a row is a MOVE the fixture names
 * rather than a fixed recipe.
 */
export const TIERS: Fixture = {
  label: "Tiers",
  fixedMonthlyCost: 29_500,
  comfortable: 5_000,
  rateDomain: [-29_500, 60_000],
  cashCap: 150_000,
  calibration: {
    yellow: { kind: "delta", product: "starter", to: -6 },
    red: { kind: "lost", product: "enterprise" },
  },
  products: [
    {
      id: "starter",
      label: "Starter",
      start: DOMAIN_START.getTime(),
      committed: {
        monthly: { count: 40, delta: 0, fee: 200 },
        annual: { count: 10, delta: 0, pct: 85 },
      },
      ranges: {
        monthlyCount: [0, 50],
        monthlyDelta: [-5, 5],
        monthlyFee: [100, 600],
        annualCount: [0, 30],
        annualDelta: [-5, 5],
        annualPct: [0, 100],
      },
      changes: {},
    },
    {
      id: "team",
      label: "Team",
      start: DOMAIN_START.getTime(),
      committed: {
        monthly: { count: 12, delta: 0, fee: 900 },
        annual: { count: 6, delta: 0, pct: 80 },
      },
      ranges: {
        monthlyCount: [0, 30],
        monthlyDelta: [-5, 5],
        monthlyFee: [500, 2_000],
        annualCount: [0, 20],
        annualDelta: [-5, 5],
        annualPct: [0, 100],
      },
      changes: {},
    },
    {
      id: "enterprise",
      label: "Enterprise",
      start: DOMAIN_START.getTime(),
      committed: {
        monthly: { count: 2, delta: 0, fee: 5_000 },
        annual: { count: 3, delta: 0, pct: 20 },
      },
      ranges: {
        monthlyCount: [0, 10],
        monthlyDelta: [-5, 5],
        monthlyFee: [2_000, 6_000],
        annualCount: [0, 10],
        annualDelta: [-5, 5],
        annualPct: [0, 100],
      },
      changes: {},
    },
  ],
};

/** FLIP THIS ONE CONST to swap the whole board over: `APPS` or `TIERS`. */
export const FIXTURE: Fixture = APPS;

export const PRODUCTS: readonly Product[] = FIXTURE.products;
export const FIXED_MONTHLY_COST = FIXTURE.fixedMonthlyCost;
export const COMFORTABLE = FIXTURE.comfortable;
export const RATE_DOMAIN: readonly [number, number] = FIXTURE.rateDomain;
export const DEFAULT_CASH_CAP = FIXTURE.cashCap;

/** The board opens with NO changes; the first interaction makes its own. */
export const SEED_MUTATIONS: readonly Mutation[] = [];

// ── Walking the history ──────────────────────────────────────────────────────

/** The moment a mutation sits at. */
const timeOfMutation = (
  mutationId: string,
  mutations: readonly Mutation[],
): number =>
  timeOf(
    find((mutation: Mutation) => mutation.id === mutationId, mutations)?.at ??
      DOMAIN_START,
  );

/** One stretch of a product's life on one plan. */
export interface Segment {
  /** The month index this plan takes effect at. */
  readonly from: number;
  /** The plan, or `null` for a stretch where the product is not sold. */
  readonly plan: Plan | null;
}

/**
 * A product's life as SEGMENTS, in month order — its committed plan from its
 * start, then one per change.
 *
 * The forecast walks these rather than reading a plan at every month, because Δ
 * needs to know how long the CURRENT plan has been in force: a change at month 6
 * RE-BASES the ramp, so its count is read from month 6 and not from month 0. A
 * per-month lookup has no way to say that.
 */
export const segmentsOf = (
  product: Product,
  mutations: readonly Mutation[],
): Segment[] => {
  const segments: Segment[] = [
    {
      from: monthIndexOf(product.start),
      plan: clamped(product, product.committed),
    },
  ];
  for (const mutation of orderedMutations(mutations)) {
    const own = product.changes[mutation.id];
    if (own === undefined) continue;
    segments.push({
      from: monthIndexOf(timeOfMutation(mutation.id, mutations)),
      plan: clamped(product, own),
    });
  }
  return collapse(sortBy((segment: Segment) => segment.from, segments));
};

/**
 * ONE SEGMENT PER MONTH — the later declaration wins.
 *
 * ⚠ THIS IS A BUG FIX WITH A REAL SYMPTOM. A change made in the span's FIRST
 * month sits at the same month index as the committed plan, so the walk
 * produced two segments both starting at 0. `segmentAt` picked the later one
 * (correct), but `cohortsOf` walks EVERY segment — so it opened the annual base
 * twice, and the product billed its whole annual base twice in month 0 and
 * again twice at the renewal.
 *
 * It was invisible in the numbers and loud in the gauge: nudging Amygdala's `%`
 * dial by one point moved the reading by +$512/mo, when the honest answer is
 * about +$6/mo. A doubled base is exactly the kind of error that looks like a
 * plausible chart.
 *
 * Collapsing here rather than at each reader is what makes it structural: there
 * is no month with two plans, so nothing downstream has to remember that there
 * could be.
 */
const collapse = (ordered: readonly Segment[]): Segment[] => {
  const kept: Segment[] = [];
  for (const segment of ordered) {
    const last = kept[kept.length - 1];
    if (last !== undefined && last.from === segment.from) kept.pop();
    kept.push(segment);
  }
  return kept;
};

/** The segment in force at a month index, or `undefined` before the first. */
export const segmentAt = (
  segments: readonly Segment[],
  month: number,
): Segment | undefined => {
  let current: Segment | undefined;
  for (const segment of segments) {
    if (segment.from > month) break;
    current = segment;
  }
  return current;
};

/** The plan in force at a month index — `null` when not sold then. */
export const planAtMonth = (
  product: Product,
  month: number,
  mutations: readonly Mutation[],
): Plan | null => {
  const slot = MONTH_SLOTS[month];
  if (slot !== undefined && !isLiveAt(product, slot)) return null;
  return segmentAt(segmentsOf(product, mutations), month)?.plan ?? null;
};

// ── MONTHLY licences: a count times a fee ───────────────────────────────────

/** The count a variant has reached, `months` months after its plan took effect.
 *  CLAMPED AT ZERO: a dying base stops at nothing, not below it. */
export const countAfter = (population: Population, months: number): number =>
  Math.max(0, population.count + population.delta * months);

/** What a product's MONTHLY licences bill in each month of the span. */
export const monthlyCashByMonth = (
  product: Product,
  mutations: readonly Mutation[],
): number[] => {
  const segments = segmentsOf(product, mutations);
  return map((slot: number, month: number) => {
    if (!isLiveAt(product, slot)) return 0;
    const segment = segmentAt(segments, month);
    const plan = segment?.plan;
    if (segment === undefined || plan === null || plan === undefined) return 0;
    return countAfter(plan.monthly, month - segment.from) * plan.monthly.fee;
  }, MONTH_SLOTS);
};

// ── ANNUAL licences: cohorts, paying once a year ────────────────────────────

/** One cohort of annual licences: how many, bought when, churning how fast. */
export interface Cohort {
  /** Licences in the cohort when it first paid. */
  readonly size: number;
  /** The month index it first paid in. */
  readonly bornAt: number;
  /** The Δ in force when it was born. Negative shrinks it at each renewal. */
  readonly churn: number;
}

/**
 * What a cohort renews at on its `k`-th anniversary. `k = 0` is its first
 * payment, which is always its full size.
 *
 * CHURN BITES AT RENEWAL — Peter's worked example: ten licences at Δ = −1 show
 * "10 × fee for the first month and 9 × fee for the 12th month". The shrink is
 * applied ONCE PER YEAR, not once per month. See the header's ⚠ for the reading
 * this rules out.
 *
 * A positive Δ does not grow a cohort; it opens NEW ones (`cohortsOf`), because
 * a new sale is a new anniversary and paying it on an older cohort's date would
 * move its cash by up to eleven months.
 */
export const cohortSizeAt = (cohort: Cohort, anniversary: number): number => {
  if (anniversary <= 0) return Math.max(0, cohort.size);
  if (cohort.churn >= 0) return Math.max(0, cohort.size);
  return Math.max(0, cohort.size + cohort.churn * anniversary);
};

/**
 * EVERY COHORT a product's annual licences produce across the span.
 *
 * Each segment opens its counted base at its own first month, plus one cohort of
 * Δ in every later month it is in force when Δ > 0.
 *
 * ⚠ THE SECOND READING I HAD TO CHOOSE — what a CHANGE does. A change at month M
 * re-declares the annual base: the cohorts the previous segment would have
 * opened after M are not opened, and the new segment's `#` becomes a cohort
 * paying at M. That is the simplest rule the six dials can express — the `#`
 * dial means "this many annual licences, from here" — and it is honest in the
 * common case, because raising `#` at M IS a sale and a sale is paid for in the
 * month it happens.
 *
 * What it gets wrong is the reader who edits `#` at M without intending a sale:
 * they are charged the whole base again at M rather than only the difference.
 * The alternative — diffing against the live base, opening a cohort for the
 * increment alone and keeping the old anniversaries — is more nearly right and
 * makes the `#` dial mean "the total I want, and I will work out what that costs
 * and when", which is a harder thing to read off a slider. FLAGGED rather than
 * decided silently. The board opens with no changes, so nothing in the
 * calibration depends on it.
 */
export const cohortsOf = (
  product: Product,
  mutations: readonly Mutation[],
): Cohort[] => {
  const segments = segmentsOf(product, mutations);
  const cohorts: Cohort[] = [];
  for (const [index, segment] of segments.entries()) {
    const plan = segment.plan;
    if (plan === null) continue;
    const next = segments[index + 1];
    const until = next === undefined ? MONTH_COUNT : next.from;
    const { annual } = plan;
    if (annual.count > 0) {
      cohorts.push({
        size: annual.count,
        bornAt: segment.from,
        churn: annual.delta,
      });
    }
    if (annual.delta > 0) {
      for (let month = segment.from + 1; month < until; month += 1) {
        cohorts.push({
          size: annual.delta,
          bornAt: month,
          churn: annual.delta,
        });
      }
    }
  }
  return cohorts;
};

/**
 * What a product's ANNUAL licences bill in each month of the span.
 *
 * Every cohort pays in the month it is born and every twelve months after, at
 * the fee in force THEN — so a fee raised at month 6 is what the month-12
 * renewal costs, which is what a renewal actually does.
 */
export const annualCashByMonth = (
  product: Product,
  mutations: readonly Mutation[],
): number[] => {
  const segments = segmentsOf(product, mutations);
  const cash = map(() => 0, MONTH_SLOTS);
  for (const cohort of cohortsOf(product, mutations)) {
    let month = cohort.bornAt;
    let anniversary = 0;
    while (month < MONTH_COUNT) {
      const slot = MONTH_SLOTS[month];
      if (slot !== undefined && isLiveAt(product, slot)) {
        const plan = segmentAt(segments, month)?.plan;
        const fee = plan === null || plan === undefined ? 0 : annualFeeOf(plan);
        cash[month] =
          (cash[month] ?? 0) + cohortSizeAt(cohort, anniversary) * fee;
      }
      month += MONTHS_PER_YEAR;
      anniversary += 1;
    }
  }
  return cash;
};

// ── Sources: a product × a billing variant ──────────────────────────────────

/** The two ways a product bills. A SOURCE is a product on one of them. */
export type Billing = "mo" | "yr";

/** One band of the License Mix chart: where cash comes from, month by month. */
export interface CashSource {
  readonly id: string;
  readonly label: string;
  readonly productId: string;
  readonly billing: Billing;
  /** Cash in each month of the span, in dollars. */
  readonly cash: readonly number[];
}

/** EVERY SOURCE, two per product. See the header for why a band is a VARIANT
 *  rather than a whole product. */
export const cashSources = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): CashSource[] => {
  const sources: CashSource[] = [];
  for (const product of products) {
    sources.push({
      id: `${product.id}-mo`,
      label: `${product.label} · mo`,
      productId: product.id,
      billing: "mo",
      cash: monthlyCashByMonth(product, mutations),
    });
    sources.push({
      id: `${product.id}-yr`,
      label: `${product.label} · yr`,
      productId: product.id,
      billing: "yr",
      cash: annualCashByMonth(product, mutations),
    });
  }
  return sources;
};

/** Total cash in each month, from every source. */
export const cashByMonth = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): number[] => {
  const sources = cashSources(products, mutations);
  return map(
    (_slot: number, month: number) =>
      sum(map((source: CashSource) => source.cash[month] ?? 0, sources)),
    MONTH_SLOTS,
  );
};

/** NET cash in each month — everything sold, less the fixed monthly cost. */
export const netCashByMonth = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  fixed: number = FIXED_MONTHLY_COST,
): number[] =>
  map((cash: number) => cash - fixed, cashByMonth(products, mutations));

/** Average GROSS cash a month across the span. */
export const averageCash = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): number => sum(cashByMonth(products, mutations)) / Math.max(MONTH_COUNT, 1);

/**
 * THE GAUGE'S READING: average NET cash a month across the whole span.
 *
 * A plain mean, not a time-weighted integral, and that is the simplification
 * cash buys: every month is one month, the cash in it is a number, and the mean
 * of 24 numbers needs no weighting. (The boards this one descends from had to
 * integrate, because their quantity was a RATE that changed between samples.)
 */
export const averageNetCash = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  fixed: number = FIXED_MONTHLY_COST,
): number =>
  sum(netCashByMonth(products, mutations, fixed)) / Math.max(MONTH_COUNT, 1);

/** The rate the board opens on, and the gauge's baseline. */
export const COMMITTED_RATE = averageNetCash(PRODUCTS, SEED_MUTATIONS);

/** What the gauge will actually DRAW — the domain clamp, named. */
export const drawnRate = (rate: number): number =>
  Math.min(Math.max(rate, RATE_DOMAIN[0]), RATE_DOMAIN[1]);

/** Is this rate off the end of the dial? Then the table must say so. */
export const isOffDial = (rate: number): boolean => drawnRate(rate) !== rate;

// ── The running balance ─────────────────────────────────────────────────────

/** The opening bank balance, in dollars. */
export const OPENING_BALANCE = 38_000;

/**
 * THE WHOLE FOLD: the balance at the end of each month.
 *
 *     balance(m) = balance(m − 1) + cash(m) − fixed
 *
 * LUMPY on purpose. The annual cohorts land as single months of five figures, so
 * the line STEPS at every anniversary rather than sloping — which is what a
 * licence business's bank account actually does, and the reason this board
 * stopped integrating a smooth rate.
 */
export const balancesByMonth = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  opening: number = OPENING_BALANCE,
  fixed: number = FIXED_MONTHLY_COST,
): number[] => {
  const balances: number[] = [];
  let carried = opening;
  for (const flow of netCashByMonth(products, mutations, fixed)) {
    carried += flow;
    balances.push(carried);
  }
  return balances;
};

/** The fan's half-width at a month: ZERO at the month being edited, widening
 *  with the SQUARE of the months since — a forecast is surer about next month
 *  than next year. */
export const UNCERTAINTY_PER_MONTH_SQUARED = 120;

export const fanAt = (index: number, nowIndex: number): number => {
  const months = index - nowIndex;
  return months <= 0 ? 0 : UNCERTAINTY_PER_MONTH_SQUARED * months * months;
};

// ── The dials ───────────────────────────────────────────────────────────────

/** One card: six measures under one product name. */
export const entityOf = (
  product: Product,
  before: Plan | null,
  from: Plan | null,
): GroupedMutationEntity => ({
  id: product.id,
  label: product.label,
  measures: map(
    (field: PlanField) => ({
      prior: before === null ? null : fieldValue(before, field),
      value: from === null ? null : fieldValue(from, field),
      range: rangeOf(product.ranges, field),
    }),
    FIELDS,
  ),
});

/** The plan a product carried JUST BEFORE a mutation. */
export const planBefore = (
  product: Product,
  mutationId: string,
  mutations: readonly Mutation[],
): Plan | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (at < product.start) return null;
  if (product.end !== undefined && at > product.end) return null;
  let carried = product.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (mutation.id === mutationId) break;
    const own = product.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return clamped(product, carried);
};

/** The plan from a mutation onward. */
export const planFrom = (
  product: Product,
  mutationId: string,
  mutations: readonly Mutation[],
): Plan | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (!isLiveAt(product, at)) return null;
  const own = product.changes[mutationId];
  if (own !== undefined) return clamped(product, own);
  return planBefore(product, mutationId, mutations);
};

/** Is this product on the books at the mutation being edited? */
export const isSoldAt = (before: Plan | null, from: Plan | null): boolean =>
  before !== null || from !== null;

/** One product read across one mutation. */
interface AcrossMutation {
  readonly product: Product;
  readonly before: Plan | null;
  readonly from: Plan | null;
}

/** THE CARDS, for a mutation or for the opening state. */
export const entitiesFor = (
  products: readonly Product[],
  mutationId: string | null,
  mutations: readonly Mutation[],
): GroupedMutationEntity[] => {
  const rows: AcrossMutation[] = [];
  for (const product of products) {
    if (mutationId === null) {
      if (product.committed === null) continue;
      const opening = clamped(product, product.committed);
      rows.push({ product, before: opening, from: opening });
      continue;
    }
    const before = planBefore(product, mutationId, mutations);
    const from = planFrom(product, mutationId, mutations);
    if (!isSoldAt(before, from)) continue;
    rows.push({ product, before, from });
  }
  return map(
    (row: AcrossMutation) => entityOf(row.product, row.before, row.from),
    rows,
  );
};

/**
 * THE LINE UNDER A CARD: what this product bills in a STEADY month — its
 * monthly base alone.
 *
 * The monthly half and not the whole, because the whole is not a monthly
 * figure: the annual half arrives twice in twenty-four months and calling its
 * lump part of "a month" would be the one number on the board that is an average
 * pretending to be a reading. The annual side gets its own line.
 *
 * `null` for a discontinued product, which draws an empty line.
 */
export const monthlyCashOfEntity = (
  entity: GroupedMutationEntity,
): number | null => {
  const count = entity.measures[MONTHLY_COUNT]?.value ?? null;
  const fee = entity.measures[MONTHLY_FEE]?.value ?? null;
  if (count === null || fee === null) return null;
  return count * fee;
};

/**
 * WHAT ONE ANNUAL LICENCE ON THIS CARD COSTS A YEAR — the derived price, read
 * off the card's own dials: `monthly $ × 12 × % / 100`.
 *
 * It is the figure on the invoice, and the thing the `%` dial is actually
 * setting — so the card prints it, because a dial whose result the reader cannot
 * see is a dial they cannot check. `null` for a discontinued product.
 */
export const annualPriceOfEntity = (
  entity: GroupedMutationEntity,
): number | null => {
  const fee = entity.measures[MONTHLY_FEE]?.value ?? null;
  const pct = entity.measures[ANNUAL_PCT]?.value ?? null;
  if (fee === null || pct === null) return null;
  return (fee * MONTHS_PER_YEAR * pct) / 100;
};

/** What this product's whole annual base bills WHEN IT PAYS — the lump, not a
 *  twelfth of it. `null` for a discontinued product. */
export const annualLumpOfEntity = (
  entity: GroupedMutationEntity,
): number | null => {
  const count = entity.measures[ANNUAL_COUNT]?.value ?? null;
  const price = annualPriceOfEntity(entity);
  if (count === null || price === null) return null;
  return count * price;
};

// ── Editing ─────────────────────────────────────────────────────────────────

export const withChange = (
  products: readonly Product[],
  id: string,
  mutationId: string,
  field: PlanField,
  value: number,
  mutations: readonly Mutation[],
): Product[] =>
  map((product: Product) => {
    if (product.id !== id) return product;
    const base =
      planFrom(product, mutationId, mutations) ??
      planBefore(product, mutationId, mutations);
    if (base === null) return product;
    return {
      ...product,
      changes: {
        ...product.changes,
        [mutationId]: withField(base, field, value),
      },
    };
  }, products);

/** ⊗ Discontinue: off the books from the selected change onward. */
export const withDiscontinue = (
  products: readonly Product[],
  id: string,
  mutationId: string,
): Product[] =>
  map(
    (product: Product) =>
      product.id === id
        ? { ...product, changes: { ...product.changes, [mutationId]: null } }
        : product,
    products,
  );

/** ↺ Relaunch: DELETE the change rather than invent a plan. */
export const withoutChange = (
  products: readonly Product[],
  id: string,
  mutationId: string,
): Product[] =>
  map((product: Product) => {
    if (product.id !== id) return product;
    const { [mutationId]: _dropped, ...rest } = product.changes;
    return { ...product, changes: rest };
  }, products);

// ── Launching a product ─────────────────────────────────────────────────────

export interface ProductDraft {
  readonly name: string;
  readonly monthlyCount: number | undefined;
  readonly monthlyDelta: number | undefined;
  readonly monthlyFee: number | undefined;
  readonly annualCount: number | undefined;
  readonly annualDelta: number | undefined;
  readonly annualPct: number | undefined;
}

export const EMPTY_DRAFT: ProductDraft = {
  name: "",
  monthlyCount: 10,
  monthlyDelta: 1,
  monthlyFee: 50,
  annualCount: 4,
  annualDelta: 0,
  annualPct: 85,
};

export const draftName = (draft: ProductDraft): string => draft.name.trim();

/** The tracks a launched product gets — the whole axes, because a product
 *  invented in a modal has negotiated no band of its own. */
export const LAUNCH_RANGES: PlanRanges = {
  monthlyCount: COUNT_DOMAIN,
  monthlyDelta: DELTA_DOMAIN,
  monthlyFee: MONTHLY_FEE_DOMAIN,
  annualCount: COUNT_DOMAIN,
  annualDelta: DELTA_DOMAIN,
  annualPct: PCT_DOMAIN,
};

export const canAdd = (draft: ProductDraft): boolean => {
  if (draftName(draft) === "") return false;
  const inside = (
    value: number | undefined,
    range: readonly [number, number],
  ): boolean => value !== undefined && value >= range[0] && value <= range[1];
  return (
    inside(draft.monthlyCount, COUNT_DOMAIN) &&
    inside(draft.monthlyDelta, DELTA_DOMAIN) &&
    inside(draft.monthlyFee, MONTHLY_FEE_DOMAIN) &&
    inside(draft.annualCount, COUNT_DOMAIN) &&
    inside(draft.annualDelta, DELTA_DOMAIN) &&
    inside(draft.annualPct, PCT_DOMAIN)
  );
};

export const uniqueId = (stem: string, taken: readonly string[]): string => {
  const slug = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug === "" ? "product" : slug;
  let candidate = base;
  let suffix = 2;
  while (taken.includes(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

export const addProduct = (
  products: readonly Product[],
  draft: ProductDraft,
  at: string,
  mutations: readonly Mutation[],
): { products: Product[]; id: string } => {
  if (!canAdd(draft)) throw new Error("Draft is not addable");
  const name = draftName(draft);
  const id = uniqueId(
    name,
    map((product: Product) => product.id, products),
  );
  const added: Product = {
    id,
    label: name,
    start: timeOfMutation(at, mutations),
    committed: null,
    ranges: LAUNCH_RANGES,
    changes: {
      [at]: {
        monthly: {
          count: draft.monthlyCount ?? 0,
          delta: draft.monthlyDelta ?? 0,
          fee: draft.monthlyFee ?? 0,
        },
        annual: {
          count: draft.annualCount ?? 0,
          delta: draft.annualDelta ?? 0,
          pct: draft.annualPct ?? PCT_DOMAIN[1],
        },
      },
    },
  };
  return { products: [...products, added], id };
};

// ── Removing a change ───────────────────────────────────────────────────────

export const addedAt = (
  product: Product,
  mutations: readonly Mutation[],
): string | undefined => {
  if (product.committed !== null) return undefined;
  return find(
    (mutation: Mutation) => product.changes[mutation.id] !== undefined,
    orderedMutations(mutations),
  )?.id;
};

export const nearestMutation = (
  mutations: readonly Mutation[],
  id: string,
): string | null => {
  const ordered = orderedMutations(mutations);
  const index = findIndex((mutation: Mutation) => mutation.id === id, ordered);
  if (index === -1) return ordered[0]?.id ?? null;
  const survivor = ordered[index + 1] ?? ordered[index - 1];
  return survivor?.id ?? null;
};

export const removeMutation = (
  scenario: {
    readonly mutations: readonly Mutation[];
    readonly products: readonly Product[];
  },
  id: string,
): { mutations: Mutation[]; products: Product[]; selected: string | null } => {
  const selected = nearestMutation(scenario.mutations, id);
  const survivors = filter(
    (product: Product) => addedAt(product, scenario.mutations) !== id,
    scenario.products,
  );
  return {
    mutations: filter(
      (mutation: Mutation) => mutation.id !== id,
      scenario.mutations,
    ),
    products: map((product: Product) => {
      const { [id]: _dropped, ...rest } = product.changes;
      return { ...product, changes: rest };
    }, survivors),
    selected,
  };
};

// ── The calibration ─────────────────────────────────────────────────────────

export type RateBand = "red" | "yellow" | "green";

export const bandOfRate = (
  rate: number,
  comfortable: number = COMFORTABLE,
): RateBand => {
  if (rate < 0) return "red";
  if (rate < comfortable) return "yellow";
  return "green";
};

export interface RateRow {
  readonly scenario: string;
  readonly cash: number;
  readonly net: number;
  readonly band: RateBand;
}

/** One product's plan rewritten everywhere in its history — the committed plan
 *  and every change — so a calibration row reads "all span". */
const rewrite = (
  products: readonly Product[],
  id: string,
  move: (plan: Plan) => Plan,
): Product[] =>
  map((product: Product) => {
    if (product.id !== id) return product;
    const moved = (plan: Plan | null): Plan | null =>
      plan === null ? null : move(plan);
    return {
      ...product,
      committed: moved(product.committed),
      changes: Object.fromEntries(
        map(
          ([key, plan]: [string, Plan | null]) => [key, moved(plan)],
          Object.entries(product.changes),
        ),
      ),
    };
  }, products);

/** A calibration row's products, and the sentence that names what it did. */
const applyMove = (
  products: readonly Product[],
  move: CalibrationMove,
): { label: string; products: readonly Product[] } => {
  const name =
    find((product: Product) => product.id === move.product, products)?.label ??
    move.product;
  if (move.kind === "lost") {
    return {
      label: `${name}'s monthly licences are lost`,
      products: rewrite(products, move.product, (plan) =>
        withField(plan, "monthlyCount", 0),
      ),
    };
  }
  return {
    // A REAL MINUS (U+2212) when the figure is negative, as everywhere else.
    label: `${name}'s monthly Δ goes to ${
      move.to < 0 ? `\u2212${Math.abs(move.to)}` : String(move.to)
    }`,
    products: rewrite(products, move.product, (plan) =>
      withField(plan, "monthlyDelta", move.to),
    ),
  };
};

/**
 * THE CALIBRATION, as data — what the gauge reads for the catalogue the board
 * opens on, and for the two MOVES the fixture names as its yellow and red.
 *
 * It takes a whole FIXTURE, not just the products, because a row's BAND depends
 * on that catalogue's own fixed cost and comfortable gain — reading one
 * catalogue's cash against another's breakeven would produce a table that looks
 * fine and describes nothing. That is what lets the test assert BOTH tables
 * while only one fixture is active.
 */
export const rateBandTable = (fixture: Fixture = FIXTURE): RateRow[] => {
  const { products, calibration } = fixture;
  const row = (
    scenario: string,
    scenarioProducts: readonly Product[],
  ): RateRow => {
    const cash = averageCash(scenarioProducts, SEED_MUTATIONS);
    const net = cash - fixture.fixedMonthlyCost;
    return { scenario, cash, net, band: bandOfRate(net, fixture.comfortable) };
  };
  const yellow = applyMove(products, calibration.yellow);
  const red = applyMove(products, calibration.red);
  return [
    row("as it opens", products),
    row(yellow.label, yellow.products),
    row(red.label, red.products),
  ];
};

// ── The License Mix chart ───────────────────────────────────────────────────

/** Population standard deviation — "how big are the bumps". */
const stdDev = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const mean = sum(values) / values.length;
  return Math.sqrt(
    sum(map((value: number) => (value - mean) ** 2, values)) / values.length,
  );
};

/** One source's variability across the span, in dollars of cash. */
export const variabilityOf = (source: CashSource): number =>
  stdDev([...source.cash]);

/**
 * Sources ordered ASCENDING by variability, so the MOST variable is LAST — the
 * TOP band. On this model that puts the ANNUAL sources on top by construction:
 * two spikes and twenty-two zeroes is the most variable thing a band can be,
 * which is exactly the shape the reader should meet first.
 */
export const byVariability = (sources: readonly CashSource[]): CashSource[] =>
  sortBy((source: CashSource) => variabilityOf(source), sources);

/** One band per SOURCE, most variable on top. */
export const licenseMixSeries = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): StackedAreaSeriesData[] =>
  map(
    (source: CashSource) => ({
      id: source.id,
      label: source.label,
      points: map(
        (slot: number, month: number) => ({
          at: new Date(slot),
          value: source.cash[month] ?? 0,
        }),
        MONTH_SLOTS,
      ),
    }),
    byVariability(cashSources(products, mutations)),
  );

/** The quarter starts inside the span — the x-axis's tick values. */
export const quarterTicks = (
  start: Date = DOMAIN_START,
  end: Date = DOMAIN_END,
): number[] => {
  const ticks: number[] = [];
  let year = start.getUTCFullYear();
  let month = Math.floor(start.getUTCMonth() / 3) * 3;
  for (;;) {
    const at = Date.UTC(year, month, 1);
    if (at >= end.getTime()) break;
    if (at >= start.getTime()) ticks.push(at);
    month += 3;
    if (month > 11) {
      month -= 12;
      year += 1;
    }
  }
  return ticks;
};

/** `2025-Q1`. The vocabulary the as-of chips name their quarter in. */
export const quarterLabelOf = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `${when.getUTCFullYear()}-Q${Math.floor(when.getUTCMonth() / 3) + 1}`;
};

// ── The headless observation ────────────────────────────────────────────────

/** One month of the cash forecast, as a row a terminal can print. */
export interface CashRow {
  readonly month: number;
  readonly label: string;
  /** One column per source, in `cashSources` order. */
  readonly bySource: readonly number[];
  readonly cash: number;
  readonly net: number;
  readonly balance: number;
}

/**
 * THE FORECAST, month by month — every source's cash beside the total, the net
 * and the running balance. This is the observation the two charts draw, so the
 * lumps can be argued with from a terminal before anyone opens a browser
 * (headless observation first).
 */
export const cashTable = (
  products: readonly Product[] = PRODUCTS,
  mutations: readonly Mutation[] = [],
  fixed: number = FIXED_MONTHLY_COST,
): CashRow[] => {
  const sources = cashSources(products, mutations);
  const balances = balancesByMonth(products, mutations, OPENING_BALANCE, fixed);
  return map((slot: number, month: number) => {
    const bySource = map(
      (source: CashSource) => source.cash[month] ?? 0,
      sources,
    );
    const cash = sum(bySource);
    return {
      month,
      label: monthLabel(new Date(slot)),
      bySource,
      cash,
      net: cash - fixed,
      balance: balances[month] ?? 0,
    };
  }, MONTH_SLOTS);
};

/** The months a product's annual licences actually paid in, and what they paid.
 *  The worked example, as data. */
export const annualPayments = (
  product: Product,
  mutations: readonly Mutation[],
): { month: number; amount: number }[] =>
  filter(
    (row: { month: number; amount: number }) => row.amount > 0,
    map(
      (amount: number, month: number) => ({ month, amount }),
      annualCashByMonth(product, mutations),
    ),
  );

// ── Save ────────────────────────────────────────────────────────────────────

export const scenarioDigest = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): string =>
  JSON.stringify({
    mutations: map(
      (mutation: Mutation) => [mutation.id, timeOf(mutation.at)],
      orderedMutations(mutations),
    ),
    products: map(
      (product: Product) => [
        product.id,
        product.committed,
        map(
          (mutation: Mutation) => product.changes[mutation.id] ?? null,
          orderedMutations(mutations),
        ),
      ],
      products,
    ),
  });

export const isDirty = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  savedDigest: string,
): boolean => scenarioDigest(products, mutations) !== savedDigest;

export const hasAnyChange = (products: readonly Product[]): boolean =>
  some((product: Product) => Object.keys(product.changes).length > 0, products);
