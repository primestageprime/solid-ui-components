/**
 * License Board — the model, as plain functions. No Solid, no DOM, no CSS.
 *
 * A business that sells LICENCES. Every region of the bench is a different
 * reading of the same four facts per product — how many MONTHLY licences are in
 * force, what one costs a month, how many ANNUAL licences are in force, and what
 * percentage of twelve monthly ones an annual one is sold for — so the
 * derivations live here, once, where they can be asserted from a terminal
 * (headless observation first). The `.tsx` beside this file holds the
 * ARRANGEMENT and the WIRING and nothing else.
 *
 * The wiring, stated once:
 *
 *   start/end + changes ──────▶ planAt   (what a product bills in a month)
 *   products ──licenseMixSeries▶ StackedTimelineChart (one band per PRODUCT, $/mo)
 *   products ──mrrAt──────────▶ rateAt ──▶ the balance line's sampled slope
 *   products ──mrrAt──────────▶ averageRate ──▶ RateGauge.value (the WHOLE year)
 *   products ──entitiesFor────▶ GroupedMutationSliders.entities (one CARD each)
 *   month pick ───────────────▶ which mutation the dials edit
 *
 * ── FOUR MEASURES, TWO GROUPS (Peter's sketch, 2026-09-18) ──────────────────
 *
 * A product's plan is four numbers in two captioned groups, and they are not
 * four independent dials: the ANNUAL PRICE IS A TRANSFORMATION OF THE MONTHLY
 * ONE.
 *
 *     mo:  #  monthly licences        $  the monthly fee
 *     yr:  #  annual licences         %  the annual price, as a percentage
 *                                        of twelve monthly fees
 *
 *     annual price = fee × 12 × pct        [$/yr]   — $1,000/mo at 90% is
 *                                                     $10,800/yr
 *
 * So the `$` dial prices BOTH groups and the `%` dial is a discount on it.
 *
 * ONE PRODUCT IS ONE CARD (Peter, 2026-09-18: "rather than having one product
 * with 6 variants, I want N products with 2 variants (monthly and annual)").
 * The bench draws each product as a single `GroupedMutationSliders` card — the
 * product name as its pressable header, four dials under it in the two captioned
 * groups above — and pages by whole cards when they do not fit.
 *
 * THAT DELETED A LOT OF THIS MODULE. The board's first pass drew two
 * `PairedMutationSliders` rows, because that component is a PAIR by type
 * (`measures: [PairedMeasure, PairedMeasure]`) and four dials under one name is
 * not expressible on it. Keeping two rows honest cost six pieces here —
 * `monthlyPairs`, `annualPairs`, a shared `soldAcross` walk, two per-row range
 * helpers and a `shownPlanOf` lookup, the last because a summary needs all four
 * numbers and a paired entity only ever carried two. One entity carries all
 * four, so `entitiesFor` is one walk and `monthlyOfEntity` reads the card in
 * front of it. All six are gone.
 *
 * It also cost the LAYOUT: two rows needed ~700px of a 1300px viewport, which is
 * why that pass had to give the charts a stated height. One row is ~325px, so
 * the board is back to the plain 50/50 frame the other two boards use and the
 * License Mix chart has its height back.
 *
 * ── THE UNIT IS DOLLARS A MONTH ─────────────────────────────────────────────
 *
 * Every money figure this board quotes is $/MO — each product's summary, both
 * of the gauge's sentences, its domain and baseline, the fixed cost and every
 * DEBUG table:
 *
 *     product MRR = #mo × $ + #yr × $ × pct          [$/mo]
 *     MRR         = Σ over products
 *     rate        = MRR − fixed monthly cost         [$/mo]
 *
 * An annual licence's monthly EQUIVALENT is `fee × pct`, which is the annual
 * price divided by twelve — the ×12 and the ÷12 cancel exactly, and that
 * cancellation is why there is no ×12 anywhere in the arithmetic below.
 *
 * ⚠ CASH TIMING IS RECOGNISED MONTHLY, NOT AT PURCHASE. An annual licence is
 * billed a year UP FRONT, so the real cash flow is a lump at the purchase month
 * and again at each renewal, while this board spreads it evenly. That is a
 * deliberate first pass — it makes the gauge, the stack and the projection one
 * arithmetic — and it is WRONG about the bank balance in any month an annual
 * cohort renews. The alternative (annual prepay as lumps on the Cash Flow chart
 * at purchase and renewal months) needs a renewal-month per cohort, which the
 * fixture does not carry yet. Flagged to Peter rather than chosen silently.
 *
 * Because the rate is per MONTH and the cash chart's cells ARE months, this
 * board needs no unit bridge at all: the Hourly Board's `WEEKS_PER_UNIT` table
 * and its `monthlyFrom` collapse here to a factor of one, which
 * `MONTHS_PER_UNIT` below says out loud rather than leaving implicit.
 *
 * ── A PRODUCT IS A SEGMENT OR A RAY, AND ITS YEAR IS CHANGE EVENTS ──────────
 *
 * The same shape the Hourly Board gives a service and the Scenario Board gives a
 * person. A product has a `start`, an optional `end` (present = a segment,
 * absent = a ray running off the right edge), the plan it opens on, and a
 * history of change events keyed by mutation id. What it bills in any month is
 * the last event at or before that month (`planAt`).
 *
 * A change is an ABSOLUTE plan that holds until the next one — not an offset. A
 * DISCONTINUED product is absence (`null`, which is all four measures at once),
 * hidden at later dates, and Relaunch DELETES the change so the product falls
 * back on whatever it was carrying.
 *
 * ── THE FIXTURE OPENS WITH NO CHANGES, AND THAT IS WHY THE MATHS IS EASY ────
 *
 * Three products, zero seeded mutations:
 *
 *     product      #mo    $     #yr   %      MRR/mo
 *     ----------   ----   ---   ---   ----   --------
 *     Starter      120    15     60   85 %    2,565.00
 *     Team          40    49     25   90 %    3,062.50
 *     Enterprise     2   400      6   80 %    2,720.00
 *     ---------------------------------------------------
 *     opening MRR                             8,347.50
 *
 * Three products of deliberately different SHAPES, because one band per product
 * is only worth drawing if the bands disagree — Starter is many cheap seats,
 * Enterprise is eight expensive ones, Team is in between — and yet all three
 * land within $500/mo of each other, so no band swamps the stack. Enterprise is
 * mostly ANNUAL and Starter mostly MONTHLY, which is what makes the `%` dial
 * worth having: it moves Enterprise hard and Starter barely at all.
 *
 * With no change events the schedule is FLAT, so the time-weighted average over
 * the year collapses to that constant — `averageRate` returns exactly
 * `8,347.50 − FIXED_MONTHLY_COST`. That collapse is stated rather than leaned on
 * silently: the moment a reader adds a change the average stops being a
 * constant, and every function below is written for the general case.
 *
 * ── THE CALIBRATION, IN $/MO ────────────────────────────────────────────────
 *
 * Revenue is an INFLOW, so the arithmetic and the words run the same way — up is
 * better. Each row is the reading THE GAUGE GIVES for the opening scenario with
 * the row's change applied to every plan in that product's history:
 *
 *     scenario                          MRR/mo    rate/mo   band    why
 *     -------------------------------   -------   -------   ------  ------------
 *     as it opens                       8,347.5   1,847.5?  green   ≥ COMFORTABLE
 *     Starter +50 monthly licences      9,097.5   2,497.5   green   selling more
 *                                                                   reads better
 *     Team's fee at its floor ($29)     7,097.5     497.5   yellow  above water,
 *                                                                   not clear
 *     Team AND Enterprise at their
 *       fee floors ($29, $250)          6,077.5    −522.5   red     under breakeven
 *
 * (Row 1's rate is 1,747.5 — the column above is the MRR less FIXED.)
 *
 * The constants are the SOLUTION to four inequalities rather than a choice.
 * Writing MRR0 = 8,347.5, MRRteam = 7,097.5 and MRRboth = 6,077.5:
 *
 *     MRR0     − FIXED ≥ COMFORTABLE    the board opens green
 *     MRRteam  − FIXED > 0              cutting ONE fee is not yet a loss
 *     MRRteam  − FIXED < COMFORTABLE    …but it is no longer comfortable
 *     MRRboth  − FIXED < 0              cutting BOTH crosses zero
 *
 * Rows 3 and 4 bound FIXED from opposite sides: FIXED ∈ (6,077.5, 7,097.5),
 * whose midpoint is 6,587.5. FIXED = 6,600 is that midpoint to the nearest
 * hundred. Rows 1 and 3 then bound COMFORTABLE ∈ (497.5, 1,747.5], and 1,100
 * sits near its middle with room either side. Row 2 constrains NOTHING — it
 * follows from row 1, because more licences at the same fee is more MRR — and it
 * is asserted anyway, because a board on which selling more read worse would be
 * a board with a sign error.
 *
 * NOTE WHICH DIAL EACH ROW MOVES. Rows 3 and 4 cut the `$` dial, and on a
 * product with annual licences that cut lands TWICE: Team loses $11 × 40 monthly
 * seats and another $11 × 25 × 0.9 of annual ones. That coupling is the model
 * this board is for, and it is exactly why the two floors are enough to cross
 * zero where four separate dials would not have been.
 *
 * `rateBandTable()` prints that table and the test asserts every cell of it.
 *
 * THE CATALOGUE IS SWAPPABLE, and so is everything solved against it. The
 * figures above are the TIERS fixture, which is the one `FIXTURE` currently
 * points at; APPS (Amygdala and JTF) carries its own four rows and its own four
 * constants, solved the same way, in its own header further down. Flipping that
 * one const swaps the products, the fixed cost, the comfortable gain, the
 * gauge's domain and the stack's cap together, and the test asserts BOTH tables
 * so the inactive one cannot rot.
 *
 * ── WHEN, NOT ONLY HOW MUCH ────────────────────────────────────────────────
 *
 * The gauge reads the COMPOSITE — the rate time-averaged over the whole span —
 * so a change is worth its own rate times the share of the year it is in force
 * for. `weightToReach` is the algebra of that trade between two flat levels,
 * which on this fixture is exact: the opening schedule IS flat.
 */
