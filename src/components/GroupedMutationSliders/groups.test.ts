// ============================================
// GroupedMutationSliders — the pure part, asserted without a browser.
//
// Two ideas live in `groups.ts` and both are pinned here: the PROJECTION at an
// arbitrary index (what makes the pin arithmetic reusable unchanged) and the
// RUNS (what the captions say). Everything prints as a table.
// ============================================
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import { DIAL_SLOT } from "../MutationSliders/rows";
import {
  type GroupedMutationEntity,
  dialLabel,
  groupRuns,
  hasCaptions,
  isRemoved,
  measureEntities,
  measureEntity,
  measureIndices,
  runsOf,
  slotFor,
} from "./groups";

/** A licence product: four measures in two groups. */
const STARTER: GroupedMutationEntity = {
  id: "starter",
  label: "Starter",
  measures: [
    { prior: 100, value: 120, range: [0, 300] },
    { prior: 15, value: 15, range: [9, 25] },
    { prior: 50, value: 60, range: [0, 200] },
    { prior: 85, value: 85, range: [50, 100] },
  ],
};

const TEAM: GroupedMutationEntity = {
  id: "team",
  label: "Team",
  measures: [
    { prior: 40, value: 40, range: [0, 120] },
    { prior: 49, value: 49, range: [29, 80] },
    { prior: 25, value: 25, range: [0, 80] },
    { prior: 90, value: 90, range: [50, 100] },
  ],
};

const FOUR_AXES = [
  { group: "mo" },
  { group: "mo" },
  { group: "yr" },
  { group: "yr" },
];

describe("measure positions", () => {
  it("counts from zero to N−1", () => {
    expect(measureIndices(4)).toEqual([0, 1, 2, 3]);
    expect(measureIndices(1)).toEqual([0]);
  });

  it("is empty, not negative, for a row with no measures", () => {
    expect(measureIndices(0)).toEqual([]);
    expect(measureIndices(-3)).toEqual([]);
  });
});

describe("the slot a whole entity costs", () => {
  it("is one dial slot per measure — the paired case falls out at N = 2", () => {
    expect(slotFor(4)).toBe(4 * DIAL_SLOT);
    expect(slotFor(2)).toBe(2 * DIAL_SLOT);
  });

  it("never falls below one dial, so a zero-axis row still pages sanely", () => {
    expect(slotFor(0)).toBe(DIAL_SLOT);
  });
});

describe("the projection onto one measure", () => {
  it("keeps the ENTITY's id, so an emission needs no unpicking", () => {
    const annualCount = measureEntity(STARTER, 2);
    expect(annualCount).toEqual({
      id: "starter",
      label: "Starter",
      old: 50,
      value: 60,
      range: [0, 200],
    });
  });

  it("reads measure 3 as a percentage band, unrelated to measure 0's", () => {
    expect(measureEntity(STARTER, 0)?.range).toEqual([0, 300]);
    expect(measureEntity(STARTER, 3)?.range).toEqual([50, 100]);
  });

  it("is undefined past the end — an entity may be shorter than the axes", () => {
    expect(measureEntity(STARTER, 4)).toBeUndefined();
  });

  it("DROPS an entity that has no measure at that position", () => {
    const short: GroupedMutationEntity = {
      id: "legacy",
      label: "Legacy",
      measures: [{ prior: 5, value: 5, range: [0, 10] }],
    };
    expect(map((row) => row.id, measureEntities([STARTER, short], 0))).toEqual([
      "starter",
      "legacy",
    ]);
    // …and it is simply absent from the third measure's row, so the pin
    // arithmetic never has to know it exists.
    expect(map((row) => row.id, measureEntities([STARTER, short], 2))).toEqual([
      "starter",
    ]);
  });

  it("projects disjointly — measure 0's row shares no value with measure 1's", () => {
    const counts = measureEntities([STARTER, TEAM], 0);
    const fees = measureEntities([STARTER, TEAM], 1);
    expect(map((row) => row.value, counts)).toEqual([120, 40]);
    expect(map((row) => row.value, fees)).toEqual([15, 49]);
  });
});

describe("removal", () => {
  it("needs EVERY measure to have lost its value", () => {
    const allNull: GroupedMutationEntity = {
      ...STARTER,
      measures: map(
        (measure) => ({ ...measure, value: null }),
        STARTER.measures,
      ),
    };
    expect(isRemoved(allNull)).toBe(true);
  });

  it("is NOT removal when one measure still holds a value", () => {
    const partial: GroupedMutationEntity = {
      ...STARTER,
      measures: [
        { ...STARTER.measures[0], value: null },
        { ...STARTER.measures[1], value: null },
        { ...STARTER.measures[2], value: null },
        STARTER.measures[3],
      ],
    };
    expect(isRemoved(partial)).toBe(false);
  });

  it("is not vacuously true of an entity with no measures at all", () => {
    expect(isRemoved({ id: "x", label: "X", measures: [] })).toBe(false);
  });
});

describe("the captioned runs", () => {
  it("merges CONSECUTIVE axes sharing a name into one run", () => {
    expect(groupRuns(["mo", "mo", "yr", "yr"])).toEqual([
      { caption: "mo", indices: [0, 1] },
      { caption: "yr", indices: [2, 3] },
    ]);
  });

  it("opens a SECOND run when a name comes back after an interruption", () => {
    // `mo, yr, mo` keeps the reader's own order rather than reordering the row
    // to caption the two `mo` dials once.
    expect(groupRuns(["mo", "yr", "mo"])).toEqual([
      { caption: "mo", indices: [0] },
      { caption: "yr", indices: [1] },
      { caption: "mo", indices: [2] },
    ]);
  });

  it("gives every UNGROUPED axis a run of its own, never merged", () => {
    expect(groupRuns([undefined, undefined])).toEqual([
      { caption: "", indices: [0] },
      { caption: "", indices: [1] },
    ]);
  });

  it("mixes grouped and ungrouped axes without either swallowing the other", () => {
    expect(groupRuns(["mo", "mo", undefined])).toEqual([
      { caption: "mo", indices: [0, 1] },
      { caption: "", indices: [2] },
    ]);
  });

  it("is empty for no axes", () => {
    expect(groupRuns([])).toEqual([]);
  });

  it("reads the runs straight off an axis list", () => {
    expect(runsOf(FOUR_AXES)).toEqual([
      { caption: "mo", indices: [0, 1] },
      { caption: "yr", indices: [2, 3] },
    ]);
  });

  it("knows whether the caption LINE is needed at all", () => {
    expect(hasCaptions(FOUR_AXES)).toBe(true);
    // Two axes that name no group: the caption LINE is not drawn at all.
    expect(hasCaptions([{}, {}])).toBe(false);
  });
});

describe("a dial's accessible name", () => {
  it("carries the entity, the group AND the measure", () => {
    expect(dialLabel("Starter", "yr", "#", 2)).toBe("Starter yr #");
  });

  it("tells two same-labelled dials apart by their captions alone", () => {
    expect(dialLabel("Starter", "mo", "#", 0)).not.toBe(
      dialLabel("Starter", "yr", "#", 2),
    );
  });

  it("leaves no gap where an absent caption would have been", () => {
    expect(dialLabel("Design", "", "Hrs/wk", 0)).toBe("Design Hrs/wk");
  });

  it("falls back to a 1-based position rather than to silence", () => {
    expect(dialLabel("Design", "", undefined, 2)).toBe("Design measure 3");
  });
});
