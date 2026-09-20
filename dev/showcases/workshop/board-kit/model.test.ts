/**
 * Board Kit — THE TEST THAT DISTINGUISHES A KIT FROM A RENAME.
 *
 * `hourly.config.test.ts` is 99 assertions proving the Hourly Board's numbers
 * survive the move onto this kit. On its own that proves only that the Hourly
 * model was renamed: every one of those numbers could still be coming from code
 * that knows what a service is.
 *
 * So this file drives the SAME functions from a config shaped like the OTHER
 * board — one axis instead of two, `side: "expense"` instead of `"revenue"`,
 * `unit: "yr"` instead of `"wk"`, a quarterly grain instead of a weekly one —
 * and asserts the Scenario Board's own published calibration table, computed by
 * `scenario-shape.fixture.ts` rather than retyped. If the kit were Hourly
 * code wearing a generic hat, this would not read 60,000 / 40,000 / 20,000 /
 * −180,000.
 *
 * ── THE ALGEBRA THAT MAKES ONE SUBTRACTION SERVE BOTH BOARDS ───────────────
 *
 * The Scenario Board's rate is stated as a BASELINE less the pay CHANGE:
 *
 *     rate = RATE_BASELINE − Σ (pay(t) − committed pay)
 *          = (RATE_BASELINE + Σ committed pay) − Σ pay(t)
 *
 * which is `fixedCost − Σ contribution` with `fixedCost = 60,000 + 160,000 =
 * 220,000`. The Hourly Board's is `Σ contribution − fixedCost`. One
 * subtraction, read in two directions — which is all `side` is.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../../src/fn";
import type { Mutation } from "../../../../src";
import {
  type BoardConfig,
  type BoardEntity,
  bandOfRate,
  rateFromContribution,
  unitsPer,
} from "./config";
import {
  accruedOver,
  addMutation,
  averageRate,
  ensureMutation,
  gridOf,
  levelsAt,
  monthlyFrom,
  momentsOf,
  nearestMutation,
  nextFreeSlot,
  rateAt,
  removeMutation,
  segmentLabelsOf,
  slotOf,
  spanIn,
  weightFrom,
} from "./model";
import { abbreviateDollars } from "./model";
import {
  COMFORTABLE,
  RATE_BASELINE,
  RATE_DOMAIN,
  rateBandTable,
} from "./scenario-shape.fixture";

const DOMAIN_START = new Date("2025-01-01");
const DOMAIN_END = new Date("2026-01-01");
const START = DOMAIN_START.getTime();
const END = DOMAIN_END.getTime();

/** The two engineers the Scenario Board opens with: both on $80k, both in a
 *  role that runs $80k–$200k, and neither given anything yet. */
const PEOPLE: readonly BoardEntity[] = [
  {
    id: "peter",
    label: "Peter",
    start: START,
    committed: [80_000],
    ranges: [[80_000, 200_000]],
    changes: {},
  },
  {
    id: "adlai",
    label: "Adlai",
    start: START,
    committed: [80_000],
    ranges: [[80_000, 200_000]],
    changes: {},
  },
];

/** `RATE_BASELINE` plus what the roster is already committed to — see header. */
const COMMITTED_PAY = 160_000;

/** THE SCENARIO BOARD, AS A CONFIG. One axis, expense side, dollars a year. */
const SCENARIO: BoardConfig<1> = {
  id: "scenario",
  title: "Scenario Board",
  unit: "yr",
  grain: "quarter",
  side: "expense",
  domain: [DOMAIN_START, DOMAIN_END],
  axes: [
    {
      label: "Pay",
      domain: [80_000, 200_000],
      snap: 1_000,
      format: abbreviateDollars,
    },
  ],
  contributionOf: (measures: readonly number[]): number => measures[0] ?? 0,
  fixedCost: RATE_BASELINE + COMMITTED_PAY,
  comfortable: COMFORTABLE,
  rateDomain: RATE_DOMAIN,
  sentences: { against: String, delta: String },
  mix: "levels",
  fixture: PEOPLE,
  seed: [],
  measures: 1,
};

/** A change at the span's own left edge — weight 1, which is the moment the
 *  Scenario Board's calibration table is computed at. */