import {
  filter,
  find,
  findIndex,
  map,
  pipe,
  some,
  sortBy,
  sum,
} from "../../../src/fn";
import { timeOf } from "../../../src";
import type {
  Mutation,
  StackedAreaSeriesData,
  TimeDomain,
  TimeValue,
} from "../../../src";
// NOT ON THE PACKAGE BARREL YET. `GroupedMutationSliders` is still on its own
// workshop bench, so it is imported by RELATIVE PATH into `src/components/`
// rather than from `../../../src` — which says "this is not published" at the
// call site, where a barrel import would have said the opposite. `/promote`
// turns that around in one step.
import type {
  GroupedMeasureIndex,
  GroupedMutationEntity,
} from "../../../src/components/GroupedMutationSliders";
// The mutation calendar is REUSED, not re-derived. Every one of these is a pure
// function of `Mutation[]` alone — it holds no product and no fee — so the
// license board gets the same snapping, the same numbering and the same chips
// as the Scenario and Hourly Boards rather than a third set that can drift from
// them. Anything that touches an ENTITY is written below against products.
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

// ── This board's grain is the MONTH ──────────────────────────────────────────
//
// Licences bill monthly, so a change to a seat count or a fee takes effect on a
// billing boundary and nowhere else. The grain is bound HERE, once, rather than
// passed at each of the bench's call sites — both ways a change can be created
// (a click on the License Mix plot and a drag with nothing selected) have to
// land on the SAME grid, because `addMutation` dedupes on an exact timestamp,
// and a bench that had to remember to say `"month"` twice could forget it once
// and put two flags three weeks apart inside one billing month.

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

/** The month slot a picked date belongs to, against THIS board's span. A click
 *  on the License Mix plot arrives unsnapped (`StackedTimelineChart.onPick`
 *  snaps nothing — it does not know whose calendar it is on) and goes through
 *  here. */
export const monthOfPick = (at: Date | number): Date =>
  new Date(
    monthSlotOf(
      typeof at === "number" ? at : at.getTime(),
      timeOf(DOMAIN_START),
    ),
  );

// ── The span ─────────────────────────────────────────────────────────────────

/** The year the chart, the licence mix and the gauge are all drawn against. */
export const DOMAIN_START = new Date("2025-01-01");
export const DOMAIN_END = new Date("2026-01-01");
export const TIME_DOMAIN: TimeDomain = [DOMAIN_START, DOMAIN_END];

/** Months in a year. The bridge between an annual price and a monthly one, and
 *  the only place the number 12 appears on this board. */
export const MONTHS_PER_YEAR = 12;

// ── The month grid ───────────────────────────────────────────────────────────
//
// The billing table and the License Mix stack are read per MONTH SLOT, so the
// slots have to be the same grid a click lands on. They are not re-derived:
// `nextFreeSlot` is already the exported enumeration of that grid, so walking it
// once at module load makes the two identical by construction rather than by
// agreement.

/** Every month slot in the span, in order. Twelve, for a year opening on the
 *  first of January. */
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

/** The number of month slots the span holds — 12. The billing table has one row
 *  each. */
export const MONTH_COUNT = MONTH_SLOTS.length;

/**
 * Every moment the schedule can change at: EVERY MONTH SLOT, and each flag.
 *
 * The month slots are in here because a product can begin or end at a moment
 * that is not a flag — a segment's `end` is a date on the product, not a
 * mutation — and a sampler given only the mutation times would carry a product
 * past the month it stopped. Sampling every month costs twelve reads and catches
 * it.
 *
 * Flags are usually slots already (a click snaps), so the union is normally the
 * slots alone; a mutation off the grid is kept rather than rounded onto one.
 */
export const momentsOf = (mutations: readonly Mutation[]): number[] => {
  const times = new Set<number>(MONTH_SLOTS);
  for (const mutation of mutations) times.add(timeOf(mutation.at));
  return sortBy((time: number) => time, [...times]);
};

/** A day, in ms. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** A timestamp as its UTC calendar date, `2025-08-01`. */
const isoDate = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

/** The month slot a moment falls in, as a first and last DAY — what the License
 *  Mix hover reads out. Both inclusive, both inside the span. */
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

/** What one product is worth in one MONTH: the four numbers the dials edit. */
export interface Plan {
  /** Licences billed MONTHLY. */
  readonly monthlyLicenses: number;
  /** Dollars a month, per monthly licence — and the base the annual price is a
   *  percentage OF, so this one number prices both groups. */
  readonly fee: number;
  /** Licences billed ANNUALLY, a year up front. */
  readonly annualLicenses: number;
  /** The annual price as a percentage of twelve monthly fees. 85 means an
   *  annual licence costs `fee × 12 × 0.85` a year — a 15% discount for paying
   *  up front. */
  readonly annualPct: number;
}

/**
 * A product the business sells — a SEGMENT or a RAY on the time axis.
 *
 *   • `start` — when it begins billing. Every product has one.
 *   • `end`   — when it stops, EXCLUSIVE. Present = a segment; absent = a ray
 *               that runs off the right edge of the span.
 *
 * Outside `[start, end)` the product does not exist, and `planAt` reads `null`
 * there — absence, not zero licences.
 *
 * INSIDE it, what the product bills is a history of CHANGE EVENTS: `committed`
 * is the plan it opens on at `start`, and `changes` — keyed by mutation id — is
 * every later event, each an ABSOLUTE plan that holds until the next one.
 *
 * `committed === null` is a product with NO opening plan — one launched in the
 * modal, which exists from the mutation it was added at, carrying one change
 * there. An ABSENT key in `changes` means the product did not move at that
 * mutation; a `null` VALUE is the product being DISCONTINUED there.
 *
 * The four RANGES are the per-product ALLOWANCE — the shaded box on each dial
 * and the clamp. They are NOT the axis domains: the axes run 0–500 licences,
 * $0–600 and 50–100% for the whole row, which is what makes three products of
 * very different shapes comparable.
 */
export interface Product {
  readonly id: string;
  readonly label: string;
  /** When the product begins, as a timestamp. */
  readonly start: number;
  /** When it ends, EXCLUSIVE. Absent = a ray. */
  readonly end?: number;
  /** The plan it opens on at `start`. `null` = launched at a mutation instead. */
  readonly committed: Plan | null;
  readonly monthlyRange: readonly [number, number];
  readonly feeRange: readonly [number, number];
  readonly annualRange: readonly [number, number];
  readonly pctRange: readonly [number, number];
  readonly changes: Readonly<Record<string, Plan | null>>;
}

/** Is `time` inside the product's own life — on or after `start`, before `end`? */
export const isLiveAt = (product: Product, time: number): boolean =>
  time >= product.start && (product.end === undefined || time < product.end);

/**
 * THE FOUR DIALS OF ONE CARD, and their positions.
 *
 * Peter, 2026-09-18: "rather than having one product with 6 variants, I want N
 * products with 2 variants (monthly and annual)". So one product is ONE card —
 * its name the pressable header, four dials under it in two captioned groups:
 *
 *     mo   measure 0 = MONTHLY (#)   measure 1 = FEE (\$)
 *     yr   measure 2 = ANNUAL  (#)   measure 3 = PCT (%)
 *
 * The index is now unambiguous — it names one field of one plan and nothing
 * else — which is the difference from the two-row board this replaces, where
 * measure 1 was a fee on one row and a percentage on the other.
 *
 * `withChange` still takes a PLAN FIELD rather than an index, and `FIELDS` is
 * the single translation. Keeping the field is not ceremony now that the index
 * is unambiguous: it is what makes a mis-ordered `axes` array a TYPE error at
 * the bench rather than a percentage silently written into a fee.
 */
export type PlanField =
  "monthlyLicenses" | "fee" | "annualLicenses" | "annualPct";

/** The card's four measures, in reading order. The ONLY place that order is
 *  written down; `axes` at the bench is positioned against it. */
export const FIELDS: readonly [PlanField, PlanField, PlanField, PlanField] = [
  "monthlyLicenses",
  "fee",
  "annualLicenses",
  "annualPct",
];

/** The four positions, named so nothing below counts on its fingers. */
export const MONTHLY: GroupedMeasureIndex = 0;
export const FEE: GroupedMeasureIndex = 1;
export const ANNUAL: GroupedMeasureIndex = 2;
export const PCT: GroupedMeasureIndex = 3;

/** The plan field one measure index writes, or `undefined` past the end. */
export const fieldOf = (measure: GroupedMeasureIndex): PlanField | undefined =>
  FIELDS[measure];

