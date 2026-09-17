import { describe, it, expect } from "vitest";
import { map } from "../../../src/fn";
import { isPresentAt } from "./scenario-board-rate";
import {
  EMPTY_HIRE,
  ROLES,
  canHire,
  hire,
  hireName,
  payAt,
  payBefore,
  payFrom,
  payDomainOf,
  addMutation,
  ensureMutation,
  hiredAt,
  nextFreeSlot,
  nearestMutation,
  removeMutation,
  roleOf,
  roleOptionLabel,
  segmentLabelsOf,
  uniqueId,
  type Person,
} from "./scenario-board-people";
import {
  type Mutation,
  quarterLabelOf,
} from "../../../src/components/LevelsTimeline/geometry";

// The bench's own three flags, rebuilt here rather than imported: a test that
// shares the bench's fixture stops being able to say what the FUNCTION does
// once somebody edits the fixture.
const MUTATIONS: readonly Mutation[] = [
  { id: "spring", at: new Date("2025-04-01"), label: "1" },
  { id: "summer", at: new Date("2025-07-01"), label: "2" },
  { id: "autumn", at: new Date("2025-10-01"), label: "3" },
];

const ADLAI: Person = {
  id: "adlai",
  label: "Adlai",
  roleId: "engineer",
  base: 80_000,
  changes: { spring: 100_000 },
};

const money = (amount: number): string => `$${Math.round(amount / 1000)}k`;

describe("roles", () => {
  it("offers three roles with a floor below every ceiling", () => {
    expect(ROLES).toHaveLength(3);
    for (const role of ROLES) {
      expect(role.range[0]).toBeLessThan(role.range[1]);
    }
  });

  // Every pay figure the board's people hold has to sit inside its own role's
  // band, or the dial clamps it on sight and the fixture quietly disagrees
  // with what it draws.
  it("contains every fixture pay inside its role's band", () => {
    const pays: ReadonlyArray<readonly [string, number]> = [
      ["engineer", 80_000],
      ["engineer", 200_000],
      ["cfo", 80_000],
      ["intern", 1_000],
      ["intern", 5_000],
    ];
    for (const [roleId, pay] of pays) {
      const role = roleOf(roleId);
      expect(role, roleId).toBeDefined();
      expect(pay, `${roleId} ${pay}`).toBeGreaterThanOrEqual(
        role?.range[0] ?? Number.NaN,
      );
      expect(pay, `${roleId} ${pay}`).toBeLessThanOrEqual(
        role?.range[1] ?? Number.NaN,
      );
    }
  });

  it("reads a role as its name beside its band", () => {
    const engineer = roleOf("engineer");
    expect(engineer).toBeDefined();
    expect(roleOptionLabel(engineer as (typeof ROLES)[number], money)).toBe(
      "Software Engineer · $80k–$200k",
    );
  });

  it("has no role for an id nobody offers", () => {
    expect(roleOf("ceo")).toBeUndefined();
    expect(roleOf(null)).toBeUndefined();
  });

  // The pinned track has to hold every band it may be asked to draw — a role
  // added with a higher ceiling must widen it, not overflow it.
  it("spans every role's band, floor to ceiling", () => {
    expect(payDomainOf()).toEqual([1_000, 200_000]);
    expect(payDomainOf([{ id: "x", label: "X", range: [10, 20] }])).toEqual([
      10, 20,
    ]);
  });
});

describe("the hire form", () => {
  it("refuses an empty form", () => {
    expect(canHire(EMPTY_HIRE)).toBe(false);
  });

  it("refuses a name that is only whitespace", () => {
    expect(canHire({ name: "   ", roleId: "intern" })).toBe(false);
    expect(hireName({ name: "  Sam  ", roleId: "intern" })).toBe("Sam");
  });

  it("refuses a hire with no role picked", () => {
    expect(canHire({ name: "Sam", roleId: null })).toBe(false);
  });

  it("refuses a role nobody offers", () => {
    expect(canHire({ name: "Sam", roleId: "ceo" })).toBe(false);
  });

  it("accepts a trimmed name and a real role", () => {
    expect(canHire({ name: " Sam ", roleId: "intern" })).toBe(true);
  });

  it("keeps two people of the same name apart", () => {
    expect(uniqueId("Sam", [])).toBe("sam");
    expect(uniqueId("Sam", ["sam"])).toBe("sam-2");
    expect(uniqueId("Sam", ["sam", "sam-2"])).toBe("sam-3");
    // A name with nothing id-able left in it still gets an id.
    expect(uniqueId("...", [])).toBe("hire");
  });
});

