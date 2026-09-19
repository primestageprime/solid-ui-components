/**
 * Board Kit — the lens, asserted on its own.
 *
 * Four board edits, one pair of functions. What the tests below pin is the
 * three rules that were stated twice, in two vocabularies, before this file
 * existed: a write CARRIES the measures it did not touch, a drop is ABSENCE
 * rather than zero, and an undo DELETES rather than invents.
 */
import { describe, expect, it } from "vitest";
import { map } from "../../../../src/fn";
import type { BoardEntity } from "./config";
import {
  add,
  applyChanges,
  type Change,
  carriedBefore,
  clear,
  remove,
  set,
  uniqueId,
  view,
} from "./lens";

const ORDER = ["s1", "s2", "s3"];

/** A two-measure entity, the Hourly Board's shape: 20 h/wk at $18/hr, raised
 *  to 30 hours at the second slot. */
const BASE: BoardEntity = {
  id: "a",
  label: "A",
  start: 0,
  committed: [20, 18],
  ranges: [
    [0, 45],
    [10, 40],
  ],
  changes: { s2: [30, 18] },
};

const OTHER: BoardEntity = {
  id: "b",
  label: "B",
  start: 0,
  committed: [15, 120],
  ranges: [
    [0, 32],
    [80, 160],
  ],
  changes: {},
};

const ROSTER: readonly BoardEntity[] = [BASE, OTHER];

describe("view", () => {
  it("reads a measure from the slot's own entry", () => {
    expect(view(ROSTER, ["a", 0], "s2", ORDER)).toBe(30);
    expect(view(ROSTER, ["a", 1], "s2", ORDER)).toBe(18);
  });

  it("CARRIES a level forward rather than reading one key", () => {
    // Raised at s2 and untouched at s3: the reader editing s3 is looking at 30
    // hours, not at the opening 20. Both boards wrote this walk, and both wrote
    // the same comment explaining why.
    expect(view(ROSTER, ["a", 0], "s1", ORDER)).toBe(20);
    expect(view(ROSTER, ["a", 0], "s3", ORDER)).toBe(30);
  });

  it("answers a presence path with presence, not with a number", () => {
    expect(view(ROSTER, ["a", "presence"], "s1", ORDER)).toBe(1);
    const dropped = set(ROSTER, ["a", "presence"], null, "s2", ORDER);
    expect(view(dropped, ["a", "presence"], "s2", ORDER)).toBeNull();
    expect(view(dropped, ["a", 0], "s2", ORDER)).toBeNull();
  });

  it("reads an unknown entity as absent rather than throwing", () => {
    expect(view(ROSTER, ["nobody", 0], "s1", ORDER)).toBeNull();
  });
});

describe("set", () => {
  it("carries the measure that did NOT move", () => {
    // The whole reason a change in the history is a set of measures: the stack
    // and the revenue both need every number at every moment, so the one that
    // did not change is written down saying exactly that.
    const next = set(ROSTER, ["a", 0], 25, "s1", ORDER);
    expect(next[0]!.changes.s1).toEqual([25, 18]);
  });

  it("leaves every other entity and every other slot untouched", () => {
    const next = set(ROSTER, ["a", 0], 25, "s1", ORDER);
    expect(next[1]).toBe(OTHER);
    expect(next[0]!.changes.s2).toEqual([30, 18]);
  });

  it("CLAMPS to the entity's own allowance, exactly as the dial does", () => {
    // The shaded box on a slider IS `ranges[measure]`, so a figure written past
    // it would be a stored value the control could never emit.
    expect(set(ROSTER, ["a", 0], 999, "s1", ORDER)[0]!.changes.s1).toEqual([
      45, 18,
    ]);
    expect(set(ROSTER, ["a", 1], 0, "s1", ORDER)[0]!.changes.s1).toEqual([
      20, 10,
    ]);
  });

  it("refuses to edit an entity that is not on the board into existence", () => {
    // That is `add`'s job, where the whole set of measures is supplied at once.
    const notYet: BoardEntity = { ...BASE, committed: null, changes: {} };
    expect(set([notYet], ["a", 0], 25, "s1", ORDER)[0]).toBe(notYet);
  });

  it("makes a DROP both measures absent, and nothing else", () => {
    const next = set(ROSTER, ["a", "presence"], null, "s2", ORDER);
    expect(next[0]!.changes.s2).toBeNull();
    expect(next[0]!.committed).toEqual([20, 18]);
    expect(next[1]).toBe(OTHER);
  });
});

describe("clear", () => {
  it("DELETES the entry rather than inventing a level", () => {
    // The honest inverse of setting it: the entity carries whatever the
    // previous slot left it on, which is why a drop and a raise are undone by
    // the same single deletion rather than by two special cases.
    const dropped = set(ROSTER, ["a", "presence"], null, "s2", ORDER);
    const undone = clear(dropped, "a", "s2");
    expect(Object.keys(undone[0]!.changes)).toEqual([]);
    expect(view(undone, ["a", 0], "s2", ORDER)).toBe(20);
  });
});

describe("the roster ops", () => {
  it("adds an entity whose existence starts where the reader put it", () => {
    const next = add(
      ROSTER,
      {
        id: "c",
        label: "C",
        measures: [5, 100],
        ranges: [
          [0, 80],
          [0, 300],
        ],
        start: 0,
      },
      "s2",
    );
    const added = next[2]!;
    // `committed: null` is what makes it an ADDITION rather than a row that
    // happens to start low — there is no prior, so the dial draws no prior arrow.
    expect(added.committed).toBeNull();
    expect(view(next, ["c", 0], "s1", ORDER)).toBeNull();
    expect(view(next, ["c", 0], "s2", ORDER)).toBe(5);
    expect(view(next, ["c", 1], "s3", ORDER)).toBe(100);
  });

  it("removes one outright", () => {
    expect(map((e: BoardEntity) => e.id, remove(ROSTER, "a"))).toEqual(["b"]);
  });

  it("derives an id from the NAME, so the same add twice is the same result", () => {
    expect(uniqueId("Service C", [])).toBe("service-c");
    expect(uniqueId("Service C", ["service-c"])).toBe("service-c-2");
    expect(uniqueId("  ", [], "service")).toBe("service");
  });
});

describe("applyChanges", () => {
  it("replays a log across several slots, in order", () => {
    // The whole point of a change being a VALUE: a scenario is its fixture plus
    // a log, rather than a mutable roster nothing can reproduce.
    const log: readonly Change[] = [
      { at: "s1", path: ["a", 0], value: 25 },
      { at: "s2", path: ["a", 1], value: 22 },
      { at: "s2", path: ["b", "presence"], value: null },
    ];
    const next = applyChanges(ROSTER, log, ORDER);
    expect(next[0]!.changes.s1).toEqual([25, 18]);
    expect(next[0]!.changes.s2).toEqual([30, 22]);
    expect(view(next, ["b", 0], "s2", ORDER)).toBeNull();
    // Replaying the same log onto the same fixture is the same scenario.
    expect(applyChanges(ROSTER, log, ORDER)).toEqual(next);
    // And the fixture itself never moved.
    expect(ROSTER[0]!.changes).toEqual({ s2: [30, 18] });
  });

  it("is carriedBefore that makes a later write see an earlier one", () => {
    const once = applyChanges(
      ROSTER,
      [{ at: "s1", path: ["a", 0], value: 25 }],
      ORDER,
    );
    expect(carriedBefore(once[0]!, "s2", ORDER)).toEqual([25, 18]);
  });
});