/** The shared tracks. The whole row is drawn on them. */
export const LICENSE_DOMAIN: readonly [number, number] = [0, 500];
export const FEE_DOMAIN: readonly [number, number] = [0, 600];
/**
 * The percentage track stops at 100 and starts at 50.
 *
 * 100 is the ceiling because an annual licence sold for MORE than twelve
 * monthly ones is a penalty for paying up front, which is not a thing anyone
 * prices — and a dial that can express it would invite it. 50 is the floor for
 * the mirror reason: half price is already an aggressive prepay discount, and a
 * track running to zero would spend four fifths of its length on figures the
 * business would never offer, leaving the ones it might in a band too short to
 * aim at.
 */
export const PCT_DOMAIN: readonly [number, number] = [50, 100];

// -- THE FIXTURE, AND HOW TO SWAP IT -----------------------------------------
//
// Peter, 2026-09-18: "I could also just do Amygdala and JTF with mo/annual
// billing." So there are TWO fixtures below and ONE const to flip between them
// (`FIXTURE`, just after them). Everything the board reads -- the products, the
// fixed cost, the comfortable gain, the gauge's domain and the stack's cap --
// comes out of the chosen one, because every one of those five is solved
// AGAINST a particular catalogue, and a fixture swapped without them would put
// the gauge in the wrong band on the first frame.
//
// The calibration is solved the same way for both (see the header's four
// inequalities), and `license-board-model.test.ts` asserts BOTH tables rather
// than only the active one -- so flipping the const cannot land on a fixture
// whose numbers nobody checked.

/** Everything a catalogue needs to be read: the products, and the four
 *  constants solved against them. */
export interface Fixture {
  readonly label: string;
  readonly products: readonly Product[];
  /** What the business pays out a month whatever it sells. Breakeven. */
  readonly fixedMonthlyCost: number;
  /** The comfortable gain, in $/mo -- the gauge's green/yellow split. */
  readonly comfortable: number;
  /** The gauge's domain, in $/mo. */
  readonly rateDomain: readonly [number, number];
  /** The License Mix y-axis cap, in $/mo. */
  readonly mrrCap: number;
  /**
   * WHICH PRODUCTS THE CALIBRATION ROWS MOVE, by id.
   *
   * On the tier fixture the yellow row cuts Team and the red row cuts Team AND
   * Enterprise; on the two-app fixture both rows start at Amygdala. The rows
   * are therefore a property of the CATALOGUE rather than of the table, and
   * naming them here is what lets one `rateBandTable` read either fixture.
   */
  readonly calibration: {
    /** Gets +50 monthly licences in row 2 — the row that must stay green. */
    readonly grow: string;
    /** Fees to their floors in row 3 — the row that must read yellow. */
    readonly yellow: readonly string[];
    /** Fees to their floors in row 4 — the row that must read red. */
    readonly red: readonly string[];
  };
}

/**
 * TIERS -- one product per price point, the shape a single app sells in.
 *
 * Three products of deliberately different SHAPES, because one band per product
 * is only worth drawing if the bands disagree: Starter is many cheap seats,
 * Enterprise is eight expensive ones, Team is in between -- yet all three land
 * within $500/mo of each other, so no band swamps the stack. Enterprise is
 * mostly ANNUAL and Starter mostly MONTHLY, which is what makes the `%` dial
 * worth having: it moves Enterprise hard and Starter barely at all.
 *
 *     product      #mo    $     #yr   %      MRR/mo
 *     ----------   ----   ---   ---   ----   --------
 *     Starter      120    15     60   85 %    2,565.00
 *     Team          40    49     25   90 %    3,062.50
 *     Enterprise     2   400      6   80 %    2,720.00
 *     ---------------------------------------------------
 *                                             8,347.50
 */
export const TIERS: Fixture = {
  label: "Tiers",
  fixedMonthlyCost: 6_600,
  comfortable: 1_100,
  rateDomain: [-6_600, 24_500],
  mrrCap: 16_000,
  calibration: {
    grow: "starter",
    yellow: ["team"],
    red: ["team", "enterprise"],
  },
  products: [
    {
      id: "starter",
      label: "Starter",
      start: DOMAIN_START.getTime(),
      committed: {
        monthlyLicenses: 120,
        fee: 15,
        annualLicenses: 60,
        annualPct: 85,
      },
      monthlyRange: [0, 300],
      feeRange: [9, 25],
      annualRange: [0, 200],
      pctRange: [70, 100],
      changes: {},
    },
    {
      id: "team",
      label: "Team",
      start: DOMAIN_START.getTime(),
      committed: {
        monthlyLicenses: 40,
        fee: 49,
        annualLicenses: 25,
        annualPct: 90,
      },
      monthlyRange: [0, 120],
      feeRange: [29, 80],
      annualRange: [0, 80],
      pctRange: [70, 100],
      changes: {},
    },
    {
      id: "enterprise",
      label: "Enterprise",
      start: DOMAIN_START.getTime(),
      committed: {
        monthlyLicenses: 2,
        fee: 400,
        annualLicenses: 6,
        annualPct: 80,
      },
      monthlyRange: [0, 20],
      feeRange: [250, 600],
      annualRange: [0, 20],
      // Enterprise negotiates hardest on prepay, so its percentage band
      // reaches lower than the other two's.
      pctRange: [60, 100],
      changes: {},
    },
  ],
};

/**
 * APPS -- one card per PRODUCT, which is the other thing Peter said the board
 * has to be able to be: "Amygdala and JTF with mo/annual billing".
 *
 * TWO cards rather than three, on purpose: it is the case that proves the board
 * is not secretly built for three, and it is the one a two-app shop would
 * actually open. Amygdala is the volume seat product and JTF the expensive
 * per-installation one, so the two bands are still different shapes.
 *
 *     product      #mo    $     #yr   %      MRR/mo
 *     ----------   ----   ---   ---   ----   --------
 *     Amygdala      80     50    30   80 %    5,200.00
 *     JTF           25    120    10   75 %    3,900.00
 *     ---------------------------------------------------
 *                                             9,100.00
 *
 * Its own four inequalities, solved the same way -- the floors are Amygdala's
 * $30 and JTF's $80:
 *
 *     scenario                          MRR/mo    rate/mo   band
 *     -------------------------------   -------   -------   ------
 *     as it opens                        9,100     2,700    green
 *     Amygdala +50 monthly licences     11,600     5,200    green
 *     Amygdala's fee at its floor        7,020       620    yellow
 *     Amygdala AND JTF at their floors   5,720      -680    red
 *
 * FIXED in (5,720, 7,020) -> 6,400; COMFORTABLE in (620, 2,700] -> 1,600.
 */
export const APPS: Fixture = {
  label: "Apps",
  fixedMonthlyCost: 6_400,
  comfortable: 1_600,
  rateDomain: [-6_400, 34_500],
  mrrCap: 18_000,
  calibration: {
    grow: "amygdala",
    yellow: ["amygdala"],
    red: ["amygdala", "jtf"],
  },
  products: [
    {
      id: "amygdala",
      label: "Amygdala",
      start: DOMAIN_START.getTime(),
      committed: {
        monthlyLicenses: 80,
        fee: 50,
        annualLicenses: 30,
        annualPct: 80,
      },
      monthlyRange: [0, 300],
      feeRange: [30, 120],
      annualRange: [0, 150],
      pctRange: [70, 100],
      changes: {},
    },
    {
      id: "jtf",
      label: "JTF",
      start: DOMAIN_START.getTime(),
      committed: {
        monthlyLicenses: 25,
        fee: 120,
        annualLicenses: 10,
        annualPct: 75,
      },
      monthlyRange: [0, 120],
      feeRange: [80, 300],
      annualRange: [0, 60],
      pctRange: [60, 100],
      changes: {},
    },
  ],
};

/**
 * FLIP THIS ONE CONST to swap the whole board over: `TIERS` or `APPS`.
 *
 * Everything below reads through it, so nothing else has to change -- and the
 * test asserts both tables either way, so the fixture that is not active is
 * still checked.
 */
export const FIXTURE: Fixture = TIERS;

/** The catalogue the board opens on. */
export const PRODUCTS: readonly Product[] = FIXTURE.products;

/**
 * THE BOARD OPENS WITH NO CHANGES. The first interaction makes its own, at the
 * first free month (`ensureMutation`), which for this span is January — so the
 * reader's first move is in force for the whole year and the gauge agrees with
 * `rateBandTable()`'s weight-1 claim by construction.
 */
export const SEED_MUTATIONS: readonly Mutation[] = [];

// ── Walking the history ──────────────────────────────────────────────────────

/** A number held inside a range. */
const held = (value: number, range: readonly [number, number]): number =>
  Math.min(Math.max(value, range[0]), range[1]);

/**
 * A plan inside the product's allowance — all four measures at once.
 *
 * Every measure is clamped, not just the counts, because the calibration's own
 * rows are FEE cuts: a row that could push a fee below the floor it claims to
 * be reading would make the calibration table describe a scenario the dials
 * cannot reach.
 */
const clamped = (product: Product, plan: Plan | null): Plan | null =>
  plan === null
    ? null
    : {
        monthlyLicenses: held(plan.monthlyLicenses, product.monthlyRange),
        fee: held(plan.fee, product.feeRange),
        annualLicenses: held(plan.annualLicenses, product.annualRange),
        annualPct: held(plan.annualPct, product.pctRange),
      };