describe("hiring at a mutation", () => {
  const hired = hire([ADLAI], { name: " Sam ", roleId: "intern" }, "summer");
  const sam = hired.people[hired.people.length - 1] as Person;

  it("adds one person and leaves everyone else alone", () => {
    expect(hired.people).toHaveLength(2);
    expect(hired.people[0]).toBe(ADLAI);
    expect(sam.label).toBe("Sam");
    expect(sam.id).toBe("sam");
    expect(hired.id).toBe("sam");
  });

  it("starts them at their role's floor, with no prior pay", () => {
    expect(sam.base).toBeNull();
    expect(payFrom(sam, "summer", MUTATIONS)).toBe(1_000);
    expect(payBefore(sam, "summer", MUTATIONS)).toBeNull();
  });

  // The acceptance criterion in one test: a hire exists FROM their mutation
  // and NOT BEFORE it. `isPresentAt` is what the bench filters the dials by,
  // so the rule is asserted through the same function the board uses.
  it("exists from that mutation onward and not before", () => {
    expect(
      isPresentAt(
        payBefore(sam, "spring", MUTATIONS),
        payFrom(sam, "spring", MUTATIONS),
      ),
    ).toBe(false);
    expect(
      isPresentAt(
        payBefore(sam, "summer", MUTATIONS),
        payFrom(sam, "summer", MUTATIONS),
      ),
    ).toBe(true);
    expect(
      isPresentAt(
        payBefore(sam, "autumn", MUTATIONS),
        payFrom(sam, "autumn", MUTATIONS),
      ),
    ).toBe(true);
  });

  // The rails read the history by TIME rather than by mutation id, so the
  // same rule has to hold there or a hire would draw a head on a rail before
  // they were hired.
  it("is on no rail before the moment they were hired", () => {
    expect(payAt(sam, new Date("2025-01-01").getTime(), MUTATIONS)).toBeNull();
    expect(payAt(sam, new Date("2025-06-30").getTime(), MUTATIONS)).toBeNull();
    expect(payAt(sam, new Date("2025-07-01").getTime(), MUTATIONS)).toBe(1_000);
    expect(payAt(sam, new Date("2025-12-31").getTime(), MUTATIONS)).toBe(1_000);
  });

  it("needs no entry at the mutations after the hire", () => {
    // "Unchanged" is what an ABSENT key already says, so a hire writes exactly
    // one key however many mutations follow it.
    expect(Object.keys(sam.changes)).toEqual(["summer"]);
  });

  it("refuses to hire into a role nobody offers", () => {
    expect(() => hire([], { name: "Sam", roleId: "ceo" }, "summer")).toThrow();
  });
});

// The chips sit directly under an axis that labels a one-year span by quarter,
// so they read by quarter too — and the interesting half is what happens when
// two changes land in the same one.
describe("the as-of chips", () => {
  const at = (iso: string): Mutation => ({
    id: iso,
    at: new Date(iso),
    label: "",
  });

  // The formatter is the AXIS's, not ours (`quarterLabelOf`), so these rows
  // assert the contract the chips depend on rather than a local copy of it —
  // if the axis ever changed its mind about quarter boundaries, the chips
  // would follow and this test would say so.
  it("labels each quarter of the year", () => {
    expect(quarterLabelOf(new Date("2025-01-01"))).toBe("2025-Q1");
    expect(quarterLabelOf(new Date("2025-03-31"))).toBe("2025-Q1");
    expect(quarterLabelOf(new Date("2025-04-01"))).toBe("2025-Q2");
    expect(quarterLabelOf(new Date("2025-07-01"))).toBe("2025-Q3");
    expect(quarterLabelOf(new Date("2025-10-01"))).toBe("2025-Q4");
    expect(quarterLabelOf(new Date("2025-12-31"))).toBe("2025-Q4");
    expect(quarterLabelOf(new Date("2026-01-01"))).toBe("2026-Q1");
  });

  it("reads as the bare quarter when a quarter holds one change", () => {
    expect(
      map(
        (segment) => segment.label,
        segmentLabelsOf([at("2025-04-01"), at("2025-07-01")]),
      ),
    ).toEqual(["2025-Q2", "2025-Q3"]);
  });

  // BOTH chips gain the month, not just the second one: a reader comparing two
  // chips needs them to differ in the same place.
  it("adds the month to EVERY chip in a crowded quarter", () => {
    expect(
      map(
        (segment) => segment.label,
        segmentLabelsOf([at("2025-07-01"), at("2025-08-01"), at("2025-10-01")]),
      ),
    ).toEqual(["2025-Q3 · Jul", "2025-Q3 · Aug", "2025-Q4"]);
  });

  // The suffix is always enough, and this is why: a mutation's moment is
  // snapped to a month boundary and no two may share a timestamp, so no two
  // can share a month — which makes (quarter, month) unique by construction.
  it("gives every chip in a year a distinct label", () => {
    const months = map(
      (index: number) => at(`2025-${String(index + 1).padStart(2, "0")}-01`),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    );
    const labels = map((segment) => segment.label, segmentLabelsOf(months));
    expect(new Set(labels).size).toBe(12);
  });

  it("carries the exact month beside the abbreviation", () => {
    const [segment] = segmentLabelsOf([at("2025-08-01")]);
    expect(segment?.month).toBe("2025-08");
  });

  it("orders the chips in time, whatever order it is given", () => {
    expect(
      map(
        (segment) => segment.id,
        segmentLabelsOf([at("2025-10-01"), at("2025-04-01")]),
      ),
    ).toEqual(["2025-04-01", "2025-10-01"]);
  });
});

