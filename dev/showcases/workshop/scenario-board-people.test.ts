import { describe, it, expect } from "vitest";
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
  roleOf,
  roleOptionLabel,
  uniqueId,
  type Person,
} from "./scenario-board-people";
import type { Mutation } from "../../../src/components/LevelsTimeline/geometry";

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