/** The moment a mutation sits at. */
const timeOfMutation = (
  mutationId: string,
  mutations: readonly Mutation[],
): number =>
  timeOf(
    find((mutation: Mutation) => mutation.id === mutationId, mutations)?.at ??
      DOMAIN_START,
  );

/** The plan a product carried JUST BEFORE a mutation. Walks in time order rather
 *  than reading one key: a product raised at mutation 1 and untouched at
 *  mutation 2 has a prior of its mutation-1 plan while the reader is editing
 *  mutation 2. */
const carriedBefore = (
  product: Product,
  mutationId: string,
  mutations: readonly Mutation[],
): Plan | null => {
  let carried = product.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (mutation.id === mutationId) return carried;
    const own = product.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return carried;
};

/**
 * The plan a product carried JUST BEFORE a mutation — `null` when it had not
 * begun by then, or had already ended.
 *
 * A mutation AT a product's start still reads its opening plan as the prior:
 * that is the dial's fixed tick, and a product that opens on `committed` has
 * that figure from its first instant.
 */
export const planBefore = (
  product: Product,
  mutationId: string,
  mutations: readonly Mutation[],
): Plan | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (at < product.start) return null;
  if (product.end !== undefined && at > product.end) return null;
  return clamped(product, carriedBefore(product, mutationId, mutations));
};

/** The plan from a mutation onward: its change at it, or whatever it was on. */
export const planFrom = (
  product: Product,
  mutationId: string,
  mutations: readonly Mutation[],
): Plan | null => {
  const at = timeOfMutation(mutationId, mutations);
  if (!isLiveAt(product, at)) return null;
  const own = product.changes[mutationId];
  if (own !== undefined) return clamped(product, own);
  return clamped(product, carriedBefore(product, mutationId, mutations));
};

/**
 * The plan in force at a MOMENT, or `null` when the product is not sold then —
 * outside its `[start, end)`, or discontinued. `null` is absence, not zero: a
 * product with no seats left is still a product, and one that has been
 * discontinued is not.
 *
 * The last change at or before `time` wins. Every money figure on the board is a
 * reading of this one function, which is how a change reaches the gauge, the
 * projection and the stack at once.
 */
export const planAt = (
  product: Product,
  time: number,
  mutations: readonly Mutation[],
): Plan | null => {
  if (!isLiveAt(product, time)) return null;
  let carried = product.committed;
  for (const mutation of orderedMutations(mutations)) {
    if (timeOf(mutation.at) > time) break;
    const own = product.changes[mutation.id];
    if (own !== undefined) carried = own;
  }
  return clamped(product, carried);
};

/**
 * Is this product on the books at the mutation being edited?
 *
 * ONE condition covers four cases. Given its plan just BEFORE the mutation and
 * its plan FROM it:
 *
 *   before   from    what it is                        shown?
 *   ------   -----   -------------------------------   ------
 *   plan     plan    a change (or no change)           yes
 *   plan     null    DISCONTINUED at this mutation     yes — struck through
 *   null     plan    LAUNCHED at this mutation         yes
 *   null     null    discontinued EARLIER, or not
 *                    launched until a later mutation   no
 *
 * The last row is "a discontinued product is hidden at later dates", and it
 * gives "not launched yet" for free: a product that starts at a later mutation
 * is equally absent from this one.
 */
export const isSoldAt = (before: Plan | null, from: Plan | null): boolean =>
  before !== null || from !== null;

// ── Editing ──────────────────────────────────────────────────────────────────

/** One FIELD of a plan, replaced; the other three carried forward untouched. */
export const withField = (
  plan: Plan,
  field: PlanField,
  value: number,
): Plan => ({ ...plan, [field]: value });

/**
 * Set ONE measure of ONE product at ONE mutation.
 *
 * `PairedMutationSliders` emits `(id, measureIndex, value)` — one measure at a
 * time — but a change in the history is a whole PLAN, because the stack and the
 * MRR both need all four numbers at every moment. So the three fields that did
 * not move are carried forward, which is the honest answer: they did not change,
 * and writing them down says exactly that.
 *
 * It takes a FIELD and not an index on purpose: measure 1 is a fee on the
 * Monthly row and a percentage on the Annual one, so an index alone could write
 * a percentage into a fee. `withMonthlyChange` / `withAnnualChange` are the two
 * row-shaped callers that resolve it.
 */
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

/** ⊗ Discontinue: this product is off the books from the selected mutation on.
 *  ALL FOUR measures go null together, which is what `null` means here — the
 *  product is not sold, rather than sold at zero. */
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

/**
 * ↺ Relaunch: DELETE the change rather than invent a plan. The product carries
 * whatever the previous mutation left it on, which for one launched here is the
 * plan it was launched at, exactly. It is only ever offered at the product's OWN
 * date — the mutation the discontinuation sits on — which is why it needs no
 * guard of its own.
 */
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

// ── Launching a product ──────────────────────────────────────────────────────

/** What the Add form holds while it is being filled in. */
export interface ProductDraft {
  readonly name: string;
  readonly monthlyLicenses: number | undefined;
  readonly fee: number | undefined;
  readonly annualLicenses: number | undefined;
  readonly annualPct: number | undefined;
}

/** The form opens empty of a name, on a plausible small launch. */
export const EMPTY_DRAFT: ProductDraft = {
  name: "",
  monthlyLicenses: 10,
  fee: 50,
  annualLicenses: 5,
  annualPct: 85,
};

export const draftName = (draft: ProductDraft): string => draft.name.trim();

/**
 * Can this draft be launched? A name, and four figures the shared tracks admit.
 *
 * The RANGE a new product gets is the whole axis (below), so "inside the track"
 * is the only bound there is to check — a narrower rule here would refuse a
 * figure the dial would then happily accept.
 */
export const canAdd = (draft: ProductDraft): boolean => {
  if (draftName(draft) === "") return false;
  const inside = (
    value: number | undefined,
    range: readonly [number, number],
  ): boolean => value !== undefined && value >= range[0] && value <= range[1];
  return (
    inside(draft.monthlyLicenses, LICENSE_DOMAIN) &&
    inside(draft.fee, FEE_DOMAIN) &&
    inside(draft.annualLicenses, LICENSE_DOMAIN) &&
    inside(draft.annualPct, PCT_DOMAIN)
  );
};

/**
 * A stable id from the NAME rather than a counter or a clock, so the same launch
 * made twice in a test gives the same id and this function stays pure.
 */
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

/**
 * LAUNCH a product at one mutation. Three decisions, all the consumer's:
 *
 *   • `committed: null` — it was not sold before, so there is no prior and the
 *     dials draw no prior arrow. That is what makes it a LAUNCH rather than a
 *     product that happens to start small.
 *   • ONE change, at `at` — so `planBefore` reads `null`, `planFrom` reads its
 *     opening plan, and at every EARLIER mutation both read `null` and
 *     `isSoldAt` hides it. Its existence starts exactly where the reader put it.
 *   • The RANGES are the whole axes. The fixture's three products carry bands
 *     somebody negotiated; a product invented in a modal has negotiated nothing,
 *     and inventing bands for it would be the board making up a constraint.
 */
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
    // It begins where the reader launched it and runs on as a RAY.
    start: timeOfMutation(at, mutations),
    committed: null,
    monthlyRange: LICENSE_DOMAIN,
    feeRange: FEE_DOMAIN,
    annualRange: LICENSE_DOMAIN,
    pctRange: PCT_DOMAIN,
    changes: {
      [at]: {
        monthlyLicenses: draft.monthlyLicenses ?? 0,
        fee: draft.fee ?? 0,
        annualLicenses: draft.annualLicenses ?? 0,
        annualPct: draft.annualPct ?? PCT_DOMAIN[1],
      },
    },
  };
  return { products: [...products, added], id };
};

// ── Removing a change ────────────────────────────────────────────────────────

/** The mutation a product was LAUNCHED at, or `undefined` if it was always
 *  sold. */
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

/** The mutation the selection should move to once `id` is gone. */
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

/**
 * DELETE the selected change and everything that only existed because of it —
 * the flag, the chip, every product's entry at it, and anything launched there.
 * The inverse, mark for mark, of what the board can do.
 */
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

// ── The dials ────────────────────────────────────────────────────────────────

/**
 * ONE PRODUCT'S FOUR MEASURES across one mutation — the shape
 * `GroupedMutationSliders` takes, and the shape Peter asked for on 2026-09-18:
 * "N products with 2 variants (monthly and annual)", one CARD each.
 *
 * The order is `MONTHLY`, `FEE`, `ANNUAL`, `PCT`, which the bench's `axes`
 * caption as `mo` (#, $) and `yr` (#, %). Position for position; `FIELDS` below
 * is the only place that order is written down.
 *
 * FOUR MEASURES ON ONE ENTITY IS WHAT DELETED THE SYNC MACHINERY. While the
 * board drew two paired rows this module carried `monthlyPairs`, `annualPairs`,
 * a shared `soldAcross` walk to keep them in step, two per-row range helpers and
 * a `shownPlanOf` lookup — because a summary needs all four numbers and a paired
 * entity only ever carried two. One entity carries all four, so the summary is a
 * function of the entity (`monthlyOfEntity`) and every one of those six pieces
 * is gone.
 */