const Q1: Mutation = { id: "q1", at: new Date("2025-01-01"), label: "1" };
/** And one three quarters of the way through it. */
const Q4: Mutation = { id: "q4", at: new Date("2025-10-01"), label: "2" };

/** Everyone raised by the same amount at one change. */
const raiseAll = (
  people: readonly BoardEntity[],
  to: number,
  at: string,
): BoardEntity[] =>
  map(
    (person: BoardEntity) => ({
      ...person,
      changes: { ...person.changes, [at]: [to] },
    }),
    people,
  );

describe("one subtraction, read in two directions", () => {
  it("reproduces the Scenario Board's OWN calibration table", () => {
    // Its four rows, from its own module — not retyped here, so a change to
    // that board's constants fails this test rather than drifting past it.
    const published = rateBandTable();
    const readings = [
      { pay: [80_000, 80_000], row: 0 },
      { pay: [100_000, 80_000], row: 1 },
      { pay: [100_000, 100_000], row: 2 },
      { pay: [200_000, 200_000], row: 3 },
    ];
    for (const { pay, row } of readings) {
      const total = pay[0]! + pay[1]!;
      const rate = rateFromContribution(SCENARIO, total);
      expect(rate).toBe(published[row]!.rate);
      expect(bandOfRate(SCENARIO, rate)).toBe(published[row]!.band);
    }
    // And the four figures, spelled out, so a reader of this file does not
    // have to run the other module to know what is being claimed.
    expect(map((r) => r.rate, published)).toEqual([
      60_000, 40_000, 20_000, -180_000,
    ]);
    expect(map((r) => r.band, published)).toEqual([
      "green",
      "green",
      "yellow",
      "red",
    ]);
  });

  it("runs the SAME function the revenue-side board runs", () => {
    // Revenue side: contribution up, rate up. Expense side: contribution up,
    // rate down. Nothing else differs.
    const revenue = { side: "revenue" as const, fixedCost: 1_700 };
    const expense = { side: "expense" as const, fixedCost: 1_700 };
    expect(rateFromContribution(revenue, 2_185)).toBe(485);
    expect(rateFromContribution(expense, 2_185)).toBe(-485);
  });

  it("reads the opening roster at exactly the baseline", () => {
    expect(averageRate(SCENARIO, PEOPLE, [])).toBe(RATE_BASELINE);
    expect(rateAt(SCENARIO, PEOPLE, START, [])).toBe(RATE_BASELINE);
  });
});

describe("the composite reading, on a QUARTERLY board in YEARS", () => {
  it("weighs a raise by the share of the year it is in force for", () => {
    const history = [Q1, Q4];
    // Both engineers to $100k — a $40k pay rise against the committed roster.
    const fromQ1 = raiseAll(PEOPLE, 100_000, Q1.id);
    const fromQ4 = raiseAll(PEOPLE, 100_000, Q4.id);
    expect(averageRate(SCENARIO, fromQ1, history)).toBeCloseTo(20_000, 6);
    // The same raise made in October is in force for a quarter of the year and
    // costs the average a quarter as much — which is why the published table
    // states the moment its rows are computed at.
    expect(weightFrom(START, END, new Date("2025-10-01").getTime(), "yr")).toBeCloseTo(0.25, 10);
    expect(averageRate(SCENARIO, fromQ4, history)).toBeCloseTo(50_000, 6);
    // Still green in October, yellow from January: the verdict moved with the
    // date and not with the amount.
    expect(bandOfRate(SCENARIO, averageRate(SCENARIO, fromQ4, history))).toBe(
      "green",
    );
    expect(bandOfRate(SCENARIO, averageRate(SCENARIO, fromQ1, history))).toBe(
      "yellow",
    );
  });

  it("weighs in the unit the board counts in", () => {
    // A year is twelve months and 52.14 weeks, and the difference is the
    // calendar rather than an error.
    expect(spanIn("yr", START, END)).toBe(1);
    expect(spanIn("mo", START, END)).toBe(12);
    expect(spanIn("wk", START, END)).toBeCloseTo(365 / 7, 10);
  });
});