// Peter, 2026-09-16: "add a delete button next to RESET so that I can remove a
// change frame." Removing one has to undo everything that only existed because
// of it — which is four different inverses, so they get four tests.
describe("removing a change", () => {
  const PETER: Person = {
    id: "peter",
    label: "Peter",
    roleId: "engineer",
    base: 80_000,
    changes: { spring: 100_000, autumn: 120_000 },
  };
  const LEAVER: Person = {
    id: "joe",
    label: "Joe",
    roleId: "engineer",
    base: 80_000,
    changes: { summer: null },
  };
  const NEW_HIRE: Person = {
    id: "sam",
    label: "Sam",
    roleId: "intern",
    base: null,
    changes: { summer: 1_000, autumn: 4_000 },
  };
  const SCENARIO = {
    mutations: MUTATIONS,
    people: [PETER, LEAVER, NEW_HIRE],
  };

  it("takes the mutation itself out of the list", () => {
    const after = removeMutation(SCENARIO, "summer");
    expect(map((mutation) => mutation.id, after.mutations)).toEqual([
      "spring",
      "autumn",
    ]);
  });

  it("reverts a raise to the previous interval's pay", () => {
    const after = removeMutation(SCENARIO, "spring");
    const peter = after.people[0] as Person;
    expect(peter.changes.spring).toBeUndefined();
    // Nothing invented: he simply carries his base until the autumn raise.
    expect(payFrom(peter, "summer", after.mutations)).toBe(80_000);
    expect(payFrom(peter, "autumn", after.mutations)).toBe(120_000);
  });

  it("undoes a termination made at it", () => {
    const after = removeMutation(SCENARIO, "summer");
    const joe = after.people[1] as Person;
    expect(joe.changes.summer).toBeUndefined();
    expect(payFrom(joe, "autumn", after.mutations)).toBe(80_000);
    expect(isPresentAt(80_000, payFrom(joe, "autumn", after.mutations))).toBe(
      true,
    );
  });

  // Somebody whose existence BEGAN at the deleted change has no history to
  // revert to, so they go — and their later raise goes with them, rather than
  // leaving a hire the reader never made.
  it("removes a person hired at it, and their later changes", () => {
    const after = removeMutation(SCENARIO, "summer");
    expect(map((person) => person.id, after.people)).toEqual(["peter", "joe"]);
  });

  it("keeps a hire whose own mutation survives", () => {
    const after = removeMutation(SCENARIO, "autumn");
    const sam = after.people[2] as Person;
    expect(sam.id).toBe("sam");
    expect(sam.changes).toEqual({ summer: 1_000 });
  });

  it("knows when a person was hired, and when they simply were there", () => {
    expect(hiredAt(NEW_HIRE, MUTATIONS)).toBe("summer");
    expect(hiredAt(PETER, MUTATIONS)).toBeUndefined();
  });

  describe("what gets selected next", () => {
    it("falls back to the EARLIER change when there is one", () => {
      expect(nearestMutation(MUTATIONS, "summer")).toBe("spring");
      expect(removeMutation(SCENARIO, "autumn").selected).toBe("summer");
    });

    it("falls forward when the removed change was the first", () => {
      expect(nearestMutation(MUTATIONS, "spring")).toBe("summer");
    });

    it("selects nothing once the last change is gone", () => {
      const one = { mutations: [MUTATIONS[0] as Mutation], people: [PETER] };
      const after = removeMutation(one, "spring");
      expect(after.mutations).toEqual([]);
      expect(after.selected).toBeNull();
      // Back to the board's opening state: the empty-state sentence returns on
      // its own, because it is a function of this list being empty.
      expect(after.people[0]?.changes).toEqual({ autumn: 120_000 });
    });
  });

  it("changes nothing for an id nobody has", () => {
    const after = removeMutation(SCENARIO, "winter");
    expect(after.mutations).toHaveLength(3);
    expect(after.people).toHaveLength(3);
  });
});