export const entityOf = (
  product: Product,
  before: Plan | null,
  from: Plan | null,
): GroupedMutationEntity => {
  const measure = (field: PlanField, range: readonly [number, number]) => ({
    prior: before === null ? null : before[field],
    value: from === null ? null : from[field],
    range,
  });
  return {
    id: product.id,
    label: product.label,
    measures: [
      measure("monthlyLicenses", product.monthlyRange),
      measure("fee", product.feeRange),
      measure("annualLicenses", product.annualRange),
      measure("annualPct", product.pctRange),
    ],
  };
};

/** One product read across one mutation: what it was, and what it becomes. */
interface AcrossMutation {
  readonly product: Product;
  readonly before: Plan | null;
  readonly from: Plan | null;
}

/**
 * THE CARDS, for a mutation or for the opening state.
 *
 * `mutationId === null` is the board's OPENING state — there is no change to
 * show, and saying so with `prior === value` is what makes every reading
 * downstream fall out with no special case: the delta is zero, no change line is
 * drawn, and the gauge reads exactly the baseline.
 *
 * A product not on the books at this mutation is simply absent from the list —
 * which is `isSoldAt`'s four-case table, and is how a discontinued product
 * disappears from the row at later dates while still being shown, struck
 * through, at its own.
 */
export const entitiesFor = (
  products: readonly Product[],
  mutationId: string | null,
  mutations: readonly Mutation[],
): GroupedMutationEntity[] => {
  const across: AcrossMutation[] =
    mutationId === null
      ? pipe(
          products,
          filter((product: Product) => product.committed !== null),
          map((product: Product): AcrossMutation => {
            const opening = planAt(product, DOMAIN_START.getTime(), []);
            return { product, before: opening, from: opening };
          }),
        )
      : pipe(
          products,
          map((product: Product): AcrossMutation => ({
            product,
            before: planBefore(product, mutationId, mutations),
            from: planFrom(product, mutationId, mutations),
          })),
          filter((row: AcrossMutation) => isSoldAt(row.before, row.from)),
        );
  return map(
    (row: AcrossMutation) => entityOf(row.product, row.before, row.from),
    across,
  );
};

/**
 * WHAT ONE CARD BILLS A MONTH, read off its own four dials.
 *
 * `#mo × $ + #yr × $ × pct`, exactly `monthlyOf`'s arithmetic — and it has to
 * be, because this is the line under the card that tells the reader their drag
 * did what the gauge says it did. The test pins the two equal.
 *
 * It reads the ENTITY rather than the product, which is the whole gain of one
 * card over two rows: while the measures were split across two entities this
 * was impossible and the board had to look the product up by id
 * (`shownPlanOf`, now deleted).
 *
 * A discontinued product has every measure at `null` and bills nothing.
 */
export const monthlyOfEntity = (entity: GroupedMutationEntity): number => {
  const at = (index: GroupedMeasureIndex): number | null =>
    entity.measures[index]?.value ?? null;
  const monthly = at(MONTHLY);
  const fee = at(FEE);
  const annual = at(ANNUAL);
  const pct = at(PCT);
  if (monthly === null || fee === null || annual === null || pct === null) {
    return 0;
  }
  return monthly * fee + annual * fee * (pct / 100);
};

/** What ONE annual licence on this card costs a year — the figure on the
 *  invoice, which is the thing the `%` dial is actually setting. */
export const annualPriceOfEntity = (
  entity: GroupedMutationEntity,
): number | null => {
  const fee = entity.measures[FEE]?.value ?? null;
  const pct = entity.measures[PCT]?.value ?? null;
  if (fee === null || pct === null) return null;
  return fee * MONTHS_PER_YEAR * (pct / 100);
};

// ── The money ────────────────────────────────────────────────────────────────

/**
 * What one plan bills in a MONTH.
 *
 *     #mo × $ + #yr × $ × pct
 *
 * The second term is an annual licence's MONTHLY EQUIVALENT: its yearly price is
 * `fee × 12 × pct`, and a twelfth of that is `fee × pct`. The ×12 and the ÷12
 * cancel, which is why neither appears — see the header's cash-timing note for
 * what that costs.
 */
export const monthlyOf = (plan: Plan | null): number =>
  plan === null
    ? 0
    : plan.monthlyLicenses * plan.fee +
      plan.annualLicenses * plan.fee * (plan.annualPct / 100);

/** What ONE annual licence costs a year — the figure on the invoice, spelled
 *  once so the ×12 lives in exactly one place on this board. */
export const annualPriceOf = (plan: Plan): number =>
  plan.fee * MONTHS_PER_YEAR * (plan.annualPct / 100);

/** MRR: what every product sold at a moment bills that MONTH, added up. */
export const mrrAt = (
  products: readonly Product[],
  time: number,
  mutations: readonly Mutation[],
): number =>
  sum(
    map(
      (product: Product) => monthlyOf(planAt(product, time, mutations)),
      products,
    ),
  );

/**
 * What the business pays out in a MONTH regardless of what it sells — hosting,
 * support, the people who are not selling.
 *
 * It lives in the FIXTURE rather than in a component because it is the whole
 * reason breakeven is a number at all: without it every scenario is profitable,
 * the gauge's red half is unreachable, and the License Mix chart has no rule
 * worth drawing. It is the solution to the calibration's four inequalities —
 * the midpoint of the interval they leave, to the nearest hundred (see the
 * header) — which is why it comes off the FIXTURE rather than being written
 * here: a different catalogue has a different interval. It is ALSO the
 * breakeven MRR the stack's dashed rule is drawn at, which is the point of
 * having it in one place: the rule and the gauge's zero are the same number by
 * construction.
 */
export const FIXED_MONTHLY_COST = FIXTURE.fixedMonthlyCost;

/** The business's rate, given what it bills in a MONTH. */
export const rateFromMrr = (mrr: number): number => mrr - FIXED_MONTHLY_COST;

/**
 * The comfortable gain, in $/mo. At or above it the gauge lights green, below it
 * yellow; below zero is red, and that split is the gauge's own. Solved against
 * the active fixture, so it comes off it too.
 */
export const COMFORTABLE = FIXTURE.comfortable;

/**
 * The gauge's domain, in $/mo.
 *
 * Sized against the FIXTURE, not against everything the board can become, and
 * the difference is worth stating because `RateGauge` clamps `value` to its
 * domain and announces the DRAWN figure — so a reading outside the domain is a
 * dial that quietly contradicts the terminal.
 *
 *   • The floor is exact and unconditional: every product discontinued is no MRR
 *     and all of the fixed cost, which is −FIXED_MONTHLY_COST. Nothing can go
 *     below it, because MRR cannot be negative.
 *   • The ceiling is every product's LICENCE COUNTS at their allowance ceilings
 *     on its CURRENT fee and percentage — $30,858/mo of MRR, so a rate of
 *     $24,258/mo — rounded up to 24,500. That is the board read as a GROWTH
 *     story, which is what its reader is exploring. It does NOT hold for a
 *     scenario that also raises every fee to its ceiling ($52,500/mo of MRR),
 *     nor once products are LAUNCHED: `addProduct` gives a product the whole
 *     tracks, so one launched product alone reaches 500 × $600 × 2 = $600k/mo,
 *     and the count is unbounded.
 *
 * So the promise is kept the other way round: `drawnRate` states the clamp
 * explicitly, and the DEBUG summary prints the drawn figure BESIDE the raw one.
 */
export const RATE_DOMAIN: readonly [number, number] = FIXTURE.rateDomain;

/**
 * What the gauge will actually DRAW for a rate — the domain clamp, named.
 *
 * `RateGauge` applies exactly this to `value` before it draws or announces
 * anything, so the consumer that wants its table to agree with its dial applies
 * it too rather than assuming the two never differ.
 */
export const drawnRate = (rate: number): number =>
  Math.min(Math.max(rate, RATE_DOMAIN[0]), RATE_DOMAIN[1]);

/** Is this rate off the end of the dial? Then the table must say so. */
export const isOffDial = (rate: number): boolean => drawnRate(rate) !== rate;

/**
 * The highest rate the fixture's allowances can reach, in $/mo — every count,
 * every fee AND every percentage at its ceiling. The figure `RATE_DOMAIN`
 * documents itself as NOT covering.
 */
export const maxReachableRate = (products: readonly Product[]): number =>
  rateFromMrr(
    sum(
      map(
        (product: Product) =>
          monthlyOf({
            monthlyLicenses: product.monthlyRange[1],
            fee: product.feeRange[1],
            annualLicenses: product.annualRange[1],
            annualPct: product.pctRange[1],
          }),
        products,
      ),
    ),
  );

/** The lowest — every product discontinued, so the fixed cost stands alone. */
export const minReachableRate = (): number => rateFromMrr(0);