describe("the unit conversions, which the two boards wrote in opposite directions", () => {
  it("keys monthlyFrom off the unit, so neither board can have it backwards", () => {
    // A $/yr board divides by twelve; a $/wk board multiplies by 52/12; a
    // $/mo board does nothing at all. One lookup, three answers.
    expect(monthlyFrom("yr", 60_000)).toBe(5_000);
    expect(monthlyFrom("mo", 5_000)).toBe(5_000);
    expect(monthlyFrom("wk", 1_200)).toBe(5_200);
  });

  it("states unitsPer as the reciprocal pair it is", () => {
    expect(unitsPer("wk", "mo")).toBeCloseTo(52 / 12, 12);
    expect(unitsPer("mo", "wk")).toBeCloseTo(12 / 52, 12);
    expect(unitsPer("yr", "mo")).toBeCloseTo(1 / 12, 12);
    expect(unitsPer("wk", "wk")).toBe(1);
  });

  it("integrates a YEARLY rate over months as the Scenario Board did", () => {
    // Its own integral was `monthsBetween × rate / 12`. Twelve months of
    // $60k/yr is $60k, whichever way it is summed.
    expect(accruedOver(START, END, [], () => 60_000, "yr", "mo")).toBeCloseTo(
      60_000,
      6,
    );
    expect(accruedOver(START, END, [], () => 60_000, "yr")).toBeCloseTo(
      60_000,
      6,
    );
  });
});

describe("the calendar, by grain", () => {
  it("lays a QUARTERLY grid where the Scenario Board's flags land", () => {
    const grid = gridOf(SCENARIO);
    expect(grid).toHaveLength(4);
    expect(map((at: number) => new Date(at).toISOString().slice(0, 10), grid))
      .toEqual(["2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01"]);
    expect(nextFreeSlot(SCENARIO, [])).toBe(START);
    expect(nextFreeSlot(SCENARIO, [Q1])).toBe(new Date("2025-04-01").getTime());
  });

  it("lays a MONTHLY grid for a board that asks for one", () => {
    const monthly = { ...SCENARIO, grain: "month" as const };
    expect(gridOf(monthly)).toHaveLength(12);
    // The License Board's grain: a change lands on the first of its month.
    expect(slotOf("month", new Date("2025-08-19").getTime(), START)).toBe(
      Date.UTC(2025, 7, 1),
    );
  });

  it("clamps the FIRST slot to the span's own start, so weight 1 is reachable", () => {
    // A weekly board opening on a Wednesday: without the clamp its first
    // pickable slot would be five days in, and every reading that depends on
    // "a change at the left edge holds all year" would be off by those days.
    const weekly = { ...SCENARIO, grain: "week" as const };
    expect(gridOf(weekly)[0]).toBe(START);
    expect(weightFrom(START, END, gridOf(weekly)[0]!, "wk")).toBe(1);
  });

  it("samples every slot, not only the flags", () => {
    // An entity can begin or end in a slot with no flag in it.
    expect(momentsOf(SCENARIO, [])).toHaveLength(4);
    expect(momentsOf(SCENARIO, [Q4])).toHaveLength(4);
    const offGrid: Mutation = {
      id: "x",
      at: new Date("2025-05-14"),
      label: "",
    };
    expect(momentsOf(SCENARIO, [offGrid])).toHaveLength(5);
  });

  it("labels a chip by the grain, and disambiguates only where it must", () => {
    // Two quarterly changes in ONE quarter: both chips gain the month, not
    // just the second, because a reader comparing two chips needs them to
    // differ in the same place.
    const july: Mutation = { id: "jul", at: new Date("2025-07-01"), label: "" };
    const august: Mutation = { id: "aug", at: new Date("2025-08-01"), label: "" };
    expect(map((s) => s.label, segmentLabelsOf([Q1, july], "quarter"))).toEqual([
      "2025-Q1",
      "2025-Q3",
    ]);
    expect(
      map((s) => s.label, segmentLabelsOf([july, august], "quarter")),
    ).toEqual(["2025-Q3 · Jul", "2025-Q3 · Aug"]);
    // A weekly grid needs none: one change per week is unique by construction.
    // The chip carries the change's OWN date beside its ISO week number — the
    // week number is what a reader talks seasonality in, the date is what makes
    // the chip locatable against an axis ticked by quarter.
    expect(map((s) => s.label, segmentLabelsOf([Q4], "week"))).toEqual([
      "W40 · Oct 1",
    ]);
    // A monthly grid needs none either — but its chip is the crowded-quarter
    // chip with the suffix ALWAYS on, rather than a bare `2025-07`. Always-on
    // is the point: the crowding rule alone would give one control three chip
    // formats as the reader works (`2025-Q3`, then two `2025-Q3 · Jul`/`· Aug`,
    // then a bare `2025-Q4`). Reconciled from the retired Scenario Board's
    // version on 2026-09-19; the License Board reads through this branch.
    expect(map((s) => s.label, segmentLabelsOf([july], "month"))).toEqual([
      "2025-Q3 · Jul",
    ]);
    expect(
      map((s) => s.label, segmentLabelsOf([july, august], "month")),
    ).toEqual(["2025-Q3 · Jul", "2025-Q3 · Aug"]);
  });

  it("selects rather than duplicates, and renumbers by POSITION", () => {
    const first = addMutation([], new Date("2025-04-01"));
    expect(addMutation(first.mutations, new Date("2025-04-01")).mutations)
      .toHaveLength(1);
    const second = addMutation(first.mutations, new Date("2025-01-01"));
    expect(map((m: Mutation) => m.label, second.mutations)).toEqual(["1", "2"]);
  });

  it("makes the first change at the first free slot and keeps an existing one", () => {
    const made = ensureMutation(SCENARIO, { mutations: [], selected: null });
    expect(made.created).toBe(true);
    expect(made.mutations[0]!.at.valueOf()).toBe(START);
    const kept = ensureMutation(SCENARIO, {
      mutations: [Q4],
      selected: Q4.id,
    });
    expect(kept.created).toBe(false);
    expect(kept.selected).toBe(Q4.id);
  });
});

