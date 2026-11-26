import { describe, expect, it } from "vitest";
import {
  type CountedMember,
  type WeightedGroup,
  groupEntity,
  headcount,
  isChanged,
  memberTotal,
  removeMember,
  resetAll,
  resetMember,
  restoreMember,
  setCount,
  setRange,
  setValue,
  total,
  weightedMean,
} from "./weighted";

// Peter's sketch, 2026-11-20: Carpenters, Gerald ×2 at +$16K and Jen ×1 at +$12K
// on a $48K base.
const gerald: CountedMember = { id: "g", label: "Gerald", count: 2, old: 48_000, value: 64_000 };
const jen: CountedMember = { id: "j", label: "Jen", count: 1, old: 48_000, value: 60_000 };
const carpenters: WeightedGroup = {
  id: "carpenters",
  label: "Carpenters",
  range: [40_000, 90_000],
  members: [gerald, jen],
};

describe("weightedMean", () => {
  it("weights each amount by its count", () => {
    expect(weightedMean([[64_000, 2], [60_000, 1]])).toBeCloseTo(62_666.67, 1);
  });
  it("is null when nothing is counted", () => {
    expect(weightedMean([])).toBeNull();
    expect(weightedMean([[10, 0]])).toBeNull();
  });
});

describe("headcount", () => {
  it("is the sum of the members' counts", () => {
    expect(headcount(carpenters.members)).toBe(3);
  });
  it("leaves out a removed member", () => {
    expect(headcount([gerald, { ...jen, value: null }])).toBe(2);
  });
});

describe("groupEntity", () => {
  const entity = groupEntity(carpenters);
  it("is labelled with the group's own name", () => {
    expect(entity.label).toBe("Carpenters");
  });
  it("sits at the count-weighted mean, on the group's range", () => {
    expect(entity.value).toBeCloseTo(62_666.67, 1);
    expect(entity.old).toBe(48_000);
    expect(entity.range).toEqual([40_000, 90_000]);
  });
  it("has no prior when every member is new, and no value when all are removed", () => {
    const fresh = { ...carpenters, members: [{ ...gerald, old: null }] };
    expect(groupEntity(fresh).old).toBeNull();
    const gone = { ...carpenters, members: [{ ...gerald, value: null }] };
    expect(groupEntity(gone).value).toBeNull();
  });
  it("weights the prior by count too, over the members that had one", () => {
    const mixed = { ...carpenters, members: [{ ...gerald, old: 40_000 }, { ...jen, old: null }] };
    expect(groupEntity(mixed).old).toBe(40_000);
  });
});

describe("totals", () => {
  it("multiplies each member's amount by its count", () => {
    expect(memberTotal(gerald)).toBe(128_000);
    expect(memberTotal({ ...jen, value: null })).toBeNull();
  });
  it("is the members' totals summed: the per-unit amount times the headcount", () => {
    expect(total(carpenters.members)).toBe(188_000);
    expect(total([])).toBeNull();
  });
});

describe("resets", () => {
  it("resetAll puts every member back on its old amount and keeps a new one", () => {
    const fresh = { ...jen, old: null };
    expect(resetAll([gerald, fresh])).toEqual([{ ...gerald, value: 48_000 }, fresh]);
  });
  it("resetMember puts back only that member", () => {
    expect(resetMember(carpenters.members, "j")).toEqual([gerald, { ...jen, value: 48_000 }]);
  });
  it("isChanged says whether a reset has anything to undo", () => {
    expect(isChanged(carpenters.members)).toBe(true);
    expect(isChanged(resetAll(carpenters.members))).toBe(false);
    expect(isChanged([{ ...jen, old: null }])).toBe(false);
  });
});

describe("edits", () => {
  it("setCount takes a whole number of one or more", () => {
    expect(setCount(carpenters.members, "j", 4)[1]?.count).toBe(4);
    expect(setCount(carpenters.members, "j", 2.6)[1]?.count).toBe(3);
    expect(setCount(carpenters.members, "j", 0)[1]?.count).toBe(1);
    expect(setCount(carpenters.members, "j", Number.NaN)[1]?.count).toBe(1);
  });
  it("setValue clamps into the group's range", () => {
    expect(setValue(carpenters, "g", 120_000).members[0]?.value).toBe(90_000);
    expect(setValue(carpenters, "g", 50_000).members[0]?.value).toBe(50_000);
  });
  it("setRange orders the ends and pulls every amount inside", () => {
    const narrowed = setRange(carpenters, [62_000, 45_000]);
    expect(narrowed.range).toEqual([45_000, 62_000]);
    expect(narrowed.members.map((m) => m.value)).toEqual([62_000, 60_000]);
  });
  it("setRange ignores a range that is not two numbers", () => {
    expect(setRange(carpenters, [Number.NaN, 1])).toBe(carpenters);
  });
});

describe("removal", () => {
  it("removeMember takes a member out of the new scenario and keeps its old amount", () => {
    const out = removeMember(carpenters.members, "j");
    expect(out).toEqual([gerald, { ...jen, value: null }]);
    expect(headcount(out)).toBe(2);
    expect(isChanged(out)).toBe(true);
  });
  it("removeMember drops a new member outright: it has nothing to come back to", () => {
    expect(removeMember([gerald, { ...jen, old: null }], "j")).toEqual([gerald]);
  });
  it("restoreMember brings a removed member back on its old amount", () => {
    expect(restoreMember(removeMember(carpenters.members, "j"), "j")).toEqual([
      gerald,
      { ...jen, value: 48_000 },
    ]);
  });
});