// ── The composite reading ────────────────────────────────────────────────────
//
// COPIED from `hourly-board-model.ts` (which copied the month arithmetic from
// `scenario-board-rate.ts`) rather than imported, deliberately, and for that
// module's own stated reason turned around: its `averageRateOver` returns a rate
// through `rateFromRevenue`, which subtracts a WEEKLY fixed cost of $1,700 that
// has nothing to do with this board. Importing it would silently price a licence
// business on an hourly business's overheads — a wrong number that type-checks.
// `abbreviateDollars` IS imported (see `license-board-money`) because a second
// rounding policy would be visible to a reader; a second month-position function
// that agrees by construction is not.
//
// THE UNIT PARAMETER IS GONE, and that is the simplification this board earns by
// billing monthly. The Hourly Board carries a `RateUnit` because its rate is
// $/wk while its cash cells are months, so every integral needs a conversion.
// Here the rate is $/mo and the cells are months: the factor is 1, stated once
// as `MONTHS_PER_UNIT` below, and there is no second unit to be in.

/** A moment as a position on the MONTH line, carrying the fraction elapsed. */
const monthPosition = (time: number): number => {
  const at = new Date(time);
  const daysInMonth = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const elapsed = (at.getUTCDate() - 1 + at.getUTCHours() / 24) / daysInMonth;
  return at.getUTCFullYear() * 12 + at.getUTCMonth() + elapsed;
};

/**
 * Months from one moment to another. Exact — and integral — on boundaries.
 *
 * A walk over each month's own length rather than a division, because a calendar
 * month is not 1/12 of a year: a change made on 1 July weighs 0.4959 of a year
 * in milliseconds and exactly half of it in months, and this board's changes all
 * land on the first of a month.
 */
export const monthsBetween = (from: number, to: number): number =>
  monthPosition(to) - monthPosition(from);

/**
 * THE MONTHS ONE SAMPLING UNIT HOLDS — the whole of this board's unit
 * conversion, named so its absence is visible.
 *
 * The rate is quoted per MONTH and the stretches are measured in months, so the
 * integral is `months × $/mo` with nothing in between. One is a real factor, not
 * a missing one, and writing it down is what stops a later reader "fixing" it
 * with a ×12. (The Hourly Board's equivalent table has two rows, because its
 * rate is weekly and its cells are monthly.)
 */
const MONTHS_PER_UNIT = 1;

/**
 * The MRR over a whole span, weighted by time. NO fixed cost subtracted.
 *
 * Takes a FUNCTION and the moments rather than the products and the mutations,
 * because neither model is anything this arithmetic needs: given "what does it
 * bill at time t" and "when can it change", the average is decided.
 *
 * IT RETURNS RAW MRR, and that is what lets the calibration read either
 * fixture: a rate is MRR less a fixed cost, and WHICH fixed cost is a property
 * of the catalogue being read. `rateBandTable` subtracts the one belonging to
 * the fixture it was handed; `averageRate` below subtracts the ACTIVE one.
 * Returning a rate here would have baked the active fixture into the
 * arithmetic, so the two-app table would have been priced on the tier
 * catalogue's overheads — a wrong number that type-checks.
 *
 * Moments outside the span are IGNORED rather than clamped: one before it is
 * already in the MRR at the span's start, and one after it never happens inside
 * the period being read.
 */
export const averageMrrOver = (
  start: number,
  end: number,
  moments: readonly number[],
  mrr: (time: number) => number,
): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return mrr(start);
  const inside = filter(
    (moment: number) => moment > start && moment < end,
    moments,
  );
  const edges = [start, ...sortBy((moment: number) => moment, inside), end];
  let weighted = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const from = edges[index] ?? start;
    const to = edges[index + 1] ?? end;
    weighted += monthsBetween(from, to) * mrr(from);
  }
  return weighted / span;
};

/** The same span read as a RATE, against the ACTIVE fixture's fixed cost. */
export const averageRateOver = (
  start: number,
  end: number,
  moments: readonly number[],
  mrr: (time: number) => number,
): number => rateFromMrr(averageMrrOver(start, end, moments, mrr));

/** The share of the span a change made at `at` is in force for. */
export const weightFrom = (start: number, end: number, at: number): number => {
  const span = monthsBetween(start, end);
  if (span <= 0) return 0;
  return Math.min(Math.max(monthsBetween(at, end) / span, 0), 1);
};

/**
 * THE GAUGE'S READING, in MRR: the scenario's monthly revenue averaged over the
 * whole year, in MONTHS.
 *
 * Not the selected change's own MRR, which would say a product discontinued in
 * December costs the year what the same product discontinued in January does.
 *
 * It samples EVERY MONTH (`momentsOf`), not only the flags — see there. On the
 * OPENING scenario, which carries no changes at all, every sample is the same
 * figure and the weighted average collapses to it exactly: $8,347.50 on the tier
 * fixture, $9,100 on the two-app one. That collapse is what makes each
 * calibration solvable in one line per row.
 */
export const averageMrr = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  products: readonly Product[],
): number =>
  averageMrrOver(
    timeOf(domain[0]),
    timeOf(domain[1]),
    momentsOf(mutations),
    (time: number) => mrrAt(products, time, mutations),
  );

/** The same reading as a RATE — MRR less the ACTIVE fixture's fixed cost. */
export const averageRate = (
  domain: TimeDomain,
  mutations: readonly Mutation[],
  products: readonly Product[],
): number =>
  averageRateOver(
    timeOf(domain[0]),
    timeOf(domain[1]),
    momentsOf(mutations),
    (time: number) => mrrAt(products, time, mutations),
  );

/**
 * The COMMITTED rate, in $/mo — what the catalogue the board OPENS on bills on
 * average over the year, less the fixed cost.
 *
 * THE SAME CALL the gauge makes for its own value, so the two are equal by
 * construction rather than by arithmetic that could drift: on the opening
 * scenario the delta is zero and the brace reads "no change to revenue".
 */
export const COMMITTED_RATE = averageRate(
  TIME_DOMAIN,
  SEED_MUTATIONS,
  PRODUCTS,
);

/**
 * The INSTANTANEOUS rate from a moment onward — what the business runs at once
 * every change up to then is in force. A different question from `averageRate`
 * and both are wanted: the gauge reads the year, the balance line projects
 * FORWARD from the month being edited, which is a slope rather than an average.
 */
export const rateAt = (
  time: number,
  mutations: readonly Mutation[],
  products: readonly Product[],
): number => rateFromMrr(mrrAt(products, time, mutations));

/**
 * The share of the year a change must still have ahead of it to pull the average
 * from the committed rate past a THRESHOLD:
 *
 *     COMMITTED + w × (changed − COMMITTED) < threshold
 *
 * EXACT for a change between two FLAT levels — which on THIS fixture is the real
 * case rather than an idealisation, because the opening schedule carries no
 * changes and so is flat. A reader who has already made three changes is back to
 * the general case, and the tests make the empirical claims.
 */
export const weightToReach = (changed: number, threshold: number): number =>
  (COMMITTED_RATE - threshold) / (COMMITTED_RATE - changed);

// ── The calibration table ────────────────────────────────────────────────────

export type RateBand = "red" | "yellow" | "green";

/** The band a rate reads as. Mirrors the gauge's own split, so the headless
 *  table and the drawn dial cannot disagree. */
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
  readonly mrr: number;
  readonly rate: number;
  readonly band: RateBand;
}

/**
 * One calibration scenario: each product asked for has EVERY plan in its history
 * moved — its opening plan and each change — so the row reads "all year",
 * whatever steps the history already takes.
 *
 * `addMonthly` is a DELTA and `fee` an absolute figure, because that is what the
 * two readings are: "fifty more licences" is more seats in every month, and "at
 * its floor" is a level. A discontinued plan (`null`) stays discontinued.
 */
const calibrationProducts = (
  products: readonly Product[],
  change: (
    product: Product,
  ) => { addMonthly?: number; fee?: number } | undefined,
): Product[] =>
  map((product: Product) => {
    const asked = change(product);
    if (asked === undefined) return product;
    const moved = (plan: Plan | null): Plan | null =>
      plan === null
        ? null
        : {
            ...plan,
            monthlyLicenses: plan.monthlyLicenses + (asked.addMonthly ?? 0),
            fee: asked.fee ?? plan.fee,
          };
    return {
      ...product,
      committed: moved(product.committed),
      changes: Object.fromEntries(
        map(
          ([id, plan]: [string, Plan | null]) => [id, moved(plan)],
          Object.entries(product.changes),
        ),
      ),
    };
  }, products);

/** A product's own label, for a row's sentence. Falls back to the id so a
 *  fixture that names a product the table cannot find still prints something
 *  a reader can act on rather than an empty phrase. */
const labelOf = (products: readonly Product[], id: string): string =>
  find((product: Product) => product.id === id, products)?.label ?? id;

/**
 * The row's sentence, naming the products it moved — `Team's fee at its floor`
 * for one, `Team and Enterprise at their fee floors` for several.
 *
 * SINGULAR AND PLURAL are spelled separately because the fixtures differ on
 * exactly this: both yellow rows cut ONE product and both red rows cut several.
 * "Team at their fee floors" is what a single shared phrasing produced, and a
 * calibration table is a thing people read aloud to each other.
 */
const atFloorsLabel = (
  products: readonly Product[],
  ids: readonly string[],
): string => {
  const names = map((id: string) => labelOf(products, id), ids);
  return names.length === 1
    ? `${names[0]}'s fee at its floor`
    : `${names.join(" and ")} at their fee floors`;
};