describe("deleting a change", () => {
  it("prefers the EARLIER survivor — the Scenario Board's argued rule", () => {
    // The changes AFTER the deleted one now mean something different, because
    // they carry forward from a different level. The reader should land where
    // the scenario still says what it said. The Hourly Board preferred the
    // later survivor with no stated reason; this is the resolution.
    const q2: Mutation = { id: "q2", at: new Date("2025-04-01"), label: "2" };
    expect(nearestMutation([Q1, q2, Q4], q2.id)).toBe(Q1.id);
    // With nothing earlier there is only the later one.
    expect(nearestMutation([Q1, q2, Q4], Q1.id)).toBe(q2.id);
    expect(nearestMutation([Q1], Q1.id)).toBeNull();
  });

  it("removes anything that only existed because of it", () => {
    const hired: BoardEntity = {
      id: "new",
      label: "New",
      start: START,
      committed: null,
      ranges: [[80_000, 200_000]],
      changes: { [Q4.id]: [80_000] },
    };
    const next = removeMutation(
      { mutations: [Q1, Q4], entities: [...PEOPLE, hired] },
      Q4.id,
    );
    expect(map((e: BoardEntity) => e.id, next.entities)).toEqual([
      "peter",
      "adlai",
    ]);
    expect(next.selected).toBe(Q1.id);
  });
});

describe("reading the roster", () => {
  it("carries a level forward until the next change, on any arity", () => {
    const history = [Q1, Q4];
    const raised = raiseAll(PEOPLE, 120_000, Q1.id);
    expect(levelsAt(raised[0]!, START, history)).toEqual([120_000]);
    expect(levelsAt(raised[0]!, END - 1, history)).toEqual([120_000]);
    // Before the entity exists at all, absence rather than zero.
    const later: BoardEntity = { ...PEOPLE[0]!, start: new Date("2025-10-01").getTime() };
    expect(levelsAt(later, START, history)).toBeNull();
    expect(levelsAt(later, new Date("2025-10-01").getTime(), history)).toEqual([80_000]);
  });

  it("holds every level inside the entity's own allowance", () => {
    // The shaded box on a dial IS the range, so a stored figure past it would
    // be a value the control could never emit.
    const wild: BoardEntity = { ...PEOPLE[0]!, committed: [999_999] };
    expect(levelsAt(wild, START, [])).toEqual([200_000]);
  });
});