// Peter, 2026-09-16: dragging a dial with nothing selected should stop being a
// no-op and make the change it obviously means.
describe("the first interaction makes its own change", () => {
  const START = new Date("2025-01-01").getTime();
  const END = new Date("2026-01-01").getTime();
  const atQuarter = (iso: string): Mutation => ({
    id: iso,
    at: new Date(iso),
    label: "",
  });

  it("puts the first change on the first quarter of the span", () => {
    expect(nextFreeSlot(START, END, [])).toBe(new Date("2025-01-01").getTime());
  });

  it("moves to the next quarter when one is taken", () => {
    expect(nextFreeSlot(START, END, [atQuarter("2025-01-01")])).toBe(
      new Date("2025-04-01").getTime(),
    );
    expect(
      nextFreeSlot(START, END, [
        atQuarter("2025-01-01"),
        atQuarter("2025-04-01"),
      ]),
    ).toBe(new Date("2025-07-01").getTime());
  });

  it("steps over a taken quarter rather than stopping at it", () => {
    // Q1 free, Q2 taken: the FIRST free one is still Q1.
    expect(nextFreeSlot(START, END, [atQuarter("2025-04-01")])).toBe(
      new Date("2025-01-01").getTime(),
    );
  });

  it("has nowhere left to put one when every quarter is taken", () => {
    const all = map(atQuarter, [
      "2025-01-01",
      "2025-04-01",
      "2025-07-01",
      "2025-10-01",
    ]);
    expect(nextFreeSlot(START, END, all)).toBeUndefined();
  });

  it("creates and selects a change when nothing is selected", () => {
    const ensured = ensureMutation(
      { mutations: [], selected: null },
      START,
      END,
    );
    expect(ensured.created).toBe(true);
    expect(ensured.mutations).toHaveLength(1);
    expect(ensured.selected).toBe(ensured.mutations[0]?.id);
    expect(ensured.mutations[0]?.at).toEqual(new Date("2025-01-01"));
    // Numbered like any other flag, because it IS one — `addMutation` does the
    // creating, so there is no second way for a mutation to come into being.
    expect(ensured.mutations[0]?.label).toBe("1");
  });

  it("leaves an existing selection exactly alone", () => {
    const existing = [atQuarter("2025-07-01")];
    const ensured = ensureMutation(
      { mutations: existing, selected: "2025-07-01" },
      START,
      END,
    );
    expect(ensured.created).toBe(false);
    expect(ensured.selected).toBe("2025-07-01");
    expect(ensured.mutations).toHaveLength(1);
  });

  it("selects what is there rather than crowding a full span", () => {
    const all = map(atQuarter, [
      "2025-01-01",
      "2025-04-01",
      "2025-07-01",
      "2025-10-01",
    ]);
    const ensured = ensureMutation(
      { mutations: all, selected: null },
      START,
      END,
    );
    expect(ensured.created).toBe(false);
    expect(ensured.mutations).toHaveLength(4);
    expect(ensured.selected).toBe("2025-01-01");
  });

  // The two ways a mutation is born agree: a click on the chart and a first
  // drag both go through `addMutation`, so both renumber the flags.
  it("renumbers the flags, as a click on the chart does", () => {
    const later = addMutation([], new Date("2025-10-01"));
    const ensured = ensureMutation(
      { mutations: later.mutations, selected: null },
      START,
      END,
    );
    expect(map((m) => m.label, ensured.mutations)).toEqual(["1", "2"]);
    expect(ensured.selected).toBe(ensured.mutations[0]?.id);
  });
});