/**
 * The calibration, as data — each row the reading THE GAUGE GIVES for the
 * catalogue the board OPENS on, with the row's change applied to every month of
 * the year. Exactly the table in the fixture's own header.
 *
 * IT TAKES A WHOLE FIXTURE, not just the products, because a row's BAND depends
 * on that catalogue's own fixed cost and comfortable gain — reading one
 * catalogue's MRR against another's breakeven would produce a table that looks
 * fine and describes nothing. Passing the fixture is what lets the test assert
 * BOTH tables while only one of them is active.
 */
export const rateBandTable = (fixture: Fixture = FIXTURE): RateRow[] => {
  const { products } = fixture;
  const row = (scenario: string, scenarioProducts: Product[]): RateRow => {
    const mrr = averageMrr(TIME_DOMAIN, SEED_MUTATIONS, scenarioProducts);
    const rate = mrr - fixture.fixedMonthlyCost;
    return { scenario, mrr, rate, band: bandOfRate(rate, fixture.comfortable) };
  };
  const floorOf = (product: Product): number => product.feeRange[0];
  const atFloors = (ids: readonly string[]): Product[] =>
    calibrationProducts(products, (product) =>
      ids.includes(product.id) ? { fee: floorOf(product) } : undefined,
    );
  const { grow, yellow, red } = fixture.calibration;
  return [
    row("as it opens", [...products]),
    row(
      `${labelOf(products, grow)} +50 monthly licences`,
      calibrationProducts(products, (product) =>
        product.id === grow ? { addMonthly: 50 } : undefined,
      ),
    ),
    row(atFloorsLabel(products, yellow), atFloors(yellow)),
    row(atFloorsLabel(products, red), atFloors(red)),
  ];
};

// ── The License Mix chart ────────────────────────────────────────────────────

/**
 * The cap the License Mix y-axis is FIXED to, in dollars a month.
 *
 * A fixed domain is the point — the bands' heights are then comparable across
 * every edit, and a stack that re-scaled itself would make a product
 * discontinued look like a product unchanged. It is sized against the FIXTURE
 * and comes off it: $16,000 seats the tier catalogue's $8,347.50 top edge at
 * just over half the plot and leaves the breakeven rule at $6,600 clearly below
 * it, and the two-app catalogue needs $18,000 for the same reading.
 */
export const DEFAULT_MRR_CAP = FIXTURE.mrrCap;

/**
 * The breakeven MRR, in dollars a month — the dashed rule across the stack.
 *
 * It is the fixed monthly cost, not a second number: the month the stack's top
 * edge crosses this line is the month the business starts making money, which is
 * the one thing a licence board is for. Having it BE `FIXED_MONTHLY_COST` rather
 * than a copy is what makes the rule and the gauge's zero the same claim.
 */
export const BREAKEVEN_MRR = FIXED_MONTHLY_COST;

/** The cap can never sit below the rule it has to contain. */
export const MIN_MRR_CAP = BREAKEVEN_MRR;

/**
 * The MRR points for one product. Changes only, opening at the edge.
 *
 * It walks EVERY MONTH (`momentsOf`), so a segment's start or end lands in the
 * month it happens even when no flag sits there. It emits CHANGES only — a month
 * repeating the previous month's MRR spends a transition on nothing — so the
 * opening fixture costs one point per product and a year with two changes costs
 * three.
 *
 * Falling to ZERO is a change and IS emitted, because that is what collapses the
 * band onto the edge below it.
 *
 * Every series opens at the span's left edge, including one at zero: a band that
 * started later would leave the bands above it with no floor to sit on until it
 * appeared.
 */
export const mrrPointsFor = (
  product: Product,
  mutations: readonly Mutation[],
): { at: Date; value: number }[] => {
  const points: { at: Date; value: number }[] = [];
  let previous: number | null = null;
  for (const time of momentsOf(mutations)) {
    const value = monthlyOf(planAt(product, time, mutations));
    if (previous !== null && value === previous) continue;
    points.push({ at: new Date(time), value });
    previous = value;
  }
  return points;
};

/**
 * Population standard deviation of a list of numbers — the measure of "how big
 * are the bumps" `byVariability` sorts on. COPIED from `hourly-board-model.ts`,
 * where it is module-private.
 */
const stdDev = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const mean = sum(values) / values.length;
  return Math.sqrt(
    sum(map((value: number) => (value - mean) ** 2, values)) / values.length,
  );
};

/**
 * ONE PRODUCT'S VARIABILITY: the standard deviation of its MRR across every
 * month slot in the span, read from the LIVE schedule.
 *
 * MRR AND NOT LICENCE COUNT, which is the one place this differs from the Hourly
 * Board's `variabilityOf` rather than mirroring it. There, hours IS the band's
 * value, so sorting on hours sorts on the drawn shape. Here the band's value is
 * `#mo × $ + #yr × $ × pct`: a product whose monthly seats swing by 50 at $15
 * draws a $750 bump, and one whose six annual seats move to eight at $400 × 80%
 * draws a $640 one on two seats. Sorting on the count would put the visibly
 * flatter band on top, and "the one with the biggest bumps is on top" is a claim
 * about the PICTURE.
 *
 * Std dev rather than peak-to-trough: it weighs how LONG each level lasts, where
 * peak-to-trough would see only the two extremes and rank a one-month blip as
 * high as a whole half-year at a different level.
 */
export const variabilityOf = (
  product: Product,
  mutations: readonly Mutation[],
): number =>
  stdDev(
    map((at: number) => monthlyOf(planAt(product, at, mutations)), MONTH_SLOTS),
  );

/**
 * Products ordered ASCENDING by variability — so the MOST variable product is
 * LAST, which `StackedAreaSeries` draws as the TOP band (its own header: "array
 * order is stacking order").
 *
 * `sortBy` is STABLE, so products whose variability ties keep the FIXTURE'S OWN
 * order rather than swapping as the reader edits toward and away from the tie.
 * That is not a corner case here: the board OPENS with every variability at zero
 * (no changes, so no bumps), and without stability the three bands would be in
 * an arbitrary order on the first frame.
 */
export const byVariability = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): Product[] =>
  sortBy((product: Product) => variabilityOf(product, mutations), products);

/**
 * One row of the DEBUG stack-order table: a product's variability beside where
 * it landed in the stack — position 0 is the bottom band.
 */
export interface StackOrderRow {
  readonly product: string;
  readonly stdDevDollarsPerMonth: number;
  readonly position: number;
  readonly band: "bottom" | "top" | "middle";
}

/** The stack-order table `byVariability` produces, as data. */
export const stackOrderTable = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): StackOrderRow[] => {
  const ordered = byVariability(products, mutations);
  return map(
    (product: Product, position: number): StackOrderRow => ({
      product: product.label,
      stdDevDollarsPerMonth:
        Math.round(variabilityOf(product, mutations) * 100) / 100,
      position,
      band:
        position === 0
          ? "bottom"
          : position === ordered.length - 1
            ? "top"
            : "middle",
    }),
    ordered,
  );
};

/**
 * One band per product, ordered by `byVariability` — the MOST variable product
 * is LAST in the array, which is the TOP band. The band's VALUE is that
 * product's MRR, so the stack's top edge is total MRR and the breakeven rule
 * crosses it at a meaningful height.
 */
export const licenseMixSeries = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): StackedAreaSeriesData[] =>
  map(
    (product: Product) => ({
      id: product.id,
      label: product.label,
      points: mrrPointsFor(product, mutations),
    }),
    byVariability(products, mutations),
  );

/** One month of the billing schedule, as a row a terminal can print. */
export interface MonthRow {
  /** The slot index, 0–11. */
  readonly month: number;
  /** `2025-08` — the exact month the chip abbreviates. */
  readonly label: string;
  /** One column per product, in fixture order: its MONTHLY licences. */
  readonly monthly: readonly number[];
  /** One column per product: its ANNUAL licences. */
  readonly annual: readonly number[];
  /** One column per product: what it bills that month. */
  readonly revenue: readonly number[];
  /** The top of the stack that month — total MRR. */
  readonly mrr: number;
  /** `over` or `under` the breakeven rule. */
  readonly breakeven: "over" | "under";
}

/**
 * THE BILLING SCHEDULE, month by month — every product's history as a table, so
 * the shape can be argued with from a terminal before anyone opens the chart.
 *
 * This is the observation the License Mix chart draws and the projection
 * integrates: one row per month slot, every product's two counts and its MRR
 * beside the total and which side of breakeven it lands.
 */
export const billingTable = (
  products: readonly Product[] = PRODUCTS,
  mutations: readonly Mutation[] = [],
): MonthRow[] =>
  map((at: number, month: number) => {
    const plans = map(
      (product: Product) => planAt(product, at, mutations),
      products,
    );
    const mrr = sum(map((plan: Plan | null) => monthlyOf(plan), plans));
    return {
      month,
      label: monthLabel(new Date(at)),
      monthly: map((plan: Plan | null) => plan?.monthlyLicenses ?? 0, plans),
      annual: map((plan: Plan | null) => plan?.annualLicenses ?? 0, plans),
      revenue: map((plan: Plan | null) => monthlyOf(plan), plans),
      mrr,
      breakeven: mrr > BREAKEVEN_MRR ? ("over" as const) : ("under" as const),
    };
  }, MONTH_SLOTS);

/** The best month of a schedule, and how much MRR it holds. */
export const peakMonth = (
  products: readonly Product[] = PRODUCTS,
  mutations: readonly Mutation[] = [],
): MonthRow => {
  const rows = sortBy(
    (row: MonthRow) => -row.mrr,
    billingTable(products, mutations),
  );
  return (
    rows[0] ?? {
      month: 0,
      label: "",
      monthly: [],
      annual: [],
      revenue: [],
      mrr: 0,
      breakeven: "under" as const,
    }
  );
};

/**
 * The quarter starts inside the span — the x-axis's four tick values.
 *
 * THE AXIS IS TICKED BY QUARTER while the chips read by MONTH, which is the same
 * split the Hourly Board makes between its weekly chips and its quarterly axis,
 * for the same reason: twelve ticks on one plot is a crowded axis, and the chip
 * carries the month that locates a change inside the quarter it names
 * (`2025-Q3 · Aug`). The two vocabularies meet in the chip.
 */
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

/** `2025-Q1`. The same vocabulary the as-of chips name their quarter in. */
export const quarterLabelOf = (at: TimeValue): string => {
  const when = new Date(timeOf(at));
  return `${when.getUTCFullYear()}-Q${Math.floor(when.getUTCMonth() / 3) + 1}`;
};

// ── The Cash Flow chart ──────────────────────────────────────────────────────

/** The opening bank balance, in dollars. */
export const OPENING_BALANCE = 38_000;

/**
 * Thirteen months of net monthly flow, hand-written rather than derived from the
 * dials: the top line is the business as ALREADY COMMITTED, and the dials below
 * it are the change being proposed against it.
 *
 * ⚠ These are already NET of the fixed cost, and they are SMOOTH — see the
 * header's cash-timing note. A real licence business's committed flow is lumpy
 * in exactly the months its annual cohorts renew, and this fixture does not
 * carry renewal months to make it so.
 */
export const MONTHLY_NET: readonly number[] = [
  1500, 1300, 1800, 1650, 2000, 1900, 2250, 2100, 2400, 2300, 2600, 2450, 2800,
];

/** Running balance, month by month, in dollars. */
export const runningBalances = (
  flows: readonly number[],
  opening: number,
): number[] => {
  const balances: number[] = [];
  let carried = opening;
  for (const flow of flows) {
    carried += flow;
    balances.push(carried);
  }
  return balances;
};

/** The fan's half-width at a month: ZERO at now, widening with the SQUARE of the
 *  months since — a forecast is surer about next month than next year. */
export const UNCERTAINTY_PER_MONTH_SQUARED = 150;

export const fanAt = (index: number, nowIndex: number): number => {
  const months = index - nowIndex;
  return months <= 0 ? 0 : UNCERTAINTY_PER_MONTH_SQUARED * months * months;
};

/** The first instant of each of `count` consecutive months from `from`. The
 *  balance chart's own cell edges — `monthlyCells(DOMAIN_START, …)[i].start` —
 *  stated as a number the arithmetic can take, so the projection's integral and
 *  the drawn cells cannot disagree about where a month begins. */
export const monthStarts = (from: Date, count: number): number[] => {
  const starts: number[] = [];
  for (let index = 0; index < count; index += 1) {
    starts.push(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1));
  }
  return starts;
};

/**
 * The balance a rate ACCRUES between two moments — the projection's integral.
 *
 *     accrued = Σ over each stretch between changes of
 *                   months(stretch) × MONTHS_PER_UNIT × rate(at its start)
 *
 * A SUM rather than one multiplication, and that is the point: one scalar rate
 * times the elapsed months draws the same straight slope whatever the months in
 * between did, so a scenario that launches a product in June and discontinues
 * another in September would project as a flat line while the gauge beside it
 * read the steps. Integrating the SAMPLED rate makes each stretch carry its own
 * reading, so the deltas differ cell to cell and the line bends.
 *
 * The walk is over the CHANGE MOMENTS rather than a fixed grid, and the two
 * agree by construction here: every mutation is snapped to the first of a month
 * (`monthOfPick`), so a stretch between two changes is a whole number of months
 * and summing the stretches IS summing `rateAt(month)` over them. Walking the
 * moments is also exact when they are not — a change landing mid-month is
 * weighted by the fraction of the month it is in force for rather than being
 * rounded onto the nearest sample.
 *
 * Moments outside the stretch are IGNORED, the same rule `averageRateOver`
 * follows: one before it is already in the rate at the start, and one after it
 * never happens inside the stretch being projected.
 */
export const accruedOver = (
  from: number,
  to: number,
  moments: readonly number[],
  rate: (time: number) => number,
): number => {
  if (to <= from) return 0;
  const inside = filter(
    (moment: number) => moment > from && moment < to,
    moments,
  );
  const edges = [from, ...sortBy((moment: number) => moment, inside), to];
  let accrued = 0;
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index] ?? from;
    const end = edges[index + 1] ?? to;
    accrued += monthsBetween(start, end) * MONTHS_PER_UNIT * rate(start);
  }
  return accrued;
};

/**
 * WHAT THE PROJECTION SAMPLES: the rate as a function of time, the moments it
 * can change at, and the cell edges to integrate between.
 *
 * One object rather than three positional arguments because they are one
 * decision — "how is the forward rate read?" — and a caller that has an answer
 * for `rate` always has one for `moments`.
 */
export interface RateSampling {
  /** The first instant of each cell, in ms. Same length and order as the
   *  committed balances. See `monthStarts`. */
  readonly boundaries: readonly number[];
  /** The rate in force from a moment onward. `rateAt` bound to a scenario — or
   *  `() => rate` for a flat projection, which is the same one code path. */
  readonly rate: (time: number) => number;
  /** The moments the rate is allowed to change at. */
  readonly moments: readonly number[];
}

/**
 * The balance line: COMMITTED up to `nowIndex`, then PROJECTED forward by
 * INTEGRATING the sampled rate from the pivot.
 *
 *     balance(m) = balance(now) + accruedOver(now, m, …)
 *
 * This is the wire from the dials to the chart. A drag changes the rate, the
 * rate changes every month after now, and the line visibly pivots about the now
 * point. Before now nothing moves, because the past is not a forecast.
 */
export const projectedBalances = (
  committed: readonly number[],
  sampling: RateSampling,
  nowIndex: number,
): number[] =>
  map((_balance: number, index: number) => {
    const pivotIndex = Math.min(nowIndex, committed.length - 1);
    const pivot = committed[pivotIndex] ?? 0;
    if (index <= nowIndex) return committed[index] ?? pivot;
    const from = sampling.boundaries[pivotIndex];
    const to = sampling.boundaries[index];
    if (from === undefined || to === undefined) return pivot;
    return pivot + accruedOver(from, to, sampling.moments, sampling.rate);
  }, committed);

/** One row of the DEBUG projection table: the rate the projection SAMPLED for
 *  that cell and what it did to the balance. */
export interface ProjectionRow {
  readonly month: string;
  readonly projectedRate: number;
  readonly balance: number;
  readonly delta: number;
  readonly part: "committed" | "projected";
}

/** The balance line as a table — headless first, so the bend can be argued with
 *  from a terminal before anyone opens the chart. */
export const projectionTable = (
  committed: readonly number[],
  sampling: RateSampling,
  nowIndex: number,
): ProjectionRow[] => {
  const balances = projectedBalances(committed, sampling, nowIndex);
  return map((balance: number, index: number) => {
    const at = sampling.boundaries[index] ?? 0;
    const previous =
      index === 0 ? (committed[0] ?? 0) : (balances[index - 1] ?? 0);
    return {
      month: new Date(at).toISOString().slice(0, 7),
      projectedRate: Math.round(sampling.rate(at)),
      balance: Math.round(balance),
      delta: Math.round(balance - previous),
      part: index <= nowIndex ? ("committed" as const) : ("projected" as const),
    };
  }, balances);
};

/**
 * The chart's PINNED y-domain ceiling, in dollars — computed, printed in the
 * DEBUG table and NOT given to the chart, exactly as both other boards do.
 *
 * It is what a domain wide enough for every dial at maximum would need. On this
 * fixture that is $24,258/mo of rate over thirteen months on top of a committed
 * line that ends near $65k, which squashes the committed line into the bottom of
 * the plot and makes it read flat. The chart uses a HIGH-WATER MARK instead —
 * the peak the reader has actually seen — so the axis rises when a change pushes
 * the line above it and never jitters downward on a drag.
 */
export const pinnedCeiling = (
  balances: readonly number[],
  maxRate: number,
  fan: (monthsAfterNow: number) => number,
  tick = 50_000,
): number => {
  let highest = 0;
  for (const [index] of balances.entries()) {
    const projected = (balances[0] ?? 0) + maxRate * index + fan(index);
    highest = Math.max(highest, projected, balances[index] ?? 0);
  }
  return Math.ceil(highest / tick) * tick;
};

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * The scenario, reduced to the thing Save would persist.
 *
 * A DIGEST rather than a deep comparison because "is this dirty?" is one question
 * asked on every render, and a stable string answers it with no traversal at the
 * call site. Keys are emitted in a fixed order, so two equal scenarios can never
 * digest differently.
 */
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

/** Has anything moved since the last save? */
export const isDirty = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  savedDigest: string,
): boolean => scenarioDigest(products, mutations) !== savedDigest;

/** Does any product carry a change at all? For the DEBUG table's summary. */
export const hasAnyChange = (products: readonly Product[]): boolean =>
  some((product: Product) => Object.keys(product.changes).length > 0, products);
